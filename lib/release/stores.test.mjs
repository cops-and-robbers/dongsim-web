// 출시 보드가 스토어 응답을 읽는 순수 부분 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { historyFrom, parsePlayTitle } from "./stores.ts";

test("Play 스토어 페이지 제목에서 앱 이름만 뗀다(언어마다 꼬리가 다르다)", () => {
  assert.equal(parsePlayTitle('<title id="main-title">Cops and Robbers - Apps on Google Play</title>'), "Cops and Robbers");
  assert.equal(parsePlayTitle('<title id="main-title">경찰과도둑 - Google Play 앱</title>'), "경찰과도둑");
  assert.equal(parsePlayTitle('<title id="main-title">ケイドロ - Google Play のアプリ</title>'), "ケイドロ");
  // 이름 안에 " - " 가 있어도 마지막 꼬리만 뗀다
  assert.equal(parsePlayTitle("<title>Tag - Run &amp; Hide - Apps on Google Play</title>"), "Tag - Run & Hide");
  assert.equal(parsePlayTitle("<html></html>"), null);
});

test("지표 일정의 출시 줄을 버전마다 묶고 새 버전 먼저", () => {
  const rows = [
    { day: "2026-11-02", label: "iOS 3.2.7 출시" },
    { day: "2026-11-02", label: "Android 3.2.7 출시" },
    { day: "2026-10-28", label: "iOS 3.2.6 출시" },
    { day: "2026-10-20", label: "Android 3.2.10 출시" },
    { day: "2026-10-19", label: "서울 게임 타운" },
    { day: "2026-10-01", label: "iOS 3.2.7 출시 준비" },
  ];
  assert.deepEqual(historyFrom(rows), [
    { version: "3.2.10", android: "2026-10-20" },
    { version: "3.2.7", ios: "2026-11-02", android: "2026-11-02" },
    { version: "3.2.6", ios: "2026-10-28" },
  ]);
});

test("Play 출시 목록: 5분 안의 값은 그대로, 막혔으면 쉬고, 그 밖엔 구글에서", async () => {
  const { listPlan } = await import("./stores.ts");
  const now = Date.parse("2026-11-08T07:00:00Z");
  const data = { at: now - 60_000, production: [], internal: [] };
  assert.equal(listPlan(data, now), "use-stored");
  assert.equal(listPlan({ ...data, at: now - 6 * 60_000 }, now), "fetch");
  // 막힌 동안: 저장된 값이 있으면 그 값을, 없으면 구글을 부르지 않고 막혔다고
  assert.equal(listPlan({ ...data, at: now - 6 * 60_000, blockedUntil: now + 60_000 }, now), "use-stored");
  assert.equal(listPlan({ at: 0, production: [], internal: [], blockedUntil: now + 60_000 }, now), "blocked");
  assert.equal(listPlan({ at: 0, production: [], internal: [], blockedUntil: now - 1 }, now), "fetch");
  assert.equal(listPlan(null, now), "fetch");
});
