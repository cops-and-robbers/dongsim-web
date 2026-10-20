/**
 * Supabase 가 가끔 서버 사이 시계 차이로 "JWT issued at future" 를 내며 요청을 한 번 거절한다
 * (2026-10-06, 10-17 실측). 바로 다시 보내면 된다. 거절된 요청은 실행되지 않았으니 지우기,
 * 넣기도 그대로 다시 보내도 안전하다. 다른 실패는 건드리지 않고 그대로 돌려준다 (#176).
 */

const CLOCK_SKEW = /issued at future/i;

export function retryClockSkew(
  base: typeof fetch = fetch,
  { tries = 3, waitMs = 800 }: { tries?: number; waitMs?: number } = {},
): typeof fetch {
  return async (input, init) => {
    for (let i = 1; ; i++) {
      const res = await base(input, init);
      if (res.ok || i >= tries) return res;
      // 본문은 한 번만 읽힌다. 거절이 아니면 원래 응답을 그대로 넘기려고 복사본을 읽는다
      const body = await res.clone().text().catch(() => "");
      if (!CLOCK_SKEW.test(body)) return res;
      await new Promise((r) => setTimeout(r, waitMs * i));
    }
  };
}
