/**
 * App Store 출시를 지표 차트의 일정(metrics_events)에 자동으로 넣는다 (#145).
 *
 * App Store Connect API 의 버전 목록(appStoreVersions)에는 출시한 날이 없다(만든 날만 있다).
 * 대신 판매 리포트의 Version 칸으로, 그 버전이 처음 내려받아진 날(업데이트 7, 신규 1 등)을 출시일로 본다.
 * 판매 리포트는 App Store 에서 실제로 받은 기록만 담아 TestFlight 시험 빌드가 섞이지 않는다.
 * (GA4 의 앱 버전은 TestFlight 빌드 3.1.22, 3.1.23 처럼 출시 안 된 버전까지 섞여 쓰지 않았다)
 *
 * 날짜는 판매 리포트(미국 서부)를 하루 뒤로 옮긴 한국 날짜다. 다른 App Store 숫자와 같은 규칙이다.
 * 다운로드가 적은 때는 출시 후 한참 뒤에야 처음 내려받아진다(2026-04 에 1.3.30 이 1.8.2 보다 늦게 잡혔다).
 * 그래서 더 높은 버전보다 늦게 잡힌 버전은 출시일을 믿을 수 없어 넣지 않는다.
 * 이미 넣은 버전(같은 이름의 일정)은 다시 넣지 않는다. 사람이 지운 출시 일정은, 그 버전이 아직
 * 최근 7일 창 안에 있으면 다음 수집 때 다시 생긴다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "../dates.ts";
import type { SalesRow } from "./sales.ts";

export const releaseLabel = (version: string) => `iOS ${version} 출시`;

/**
 * 받은 기간 안에서 버전마다 처음 내려받아진 날(PT). 받은 기간의 첫날에 처음 보인 버전은 뺀다.
 * 그보다 앞서 나왔을 수 있어 "처음"인지 알 수 없다(매일 수집은 창이 하루씩 밀려서, 진짜 새 버전은
 * 창의 첫날이 아닌 날에 한 번은 잡힌다)
 */
export function firstSeen(rows: SalesRow[], windowStart: string): { version: string; day: string }[] {
  const first = new Map<string, string>();
  for (const r of rows) {
    for (const [version, units] of Object.entries(r.versions)) {
      if (units <= 0) continue;
      const cur = first.get(version);
      if (!cur || r.day < cur) first.set(version, r.day);
    }
  }
  return [...first.entries()]
    .filter(([, day]) => day > windowStart)
    .map(([version, day]) => ({ version, day }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** "3.1.20" 끼리 크기 비교 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** 더 높은 버전이 같은 날이나 그 전에 이미 나왔으면 그 버전의 출시일은 믿을 수 없다 */
export function plausible(found: { version: string; day: string }[], known: { version: string; day: string }[]): { version: string; day: string }[] {
  const all = [...known, ...found];
  return found.filter((f) => !all.some((o) => compareVersion(o.version, f.version) > 0 && o.day <= f.day));
}

/** 새로 찾은 출시를 일정에 넣는다. 일정 테이블(0004)이 없으면 아무것도 하지 않는다 */
export async function recordReleases(client: SupabaseClient, rows: SalesRow[], windowStart: string): Promise<number> {
  const found = firstSeen(rows, windowStart);
  if (found.length === 0) return 0;
  const { data, error } = await client.from("metrics_events").select("day, label").like("label", "iOS % 출시");
  if (error) return 0;
  const rows2 = (data ?? []) as { day: string; label: string }[];
  const have = new Set(rows2.map((r) => r.label));
  // 이미 넣은 출시(한국 날짜)를 판매 리포트 날짜(PT)로 되돌려 같은 기준으로 견준다
  const known = rows2.map((r) => ({ version: r.label.replace(/^iOS /, "").replace(/ 출시$/, ""), day: addDays(r.day, -1) }));
  const add = plausible(
    found.filter((f) => !have.has(releaseLabel(f.version))),
    known,
  ).map((f) => ({ day: addDays(f.day, 1), label: releaseLabel(f.version) }));
  if (add.length === 0) return 0;
  const res = await client.from("metrics_events").insert(add);
  return res.error ? 0 : add.length;
}
