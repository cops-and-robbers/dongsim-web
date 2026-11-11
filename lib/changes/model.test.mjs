// 변경 기록 비교와 묶기 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { actionOf, diffList, diffValues, fieldCount, filterChanges, groupByDay, kstDay, kstTime } from "./model.ts";

test("diffValues 는 달라진 칸만, labels 순서대로", () => {
  const out = diffValues({ a: "1", b: "x", c: "same" }, { a: "2", b: "x", c: "same" }, { c: "C", a: "A", b: "B" });
  assert.deepEqual(out, [{ kind: "value", label: "A", before: "1", after: "2" }]);
});

test("diffValues 는 빈 문자열을 없음으로 보고, 생김과 없어짐을 null 로 적는다", () => {
  assert.deepEqual(diffValues({ a: "" }, { a: "새 값" }, { a: "A" }), [{ kind: "value", label: "A", before: null, after: "새 값" }]);
  assert.deepEqual(diffValues({ a: "옛 값" }, { a: "" }, { a: "A" }), [{ kind: "value", label: "A", before: "옛 값", after: null }]);
  assert.deepEqual(diffValues({ a: "" }, { a: null }, { a: "A" }), []);
});

test("diffValues 는 전이나 후가 통째로 없으면 추가, 삭제로 본다", () => {
  assert.deepEqual(diffValues(null, { a: "1" }, { a: "A" }), [{ kind: "value", label: "A", before: null, after: "1" }]);
  assert.deepEqual(diffValues({ a: "1" }, null, { a: "A" }), [{ kind: "value", label: "A", before: "1", after: null }]);
});

test("diffValues 는 labels 에 없는 칸을 기록하지 않는다", () => {
  assert.deepEqual(diffValues({ secret: "1" }, { secret: "2" }, {}), []);
});

test("diffList 는 더한 것과 뺀 것을 가른다", () => {
  assert.deepEqual(diffList("카드", ["a", "b", "c"], ["a", "c", "d"]), { kind: "list", label: "카드", added: ["d"], removed: ["b"] });
});

test("diffList 는 순서만 바뀌면 moved, 같으면 null", () => {
  assert.deepEqual(diffList("카드", ["a", "b"], ["b", "a"]), { kind: "list", label: "카드", added: [], removed: [], moved: true });
  assert.equal(diffList("카드", ["a", "b"], ["a", "b"]), null);
});

test("actionOf", () => {
  assert.equal(actionOf(null, { a: 1 }), "add");
  assert.equal(actionOf({ a: 1 }, null), "remove");
  assert.equal(actionOf({ a: 1 }, { a: 2 }), "edit");
});

test("한국 시각으로 날과 시각을 나눈다", () => {
  // UTC 15:30 은 한국 다음 날 00:30
  assert.equal(kstDay("2026-11-10T15:30:00Z"), "2026-11-11");
  assert.equal(kstTime("2026-11-10T15:30:00Z"), "00:30");
});

const c = (id, at, extra = {}) => ({ id, at, actor: "찬빈", area: "event", target: "t", action: "edit", fields: [], ...extra });

test("groupByDay 는 날도 날 안의 기록도 최근 것이 위", () => {
  const out = groupByDay([c("1", "2026-11-09T01:00:00Z"), c("2", "2026-11-10T03:00:00Z"), c("3", "2026-11-10T05:00:00Z")]);
  assert.deepEqual(out.map((g) => [g.day, g.items.map((i) => i.id)]), [["2026-11-10", ["3", "2"]], ["2026-11-09", ["1"]]]);
});

test("filterChanges 는 화면, 사람, 사용자에게 닿는 것으로 거른다", () => {
  const list = [c("1", "2026-11-10T00:00:00Z", { area: "app-config", impact: true }), c("2", "2026-11-10T00:00:00Z", { actor: "다른 분" })];
  assert.deepEqual(filterChanges(list, { area: "app-config" }).map((x) => x.id), ["1"]);
  assert.deepEqual(filterChanges(list, { actor: "다른 분" }).map((x) => x.id), ["2"]);
  assert.deepEqual(filterChanges(list, { impactOnly: true }).map((x) => x.id), ["1"]);
  assert.equal(filterChanges(list, {}).length, 2);
});

test("fieldCount", () => {
  assert.equal(fieldCount({ kind: "value", label: "a", before: "1", after: "2" }), 1);
  assert.equal(fieldCount({ kind: "list", label: "a", added: ["x", "y"], removed: ["z"] }), 3);
  assert.equal(fieldCount({ kind: "list", label: "a", added: [], removed: [], moved: true }), 1);
});

test("diffPics 는 더하고 뺀 그림을 그림째로 돌려준다", async () => {
  const { diffPics } = await import("./model.ts");
  const a = { id: "a", url: "/a.png" };
  const b = { id: "b", url: "/b.png" };
  const n = { id: "n", url: "/n.png", name: "새 그림" };
  assert.deepEqual(diffPics("스크린샷", [a, b], [a, n]), { kind: "images", label: "스크린샷", added: [n], removed: [b] });
  assert.deepEqual(diffPics("스크린샷", [a, b], [b, a]), { kind: "images", label: "스크린샷", added: [], removed: [], moved: true });
  assert.equal(diffPics("스크린샷", [a], [a]), null);
});

test("diffWords 는 바뀐 단어만 지움과 넣음으로 나눈다", async () => {
  const { diffWords } = await import("./model.ts");
  assert.deepEqual(diffWords("친구와 함께 뛰어요", "친구와 같이 뛰어요"), [
    { op: "same", text: "친구와 " },
    { op: "del", text: "함께" },
    { op: "add", text: "같이" },
    { op: "same", text: " 뛰어요" },
  ]);
  assert.deepEqual(diffWords("a b", "a b c"), [{ op: "same", text: "a b" }, { op: "add", text: " c" }]);
});

test("diffWords 는 너무 길면 null", async () => {
  const { diffWords } = await import("./model.ts");
  const long = Array.from({ length: 600 }, (_, i) => `w${i}`).join(" ");
  assert.equal(diffWords(long, `${long} 끝`), null);
});
