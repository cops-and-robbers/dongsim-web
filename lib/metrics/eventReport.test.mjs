// 행사 성적표 시험 (#165). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { baselineDays, buildEventReport } from "./eventReport.ts";

test("평소: 앞선 같은 요일 네 번, 다른 행사 날은 건너뛰고 더 앞에서 채운다", () => {
  assert.deepEqual(baselineDays("2026-09-19", new Set(), "2026-04-01"), ["2026-09-12", "2026-09-05", "2026-08-29", "2026-08-22"]);
  assert.deepEqual(baselineDays("2026-09-19", new Set(["2026-09-05"]), "2026-04-01"), ["2026-09-12", "2026-08-29", "2026-08-22", "2026-08-15"]);
  // 수집 시작 전 날은 쓰지 않는다
  assert.deepEqual(baselineDays("2026-04-18", new Set(), "2026-04-01"), ["2026-04-11", "2026-04-04"]);
});

const event = { id: 5, day: "2026-09-19", label: "청춘대로", category: "event", startsAt: "14:00", endsAt: "16:00", place: { lat: 37.5498, lng: 127.0799, radiusM: 500 } };
const here = { lat: 37.5499, lng: 127.0801 };
const g = (startedAt, kind, visitors, staff, center = here) => ({ startedAt, center, kind, visitors, staff, minutes: 10 });

test("행사 게임은 시간과 장소로 찾고, 운영진을 빼지 않고 나눠 센다", () => {
  const games = [
    g("2026-09-19T14:25:00+09:00", "mixed", 3, 3),
    g("2026-09-19T15:13:00+09:00", "staff", 0, 2), // 운영진끼리 시연한 판
    g("2026-09-19T14:27:00+09:00", "mixed", 36, 1, { lat: 37.5114, lng: 126.9969 }), // 같은 시간 다른 행사(반포)
    g("2026-09-19T19:00:00+09:00", "users", 5, 0), // 행사 끝난 뒤
  ];
  const r = buildEventReport(event, games, [], []);
  assert.equal(r.matchable, true);
  assert.deepEqual(r.games.map((x) => x.start), ["14:25", "15:13"]);
  assert.deepEqual(r.totals, { games: 2, withVisitors: 1, staffOnly: 1, visitors: 3, staff: 5 });
  assert.equal(r.noRoster, false);
});

test("그날 숫자와 평소 평균. 평소 날 숫자가 없으면 그 날은 빼고 평균한다", () => {
  const values = { "2026-09-19": 62, "2026-09-12": 5, "2026-09-05": 4, "2026-08-29": null, "2026-08-22": 6 };
  const sources = [{ key: "store_new", label: "스토어 최초 설치", unit: "명", of: (d) => values[d] ?? null, pending: () => true }];
  const r = buildEventReport(event, [], sources, ["2026-09-12", "2026-09-05", "2026-08-29", "2026-08-22"]);
  assert.deepEqual(r.metrics[0], { key: "store_new", label: "스토어 최초 설치", unit: "명", value: 62, usual: 5, usualValues: [5, 4, null, 6], pending: true });
});

test("시간도 장소도 없는 행사는 게임을 찾지 않는다", () => {
  const r = buildEventReport({ ...event, place: null, startsAt: null, endsAt: null }, [g("2026-09-19T14:25:00+09:00", "mixed", 3, 3)], [], []);
  assert.equal(r.matchable, false);
  assert.equal(r.games.length, 0);
});
