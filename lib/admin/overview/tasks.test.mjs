// 지금 할 일 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { daysBetween, splitTasks, tasksOf } from "./tasks.ts";

const TODAY = "2026-11-10";
const event = (day, done, total, builtinFrame = false) => ({ kind: "event", label: "학교 축제", day, done, total, next: "시험 인쇄를 해 주세요", frames: builtinFrame ? 0 : 2, builtinFrame });

test("처리 대기 건수가 있을 때만 띄운다", () => {
  assert.deepEqual(tasksOf({}, { reports: 0, bugs: 0, reviews: 0 }, TODAY), []);
  assert.deepEqual(tasksOf({}, null, TODAY), []);
  const ids = tasksOf({}, { reports: 2, bugs: 1, reviews: 3 }, TODAY).map((t) => t.id);
  assert.deepEqual(ids, ["rep", "bug", "rv"]);
});

test("급한 일부터 둔다", () => {
  const tasks = tasksOf({ draft: { kind: "count", count: 2, detail: null }, chk: { kind: "due", title: "판매자 신고", due: "2026-11-12", daysLeft: 2, open: 1 } }, { reports: 0, bugs: 1, reviews: 0 }, TODAY);
  assert.deepEqual(tasks.map((t) => [t.id, t.tone]), [["chk", "urgent"], ["bug", "soon"], ["draft", "info"]]);
});

test("점검 기한은 30일 안이거나 지났을 때만", () => {
  const due = (daysLeft) => tasksOf({ chk: { kind: "due", title: "판매자 신고", due: "x", daysLeft, open: 1 } }, null, TODAY);
  assert.equal(due(31).length, 0);
  assert.equal(due(30)[0].tone, "soon");
  assert.match(due(-3)[0].detail, /3일 지났어요/);
  assert.equal(due(-3)[0].tone, "urgent");
});

test("행사는 14일 안에 남은 준비와 기본 프레임만", () => {
  assert.equal(tasksOf({ ev: event("2026-11-30", 2, 6) }, null, TODAY).length, 0);
  assert.equal(tasksOf({ ev: event("2026-11-20", 6, 6) }, null, TODAY).length, 0);
  const t = tasksOf({ ev: event("2026-11-12", 4, 6, true) }, null, TODAY);
  assert.deepEqual(t.map((x) => [x.id, x.tone]), [["ev", "urgent"], ["frame", "urgent"]]);
  assert.match(t[0].title, /2개 남았어요/);
  assert.match(t[0].detail, /2일 뒤/);
  assert.equal(tasksOf({ ev: event("2026-11-09", 1, 6) }, null, TODAY).length, 0);
});

test("출시는 우리 차례이거나 막혔을 때만", () => {
  const stage = (next) => tasksOf({ rel: { kind: "stage", tracks: [], next } }, null, TODAY);
  assert.equal(stage(null).length, 0);
  assert.equal(stage({ title: "심사에 내 주세요", reason: "빌드가 붙었어요", tone: "turn" })[0].tone, "soon");
  assert.equal(stage({ title: "거절됐어요", tone: "bad" })[0].tone, "urgent");
});

test("내 역할 카드와 이어진 일을 위로 나눈다", () => {
  const tasks = tasksOf({ draft: { kind: "count", count: 1, detail: null } }, { reports: 1, bugs: 1, reviews: 0 }, TODAY);
  const s = splitTasks(tasks, { cards: ["bug", "draft"], roles: ["r_custom"] });
  assert.deepEqual(s.mine.map((t) => t.id), ["bug", "draft"]);
  assert.deepEqual(s.others.map((t) => t.id), ["rep"]);
  assert.equal(splitTasks(tasks, null).others.length, 0);
});

test("카드가 없어도 그 일을 챙기는 역할이면 내 일이다", () => {
  const tasks = tasksOf({}, { reports: 0, bugs: 0, reviews: 2 }, TODAY);
  assert.deepEqual(splitTasks(tasks, { cards: [], roles: ["mkt"] }).mine.map((t) => t.id), ["rv"]);
  assert.deepEqual(splitTasks(tasks, { cards: [], roles: ["dev"] }).others.map((t) => t.id), ["rv"]);
});

test("날짜 차이", () => {
  assert.equal(daysBetween("2026-11-10", "2026-11-12"), 2);
  assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
});
