// 최근 본 게임, 유저 기록 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { addRecent, formatAgo, parseRecent, recentHref } from "./recentViewed.ts";

const item = (kind, id, at = 1) => ({ kind, id, title: `t${id}`, detail: "d", at });

test("새로 본 것이 맨 앞에 온다", () => {
  const list = addRecent([item("user", "1")], item("game", "2"));
  assert.deepEqual(list.map((r) => r.id), ["2", "1"]);
});

test("다시 본 것은 앞으로 옮기고 시각과 이름을 새로 쓴다", () => {
  const list = addRecent(
    [item("user", "1"), item("user", "2")],
    { ...item("user", "2", 9), title: "바뀐 닉네임" }
  );
  assert.deepEqual(list.map((r) => r.id), ["2", "1"]);
  assert.equal(list[0].at, 9);
  assert.equal(list[0].title, "바뀐 닉네임");
});

test("번호가 같아도 종류가 다르면 다른 항목이다", () => {
  const list = addRecent([item("game", "7")], item("history", "7"));
  assert.equal(list.length, 2);
});

test("묶음마다 300개까지만 두고, 다른 묶음은 건드리지 않는다", () => {
  let list = [item("user", "u1")];
  for (let i = 0; i < 302; i++) list = addRecent(list, item(i % 2 ? "game" : "history", String(i)));
  assert.equal(list.filter((r) => r.kind !== "user").length, 300);
  assert.ok(list.some((r) => r.id === "u1"));
  assert.ok(!list.some((r) => r.id === "0"));
});

test("고장 난 저장값은 빈 목록이거나 온전한 항목만 남긴다", () => {
  assert.deepEqual(parseRecent(null), []);
  assert.deepEqual(parseRecent("{나쁜 값"), []);
  assert.deepEqual(parseRecent('{"a":1}'), []);
  assert.deepEqual(parseRecent(JSON.stringify([item("user", "1"), { kind: "x" }, null])), [item("user", "1")]);
});

test("종류와 번호로 주소를 만든다", () => {
  assert.equal(recentHref(item("game", "3")), "/admin/games/3");
  assert.equal(recentHref(item("history", "3")), "/admin/games/history/3");
  assert.equal(recentHref(item("user", "3")), "/admin/users/3");
  assert.equal(recentHref(item("user", "../x")), "/admin/users/..%2Fx");
});

test("언제 봤는지 읽기 쉽게 적는다", () => {
  const MIN = 60_000;
  assert.equal(formatAgo(0, 30_000), "방금");
  assert.equal(formatAgo(0, 3 * MIN), "3분 전");
  assert.equal(formatAgo(0, 59 * MIN), "59분 전");
  assert.equal(formatAgo(0, 60 * MIN), "1시간 전");
  assert.equal(formatAgo(0, 24 * 60 * MIN), "1일 전");
});
