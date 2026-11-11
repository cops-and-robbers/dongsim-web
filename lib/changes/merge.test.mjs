// 변경 기록 합치기 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeFields } from "./merge.ts";

test("mergeFields 는 처음 전 값과 이번 후 값을 잇는다", () => {
  const out = mergeFields([{ kind: "value", label: "이름", before: "가", after: "가나" }], [{ kind: "value", label: "이름", before: "가나", after: "가나다" }]);
  assert.deepEqual(out, [{ kind: "value", label: "이름", before: "가", after: "가나다" }]);
});

test("mergeFields 는 결국 같아진 칸을 뺀다", () => {
  const out = mergeFields([{ kind: "value", label: "이름", before: "가", after: "나" }], [{ kind: "value", label: "이름", before: "나", after: "가" }]);
  assert.deepEqual(out, []);
});

test("mergeFields 는 다른 칸을 더하고, 목록은 이번 것을 쓴다", () => {
  const prev = [{ kind: "value", label: "이름", before: "가", after: "나" }, { kind: "list", label: "카드", added: ["x"], removed: [] }];
  const next = [{ kind: "value", label: "설명", before: null, after: "새" }, { kind: "list", label: "카드", added: ["y"], removed: [] }];
  assert.deepEqual(mergeFields(prev, next), [prev[0], next[1], next[0]]);
});
