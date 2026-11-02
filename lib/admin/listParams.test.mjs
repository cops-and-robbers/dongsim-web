// 목록 필터와 페이지를 주소에 남기는 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { patchListParams, readListParams } from "./listParams.ts";

const SCHEMA = { status: ["", "WAITING", "IN_PROGRESS"], dir: ["DESC", "ASC"], nickname: "text" };

test("주소가 비어 있으면 기본값으로 읽는다", () => {
  assert.deepEqual(readListParams("", SCHEMA), { status: "", dir: "DESC", nickname: "", page: 0 });
});

test("주소의 값을 읽고, 페이지는 1부터 적힌 것을 0부터로 바꾼다", () => {
  assert.deepEqual(readListParams("status=WAITING&dir=ASC&nickname=%EB%83%A5%ED%8C%8C&page=3", SCHEMA), {
    status: "WAITING",
    dir: "ASC",
    nickname: "냥파",
    page: 2,
  });
});

test("틀린 값은 기본값으로 읽는다", () => {
  const read = (search) => readListParams(search, SCHEMA);
  assert.equal(read("status=FINISHED").status, "");
  for (const page of ["0", "-1", "abc", "1.5", "99999999999"]) {
    assert.equal(read(`page=${page}`).page, 0, page);
  }
});

test("기본값은 주소에서 지운다", () => {
  assert.equal(patchListParams("status=WAITING&dir=ASC", SCHEMA, { status: "", dir: "DESC" }), "");
  assert.equal(patchListParams("page=3", SCHEMA, { page: 0 }), "");
});

test("페이지만 바꾸면 필터는 그대로 둔다", () => {
  assert.equal(patchListParams("status=WAITING", SCHEMA, { page: 1 }), "status=WAITING&page=2");
});

test("필터가 바뀌면 첫 페이지로 돌아간다", () => {
  assert.equal(patchListParams("status=WAITING&page=4", SCHEMA, { status: "IN_PROGRESS" }), "status=IN_PROGRESS");
  assert.equal(patchListParams("page=4", SCHEMA, { nickname: "냥파" }), `nickname=${encodeURIComponent("냥파")}`);
});

test("같은 값을 다시 고르면 보던 페이지를 지킨다", () => {
  assert.equal(patchListParams("status=WAITING&page=4", SCHEMA, { status: "WAITING" }), "status=WAITING&page=4");
  assert.equal(patchListParams("nickname=abc&page=4", SCHEMA, { nickname: "abc" }), "nickname=abc&page=4");
});

test("이 화면이 모르는 값은 건드리지 않는다", () => {
  assert.equal(patchListParams("utm=x&page=2", SCHEMA, { page: 2 }), "utm=x&page=3");
});
