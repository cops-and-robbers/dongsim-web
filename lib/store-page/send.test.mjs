import assert from "node:assert/strict";
import { test } from "node:test";
import { blockers, changesOf, needsConfirm, signature } from "./send.ts";

const empty = { live: {}, pending: null };
const langs = (ko) => ({ ko, en: empty, ja: empty });
const d = (platform, lang, field, value) => ({ platform, lang, field, value, updatedBy: "a", updatedAt: "t" });
const ios = langs({ live: { name: "옛 이름", subtitle: "부제" }, pending: { name: "새 이름", subtitle: "부제", promotionalText: "" } });

test("초안과 스토어 값이 다른 칸만 바뀐다. 기준은 다음에 나갈 값이다", () => {
  const out = changesOf("ios", ios, [d("ios", "ko", "name", "더 새 이름"), d("ios", "ko", "subtitle", "부제"), d("android", "ko", "title", "다른 스토어")]);
  assert.equal(out.length, 1);
  assert.deepEqual([out[0].field, out[0].before, out[0].after], ["name", "새 이름", "더 새 이름"]);
});

test("글자 수 초과와 빈 이름은 막고, 경고는 막지 않는다", () => {
  const over = changesOf("ios", ios, [d("ios", "ko", "name", "가".repeat(31))]);
  assert.match(blockers("ios", ios, over).join(), /한국어 이름: 30자까지/);
  const warn = changesOf("ios", ios, [d("ios", "ko", "name", "경도 무료")]);
  assert.deepEqual(blockers("ios", ios, warn), []);
  const emptied = changesOf("ios", ios, [d("ios", "ko", "name", "")]);
  assert.match(blockers("ios", ios, emptied).join(), /비워 둘 수 없어요/);
});

test("잘못된 영상 주소는 막는다", () => {
  const play = langs({ live: { video: "https://youtu.be/4nLEws5Sk8A" }, pending: null });
  assert.match(blockers("android", play, changesOf("android", play, [d("android", "ko", "video", "https://example.com")])).join(), /YouTube/);
});

test("지문은 전, 후 값이 바뀌면 달라진다", () => {
  const a = changesOf("ios", ios, [d("ios", "ko", "name", "하나")]);
  const b = changesOf("ios", ios, [d("ios", "ko", "name", "둘")]);
  assert.notEqual(signature(a), signature(b));
  assert.equal(signature(a), signature(changesOf("ios", ios, [d("ios", "ko", "name", "하나")])));
  const moved = langs({ live: {}, pending: { name: "다른 사람이 바꾼 값" } });
  assert.notEqual(signature(a), signature(changesOf("ios", moved, [d("ios", "ko", "name", "하나")])));
});

test("사용자에게 바로 보이거나 심사에 들어가면 입력까지 받는다", () => {
  assert.equal(needsConfirm("ios", [{ field: "name" }]), false);
  assert.equal(needsConfirm("ios", [{ field: "promotionalText" }]), true);
  assert.equal(needsConfirm("android", [{ field: "title" }]), true);
});
