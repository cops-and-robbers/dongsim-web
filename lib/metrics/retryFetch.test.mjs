// Supabase 시계 차이 거절 다시 보내기 테스트 (#176). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { retryClockSkew } from "./retryFetch.ts";

const skew = () => new Response(JSON.stringify({ code: "PGRST303", message: "JWT issued at future" }), { status: 401 });
const ok = () => new Response("[]", { status: 200 });

function fake(...responses) {
  const calls = [];
  const fn = async (input, init) => {
    calls.push({ input, init });
    return responses[Math.min(calls.length - 1, responses.length - 1)]();
  };
  return { fn, calls };
}

test("시계 차이로 한 번 거절되면 같은 요청을 다시 보낸다", async () => {
  const { fn, calls } = fake(skew, ok);
  const res = await retryClockSkew(fn, { waitMs: 0 })("https://x/rest/v1/play_daily", { method: "DELETE" });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init.method, "DELETE");
});

test("계속 거절되면 정한 횟수까지만 보내고 마지막 응답을 돌려준다", async () => {
  const { fn, calls } = fake(skew);
  const res = await retryClockSkew(fn, { tries: 3, waitMs: 0 })("https://x", {});
  assert.equal(res.status, 401);
  assert.equal(calls.length, 3);
  assert.match(await res.text(), /issued at future/);
});

test("다른 실패는 다시 보내지 않고 본문도 그대로 읽힌다", async () => {
  const { fn, calls } = fake(() => new Response('{"message":"duplicate key"}', { status: 409 }));
  const res = await retryClockSkew(fn, { waitMs: 0 })("https://x", { method: "POST", body: "[]" });
  assert.equal(res.status, 409);
  assert.equal(calls.length, 1);
  assert.match(await res.text(), /duplicate key/);
});

test("성공하면 한 번만 보낸다", async () => {
  const { fn, calls } = fake(ok);
  await retryClockSkew(fn, { waitMs: 0 })("https://x", {});
  assert.equal(calls.length, 1);
});
