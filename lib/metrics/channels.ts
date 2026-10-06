/**
 * 들어온 경로(GA4 세션 소스, 매체)를 사람이 읽는 채널로 묶는다 (#145, #146).
 *
 * GA4 의 소스는 vercel.com, everytime.kr, m.search.naver.com 처럼 한 줄씩 흩어져 읽기 어렵다.
 * 마케터가 익숙한 묶음(GA4 기본 채널 그룹과 비슷하게, 우리 상황에 맞춰)으로 모은다.
 * 화면(브라우저)과 서버가 같이 쓰므로 아무것도 부르지 않는다.
 */

export type Channel = "인스타그램" | "검색" | "직접 입력과 QR" | "AI 서비스" | "다른 SNS" | "다른 사이트" | "알 수 없음";

/** 화면에 늘어놓는 순서 */
export const CHANNELS: Channel[] = ["인스타그램", "검색", "직접 입력과 QR", "AI 서비스", "다른 SNS", "다른 사이트", "알 수 없음"];

/**
 * 우리 팀이 개발하며 들어온 방문. 방문과 전환율을 부풀리니 모든 합계에서 뺀다.
 * localhost(개발 서버), vercel.com/*.vercel.app(배포 미리보기), github.com(PR 링크), tagassistant(GA 설정 확인).
 * 앞으로는 GA4 관리 > 데이터 스트림 > 내부 트래픽 정의로 막는 게 정석이지만, 이미 쌓인 기록은 여기서 거른다
 */
export function isInternal(source: string): boolean {
  const s = source.toLowerCase();
  return (
    s.startsWith("localhost") ||
    s.startsWith("127.0.0.1") ||
    s === "vercel.com" ||
    s.endsWith(".vercel.app") ||
    s === "github.com" ||
    s === "tagassistant.google.com"
  );
}

/**
 * 인스타에서 온 방문인가.
 * - ig: 인스타가 프로필 링크에 스스로 붙이는 UTM(utm_source=ig, utm_medium=social, link_in_bio)
 * - instagram: 링크트리에 우리가 붙인 UTM, 그리고 l.instagram.com 같은 인스타 앱 안 브라우저
 * - linktr.ee: UTM 없이 링크트리를 거친 방문. 링크트리는 인스타 프로필에만 걸려 있다
 * facebook.com 은 넣지 않는다. 인스타 앱 안 브라우저일 수도 있지만 페이스북 글과 가를 수 없다
 */
export function fromInstagram(source: string): boolean {
  const s = source.toLowerCase();
  return s === "ig" || s.includes("instagram") || s === "linktr.ee";
}

const SEARCH = /(^|\.)(google|naver|daum|bing|yahoo|duckduckgo|ecosia|baidu|yandex)(\.|$)/;
const AI = /(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|claude\.ai|copilot\.microsoft\.com|wrtn\.ai)$/;
const SOCIAL = /(^|\.)(facebook\.com|youtube\.com|youtu\.be|x\.com|t\.co|twitter\.com|threads\.net|tiktok\.com|kakao\.com|band\.us)$/;

/** 내부 방문(isInternal)은 먼저 걸러 낸 뒤에 부른다 */
export function channelOf(source: string, medium: string): Channel {
  const s = source.toLowerCase();
  const m = medium.toLowerCase();
  if (fromInstagram(s)) return "인스타그램";
  if (s === "(direct)") return "직접 입력과 QR";
  if (s === "(not set)" || s === "") return "알 수 없음";
  if (m === "ai-assistant" || AI.test(s)) return "AI 서비스";
  if (m === "organic" || SEARCH.test(s) || s.includes("search.naver")) return "검색";
  if (m === "social" || SOCIAL.test(s)) return "다른 SNS";
  return "다른 사이트";
}
