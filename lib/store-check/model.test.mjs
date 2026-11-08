import assert from "node:assert/strict";
import { test } from "node:test";
import { ANR_LIMIT, CRASH_LIMIT, daysLeft, EU_TERRITORIES, manualChecks, playChecks, reviewCheck, sortChecks, territoryChecks, versionChecks } from "./model.ts";

const link = { href: "x", label: "열기" };
const t = (code, statuses = ["AVAILABLE"]) => ({ code, available: true, statuses });
const levels = (list) => Object.fromEntries(list.map((c) => [c.id, c.level]));

test("유럽이 하나라도 막히면 할 일이고, 다 열려 있으면 문제없음이다", () => {
  const all = EU_TERRITORIES.map((c) => t(c));
  assert.equal(levels(territoryChecks([t("KOR"), ...all], link))["ios-eu"], "ok");
  const out = territoryChecks(all.map((x) => (x.code === "DEU" ? t("DEU", ["CANNOT_SELL"]) : x)), link);
  assert.equal(out[0].level, "todo");
  assert.match(out[0].title, /1개 나라/);
  assert.equal(territoryChecks(all.filter((x) => x.code !== "FRA"), link)[0].level, "todo");
});

test("유럽 밖에서 막힌 나라는 지켜볼 것으로 따로 알린다", () => {
  const out = territoryChecks([...EU_TERRITORIES.map((c) => t(c)), t("AFG", ["CANNOT_SELL", "CANNOT_SELL_CONTESTS"])], link);
  assert.equal(levels(out)["ios-territories"], "watch");
  assert.match(out[1].detail, /AFG/);
});

const next = { version: "3.2.8", build: "412", hasReviewContact: true, emptyWhatsNew: [], noScreenshots: [], changedFields: 0, drafts: 0 };
const links = { console: link, page: link };

test("다음 버전에 빠진 것은 할 일이다", () => {
  const out = levels(versionChecks({ ...next, build: null, emptyWhatsNew: ["ko", "en"], hasReviewContact: false, noScreenshots: ["ja"] }, links));
  assert.deepEqual([out["ios-build"], out["ios-whatsnew"], out["ios-review"], out["ios-shots"]], ["todo", "todo", "todo", "todo"]);
});

test("다 갖췄으면 문제없음이고, 다음 버전이 없어도 문제없음이다", () => {
  assert.ok(versionChecks(next, links).every((c) => c.level === "ok"));
  assert.equal(versionChecks(null, links)[0].level, "ok");
});

const play = { pendingLangs: [], drafts: 0, crashRate: null, anrRate: null, anomalies: 0 };
const pl = { publishing: link, page: link, vitals: link };

test("구글 기준을 넘은 안정성만 할 일이고 숫자가 없으면 문제없음이다", () => {
  assert.equal(levels(playChecks(play, pl))["play-crash"], "ok");
  assert.equal(levels(playChecks({ ...play, crashRate: CRASH_LIMIT + 0.001 }, pl))["play-crash"], "todo");
  assert.equal(levels(playChecks({ ...play, crashRate: CRASH_LIMIT }, pl))["play-crash"], "ok");
  assert.equal(levels(playChecks({ ...play, anrRate: ANR_LIMIT + 0.001 }, pl))["play-anr"], "todo");
  assert.equal(levels(playChecks({ ...play, anomalies: 1 }, pl))["play-anomaly"], "todo");
});

test("낮은 별점 리뷰가 없으면 항목도 없다", () => {
  assert.deepEqual(reviewCheck(0), []);
  assert.equal(reviewCheck(2)[0].level, "todo");
});

const now = new Date("2026-11-08T12:00:00+09:00");
const manual = (id, due) => ({ id, store: "ios", title: id, detail: "", due });

test("사람이 할 일은 기한이 90일 안이거나 없으면 할 일, 멀면 지켜볼 것이다", () => {
  const out = levels(manualChecks([manual("soon", "2027-01-30"), manual("far", "2027-04-01"), manual("none"), manual("past", "2026-08-31")], new Map(), now));
  assert.deepEqual(out, { soon: "todo", far: "watch", none: "todo", past: "todo" });
});

test("끝냈다고 표시하면 문제없음이고 누가 했는지 남는다", () => {
  const [c] = manualChecks([manual("a", "2026-12-01")], new Map([["a", { doneBy: "찬빈", doneAt: "2026-11-08" }]]), now);
  assert.deepEqual([c.level, c.doneBy, c.manual], ["ok", "찬빈", true]);
});

test("기한 일수는 한국 날짜로 센다", () => {
  assert.equal(daysLeft("2026-11-08", now), 1);
  assert.equal(daysLeft("2026-11-09", now), 2);
  assert.ok(daysLeft("2026-11-01", now) < 0);
});

test("할 일부터, 그 안에서는 기한이 가까운 것부터", () => {
  const list = [{ id: "ok", level: "ok" }, { id: "b", level: "todo", due: "2027-02-01" }, { id: "n", level: "todo" }, { id: "a", level: "todo", due: "2026-12-01" }, { id: "w", level: "watch" }];
  assert.deepEqual(sortChecks(list).map((c) => c.id), ["a", "b", "n", "w", "ok"]);
});
