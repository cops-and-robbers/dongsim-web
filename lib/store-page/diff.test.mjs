import assert from "node:assert/strict";
import { test } from "node:test";
import { diffText, shorten } from "./diff.ts";

const show = (parts) => parts.map((p) => `${p.kind === "same" ? "" : p.kind === "add" ? "+" : "-"}${p.text}`);

test("바뀐 낱말만 잡는다", () => {
  assert.deepEqual(show(diffText("친구들과 밖에서 노는 게임", "친구들과 동네에서 노는 게임")), ["친구들과 ", "-밖에서", "+동네에서", " 노는 게임"]);
});

test("뒤에 덧붙이거나 지운 글, 빈 글", () => {
  assert.deepEqual(show(diffText("경도", "경도 무료")), ["경도", "+ 무료"]);
  assert.deepEqual(show(diffText("경도 무료", "경도")), ["경도", "- 무료"]);
  assert.deepEqual(show(diffText("", "새 글")), ["+새 글"]);
  assert.deepEqual(show(diffText("옛 글", "")), ["-옛 글"]);
});

test("줄바꿈이 바뀐 것도 잡고, 합치면 원래 글이 된다", () => {
  const before = "첫 줄\n둘째 줄\n셋째 줄";
  const after = "첫 줄\n\n둘째 줄 고침\n셋째 줄";
  const parts = diffText(before, after);
  assert.equal(parts.filter((p) => p.kind !== "add").map((p) => p.text).join(""), before);
  assert.equal(parts.filter((p) => p.kind !== "del").map((p) => p.text).join(""), after);
});

test("아주 긴 글도 합치면 원래 글이 된다", () => {
  const before = Array.from({ length: 4000 }, (_, i) => `a${i}`).join(" ");
  const after = Array.from({ length: 4000 }, (_, i) => `b${i}`).join(" ");
  const parts = diffText(before, after);
  assert.equal(parts.filter((p) => p.kind !== "add").map((p) => p.text).join(""), before);
  assert.equal(parts.filter((p) => p.kind !== "del").map((p) => p.text).join(""), after);
});

test("바뀌지 않은 긴 글만 줄인다", () => {
  const long = "가".repeat(100);
  const out = shorten([{ kind: "same", text: long }, { kind: "add", text: long }, { kind: "same", text: long }, { kind: "del", text: "나" }, { kind: "same", text: long }]);
  assert.equal(out[0].text, `...${"가".repeat(30)}`);
  assert.equal(out[1].text, long);
  assert.equal(out[2].text, `${"가".repeat(30)}...${"가".repeat(30)}`);
  assert.equal(out[4].text, `${"가".repeat(30)}...`);
});
