// 계정 하루 지표의 경계 테스트 (#140). 인스타 응답을 흉내 낸 가짜 fetch 로 돌린다.
// 서머타임이 바뀌는 날(23시간, 25시간)에 하루를 어떻게 묻는지가 이 로직의 핵심이다.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchAccountDays } from "./api.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** 시계열이 돌려줄 하루 시작 시각들과, total_value 요청을 기록하는 가짜 fetch */
function fakeInstagram(starts) {
  const asked = [];
  globalThis.fetch = async (url) => {
    const q = new URL(url).searchParams;
    if (q.get("metric") === "reach") {
      return Response.json({ data: [{ name: "reach", values: starts.map((s, i) => ({ value: i, end_time: s })) }] });
    }
    asked.push({ since: Number(q.get("since")), until: Number(q.get("until")) });
    return Response.json({ data: [{ name: "reach", total_value: { value: 100 } }] });
  };
  return asked;
}

const sec = (iso) => Date.parse(iso) / 1000;

test("서머타임이 시작되는 23시간짜리 날도 직전 경계에서 1초 뒤부터 묻는다", async () => {
  // 2027-03-14 미국 서부 서머타임 시작: 3/14 0시는 08:00Z, 3/15 0시는 07:00Z
  const starts = ["2027-03-13T08:00:00+0000", "2027-03-14T08:00:00+0000", "2027-03-15T07:00:00+0000", "2027-03-16T07:00:00+0000"];
  const asked = fakeInstagram(starts);
  const days = await fetchAccountDays("token", new Date("2027-03-14T00:00:00Z"), new Date("2027-03-17T05:00:00Z"));

  // 맨 앞 칸은 경계로만 쓰고, 마지막 칸(3/16)은 아직 안 끝났으니 뺀다
  assert.deepEqual(days.map((d) => d.day), ["2027-03-14", "2027-03-15"]);
  assert.deepEqual(asked, [
    { since: sec("2027-03-13T08:00:01Z"), until: sec("2027-03-14T08:00:00Z") },
    // "24시간 전 + 1초"(3/14 07:00:01Z)였다면 앞 칸 경계(08:00Z)를 넘어 이틀치가 합쳐진다
    { since: sec("2027-03-14T08:00:01Z"), until: sec("2027-03-15T07:00:00Z") },
  ]);
  assert.equal(days[0].dayEnd, "2027-03-15T07:00:00.000Z"); // 23시간짜리 하루
});

test("서머타임이 끝나는 25시간짜리 날도 날짜와 경계가 맞다", async () => {
  const starts = ["2026-10-31T07:00:00+0000", "2026-11-01T07:00:00+0000", "2026-11-02T08:00:00+0000", "2026-11-03T08:00:00+0000"];
  const asked = fakeInstagram(starts);
  const days = await fetchAccountDays("token", new Date("2026-11-01T00:00:00Z"), new Date("2026-11-04T08:00:00Z"));
  assert.deepEqual(days.map((d) => [d.day, d.dayStart, d.dayEnd]), [
    ["2026-11-01", "2026-11-01T07:00:00.000Z", "2026-11-02T08:00:00.000Z"],
    ["2026-11-02", "2026-11-02T08:00:00.000Z", "2026-11-03T08:00:00.000Z"],
    ["2026-11-03", "2026-11-03T08:00:00.000Z", "2026-11-04T08:00:00.000Z"],
  ]);
  assert.equal(asked[1].since, sec("2026-11-01T07:00:01Z"));
  assert.equal(days[0].reach, 100);
});
