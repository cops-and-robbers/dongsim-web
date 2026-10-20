// 게임 상세 현장 운영 카드 규칙 테스트 (이벤트 게임 전환 BE #214, 방 참가 QR). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultLink, eventGameFailure, eventGameSwitch, isActive, joinUrl } from "./eventGame.ts";

const SITE = "https://copsandrobbers.app";
const link = (id, createdAt, over = {}) => ({
  id,
  code: `c${id}`,
  label: `링크 ${id}`,
  source: "booth",
  medium: "qr",
  campaign: "ev-20261024-12",
  content: null,
  eventId: 12,
  createdAt,
  ...over,
});

test("대기 중이나 진행 중인 방만 현장 운영 카드를 보인다", () => {
  assert.equal(isActive("WAITING"), true);
  assert.equal(isActive("IN_PROGRESS"), true);
  assert.equal(isActive("FINISHED"), false);
});

test("대기 중에는 켜고 끄기 모두 묻지 않고 바로 된다", () => {
  assert.deepEqual(eventGameSwitch("WAITING", false), { enabled: true, confirm: false });
  assert.deepEqual(eventGameSwitch("WAITING", true), { enabled: true, confirm: false });
});

test("진행 중에는 켜기만 되고, 되돌릴 수 없어서 한 번 묻는다", () => {
  assert.deepEqual(eventGameSwitch("IN_PROGRESS", false), { enabled: true, confirm: true });
  assert.deepEqual(eventGameSwitch("IN_PROGRESS", true), { enabled: false, confirm: false });
});

test("끝난 방은 바꿀 수 없다", () => {
  assert.deepEqual(eventGameSwitch("FINISHED", true), { enabled: false, confirm: false });
});

test("운영 서버에 뮤테이션이 없을 때를 따로 알아본다", () => {
  const relay = "Relay: No data returned for operation `UpdateEventGame`, got error(s):\nValidation error (FieldUndefined@[updateEventGame]) : Field 'updateEventGame' in type 'Mutation' is undefined";
  assert.equal(eventGameFailure(relay), "not-deployed");
  assert.equal(eventGameFailure("INTERNAL_ERROR for 3f2a"), "other");
  assert.equal(eventGameFailure("GAME_NOT_WAITING"), "other");
});

test("꼬리표 없이 만들면 참가 주소만", () => {
  assert.equal(joinUrl(SITE, "AB12CD", null), "https://copsandrobbers.app/join/AB12CD");
});

test("행사 링크를 고르면 그 꼬리표에 구분 join 을 붙인다", () => {
  const url = new URL(joinUrl(SITE, "AB12CD", link(1, "2026-10-20T00:00:00Z")));
  assert.equal(url.pathname, "/join/AB12CD");
  assert.equal(url.searchParams.get("utm_source"), "booth");
  assert.equal(url.searchParams.get("utm_medium"), "qr");
  assert.equal(url.searchParams.get("utm_campaign"), "ev-20261024-12");
  assert.equal(url.searchParams.get("utm_content"), "join");
});

test("App Store 캠페인 토큰 30자를 넘기면 구분을 빼서 잘리지 않게 한다", () => {
  const long = link(2, "2026-10-20T00:00:00Z", { source: "booth", campaign: "nowon-missing-festival-24" });
  const url = new URL(joinUrl(SITE, "AB12CD", long));
  assert.equal(url.searchParams.get("utm_content"), null);
  assert.equal(url.searchParams.get("utm_campaign"), "nowon-missing-festival-24");
});

test("처음 고를 링크: 기억한 것, 꼬리표 없이, 가장 최근 순", () => {
  const links = [link(1, "2026-10-01T00:00:00Z"), link(2, "2026-10-19T00:00:00Z"), link(3, "2026-10-10T00:00:00Z")];
  assert.equal(defaultLink(links, null)?.id, 2);
  assert.equal(defaultLink(links, 3)?.id, 3);
  assert.equal(defaultLink(links, 99)?.id, 2);
  assert.equal(defaultLink(links, "none"), null);
  assert.equal(defaultLink([], null), null);
});
