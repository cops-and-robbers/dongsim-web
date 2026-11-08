import assert from "node:assert/strict";
import { test } from "node:test";
import { isTransient, NotCached, retryOnce, unwrapNotCached } from "./reliable.ts";

const withStatus = (status) => Object.assign(new Error("실패"), { status });
const named = (name) => Object.assign(new Error("실패"), { name });
const fast = { waitMs: 0 };

test("서버 오류, 시간 초과, 네트워크 실패만 일시적이다", () => {
  assert.equal(isTransient(withStatus(500)), true);
  assert.equal(isTransient(withStatus(503)), true);
  assert.equal(isTransient(named("TimeoutError")), true);
  assert.equal(isTransient(new TypeError("fetch failed")), true);
  for (const status of [401, 403, 404, 429]) assert.equal(isTransient(withStatus(status)), false, String(status));
  assert.equal(isTransient(new Error("키 없음")), false);
  assert.equal(isTransient("문자열"), false);
});

test("일시적 실패는 한 번 더 읽어 성공한 값을 돌려준다", async () => {
  let calls = 0;
  const value = await retryOnce(async () => {
    calls += 1;
    if (calls === 1) throw withStatus(503);
    return "읽음";
  }, fast);
  assert.equal(value, "읽음");
  assert.equal(calls, 2);
});

test("두 번째도 실패하면 그 실패를 던지고 더 부르지 않는다", async () => {
  let calls = 0;
  await assert.rejects(
    retryOnce(async () => {
      calls += 1;
      throw withStatus(500);
    }, fast),
    { status: 500 },
  );
  assert.equal(calls, 2);
});

test("키나 권한 문제와 호출 한도는 다시 읽지 않는다", async () => {
  for (const status of [401, 403, 429]) {
    let calls = 0;
    await assert.rejects(
      retryOnce(async () => {
        calls += 1;
        throw withStatus(status);
      }, fast),
      { status },
    );
    assert.equal(calls, 1, String(status));
  }
});

test("첫 시도가 이미 오래 걸렸으면 다시 읽지 않는다", async () => {
  let calls = 0;
  await assert.rejects(
    retryOnce(
      async () => {
        calls += 1;
        throw named("TimeoutError");
      },
      { waitMs: 0, withinMs: 0 },
    ),
    { name: "TimeoutError" },
  );
  assert.equal(calls, 1);
});

test("NotCached 는 값을 돌려주고 다른 오류는 그대로 던진다", async () => {
  const board = { ios: { ok: false } };
  assert.equal(
    await unwrapNotCached(async () => {
      throw new NotCached(board);
    }),
    board,
  );
  assert.equal(await unwrapNotCached(async () => "정상"), "정상");
  await assert.rejects(
    unwrapNotCached(async () => {
      throw new Error("다른 오류");
    }),
    /다른 오류/,
  );
});
