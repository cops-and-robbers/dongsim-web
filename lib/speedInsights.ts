// Vercel Speed Insights(실사용자 속도 측정)에 보낼 측정을 고른다(#339).
// 무료 플랜은 30일 10,000건이 한도인데, 절반 가까이가 운영진이 켜 두는 어드민 화면이었다.
// 어드민은 방문자가 겪는 속도와 상관없어서 보내지 않는다. 측정 비율(sampleRate)을 낮추면
// 방문자 데이터까지 줄어 방문이 적은 페이지는 판단하기 어려워지므로 비율은 건드리지 않는다.

type Measured = { url: string };

/** 어드민 화면 주소인가. admin 서브도메인(루트도 관리자 화면으로 바뀐다)이거나 /admin 아래 */
export function isAdminUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.hostname.startsWith("admin.")) return true;
  return parsed.pathname === "/admin" || parsed.pathname.startsWith("/admin/");
}

/** SpeedInsights 의 beforeSend. null 을 돌려주면 보내지 않는다 */
export function skipAdmin<T extends Measured>(event: T): T | null {
  return isAdminUrl(event.url) ? null : event;
}
