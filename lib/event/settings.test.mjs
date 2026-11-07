// 행사 설정 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LEGACY_SETTINGS,
  boothState,
  dateLabelOf,
  defaultSettings,
  diff,
  momentsOn,
  normalize,
  pickBoothEvent,
  pickPopupEvent,
  popupOn,
  readiness,
  storyState,
  toMs,
  validate,
} from "./settings.ts";

const EV = { id: 7, day: "2026-11-22", label: "서울 게임 타운", startsAt: "12:00", endsAt: "17:00" };
const at = (t) => toMs(t);

test("일정에서 날짜 문구와 부스 시간을 만든다(행사 3시간 전 ~ 1시간 뒤)", () => {
  assert.equal(dateLabelOf(EV), "11월 22일 (일) 낮 12시 - 오후 5시");
  const s = defaultSettings(EV);
  assert.equal(s.name, "서울 게임 타운");
  assert.equal(s.boothFrom, "2026-11-22T09:00");
  assert.equal(s.boothUntil, "2026-11-22T18:00");
  assert.equal(s.popup, "untilEnd");
  assert.equal(s.story, "off");
});

test("행사 시간을 모르면 날짜만, 부스는 9시 ~ 18시", () => {
  const e = { ...EV, startsAt: null, endsAt: null };
  assert.equal(dateLabelOf(e), "11월 22일 (일)");
  assert.deepEqual([defaultSettings(e).boothFrom, defaultSettings(e).boothUntil], ["2026-11-22T09:00", "2026-11-22T18:00"]);
});

test("검사: 빈 이름, 긴 대시, 거꾸로 된 시각, https 아닌 주소", () => {
  const s = defaultSettings(EV);
  assert.deepEqual(validate(s), {});
  const p = validate({ ...s, name: " ", dateLabel: "11월 22일 — 낮", boothUntil: "2026-11-22T08:00", popupUrl: "http://x.com" });
  assert.equal(p.name, "비워 둘 수 없어요.");
  assert.match(p.dateLabel, /하이픈/);
  assert.equal(p.boothUntil, "여는 시각보다 뒤여야 해요.");
  assert.match(p.popupUrl, /https/);
});

test("저장소 값을 믿지 않는다: 모르는 칸은 버리고 빠진 칸은 기본값", () => {
  const s = normalize({ name: "가".repeat(50), popup: "weird", boothFrom: "어제", hack: 1 }, defaultSettings(EV));
  assert.equal(s.name.length, 20);
  assert.equal(s.popup, "untilEnd");
  assert.equal(s.boothFrom, "2026-11-22T09:00");
  assert.equal("hack" in s, false);
});

test("부스, 이야기 페이지, 팝업 상태", () => {
  const s = defaultSettings(EV);
  assert.equal(boothState(s, at("2026-11-22T08:59")), "before");
  assert.equal(boothState(s, at("2026-11-22T09:00")), "open");
  assert.equal(boothState(s, at("2026-11-22T18:01")), "after");
  assert.equal(boothState({ ...s, boothClosed: true }, at("2026-11-22T10:00")), "closed");
  assert.equal(storyState(s, at("2026-11-22T10:00")), "open");
  assert.equal(popupOn(EV, s, at("2026-11-10T10:00")), true);
  assert.equal(popupOn(EV, s, at("2026-11-22T17:00")), false);
  assert.equal(popupOn(EV, { ...s, popup: "off" }, at("2026-11-10T10:00")), false);
});

test("지금 행사: 운영 중 → 다가오는 것 중 먼저 → 가장 최근에 끝난 것", () => {
  const a = { event: { ...EV, id: 1, day: "2026-11-22" }, settings: defaultSettings({ ...EV, day: "2026-11-22" }) };
  const b = { event: { ...EV, id: 2, day: "2026-12-06" }, settings: defaultSettings({ ...EV, day: "2026-12-06" }) };
  const list = [b, a];
  assert.equal(pickBoothEvent(list, at("2026-11-22T10:00")).event.id, 1);
  assert.equal(pickBoothEvent(list, at("2026-11-23T10:00")).event.id, 2);
  assert.equal(pickBoothEvent(list, at("2026-12-07T10:00")).event.id, 2);
  assert.equal(pickBoothEvent([], at("2026-12-07T10:00")), null);
  // 팝업 둘 다 떠 있으면 행사 날이 가까운 것
  assert.equal(pickPopupEvent(list, at("2026-11-10T10:00")).event.id, 1);
});

test("행사 날 바뀌는 시각이 시각 순으로 묶인다", () => {
  const s = { ...defaultSettings(EV), story: "booth" };
  const m = momentsOn("2026-11-22", EV, s, { from: "2026-11-15T00:00", until: "2026-11-22T17:00" });
  assert.deepEqual(m.map((x) => x.at.slice(11)), ["09:00", "12:00", "17:00", "18:00"]);
  assert.deepEqual(m[0].what, ["부스 열림", "행사 페이지 본문 공개"]);
  assert.deepEqual(m[2].what, ["행사 끝", "홈 팝업 내림", "홈 미니게임 숨김"]);
});

test("준비 점검: 지난 행사 날짜 문구가 남으면 먼저 알린다", () => {
  const checks = readiness(EV, { ...defaultSettings(EV), dateLabel: LEGACY_SETTINGS.dateLabel });
  assert.equal(checks[0].id, "date");
  assert.equal(checks[0].level, "warn");
  assert.ok(checks.some((c) => c.id === "location" && c.level === "todo"));
});

test("바뀐 것은 어느 화면이 바뀌는지와 같이", () => {
  const before = defaultSettings(EV);
  const d = diff(before, { ...before, name: "겨울 축제", boothClosed: true });
  assert.equal(d.length, 2);
  assert.match(d[0].label, /부스 준비 중 화면/);
  assert.deepEqual([d[1].before, d[1].after], ["운영 시간대로", "닫음"]);
});
