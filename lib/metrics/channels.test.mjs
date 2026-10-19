// 유입 채널 묶기 테스트 (#145, #171). 실행: pnpm test
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
