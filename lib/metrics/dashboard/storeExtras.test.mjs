import assert from "node:assert/strict";
import { test } from "node:test";
import { iosUsage, playLanguages } from "./storeExtras.ts";

const week = { start: "2026-11-01", end: "2026-11-07" };
const same = (d) => d;
const row = (key, day, metric, value) => ({ report: metric === "user_installs" ? "installs" : "ratings", dim: "language", key, day, metric, value });

test("언어별 설치는 기간만 더하고 평점은 마지막 날 값을 쓴다", () => {
  const out = playLanguages([row("ko", "2026-10-31", "user_installs", 100), row("ko", "2026-11-02", "user_installs", 3), row("ko", "2026-11-03", "user_installs", 4), row("en", "2026-11-02", "user_installs", 9), row("ko", "2026-11-01", "rating_total", 4.5), row("ko", "2026-11-05", "rating_total", 4.8)], week, same);
  assert.deepEqual(out, [{ language: "en", installs: 9, rating: null }, { language: "ko", installs: 7, rating: 4.8 }]);
});

test("PT 날짜를 옮겨서 기간을 잰다", () => {
  const next = (d) => (d === "2026-10-31" ? "2026-11-01" : d);
  assert.equal(playLanguages([row("ko", "2026-10-31", "user_installs", 5)], week, next)[0].installs, 5);
});

test("숫자가 없는 언어는 빼고, 다른 축은 섞지 않는다", () => {
  assert.deepEqual(playLanguages([row("ja", "2026-10-01", "user_installs", 5), { ...row("ko", "2026-11-02", "user_installs", 5), dim: "country" }], week, same), []);
});

test("iOS 세션과 비정상 종료를 기간만 더한다", () => {
  const rows = [{ report: "sessions", day: "2026-11-02", counts: 10 }, { report: "sessions", day: "2026-11-03", counts: 5 }, { report: "crashes", day: "2026-11-04", counts: 2 }, { report: "sessions", day: "2026-10-30", counts: 99 }, { report: "other", day: "2026-11-06", counts: 7 }];
  assert.deepEqual(iosUsage(rows, week), { sessions: 15, crashes: 2, until: "2026-11-04" });
  assert.deepEqual(iosUsage([], week), { sessions: 0, crashes: 0, until: null });
});
