/**
 * 어드민 액세스 토큰이 진짜 어드민 것인지 백엔드에 묻는다 (#109, #145).
 *
 * 서버 라우트가 시크릿이나 서비스 키를 쓰는 일을 대신해 줄 때, 요청한 사람이
 * 어드민인지 이걸로 확인한다. 백엔드 수정 없이 기존 것을 재사용한다 - 어드민 전용
 * GraphQL(adminDashboard)을 그 토큰으로 호출해 보면, 토큰이 유효한지와 어드민인지가
 * 한 번에 검증된다. 일반 유저 토큰이면 백엔드가 거부한다.
 *
 * 결과는 셋이다. 토큰이 만료됐을 때(백엔드 401)를 "어드민 아님"과 섞으면, 화면은 403 을 받고
 * 재발급을 시도하지 않아 다시 로그인할 때까지 막힌다. 만료는 "expired" 로 돌려 라우트가 401 을 주게 한다.
 * 화면은 401 이면 한 번 재발급하고 다시 묻는다(lib/relay/environment.ts 와 같은 방식).
 *
 * 서버 전용이다. 브라우저 코드에서 부르지 않는다.
 */
export type AdminCheck = "ok" | "expired" | "denied";

export async function checkAdmin(token: string): Promise<AdminCheck> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) return "denied";

  try {
    const res = await fetch(`${apiBase}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: "query AdminPing { adminDashboard { totalUserCount } }",
        operationName: "AdminPing",
      }),
      cache: "no-store",
    });
    if (res.status === 401) return "expired";
    if (!res.ok) return "denied";
    const data = (await res.json()) as { errors?: unknown[] };
    return data.errors ? "denied" : "ok";
  } catch {
    return "denied";
  }
}
