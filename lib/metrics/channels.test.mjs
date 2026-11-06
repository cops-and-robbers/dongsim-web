// 유입 채널 묶기 테스트 (#145, #171, #207). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { channelOf } from "./channels.ts";

test("행사 링크 QR(매체 qr)은 출처와 상관없이 직접 입력과 QR", () => {
  assert.equal(channelOf("booth", "qr"), "직접 입력과 QR");
  assert.equal(channelOf("chanbin-blog", "qr"), "직접 입력과 QR");
  assert.equal(channelOf("(direct)", "(none)"), "직접 입력과 QR");
});

test("인스타 꼬리표는 매체가 qr 이어도 인스타그램", () => {
  assert.equal(channelOf("instagram", "qr"), "인스타그램");
});

test("매체가 qr 이 아니면 예전대로", () => {
  assert.equal(channelOf("booth", "referral"), "다른 사이트");
  assert.equal(channelOf("google", "organic"), "검색");
});

test("당근 광고와 비즈프로필 꼬리표, 당근 웹과 앱에서 넘어온 방문은 당근", () => {
  assert.equal(channelOf("daangn", "keyword"), "당근");
  assert.equal(channelOf("daangn", "bizprofile"), "당근");
  assert.equal(channelOf("www.daangn.com", "referral"), "당근");
  assert.equal(channelOf("localprofile.karrotwebview.com", "referral"), "당근");
});

test("이름에 daangn 이 들어 있기만 한 다른 출처는 당근이 아니다", () => {
  assert.equal(channelOf("daangn-fan.blog", "referral"), "다른 사이트");
});
