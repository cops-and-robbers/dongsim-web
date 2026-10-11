// 행사 성적표와 행사 게임 고르기 시험 (#165). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { baselineDays, buildEventReport, dayGames } from "./eventReport.ts";

test("평소: 앞선 같은 요일 네 번, 다른 행사 날은 건너뛰고 더 앞에서 채운다", () => {
  assert.deepEqual(baselineDays("2026-09-19", new Set(), "2026-04-01"), ["2026-09-12", "2026-09-05", "2026-08-29", "2026-08-22"]);
  assert.deepEqual(baselineDays("2026-09-19", new Set(["2026-09-05"]), "2026-04-01"), ["2026-09-12", "2026-08-29", "2026-08-22", "2026-08-15"]);
  // 수집 시작 전 날은 쓰지 않는다
  assert.deepEqual(baselineDays("2026-04-18", new Set(), "2026-04-01"), ["2026-04-11", "2026-04-04"]);
});

const event = { id: 5, day: "2026-09-19", label: "청춘대로", category: "event", startsAt: "14:00", endsAt: "16:00" };
const park = { lat: 37.5499, lng: 127.0801 }; // 어린이대공원
const banpo = { lat: 37.5114, lng: 126.9969 }; // 반포
// 방문객 id 는 판마다 v<판>-<번호>. 사람이 겹치는 경우는 따로 시험한다
const ids = (id, n) => Array.from({ length: n }, (_, i) => `v${id}-${i}`);
const g = (id, startedAt, kind, visitors, staff, center = park, visitorIds = kind === "unknown" ? [] : ids(id, visitors)) => ({ id, startedAt, center, kind, visitors, staff, minutes: 10, visitorIds });
const games = [
  g("1", "2026-09-19T14:25:00+09:00", "mixed", 3, 3),
  g("2", "2026-09-19T15:13:00+09:00", "staff", 0, 2, { lat: 37.5497, lng: 127.0797 }), // 운영진끼리 시연, 같은 장소
  g("3", "2026-09-19T14:27:00+09:00", "mixed", 36, 1, banpo), // 같은 시간 다른 행사
  g("4", "2026-09-19T14:51:00+09:00", "mixed", 38, 1, banpo),
  g("5", "2026-09-19T19:00:00+09:00", "users", 5, 0, null), // 구역 모름, 행사 끝난 뒤
  g("6", "2026-09-20T14:25:00+09:00", "users", 4, 0), // 다음 날
];

test("그날 게임: 장소는 판이 많은 곳부터 A, B. 인원은 운영진까지, 행사 시간 안이면 미리 체크", () => {
  const d = dayGames(event, games);
  assert.deepEqual(d.places.map((p) => [p.letter, p.count]), [["A", 2], ["B", 2]]);
  // 판 수가 같으면 먼저 나온 장소가 A(14:25 어린이대공원)
  assert.deepEqual(d.games.map((x) => [x.id, x.start, x.people, x.place, x.suggested]), [
    ["1", "14:25", 6, "A", true],
    ["3", "14:27", 37, "B", true],
    ["4", "14:51", 39, "B", true],
    ["2", "15:13", 2, "A", true],
    ["5", "19:00", 5, null, false],
  ]);
});

test("성적표는 고른 게임만 세고, 운영진을 빼지 않고 나눠 센다", () => {
  const r = buildEventReport(event, games, new Set(["2", "1"]), [], []);
  assert.deepEqual(r.games.map((x) => x.start), ["14:25", "15:13"]);
  assert.deepEqual(r.totals, { games: 2, withVisitors: 1, staffOnly: 1, visitors: 3, uniqueVisitors: 3, staff: 5 });
  assert.equal(r.noRoster, false);
  assert.equal(r.missing, 0);
  // 운영에서 고른 게임이 지금 읽은 기록에 없으면(로컬 dev 서버) 못 찾은 수로 알린다
  assert.equal(buildEventReport(event, games, new Set(["1", "999"]), [], []).missing, 1);
  assert.equal(buildEventReport(event, games, new Set(), [], []).games.length, 0);
});

test("만난 사람 수: 여러 판에 나온 방문객은 한 번만 센다. 명단 없는 판이 섞이면 모른다(null)", () => {
  const twice = [
    g("a", "2026-09-19T14:00:00+09:00", "mixed", 3, 1, park, ["u1", "u2", "u3"]),
    g("b", "2026-09-19T14:30:00+09:00", "mixed", 2, 1, park, ["u2", "u3"]),
  ];
  const r = buildEventReport(event, twice, new Set(["a", "b"]), [], []);
  assert.equal(r.totals.visitors, 5);
  assert.equal(r.totals.uniqueVisitors, 3);
  const old = [g("c", "2026-07-04T12:00:00+09:00", "unknown", 4, 0, park)];
  assert.equal(buildEventReport({ ...event, day: "2026-07-04" }, old, new Set(["c"]), [], []).totals.uniqueVisitors, null);
});

test("그날 숫자와 평소 평균. 평소 날 숫자가 없으면 그 날은 빼고 평균한다", () => {
  const values = { "2026-09-19": 62, "2026-09-12": 5, "2026-09-05": 4, "2026-08-29": null, "2026-08-22": 6 };
  const sources = [{ key: "store_new", label: "스토어 최초 설치", unit: "명", of: (d) => values[d] ?? null, pending: () => true }];
  const r = buildEventReport(event, [], new Set(), sources, ["2026-09-12", "2026-09-05", "2026-08-29", "2026-08-22"]);
  assert.deepEqual(r.metrics[0], { key: "store_new", label: "스토어 최초 설치", unit: "명", value: 62, usual: 5, usualValues: [5, 4, null, 6], pending: true });
});
