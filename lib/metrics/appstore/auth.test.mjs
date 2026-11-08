// App Store Connect 키 읽기 테스트. 실행: pnpm test
// Vercel 값 칸에 .p8 을 붙이면 줄바꿈이 빠지거나 "\n" 글자가 되는데, 어떤 모양이든 같은 키로 읽혀야 한다.
import assert from "node:assert/strict";
import { createPrivateKey, generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { ascToken, normalizePem } from "./auth.ts";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });
const der = (p) => createPrivateKey(p).export({ type: "pkcs8", format: "der" }).toString("base64");

test("줄바꿈이 빠지거나 공백, \\n 글자, 따옴표로 바뀐 키도 같은 키로 읽는다", () => {
  const shapes = {
    원본: pem,
    공백: pem.replace(/\n/g, " "),
    줄바꿈없음: pem.replace(/\n/g, ""),
    역슬래시n: pem.replace(/\n/g, "\\n"),
    따옴표: `"${pem.trim()}"`,
    윈도우줄바꿈: pem.replace(/\n/g, "\r\n"),
  };
  for (const [name, p] of Object.entries(shapes)) assert.equal(der(normalizePem(p)), der(pem), name);
});

test("출시용 키를 넘기면 그 키 ID 로 토큰을 만든다", () => {
  const token = ascToken(new Date("2026-11-08T00:00:00Z"), { issuer: "issuer-x", keyId: "KEY123", pem: pem.replace(/\n/g, " ") });
  const [head, body] = token.split(".").slice(0, 2).map((p) => JSON.parse(Buffer.from(p, "base64url").toString()));
  assert.equal(head.kid, "KEY123");
  assert.equal(body.iss, "issuer-x");
  assert.throws(() => ascToken(new Date(), { issuer: "x", keyId: "y" }), /환경변수가 없어요/);
});
