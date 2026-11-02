// 끌어 그린 궤적 단순화 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { simplifyPath } from "./simplifyPath.ts";

const p = (x, y) => ({ x, y });

test("두 점 이하는 그대로 돌려준다", () => {
  assert.deepEqual(simplifyPath([p(0, 0), p(1, 1)], 6, 40), [p(0, 0), p(1, 1)]);
  assert.deepEqual(simplifyPath([], 6, 40), []);
});

test("거의 직선인 점은 버리고 양 끝을 남긴다", () => {
  const line = [p(0, 0), p(10, 1), p(20, -1), p(30, 0)];
  assert.deepEqual(simplifyPath(line, 6, 40), [p(0, 0), p(30, 0)]);
});

test("꺾이는 점은 남고 그린 순서는 바뀌지 않는다", () => {
  const corner = [p(0, 0), p(50, 2), p(100, 0), p(102, 50), p(100, 100)];
  assert.deepEqual(simplifyPath(corner, 6, 40), [p(0, 0), p(100, 0), p(100, 100)]);
});

test("꼭짓점이 많으면 균등하게 솎아 상한을 지킨다", () => {
  const zigzag = Array.from({ length: 100 }, (_, i) => p(i * 10, i % 2 ? 50 : 0));
  const out = simplifyPath(zigzag, 6, 40);
  assert.equal(out.length, 40);
  assert.deepEqual(out[0], zigzag[0]);
  assert.deepEqual(out[39], zigzag[99]);
});
