/**
 * 구글 URL 검사 결과를 화면의 상태로 바꾼다 (#309).
 *
 * 같은 "색인 안 됨"이라도 할 일이 달라 나눈다.
 * - error: 우리가 고칠 일(404, 5xx, 리디렉션 오류, 차단)
 * - crawled: 구글이 읽고도 안 올린 것. 오류가 아니라 판단이다
 * - discovered, unknown: 아직 안 읽었거나 모르는 것. 대개 기다리면 된다
 * - excluded: 일부러 뺐거나(noindex) 다른 주소로 대신하는 것
 * - indexed: 검색에 나올 수 있다
 *
 * 이름은 서치 콘솔 한국어 표기를 따른다(docs/admin-ui.md "지표 화면"). 뜻은 상세에서 한 줄로 푼다.
 * coverageState 는 API 의 기본 언어(en-US) 문장으로 온다. 문장이 조금 바뀌어도 읽히게 앞부분으로 맞춘다.
 */

export type Kind = "error" | "crawled" | "discovered" | "unknown" | "excluded" | "indexed";

/** 화면에서 위에 둘 순서. 손댈 일부터 */
export const KIND_ORDER: Kind[] = ["error", "crawled", "discovered", "unknown", "excluded", "indexed"];

export type Inspection = {
  verdict: string;
  coverageState: string;
  indexingState: string;
  pageFetchState: string;
  robotsTxtState: string;
};

export type Status = { kind: Kind; label: string; meaning: string };

const FETCH_ERRORS: Record<string, string> = {
  NOT_FOUND: "찾을 수 없음(404)",
  SOFT_404: "소프트 404",
  SERVER_ERROR: "서버 오류(5xx)",
  REDIRECT_ERROR: "리디렉션 오류",
  ACCESS_DENIED: "승인되지 않은 요청(401)",
  ACCESS_FORBIDDEN: "액세스 금지(403)",
  BLOCKED_4XX: "기타 4xx 문제",
  BLOCKED_ROBOTS_TXT: "robots.txt에 의해 차단됨",
  INVALID_URL: "잘못된 주소",
};

const ERROR_MEANING = "구글이 이 주소를 제대로 받지 못했어요. 우리가 고쳐야 검색에 나올 수 있어요.";

const RULES: { test: RegExp; status: Status }[] = [
  { test: /^(submitted and indexed|indexed, not submitted)/i, status: { kind: "indexed", label: "색인됨", meaning: "구글 검색에 나올 수 있어요." } },
  { test: /^indexed, though blocked/i, status: { kind: "indexed", label: "색인됨, robots.txt 차단", meaning: "검색에는 나오지만 구글이 내용을 읽지 못해 설명이 비어 보일 수 있어요." } },
  { test: /^page indexed without content/i, status: { kind: "indexed", label: "콘텐츠 없이 색인됨", meaning: "검색에는 올랐지만 구글이 본문을 읽지 못했어요." } },
  { test: /^crawled/i, status: { kind: "crawled", label: "크롤링됨, 색인 안 됨", meaning: "구글이 읽었지만 아직 색인하지 않았어요. 대개 오류는 아니에요. 오래 이어지면 내용과 연결된 링크를 점검해요." } },
  { test: /^discovered/i, status: { kind: "discovered", label: "발견됨, 색인 안 됨", meaning: "구글이 주소는 알지만 아직 읽지 않았어요. 보통은 기다리면 되고, 오래 머물면 점검해요." } },
  { test: /unknown to google/i, status: { kind: "unknown", label: "구글에 알려지지 않음", meaning: "구글이 아직 이 주소를 몰라요. 사이트맵과 링크로 알려요." } },
  { test: /noindex/i, status: { kind: "excluded", label: "noindex로 제외됨", meaning: "검색 제외(noindex) 설정이 있는 주소예요." } },
  { test: /^page with redirect/i, status: { kind: "excluded", label: "리디렉션이 포함된 페이지", meaning: "다른 주소로 연결돼요. 연결된 주소의 색인 상태를 확인해요." } },
  { test: /^alternate page/i, status: { kind: "excluded", label: "적절한 표준 태그가 있는 대체 페이지", meaning: "대표 주소가 따로 있어요. 그 주소의 색인 상태를 확인해요." } },
  { test: /^duplicate/i, status: { kind: "excluded", label: "중복 페이지", meaning: "구글이 중복으로 본 주소예요. 아래 대표 주소를 확인해요." } },
];

/** URL 검사 결과 하나를 상태로. 가져오기 실패가 먼저다(사유 문장보다 확실하다) */
export function statusOf(r: Inspection): Status {
  const fetchError = FETCH_ERRORS[r.pageFetchState];
  if (fetchError) return { kind: "error", label: fetchError, meaning: ERROR_MEANING };
  if (r.robotsTxtState === "DISALLOWED") return { kind: "error", label: FETCH_ERRORS.BLOCKED_ROBOTS_TXT, meaning: ERROR_MEANING };
  const state = r.coverageState.trim();
  if (/^(not found|soft 404|server error|redirect error|blocked)/i.test(state)) {
    return { kind: "error", label: matchErrorLabel(state), meaning: ERROR_MEANING };
  }
  for (const rule of RULES) if (rule.test.test(state)) return rule.status;
  if (r.verdict === "PASS") return { kind: "indexed", label: "색인됨", meaning: "구글 검색에 나올 수 있어요." };
  if (r.verdict === "FAIL") return { kind: "error", label: state || "오류", meaning: ERROR_MEANING };
  return { kind: "unknown", label: state || "알 수 없음", meaning: "구글이 알려 준 상태를 아직 읽지 못했어요. 서치 콘솔에서 확인해요." };
}

function matchErrorLabel(state: string): string {
  if (/^not found/i.test(state)) return FETCH_ERRORS.NOT_FOUND;
  if (/^soft 404/i.test(state)) return FETCH_ERRORS.SOFT_404;
  if (/^server error/i.test(state)) return FETCH_ERRORS.SERVER_ERROR;
  if (/^redirect error/i.test(state)) return FETCH_ERRORS.REDIRECT_ERROR;
  if (/robots/i.test(state)) return FETCH_ERRORS.BLOCKED_ROBOTS_TXT;
  if (/401/.test(state)) return FETCH_ERRORS.ACCESS_DENIED;
  if (/403/.test(state)) return FETCH_ERRORS.ACCESS_FORBIDDEN;
  return FETCH_ERRORS.BLOCKED_4XX;
}

export type Locale = "ko" | "en" | "ja";

/** 주소의 언어. 경로 앞부분으로 나눈다 */
export function localeOf(url: string): Locale {
  const path = pathOf(url);
  if (path === "/en" || path.startsWith("/en/")) return "en";
  if (path === "/ja" || path.startsWith("/ja/")) return "ja";
  return "ko";
}

/** 화면에 보일 경로. 도메인을 떼고, 맨 끝 / 는 홈만 남긴다 */
export function pathOf(url: string): string {
  try {
    const p = new URL(url).pathname;
    return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  } catch {
    return url;
  }
}

/** 새로 생긴 주소가 어디서 왔나 */
export function originOf(url: string): "blog" | "meetup" | "page" {
  const path = pathOf(url).replace(/^\/(en|ja)(?=\/|$)/, "");
  if (path.startsWith("/blog/")) return "blog";
  if (path.startsWith("/g/")) return "meetup";
  return "page";
}
