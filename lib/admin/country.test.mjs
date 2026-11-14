// 어드민 국가 표시 규칙 테스트 (#319). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { countryName, isAbroad, summarizeCountries } from "./country.ts";

test("국가 이름은 한국어로, 긴 이름은 짧게 바꾼다", () => {
  assert.equal(countryName("JP"), "일본");
  assert.equal(countryName("jp"), "일본");
  assert.equal(countryName("AU"), "호주");
  assert.equal(countryName("HK"), "홍콩");
  assert.equal(countryName("US"), "미국");
  assert.equal(countryName("KR"), "대한민국");
  // 처음 보는 나라도 브라우저가 이름을 안다
  assert.equal(countryName("CY"), "키프로스");
});

test("모르는 코드는 코드 그대로 보여 준다", () => {
  assert.equal(countryName("QZ"), "QZ");
});

test("주로 플레이하는 국가는 서버가 준 첫 줄, 확인 중인 판은 따로 센다", () => {
  const s = summarizeCountries([
    { countryCode: "JP", games: 10 },
    { countryCode: "KR", games: 2 },
    { countryCode: null, games: 3 },
  ]);
  assert.equal(s.main?.countryCode, "JP");
  assert.deepEqual(s.others.map((c) => c.countryCode), ["KR"]);
  assert.equal(s.known, 12);
  assert.equal(s.pending, 3);
});

test("국가를 아는 판이 없으면 대표 국가가 없다", () => {
  const s = summarizeCountries([{ countryCode: null, games: 4 }]);
  assert.equal(s.main, null);
  assert.equal(s.pending, 4);
  assert.deepEqual(summarizeCountries([]), { main: null, others: [], known: 0, pending: 0 });
});

test("한국이 아닐 때만 해외로 본다", () => {
  assert.equal(isAbroad("JP"), true);
  assert.equal(isAbroad("kr"), false);
  assert.equal(isAbroad(null), false);
  assert.equal(isAbroad(undefined), false);
});
