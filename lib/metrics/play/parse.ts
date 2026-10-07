/**
 * Google Play 리포트 파일 읽기 (#147). 받기(run.ts)와 나눠 두어 테스트가 파일 내용만 넣어 확인한다.
 *
 * 파일은 Cloud Storage 에 달마다 하나씩 있고, 3~7일 늦게 그 달 파일이 다시 써진다.
 *   stats/installs/installs_<패키지>_<YYYYMM>_<dim>.csv
 *   stats/store_performance/store_performance_<패키지>_<YYYYMM>_<dim>.csv
 *   stats/crashes/crashes_<패키지>_<YYYYMM>_<dim>.csv
 *   stats/ratings/ratings_<패키지>_<YYYYMM>_<dim>.csv
 * 글자는 UTF-16(앞에 BOM)이다. 날짜는 미국 서부(PT) 날짜다(설치 통계 도움말, 2026-10-07 실측).
 *
 * 열 이름을 미리 정한 순서로 읽지 않고 머리줄에서 찾는다. 구글이 열을 더해도 깨지지 않게 한다.
 */

/** 받는 리포트와 나눠 보는 축. 기기, 통신사, 언어, OS 축은 마케팅 판단에 쓰지 않아 받지 않는다 */
export const PLAY_REPORTS = [
  // 버전 축(app_version)은 받지 않는다. 기존 사용자의 업데이트(Daily Device Upgrades)가 늘 0 이라 새로 깐 사람만 보여서,
  // 출시일을 찾으려 하면 행사 날(설치가 몰린 날)이 출시일로 잡힌다(2026-10-07 실측, docs "Android 출시 일정")
  { report: "installs", folder: "installs", file: "installs", dims: ["overview", "country"] },
  // 스토어 등록정보 방문자와 획득. overview 파일이 없어 나라 축(합이 전체와 같다)을 전체로 쓴다
  { report: "store", folder: "store_performance", file: "store_performance", dims: ["country", "traffic_source"] },
  { report: "crashes", folder: "crashes", file: "crashes", dims: ["overview", "app_version"] },
  { report: "ratings", folder: "ratings", file: "ratings", dims: ["overview"] },
] as const;

export type PlayReport = (typeof PLAY_REPORTS)[number]["report"];

/**
 * 열 이름 → 저장할 지표 이름. 여기 없는 열은 받지 않는다.
 * - Daily Device Uninstalls, Total User Installs 는 2026 파일에서 늘 0 이다(옛 지표). 받지 않는다
 * - Daily User Installs: 그날 처음 설치한 사람(다른 기기에 이미 깔았으면 세지 않는다). 화면의 "Google Play 최초 설치"
 * - Install events: 다시 설치까지 센 횟수
 * - Active Device Installs: 앱이 깔려 있고 최근 30일 안에 켜진(구글에 접속한) 기기. 그날 기준 누적값이라 더하지 않는다
 * - Store listing visitors: 앱이 없는 사람 중 스토어 등록정보를 본 사람. acquisitions: 그중 설치한 사람
 */
export const PLAY_METRICS: Record<string, string> = {
  "Daily User Installs": "user_installs",
  "Daily Device Installs": "device_installs",
  "Install events": "install_events",
  "Daily User Uninstalls": "user_uninstalls",
  "Uninstall events": "uninstall_events",
  "Daily Device Upgrades": "device_upgrades",
  "Active Device Installs": "active_devices",
  "Store listing visitors": "visitors",
  "Store listing acquisitions": "acquisitions",
  "Daily Crashes": "crashes",
  "Daily ANRs": "anrs",
  "Daily Average Rating": "rating_daily",
  "Total Average Rating": "rating_total",
};

/** 나눠 보는 축이 어느 열에 있나. 유입 경로는 네 열을 이어 한 칸에 둔다(GA4 의 KEY_SEP 와 같은 "|") */
const KEY_COLUMNS: Record<string, string[]> = {
  overview: [],
  country: ["Country", "Country / region"],
  app_version: ["App Version Code"],
  traffic_source: ["Traffic source", "Search term", "UTM source", "UTM campaign"],
};

export type PlayRow = { report: string; dim: string; key: string; day: string; metric: string; value: number };

/** UTF-16(BOM)이면 UTF-16 으로, 아니면 UTF-8 로 읽는다. 앞의 BOM 글자는 지운다 */
export function decodePlayFile(buf: Uint8Array): string {
  const utf16le = buf[0] === 0xff && buf[1] === 0xfe;
  const utf16be = buf[0] === 0xfe && buf[1] === 0xff;
  const text = utf16le ? new TextDecoder("utf-16le").decode(buf) : utf16be ? new TextDecoder("utf-16be").decode(buf) : new TextDecoder("utf-8").decode(buf);
  return text.replace(/^﻿/, "");
}

/** 쉼표, 큰따옴표가 들어간 칸(검색어 등)도 읽는 작은 CSV 줄 나누기 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * 파일 한 장을 줄로. 0 은 저장하지 않는다(나라, 버전 축은 줄이 많아 0 이 대부분이다).
 * 다만 overview 의 설치 지표는 0 도 남긴다 - "그날 받았는데 0"과 "아직 안 나옴"을 가르려고(App Store 의 withMarker 와 같은 이유).
 * 하루 평균 평점 0.0 은 "그날 평점 없음"이라 늘 뺀다
 */
export function parsePlayCsv(text: string, report: string, dim: string): PlayRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const head = splitCsvLine(lines[0]).map((h) => h.trim());
  const iDate = head.indexOf("Date");
  if (iDate < 0) throw new Error(`Play 파일(${report} ${dim})에 Date 열이 없어요 (열: ${head.join(", ")})`);
  const keyIdx = (KEY_COLUMNS[dim] ?? []).map((name) => head.indexOf(name)).filter((i) => i >= 0);
  if ((KEY_COLUMNS[dim] ?? []).length > 0 && keyIdx.length === 0) throw new Error(`Play 파일(${report} ${dim})에 나눠 보는 열이 없어요`);
  const metricIdx = head.map((h, i) => [PLAY_METRICS[h], i] as const).filter(([m]) => !!m) as [string, number][];
  const keepZero = dim === "overview" && report === "installs";
  const rows: PlayRow[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    const day = c[iDate]?.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? "")) continue;
    const key = keyIdx.map((i) => (c[i] ?? "").trim()).join("|");
    for (const [metric, i] of metricIdx) {
      const value = Number(c[i]);
      if (!Number.isFinite(value)) continue;
      if (value === 0 && (!keepZero || metric === "rating_daily")) continue;
      rows.push({ report, dim, key, day, metric, value });
    }
  }
  return mergePlayRows(rows);
}

/** 같은 칸(유입 경로를 이어 붙였을 때 같은 값 등)이 여러 줄이면 더한다. 누적값(활성 기기, 누적 평점)은 더하지 않고 마지막 값 */
export function mergePlayRows(rows: PlayRow[]): PlayRow[] {
  const LEVEL = new Set(["active_devices", "rating_total", "rating_daily"]);
  const map = new Map<string, PlayRow>();
  for (const r of rows) {
    const k = `${r.report}|${r.dim}|${r.key}|${r.day}|${r.metric}`;
    const prev = map.get(k);
    if (!prev) map.set(k, { ...r });
    else prev.value = LEVEL.has(r.metric) ? r.value : prev.value + r.value;
  }
  return [...map.values()];
}

/** 파일 이름에서 달과 축을 읽는다. 우리 패키지, 우리가 받는 리포트가 아니면 null */
export function parsePlayName(name: string, pkg: string): { report: PlayReport; month: string; dim: string } | null {
  for (const r of PLAY_REPORTS) {
    const prefix = `stats/${r.folder}/${r.file}_${pkg}_`;
    if (!name.startsWith(prefix)) continue;
    const m = name.slice(prefix.length).match(/^(\d{4})(\d{2})_([a-z_]+)\.csv$/);
    if (!m) return null;
    const dim = m[3];
    if (!(r.dims as readonly string[]).includes(dim)) return null;
    return { report: r.report, month: `${m[1]}-${m[2]}`, dim };
  }
  return null;
}

/** "2026-09" 의 첫날과 마지막 날 */
export function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
