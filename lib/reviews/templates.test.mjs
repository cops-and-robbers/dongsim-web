// 리뷰 답변 문구 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { CUSTOM_BLANK, replyProblem } from "./model.ts";
import { fillTemplate, fits, lengthOf, overPlay, recommend, replyLangOf, templateProblem } from "./templates.ts";

const r = (body, platform = "ios", place = "KOR") => ({ body, platform, place });
const t = (id, fit, ko, ja = "") => ({ id, title: `문구${id}`, fit, bodies: { ko, en: "", ja }, updatedBy: "a", updatedAt: "" });

test("글의 언어를 스토어 나라보다 먼저 본다", () => {
  assert.equal(replyLangOf(r("좋아요", "ios", "USA")), "ko");
  assert.equal(replyLangOf(r("楽しいです", "ios", "KOR")), "ja");
  assert.equal(replyLangOf(r("Great game", "ios", "KOR")), "en");
});

test("글로 모르면 나라나 언어 코드로 고른다", () => {
  assert.equal(replyLangOf(r("👍", "ios", "JPN")), "ja");
  assert.equal(replyLangOf(r("👍", "android", "ko_KR")), "ko");
  assert.equal(replyLangOf(r("👍", "android", "fr")), null);
  assert.equal(replyLangOf(r("👍", "ios", null)), null);
});

test("이름을 채우고 없으면 언어에 맞는 말로 대신한다", () => {
  assert.equal(fillTemplate("{이름}님, 고마워요.", "치즈", "ko"), "치즈님, 고마워요.");
  assert.equal(fillTemplate("{이름}님, 고마워요.", " ", "ko"), "이용자님, 고마워요.");
  assert.equal(fillTemplate("Hi {이름},", "", "en"), "Hi there,");
});

test("맞춤 문장 자리가 남아 있으면 올릴 수 없다", () => {
  const filled = fillTemplate("고마워요. {맞춤 문장}", "치즈", "ko");
  assert.ok(filled.includes(CUSTOM_BLANK));
  assert.match(replyProblem("ios", filled), /맞춤 문장/);
  assert.equal(replyProblem("ios", filled.replace(CUSTOM_BLANK, "지도를 고쳤어요.")), null);
});

test("별점이 맞고 언어가 있는 문구가 먼저 온다", () => {
  const list = [t(1, "high", "고마워요"), t(2, "any", "안녕하세요"), t(3, "low", "죄송해요"), t(4, "low", "")];
  assert.deepEqual(recommend(list, 1, "ko").map((x) => x.id), [3, 2, 1, 4]);
  assert.deepEqual(recommend(list, 5, "ko").map((x) => x.id), [1, 2, 3, 4]);
});

test("낮은 별점 문구는 3점까지, 높은 별점 문구는 4점부터 맞는다", () => {
  assert.equal(fits("low", 3), true);
  assert.equal(fits("low", 4), false);
  assert.equal(fits("high", 4), true);
  assert.equal(fits("any", 1), true);
});

test("언어가 없는 문구는 맨 뒤로 간다", () => {
  assert.deepEqual(recommend([t(1, "low", "죄송해요"), t(2, "any", "", "こんにちは")], 1, "ja").map((x) => x.id), [2, 1]);
});

test("Play 한도는 토큰을 빼고 센다", () => {
  assert.equal(lengthOf("{이름}님 {맞춤 문장}"), 1);
  assert.equal(overPlay("가".repeat(350)), false);
  assert.equal(overPlay("가".repeat(351)), true);
});

test("이름과 한 언어 이상의 문구가 있어야 저장한다", () => {
  const bodies = { ko: "고마워요", en: "", ja: "" };
  assert.equal(templateProblem({ title: "감사", fit: "any", bodies }), null);
  assert.match(templateProblem({ title: " ", fit: "any", bodies }), /상황 이름/);
  assert.match(templateProblem({ title: "가".repeat(31), fit: "any", bodies }), /30자/);
  assert.match(templateProblem({ title: "감사", fit: "any", bodies: { ko: " ", en: "", ja: "" } }), /한 언어/);
});
