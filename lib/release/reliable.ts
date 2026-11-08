/**
 * 출시 보드를 읽다 생긴 일시적 실패를 다루는 규칙 (docs/admin-ui.md "출시").
 * 한 번 실패한 결과가 1분 동안 저장되면, 스토어가 금방 돌아와도 페이지를 다시 열 때마다 같은 실패를 보게 된다.
 */

/** 다시 읽으면 나을 수 있는 실패. 키나 권한 문제(401, 403), 호출 한도(429)는 다시 불러도 그대로라 빼고 */
export function isTransient(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "TimeoutError" || e.name === "AbortError" || e instanceof TypeError) return true;
  const status = (e as { status?: unknown }).status;
  return typeof status === "number" && status >= 500;
}

/**
 * 일시적으로 실패하면 한 번 더 읽는다. 첫 시도가 이미 오래 걸렸으면 다시 읽지 않는다.
 * 요청 시간 한도(30초)를 넘으면 잘 읽은 다른 스토어까지 함께 못 보여 주기 때문이다
 */
export async function retryOnce<T>(read: () => Promise<T>, { waitMs = 500, withinMs = 10_000 } = {}): Promise<T> {
  const started = Date.now();
  try {
    return await read();
  } catch (e) {
    if (!isTransient(e) || Date.now() - started >= withinMs) throw e;
    await new Promise((r) => setTimeout(r, waitMs));
    return read();
  }
}

/** 캐시 함수 안에서 던져 결과를 저장하지 않게 한다. 값은 부른 쪽에서 그대로 쓴다 */
export class NotCached<T> extends Error {
  readonly value: T;
  constructor(value: T) {
    super("저장하지 않는 결과");
    this.value = value;
  }
}

/** cached 가 NotCached 를 던지면 그 값을 돌려준다 */
export async function unwrapNotCached<T>(cached: () => Promise<T>): Promise<T> {
  try {
    return await cached();
  } catch (e) {
    if (e instanceof NotCached) return e.value as T;
    throw e;
  }
}
