// 글 아래 다른 글 고르기 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { relatedPosts } from "./related.ts";

const posts = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
const ids = (list) => list.map((p) => p.id);

test("이 글 다음 차례 두 글을 고른다", () => {
  assert.deepEqual(ids(relatedPosts(posts, "b")), ["c", "d"]);
});

test("끝에 닿으면 처음으로 돈다", () => {
  assert.deepEqual(ids(relatedPosts(posts, "e")), ["a", "b"]);
  assert.deepEqual(ids(relatedPosts(posts, "d")), ["e", "a"]);
});

test("모든 글이 다른 글 두 개에서 링크를 받는다", () => {
  const inbound = Object.fromEntries(posts.map((p) => [p.id, 0]));
  for (const p of posts) for (const r of relatedPosts(posts, p.id)) inbound[r.id] += 1;
  assert.deepEqual(Object.values(inbound), [2, 2, 2, 2, 2]);
});

test("글이 적으면 자기 글만 빼고 있는 만큼 준다", () => {
  assert.deepEqual(ids(relatedPosts([{ id: "a" }], "a")), []);
  assert.deepEqual(ids(relatedPosts([{ id: "a" }, { id: "b" }], "a")), ["b"]);
  assert.deepEqual(ids(relatedPosts([{ id: "a" }, { id: "b" }, { id: "c" }], "a")), ["b", "c"]);
});

test("목록에 없는 글이면 최신 글부터 준다", () => {
  assert.deepEqual(ids(relatedPosts(posts, "z")), ["a", "b"]);
});
