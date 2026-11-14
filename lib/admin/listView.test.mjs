// 목록 보기 고르기 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveListView, parseListView } from "./listView.ts";

test("저장된 값은 두 가지만 받고 나머지는 모른다고 본다", () => {
  assert.equal(parseListView("split"), "split");
  assert.equal(parseListView("table"), "table");
  assert.equal(parseListView("grid"), null);
  assert.equal(parseListView(null), null);
  assert.equal(parseListView(undefined), null);
});

test("좁은 화면은 고른 값과 상관없이 두 칸으로 본다", () => {
  assert.equal(effectiveListView("table", true), "table");
  assert.equal(effectiveListView("table", false), "split");
  assert.equal(effectiveListView("split", true), "split");
});
