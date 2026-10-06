/**
 * 어드민 액세스 토큰이 진짜 어드민 것인지 백엔드에 묻는다 (#109, #145).
 *
 * 서버 라우트가 시크릿이나 서비스 키를 쓰는 일을 대신해 줄 때, 요청한 사람이
 * 어드민인지 이걸로 확인한다. 백엔드 수정 없이 기존 것을 재사용한다 - 어드민 전용
 * GraphQL(adminDashboard)을 그 토큰으로 호출해 보면, 토큰이 유효한지와 어드민인지가
 * 한 번에 검증된다. 일반 유저 토큰이면 백엔드가 거부한다.
 *
 * 서버 전용이다. 브라우저 코드에서 부르지 않는다.
 */
export async function isAdmin(token: string): Promise<boolean> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) return false;

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
    if (!res.ok) return false;
    const data = (await res.json()) as { errors?: unknown[] };
    return !data.errors;
  } catch {
    return false;
  }
}
