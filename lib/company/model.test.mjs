import assert from "node:assert/strict";
import test from "node:test";
import {
  attendanceCounts,
  creditHelpers,
  formatRecordDate,
  isCandidateEvent,
  isSimilarName,
  newNamesProblem,
  matchNames,
  missingLocales,
  nameKey,
  nextQaRound,
  normalizeRecord,
  parseNames,
  publicHelpers,
  publicRecords,
  qaTitle,
  showsGithub,
  sortRecords,
  tierOf,
  validatePerson,
  validateRecord,
} from "./model.ts";

const NOW = Date.parse("2026-11-08T03:00:00Z");
const text = (ko, en = "", ja = "") => ({ ko, en, ja });
const record = (over) => ({
  id: 1,
  kind: "event",
  occurredOn: "2026-07-04",
  precision: "day",
  title: text("부스", "Booth", "ブース"),
  badge: text(""),
  visible: true,
  eventId: null,
  attendees: [],
  version: 1,
  updatedBy: "",
  updatedAt: "",
  ...over,
});
const person = (over) => ({ id: 1, name: "가나다", role: "qa", github: "", priorCount: 0, visible: true, version: 1, updatedBy: "", updatedAt: "", ...over });

test("날짜는 정밀도에 맞게 보여 준다", () => {
  assert.equal(formatRecordDate("2026-03-24", "day"), "2026.03.24");
  assert.equal(formatRecordDate("2026-07-01", "month"), "2026.07");
});

test("걸어온 길은 오래된 순, 수상은 최신순, 같은 날은 넣은 순서", () => {
  const rows = [record({ id: 3, occurredOn: "2026-07-01" }), record({ id: 2, occurredOn: "2026-07-01" }), record({ id: 1, occurredOn: "2026-10-01" })];
  assert.deepEqual(sortRecords("history", rows).map((r) => r.id), [2, 3, 1]);
  assert.deepEqual(sortRecords("awards", rows).map((r) => r.id), [1, 2, 3]);
});

test("숨긴 줄과 번역 없는 줄은 그 언어에서 빠진다", () => {
  const rows = [record({ id: 1 }), record({ id: 2, visible: false }), record({ id: 3, title: text("한국어만") })];
  assert.deepEqual(publicRecords(rows, "ko").history.map((r) => r.id), [1, 3]);
  assert.deepEqual(publicRecords(rows, "en").history.map((r) => r.id), [1]);
});

test("수상은 상 이름 번역까지 있어야 그 언어에 보인다", () => {
  const row = record({ kind: "award", title: text("대회", "Contest", "大会"), badge: text("우수상", "", "優秀賞") });
  const en = publicRecords([row], "en");
  assert.deepEqual(en.awards, []);
  assert.deepEqual(publicRecords([row], "ja").awards[0].award, "優秀賞");
  assert.deepEqual(missingLocales(row), ["en"]);
});

test("미래 날짜와 틀린 날짜를 막고 이번 달은 받는다", () => {
  const ok = record({ occurredOn: "2026-11-01", precision: "month" });
  assert.deepEqual(validateRecord(ok, NOW), {});
  assert.equal(validateRecord(record({ occurredOn: "2026-12-01", precision: "month" }), NOW).date, "아직 오지 않은 날짜는 넣을 수 없어요.");
  assert.equal(validateRecord(record({ occurredOn: "2026-11-09" }), NOW).date, "아직 오지 않은 날짜는 넣을 수 없어요.");
  assert.equal(validateRecord(record({ occurredOn: "2026-02-30" }), NOW).date, "날짜를 다시 골라 주세요.");
  assert.equal(validateRecord(record({ occurredOn: "2026-07-04", precision: "month" }), NOW).date, "날짜를 다시 골라 주세요.");
});

test("수상은 상 이름이 있어야 하고 글자 수를 넘으면 막는다", () => {
  assert.equal(validateRecord(record({ kind: "award" }), NOW)["badge.ko"], "상 이름을 적어 주세요.");
  assert.equal(validateRecord(record({ title: text("가".repeat(51)) }), NOW)["title.ko"], "50자까지 적을 수 있어요.");
});

test("긴 대시는 하이픈으로 바꾸고 QA 가 아니면 참가자를 비운다", () => {
  const out = normalizeRecord(record({ title: text("가 \u2014 나", "a \u2013 b", " x  y "), attendees: [1, 1] }));
  assert.deepEqual(out.title, text("가 - 나", "a - b", "x y"));
  assert.deepEqual(out.attendees, []);
  assert.deepEqual(normalizeRecord(record({ kind: "qa", attendees: [1, 1, 2] })).attendees, [1, 2]);
});

test("QA 회차 제목 초안", () => {
  assert.deepEqual(qaTitle(3), text("경찰과 도둑 3차 QA 진행", "Cops and Robbers - third QA round", "ケイドロ 第3回QA実施"));
  assert.equal(qaTitle(11).en, "Cops and Robbers - #11 QA round");
  assert.equal(nextQaRound([{ kind: "qa" }, { kind: "qa" }, { kind: "event" }]), 3);
});

test("지난 행사와 QA 만 후보로 고른다", () => {
  assert.equal(isCandidateEvent({ day: "2026-10-24", label: "노원 축제", category: "event" }, NOW), true);
  assert.equal(isCandidateEvent({ day: "2026-10-01", label: "3차 QA", category: "test" }, NOW), true);
  assert.equal(isCandidateEvent({ day: "2026-10-01", label: "포스터 QR 시험", category: "test" }, NOW), false);
  assert.equal(isCandidateEvent({ day: "2026-10-01", label: "광고 시작", category: "promo" }, NOW), false);
  assert.equal(isCandidateEvent({ day: "2026-11-08", label: "오늘 행사", category: "event" }, NOW), false);
});

test("띄어쓰기만 다른 이름은 같은 사람이다", () => {
  assert.equal(nameKey("심 혁"), nameKey("심혁"));
  const out = matchNames(["심혁", "김나다라", "새사람"], [{ id: 1, name: "심 혁" }, { id: 2, name: "김나다마" }]);
  assert.deepEqual(out.map((m) => m.kind), ["existing", "similar", "new"]);
  assert.equal(out[0].person.id, 1);
});

test("두 글자 이름은 한 글자 달라도 비슷한 이름으로 보지 않는다", () => {
  assert.equal(isSimilarName("이진", "이준"), false);
  assert.equal(isSimilarName("김민욱", "김민옥"), true);
  assert.equal(isSimilarName("김민욱", "김민욱"), false);
});

test("붙여넣은 이름을 나누고 겹치는 이름은 하나만", () => {
  assert.deepEqual(parseNames("가나, 다라\n마 바·가나\t사아"), ["가나", "다라", "마 바", "사아"]);
});

test("회차에 온 수를 세고 QA 가 아닌 기록은 세지 않는다", () => {
  const counts = attendanceCounts([record({ kind: "qa", attendees: [1, 2] }), record({ kind: "qa", attendees: [1] }), record({ kind: "event", attendees: [1] })]);
  assert.equal(counts.get(1), 2);
  assert.equal(counts.get(2), 1);
});

test("GitHub 는 2회부터, 인프라는 바로 보인다", () => {
  assert.equal(showsGithub("qa", 1), false);
  assert.equal(showsGithub("qa", 2), true);
  assert.equal(showsGithub("infra", 0), true);
});

test("앱 크레딧 색은 참여 횟수로 정한다", () => {
  assert.deepEqual([1, 2, 3, 9].map((n) => tierOf("qa", n)), ["tier1", "tier2", "tier3", "tier3"]);
  assert.equal(tierOf("infra", 1), "tier4");
});

test("명단은 인프라, 횟수, 넣은 순서로 정렬하고 1회의 GitHub 는 내보내지 않는다", () => {
  const people = [
    person({ id: 1, name: "일회", priorCount: 1, github: "one" }),
    person({ id: 2, name: "이회", priorCount: 1, github: "two" }),
    person({ id: 3, name: "인프라", role: "infra", github: "infra" }),
    person({ id: 4, name: "숨김", priorCount: 5, visible: false }),
    person({ id: 5, name: "아직안옴" }),
    person({ id: 6, name: "또일회", priorCount: 1 }),
  ];
  const helpers = publicHelpers(people, [record({ kind: "qa", attendees: [2] })]);
  assert.deepEqual(helpers.map((h) => h.name), ["인프라", "이회", "일회", "또일회"]);
  assert.equal(helpers[0].github, "https://github.com/infra");
  assert.equal(helpers[1].github, "https://github.com/two");
  assert.equal(helpers[2].github, undefined);
  assert.deepEqual(creditHelpers(helpers).map((h) => h.tier), ["tier4", "tier2", "tier1", "tier1"]);
  assert.equal(creditHelpers(helpers)[0].role, "Infra Provision");
});

test("붙여넣은 새 이름의 글자 수를 저장 전에 막는다", () => {
  assert.equal(newNamesProblem(["가나다"]), undefined);
  assert.equal(newNamesProblem(["가".repeat(21)]), "참가자 이름은 20자까지 적을 수 있어요.");
});

test("사람 입력 검사", () => {
  const base = { name: "가나", role: "qa", github: "", priorCount: 0, visible: true };
  assert.deepEqual(validatePerson(base), {});
  assert.equal(validatePerson({ ...base, name: " " }).name, "이름을 적어 주세요.");
  assert.equal(validatePerson({ ...base, github: "https://github.com/x" }).github, "GitHub 아이디를 다시 확인해 주세요.");
  assert.equal(validatePerson({ ...base, priorCount: -1 }).priorCount, "0에서 50 사이로 적어 주세요.");
});
