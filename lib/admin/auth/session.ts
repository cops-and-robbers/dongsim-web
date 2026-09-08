// 토큰 재발급 등 REST 세션 처리. firebase 의존 없음(Relay 네트워크 계층에서 import).
import { getRefreshToken, setTokens, clearTokens } from "./tokens";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const adminAuthUrl = (path: string) => `${API_BASE}${path}`;

/**
 * 세션이 서버에게 거부당해 죽었을 때 쏘는 신호 (#109 UX).
 *
 * 재발급 실패는 화면 어디서든 일어날 수 있는데(부팅 검증, 릴레이의 401 재시도),
 * 처리는 한 곳(AuthProvider)이어야 한다 - 이 이벤트를 듣고 로그인 화면으로 보낸다.
 * 수동 로그아웃은 이 길을 지나지 않으므로 "세션 만료" 문구와 섞이지 않는다.
 */
export const SESSION_EXPIRED_EVENT = "cnr-admin-session-expired";

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
      // 서버 장애(5xx)는 세션 판정이 아니다 - 네트워크 오류처럼 그냥 실패로 두고,
      // 토큰은 보존한다. 백엔드가 잠깐 죽었다고 로그인까지 풀리면 억울하다.
      if (res.status >= 500) return false;
      if (!res.ok) {
        // 서버가 리프레시를 거부했다(4xx) - 세션이 죽었다. 네트워크 오류(catch)와
        // 구분되는 지점이라 여기서만 만료를 알린다. 오프라인이라고 쫓아내면 안 된다.
        clearTokens();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
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
