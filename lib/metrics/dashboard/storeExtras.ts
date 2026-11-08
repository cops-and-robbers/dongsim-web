/**
 * 지표 화면 스토어 탭에 더한 숫자 (docs/metrics-collection.md "어드민 지표 화면이 더 읽는 것"). 순수 함수만 둔다.
 */
type Week = { start: string; end: string };
type PlayRow = { report: string; dim: string; key: string; day: string; metric: string; value: number };

export type LanguageRow = { language: string; installs: number; rating: number | null };

/** Google Play 언어별 설치와 지금까지의 평균 별점. shift 는 PT 날짜를 화면 날짜로 옮긴다. 설치가 많은 순 */
export function playLanguages(rows: PlayRow[], w: Week, shift: (day: string) => string): LanguageRow[] {
  const by = new Map<string, { installs: number; rating: number | null; ratedOn: string }>();
  for (const r of rows) {
    if (r.dim !== "language" || !r.key) continue;
    // 설치 파일은 ko_KR, 평점 파일은 ko 로 온다(2026-11-08). 스토어 페이지가 언어 단위라 앞부분으로 묶는다
    const language = r.key.split(/[_-]/)[0];
    const o = by.get(language) ?? { installs: 0, rating: null, ratedOn: "" };
    const day = shift(r.day);
    if (r.metric === "user_installs" && day >= w.start && day <= w.end) o.installs += r.value;
    // 누적 평균이라 더하지 않고 마지막 날 값을 쓴다
    if (r.metric === "rating_total" && r.day >= o.ratedOn) {
      o.rating = r.value;
      o.ratedOn = r.day;
    }
    by.set(language, o);
  }
  return [...by.entries()]
    .filter(([, o]) => o.installs > 0 || o.rating !== null)
    .map(([language, o]) => ({ language, installs: o.installs, rating: o.rating }))
    .sort((a, b) => b.installs - a.installs || a.language.localeCompare(b.language));
}

export type IosUsage = { sessions: number; crashes: number; until: string | null };
type UsageRow = { report: string; day: string; counts: number | null };

/** iOS 세션과 비정상 종료. 애플에 분석 공유를 허락한 사람만 세고, 5명 미만인 칸은 애플이 주지 않는다 */
export function iosUsage(rows: UsageRow[], w: Week): IosUsage {
  const out: IosUsage = { sessions: 0, crashes: 0, until: null };
  for (const r of rows) {
    if (r.day < w.start || r.day > w.end) continue;
    if (r.report === "sessions") out.sessions += Number(r.counts ?? 0);
    else if (r.report === "crashes") out.crashes += Number(r.counts ?? 0);
    else continue;
    if (!out.until || r.day > out.until) out.until = r.day;
  }
  return out;
}
