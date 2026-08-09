// 토큰 재발급 등 REST 세션 처리. firebase 의존 없음(Relay 네트워크 계층에서 import).
import { getRefreshToken, setTokens, clearTokens } from "./tokens";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const adminAuthUrl = (path: string) => `${API_BASE}${path}`;

// accessToken 만료 시 refreshToken으로 재발급. 성공하면 true.
// 동시 여러 요청이 401이어도 재발급은 한 번만 돌도록 in-flight 프라미스를 공유한다.
let inflight: Promise<boolean> | null = null;

export function reissue(): Promise<boolean> {
  if (inflight) return inflight;
  inflight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(adminAuthUrl("/api/auth/reissue"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const data = (await res.json()) as { tokens: { accessToken: string; refreshToken: string } };
      setTokens(data.tokens);
      return true;
    } catch {
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
