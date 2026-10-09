// 치즈 펫 판단 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { frameOf, initial, play, setMood, SIT_AFTER, SLEEP_AFTER, step, suddenlyNear } from "./brain.ts";

const meta = JSON.parse(readFileSync(new URL("../../../public/admin/pet/cheese-sheet.json", import.meta.url), "utf8"));
const tick = (s, o) => step(s, { dt: 0.1, mouseX: null, petX: 100, idleMs: 0, ...o }, meta);
const done = (s) => s.since + 10_000; // 한 번짜리 동작이 다 끝난 뒤

test("처음 나타나면 손을 흔들고, 끝나면 대기", () => {
  const s = initial(0);
  assert.equal(s.anim, "wave");
  assert.equal(tick(s, { now: 100 }).state.anim, "wave");
  assert.equal(tick(s, { now: done(s) }).state.anim, "idle");
});

test("마우스가 멀면 달리고, 가까우면 걷고, 아주 가까우면 선다. 방향도 맞춘다", () => {
  const s = { ...initial(0), anim: "idle" };
  const far = tick(s, { now: 1, mouseX: 500 });
  assert.equal(far.state.anim, "run");
  assert.ok(far.dx > 0 && far.dx <= 17.1);
  assert.equal(tick(s, { now: 1, mouseX: 20 }).state.facing, -1);
  assert.equal(tick(s, { now: 1, mouseX: 200 }).state.anim, "walk");
  assert.equal(tick(s, { now: 1, mouseX: 130 }).state.anim, "idle");
});

test("오래 가만히 있으면 앉고, 더 오래면 졸고, 움직이면 깬다", () => {
  const s = { ...initial(0), anim: "idle" };
  assert.equal(tick(s, { now: 1, idleMs: SIT_AFTER }).state.anim, "sit");
  const sleeping = tick(s, { now: 1, idleMs: SLEEP_AFTER }).state;
  assert.equal(sleeping.anim, "sleep");
  assert.equal(tick(sleeping, { now: 2, idleMs: 0 }).state.anim, "wake");
});

test("챗봇이 생각 중이면 따라가지 않고 생각과 킁킁을 번갈아 한다", () => {
  let s = setMood({ ...initial(0), anim: "idle" }, { anim: "think", until: Infinity, since: 1000 });
  s = tick(s, { now: 1000, mouseX: 900 }).state;
  assert.equal(s.anim, "think");
  const later = tick(s, { now: 1000 + 4100, mouseX: 900 });
  assert.equal(later.dx, 0);
  assert.equal(later.state.anim, "sniff");
});

test("한 번짜리 동작은 챗봇 기분보다 먼저 끝까지 한다", () => {
  let s = play({ ...initial(0), anim: "think" }, "happy", 0);
  s = setMood(s, null);
  assert.equal(tick(s, { now: 100, mouseX: 900 }).state.anim, "happy");
  assert.equal(frameOf(s, 100, meta), 0);
  assert.equal(frameOf(s, 10_000, meta), null);
});

test("기분은 정한 시각이 지나면 풀린다", () => {
  const s = setMood({ ...initial(0), anim: "idle" }, { anim: "confused", until: 4000, since: 0 });
  assert.equal(tick(s, { now: 1000 }).state.anim, "confused");
  assert.equal(tick(s, { now: 5000 }).state.anim, "idle");
});

test("마우스가 갑자기 가까이 오면 깜짝", () => {
  assert.equal(suddenlyNear(300, 0, 40, 200), true);
  assert.equal(suddenlyNear(300, 0, 40, 500), false);
  assert.equal(suddenlyNear(100, 0, 40, 100), false);
});

test("내려놓으면 착지를 끝까지 하고 나서 다시 따라간다", () => {
  const s = play({ ...initial(0), anim: "lift" }, "land", 0);
  assert.equal(tick(s, { now: 100, mouseX: 900 }).state.anim, "land");
  assert.equal(tick(s, { now: 100, mouseX: 900 }).dx, 0);
  assert.equal(tick(s, { now: done(s), mouseX: 900 }).state.anim, "run");
});

test("스프라이트 시트에 21가지 동작이 다 있다", () => {
  for (const k of ["idle", "walk", "run", "listen", "think", "sniff", "happy", "confused", "fall", "love", "sad", "surprise", "wave", "squish", "sit", "sleep", "wake", "lift", "land", "box", "boxed"]) {
    assert.ok(meta.states[k]?.frames > 0, k);
  }
});
