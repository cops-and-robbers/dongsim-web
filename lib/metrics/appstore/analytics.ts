/**
 * App Store 분석 리포트 (Analytics Reports API) (#142).
 *
 * 요청(상시 ONGOING, 전체 기록 ONE_TIME_SNAPSHOT) → 리포트 → 인스턴스(처리일마다 한 파일)
 * → 세그먼트(gzip 파일 주소) 순서로 받는다. 인스턴스는 35일 뒤 지워진다.
 *
 * 쓰는 리포트는 넷이다(#142, #160).
 * - App Store Discovery and Engagement Standard: 노출, 제품 페이지 조회, 탭 (Event 열)
 * - App Downloads Standard: 신규 다운로드, 재다운로드, 유입 유형(Source Type: 검색, 웹 링크, 다른 앱 링크)
 * - App Downloads Detailed: 어느 앱이나 사이트에서 왔나(Source Info: 카카오톡, 우리 사이트 등), 캠페인.
 *   칸이 잘게 나뉘어 5명 미만 칸이 빠진다. 출처 이름을 보려고 받는다
 * - App Store Installation and Deletion Standard: 설치와 삭제(Event), 처음 받은 날(App Download Date).
 *   분석 공유에 동의한 사용자만 세서 실제의 절반쯤이다(2026-09: 33 / 판매 리포트 80). 비율로만 쓴다
 * 사용자 5명 미만인 칸은 애플이 뺀다. 그대로 둔다.
 */

import { gunzipSync } from "node:zlib";
import { ASC_API, ascJson } from "./auth.ts";

export const WANTED_REPORTS: Record<string, string> = {
  "App Store Discovery and Engagement Standard": "engagement",
  "App Downloads Standard": "downloads",
  "App Downloads Detailed": "downloads_detailed",
  "App Store Installation and Deletion Standard": "install_delete",
};

export type AnalyticsRow = {
  day: string;
  dims: Record<string, string>;
  counts: number | null;
  uniqueCounts: number | null;
};

/** 숫자로 읽을 열. 나머지 열은 전부 나눠 보는 축(dims)이다 */
const MEASURES = new Set(["counts", "unique counts", "unique devices"]);
/** 모든 줄에 같은 값이라 저장할 필요가 없는 열 */
const DROP = new Set(["app name", "app apple identifier"]);

/**
 * 리포트 파일 한 장을 줄로 바꾼다. 열 이름을 미리 정하지 않고 머리줄을 읽는다 -
 * 리포트마다 열이 다르고, 애플이 열을 더해도 수집이 깨지지 않게 하려는 것이다.
 * Date 열이 없으면 이 파일을 읽을 수 없다는 뜻이라 오류를 낸다.
 */
export function parseAnalyticsTsv(text: string): AnalyticsRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const head = lines[0].split("\t").map((h) => h.trim());
  const lower = head.map((h) => h.toLowerCase());
  const iDate = lower.indexOf("date");
  if (iDate < 0) throw new Error(`분석 리포트에 Date 열이 없어요 (열: ${head.join(", ")})`);
  const iCounts = lower.indexOf("counts");
  // 설치와 삭제 리포트는 고유 수 열 이름이 Unique Devices 다
  const iUnique = lower.indexOf("unique counts") >= 0 ? lower.indexOf("unique counts") : lower.indexOf("unique devices");
  const num = (s: string | undefined) => (s === undefined || s === "" ? null : Number(s));
  return lines.slice(1).map((line) => {
    const c = line.split("\t");
    const dims: Record<string, string> = {};
    head.forEach((h, i) => {
      if (i === iDate || MEASURES.has(lower[i]) || DROP.has(lower[i])) return;
      dims[h] = c[i] ?? "";
    });
    return {
      day: c[iDate],
      dims,
      counts: iCounts < 0 ? null : num(c[iCounts]),
      uniqueCounts: iUnique < 0 ? null : num(c[iUnique]),
    };
  });
}

/** dims 를 기본 키로 쓸 문자열로. 열 순서가 바뀌어도 같은 값이 나오게 정렬한다 */
export function dimsKey(dims: Record<string, string>): string {
  return Object.keys(dims)
    .sort()
    .map((k) => `${k}=${dims[k]}`)
    .join("|");
}

/** 같은 날짜, 같은 dims 가 여러 줄(여러 세그먼트)이면 더한다 */
export function mergeRows(rows: AnalyticsRow[]): AnalyticsRow[] {
  const map = new Map<string, AnalyticsRow>();
  for (const r of rows) {
    const key = `${r.day}|${dimsKey(r.dims)}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...r });
      continue;
    }
    if (r.counts !== null) prev.counts = (prev.counts ?? 0) + r.counts;
    if (r.uniqueCounts !== null) prev.uniqueCounts = (prev.uniqueCounts ?? 0) + r.uniqueCounts;
  }
  return [...map.values()];
}

/**
 * 같은 날짜가 여러 인스턴스(처리일)에 나올 때 무엇을 남길지.
 * 가장 최근에 처리된 것만 남긴다 - 둘을 다 쌓으면 그날을 두 번 센다.
 */
export function shouldReplace(storedProcessingDate: string | null, incoming: string): boolean {
  return storedProcessingDate === null || incoming > storedProcessingDate;
}

type ApiItem = { id: string; attributes: Record<string, string> };
type ApiList = { data?: ApiItem[]; links?: { next?: string } };

async function listAll(url: string, token: string): Promise<ApiItem[]> {
  const out: ApiItem[] = [];
  let next: string | undefined = url;
  for (let page = 0; next && page < 50; page++) {
    const body = (await ascJson(next, token)) as ApiList;
    out.push(...(body.data ?? []));
    next = body.links?.next;
  }
  return out;
}

export type Instance = { id: string; report: string; granularity: string; processingDate: string };

/** 우리 앱의 모든 요청(상시, 전체 기록)에서 쓸 리포트의 하루 단위 인스턴스를 모은다 */
export async function listInstances(token: string, appId: string): Promise<Instance[]> {
  const requests = await listAll(`${ASC_API}/apps/${appId}/analyticsReportRequests`, token);
  const out: Instance[] = [];
  for (const req of requests) {
    const reports = await listAll(`${ASC_API}/analyticsReportRequests/${req.id}/reports?limit=200`, token);
    for (const rep of reports) {
      const report = WANTED_REPORTS[rep.attributes.name];
      if (!report) continue;
      const instances = await listAll(
        `${ASC_API}/analyticsReports/${rep.id}/instances?filter[granularity]=DAILY&limit=200`,
        token,
      );
      for (const inst of instances) {
        out.push({
          id: inst.id,
          report,
          granularity: inst.attributes.granularity,
          processingDate: inst.attributes.processingDate,
        });
      }
    }
  }
  return out;
}

/** 인스턴스 하나의 모든 세그먼트 파일을 받아 줄로 바꾼다 */
export async function fetchInstanceRows(token: string, instanceId: string): Promise<AnalyticsRow[]> {
  const segments = await listAll(`${ASC_API}/analyticsReportInstances/${instanceId}/segments`, token);
  const rows: AnalyticsRow[] = [];
  for (const seg of segments) {
    // 세그먼트 주소는 서명된 임시 주소라 인증 헤더 없이 받는다
    const res = await fetch(seg.attributes.url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`분석 리포트 파일 HTTP ${res.status}`);
    const text = gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8");
    rows.push(...parseAnalyticsTsv(text));
  }
  return mergeRows(rows);
}
