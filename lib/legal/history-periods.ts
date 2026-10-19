// 약관·처리방침 이전 버전의 적용 기간 계산(#174).
//
// 보관본은 시행일(YYYY-MM-DD)로만 구분한다. 한 버전은 자기 시행일부터 다음 버전
// 시행일 전날까지 적용된다. 마지막 보관본은 현재 문서 시행일 전날까지다.
// 현재 문서와 시행일이 같거나 늦은 보관본은 이전 버전이 아니다. 개정판을 미리
// 보관해 둬도, 그 판이 현재 문서가 되기 전까지는 목록에 나오지 않는다.
//
// node 테스트에서 바로 읽도록 경로 별칭(@/)을 쓰지 않는다.

export type HistoryLocale = "ko" | "ja" | "en";

export type PastVersion = {
  /** 시행일, YYYY-MM-DD. 보관본 파일 이름이자 주소 조각 */
  date: string;
  /** 적용 마지막 날, YYYY-MM-DD */
  until: string;
};

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** 문서의 시행일 글자("2026년 9월 8일", "2026年9月8日", "September 8, 2026")를 YYYY-MM-DD 로 */
export function isoFromEffectiveDate(text: string): string {
  const ko = /^(\d{4})년 (\d{1,2})월 (\d{1,2})일$/.exec(text.trim());
  if (ko) return toIso(Number(ko[1]), Number(ko[2]), Number(ko[3]));
  const ja = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(text.trim());
  if (ja) return toIso(Number(ja[1]), Number(ja[2]), Number(ja[3]));
  const en = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(text.trim());
  if (en) {
    const month = EN_MONTHS.indexOf(en[1]) + 1;
    if (month > 0) return toIso(Number(en[3]), month, Number(en[2]));
  }
  throw new Error(`시행일 형식을 읽지 못했어요: ${text}`);
}

function dayBefore(iso: string): string {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`날짜 형식이 아니에요: ${iso}`);
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - 86_400_000;
  const d = new Date(t);
  return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** 보관본 시행일들과 현재 시행일로 이전 버전 목록을 만든다. 최신이 먼저 */
export function pastVersions(dates: string[], current: string): PastVersion[] {
  const past = [...new Set(dates)]
    .filter((d) => ISO.test(d) && d < current)
    .sort();
  return past
    .map((date, i) => ({ date, until: dayBefore(past[i + 1] ?? current) }))
    .reverse();
}

/** YYYY-MM-DD 를 그 언어의 문서 표기로 */
export function formatIsoDate(iso: string, locale: HistoryLocale): string {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`날짜 형식이 아니에요: ${iso}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (locale === "ja") return `${y}年${mo}月${d}日`;
  if (locale === "en") return `${EN_MONTHS[mo - 1]} ${d}, ${y}`;
  return `${y}년 ${mo}월 ${d}일`;
}
