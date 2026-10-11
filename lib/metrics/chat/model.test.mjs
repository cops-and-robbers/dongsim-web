// 서비스 계정 키 읽기 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { serviceAccount } from "./model.ts";

const json = JSON.stringify({ client_email: "a@b.iam.gserviceaccount.com", private_key: "-----KEY-----SECRETPART" });

test("따옴표로 감싼 값도 읽는다", () => {
  assert.equal(serviceAccount(json).client_email, "a@b.iam.gserviceaccount.com");
  assert.equal(serviceAccount(`'${json}'`).client_email, "a@b.iam.gserviceaccount.com");
  assert.equal(serviceAccount(`  ${json}\n`).client_email, "a@b.iam.gserviceaccount.com");
});

test("깨진 키여도 오류 메시지에 키 조각이 실리지 않는다", () => {
  const broken = json.slice(0, -2);
  assert.throws(() => serviceAccount(broken), (e) => !e.message.includes("SECRETPART") && /읽지 못했어요/.test(e.message));
  assert.throws(() => serviceAccount(JSON.stringify({ private_key: "SECRETPART" })), (e) => !e.message.includes("SECRETPART"));
});
