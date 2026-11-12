// 무전 사용 시간과 동네 이름 표시 테스트 (#315). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { attachRadio, formatRadio, radioSummary, shortPlaceName } from "./gameExtras.ts";

test("무전 시간은 1분이 넘으면 분 단위로 내린다", () => {
  assert.equal(formatRadio(0), "안 씀");
  assert.equal(formatRadio(45), "1분 미만");
  assert.equal(formatRadio(119), "1분");
  assert.equal(formatRadio(60 * 59 + 59), "59분");
  assert.equal(formatRadio(3600), "1시간");
  assert.equal(formatRadio(3600 + 25 * 60 + 30), "1시간 25분");
});

test("목록의 동네 이름은 시도를 떼고, 해외나 짧은 이름은 그대로 둔다", () => {
  assert.equal(shortPlaceName("서울특별시 강남구 역삼동"), "강남구 역삼동");
  assert.equal(shortPlaceName("경기도 성남시 분당구 정자동"), "성남시 분당구 정자동");
  assert.equal(shortPlaceName("제주특별자치도 제주시 연동"), "제주시 연동");
  assert.equal(shortPlaceName("세종특별자치시 한솔동"), "세종특별자치시 한솔동");
  assert.equal(shortPlaceName("北海道 札幌市 中央区"), "北海道 札幌市 中央区");
  assert.equal(shortPlaceName("  부산광역시  해운대구   우동 "), "해운대구 우동");
});

const row = (userId, team, extra = {}) => ({ userId, team, leftAt: null, arrestCount: 0, arrestedCount: 0, ...extra });

test("무전 시간은 순서가 달라도 줄의 값으로 짝을 짓는다", () => {
  const rows = [row("1", "POLICE", { arrestCount: 2 }), row("2", "ROBBER"), row("3", "POLICE")];
  const radios = [
    { ...row("3", "POLICE"), radioSeconds: 0 },
    { ...row("2", "ROBBER"), radioSeconds: 0 },
    { ...row("1", "POLICE", { arrestCount: 2 }), radioSeconds: 600 },
  ];
  assert.deepEqual(
    attachRadio(rows, radios).map((p) => [p.userId, p.radioSeconds]),
    [["1", 600], ["2", 0], ["3", 0]],
  );
});

test("같은 사람이 두 줄이거나 탈퇴자가 여럿이어도 줄마다 따로 맞춘다", () => {
  const left = "2026-11-01T05:00:00Z";
  const rows = [row("7", "POLICE", { leftAt: left }), row("7", "POLICE"), row(null, "POLICE"), row(null, "POLICE")];
  const radios = [
    { ...row("7", "POLICE"), radioSeconds: 300 },
    { ...row("7", "POLICE", { leftAt: left }), radioSeconds: 120 },
    { ...row(null, "POLICE"), radioSeconds: 60 },
    { ...row(null, "POLICE"), radioSeconds: 0 },
  ];
  assert.deepEqual(attachRadio(rows, radios).map((p) => p.radioSeconds), [120, 300, 60, 0]);
});

test("무전을 아직 못 읽었거나 짝이 없으면 null 로 둔다", () => {
  const rows = [row("1", "POLICE"), row("2", "POLICE")];
  assert.deepEqual(attachRadio(rows, null).map((p) => p.radioSeconds), [null, null]);
  assert.deepEqual(attachRadio(rows, [{ ...row("1", "POLICE"), radioSeconds: 90 }]).map((p) => p.radioSeconds), [90, null]);
});

test("무전 요약은 경찰 중 쓴 사람과 합계를 센다", () => {
  const s = radioSummary([
    { team: "POLICE", radioSeconds: 600 },
    { team: "POLICE", radioSeconds: 0 },
    { team: "POLICE", radioSeconds: 150 },
    { team: "ROBBER", radioSeconds: 0 },
  ]);
  assert.deepEqual(s, { police: 3, used: 2, totalSeconds: 720 });
});

test("무전 합계는 줄마다 보이는 분을 더해 줄과 어긋나지 않는다", () => {
  const rows = [
    { team: "POLICE", radioSeconds: 119 },
    { team: "POLICE", radioSeconds: 359 },
  ];
  const s = radioSummary(rows);
  assert.equal(formatRadio(s.totalSeconds), "6분");
  assert.deepEqual(rows.map((r) => formatRadio(r.radioSeconds)), ["1분", "5분"]);
  assert.equal(formatRadio(radioSummary([{ team: "POLICE", radioSeconds: 30 }, { team: "POLICE", radioSeconds: 20 }]).totalSeconds), "1분 미만");
  assert.equal(radioSummary([{ team: "POLICE", radioSeconds: 0 }]).used, 0);
});
