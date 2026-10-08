/**
 * App Store 최초 다운로드가 어떻게, 어디서 왔나와 iOS 삭제 (#160). 스토어 탭 App Store 화면이 쓴다.
 * 입력만 보고 답하는 함수라 테스트(dashboard.test.mjs)가 숫자를 넣어 확인한다.
 *
 * - 어떻게: 다운로드 리포트(Standard)의 Source Type. 판매 리포트 최초 다운로드와 거의 같다(2026-09: 79 / 80, 2026-08: 33 / 33)
 * 다운로드 상세 리포트(Detailed)의 Source Info(카카오톡, 우리 사이트 등)는 모으기만 하고 화면에는 안 쓴다.
 * 칸이 잘게 나뉘어 5명 미만 칸이 빠져서, 최초 다운로드로는 한 달에 한두 줄만 남는다(2026-09: 우리 사이트 17 뿐).
 * 카카오톡은 자동 업데이트 줄에만 잡혔다(기존 사용자가 처음 들어온 곳) - 새로 받은 길로 읽으면 안 된다
 * - 삭제: 설치와 삭제 리포트. 분석 공유에 동의한 사용자만 세서(2026-09: 33 / 80) 개수가 아니라 비율로만 쓴다
 * 분석 리포트 날짜는 UTC 라 옮기지 않는다(numbers.ts 머리 설명).
 */

import type { Week } from "../weekly/numbers.ts";
import { addDays } from "../dates.ts";

export type AnalyticsDayRow = { report: string; day: string; dims: Record<string, string>; counts: number | null };

export type SourceGroup = "search" | "web" | "app" | "other";

/** 애플의 Source Type 을 네 묶음으로. 행사 QR, 사이트 버튼은 웹 링크, 카카오톡처럼 다른 앱에서 누른 링크는 앱 링크다 */
export function sourceGroup(sourceType: string): SourceGroup {
  if (sourceType === "App Store search") return "search";
  if (sourceType === "Web referrer") return "web";
  if (sourceType === "App referrer") return "app";
  return "other"; // App Store browse, Unavailable, Institutional purchase 등
}

const isFirst = (r: AnalyticsDayRow) => r.dims["Download Type"] === "First-time download";
const inRange = (day: string, w: Week) => day >= w.start && day <= w.end;

/** 기간 안 최초 다운로드를 받은 길별로 */
export function sourceTotals(rows: AnalyticsDayRow[], w: Week): Record<SourceGroup, number> & { total: number } {
  const out = { search: 0, web: 0, app: 0, other: 0, total: 0 };
  for (const r of rows) {
    if (r.report !== "downloads" || !isFirst(r) || !inRange(r.day, w)) continue;
    const n = Number(r.counts ?? 0);
    out[sourceGroup(r.dims["Source Type"] ?? "")] += n;
    out.total += n;
  }
  return out;
}

/**
 * 받고 7일 안에 지운 비율. 받은 날(App Download Date)이 이 기간인 사람(최초, 재다운로드) 중 7일 안에 지운 사람.
 * 7일이 다 지나지 않은 날은 아직 지울 수 있어 뺀다(lastDay 는 리포트가 들어온 마지막 날)
 */
export function quickDeletes(rows: AnalyticsDayRow[], w: Week, lastDay: string | null): { num: number; den: number; until: string | null } {
  if (!lastDay) return { num: 0, den: 0, until: null };
  const until = [w.end, addDays(lastDay, -7)].sort()[0];
  if (until < w.start) return { num: 0, den: 0, until: null };
  const cohort = { start: w.start, end: until };
  let num = 0;
  let den = 0;
  for (const r of rows) {
    if (r.report !== "install_delete") continue;
    const n = Number(r.counts ?? 0);
    // 다시 받은 사람도 "처음 받은 날"이 다시 받은 날로 찍혀 지운 쪽에 섞이므로 분모에도 넣는다. 업데이트는 뺀다
    const fresh = isFirst(r) || r.dims["Download Type"] === "Redownload";
    if (r.dims.Event === "Install" && fresh && inRange(r.day, cohort)) den += n;
    const got = r.dims["App Download Date"];
    if (r.dims.Event === "Delete" && got && inRange(got, cohort) && r.day <= addDays(got, 7)) num += n;
  }
  return { num, den, until };
}
