// 블로그 목록 색인 여부 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { blogListIndexing } from "./listIndex.ts";

const SITE = "https://copsandrobbers.app";

test("글이 없는 언어의 목록은 색인하지 않고 hreflang 에서도 뺀다", () => {
  const withPosts = new Set(["ko", "ja"]);
  const en = blogListIndexing(SITE, "en", withPosts);
  assert.equal(en.index, false);
  const ko = blogListIndexing(SITE, "ko", withPosts);
  assert.equal(ko.index, true);
  assert.deepEqual(ko.languages, {
    ko: `${SITE}/blog`,
    ja: `${SITE}/ja/blog`,
    "x-default": `${SITE}/blog`,
  });
});

test("글 목록을 못 읽으면 예전처럼 세 언어 모두 색인한다", () => {
  const r = blogListIndexing(SITE, "en", null);
  assert.equal(r.index, true);
  assert.deepEqual(Object.keys(r.languages), ["ko", "en", "ja", "x-default"]);
});
