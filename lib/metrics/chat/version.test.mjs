// 체다 버전 지문 시험 (#163). 실행: pnpm test
// 지시문(FIXED)이나 도구 설명이 바뀌면 이 시험이 실패한다. 그때는 version.ts 의 버전을 올리고 바뀐 점을 적은 뒤,
// 아래 FINGERPRINT 를 실패 메시지에 나온 새 값으로 바꾼다. 버전이 같은데 답이 달라지는 일을 막는다
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { FIXED } from "./instructions.ts";
import { chatTools } from "./tools.ts";
import { CHANGELOG, CHEDDAR_VERSION } from "./version.ts";

const FINGERPRINT = { version: "1.0", hash: "8d5d90f94c120da4" };

test("지시문이나 도구 설명을 바꾸면 체다 버전도 올린다", () => {
  const tools = chatTools({});
  const desc = Object.entries(tools)
    .map(([k, t]) => `${k}:${t.description}`)
    .join("\n");
  const hash = createHash("sha256").update(`${FIXED}\n${desc}`).digest("hex").slice(0, 16);
  assert.equal(CHEDDAR_VERSION, FINGERPRINT.version, "version.ts 를 올렸으면 FINGERPRINT.version 도 맞춰 주세요");
  assert.equal(hash, FINGERPRINT.hash, `지시문이나 도구 설명이 바뀌었어요(새 지문 ${hash}). version.ts 의 버전을 올리고 바뀐 점을 적은 뒤 FINGERPRINT 를 새 값으로 바꿔 주세요`);
});

test("지금 버전의 바뀐 점이 적혀 있다", () => {
  assert.ok(CHANGELOG.some((c) => c.version === CHEDDAR_VERSION && c.notes.length > 0));
});
