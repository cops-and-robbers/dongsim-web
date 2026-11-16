// Speed Insights 에 보낼 측정 고르기 시험(#339). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { isAdminUrl, skipAdmin } from "./speedInsights.ts";

test("어드민 화면은 어드민으로 본다", () => {
  for (const url of [
    "https://admin.copsandrobbers.app/",
    "https://admin.copsandrobbers.app/admin",
    "https://admin.copsandrobbers.app/admin/games/12?tab=live",
    "https://copsandrobbers.app/admin",
    "https://copsandrobbers.app/admin/users",
    "http://admin.localhost:3000/admin/metrics",
    "http://localhost:3000/admin",
  ]) {
    assert.equal(isAdminUrl(url), true, url);
  }
});

test("방문자 화면은 어드민이 아니다", () => {
  for (const url of [
    "https://copsandrobbers.app/",
    "https://copsandrobbers.app/en",
    "https://copsandrobbers.app/online",
    "https://copsandrobbers.app/blog/admin-story",
    "https://copsandrobbers.app/administrator",
    "https://copsandrobbers.app/?from=admin",
    "https://notadmin.example.com/",
    "주소가 아님",
  ]) {
    assert.equal(isAdminUrl(url), false, url);
  }
});

test("어드민 측정은 보내지 않고 나머지는 그대로 보낸다", () => {
  const visitor = { type: "vital", url: "https://copsandrobbers.app/online", route: "/online" };
  assert.equal(skipAdmin(visitor), visitor);
  assert.equal(skipAdmin({ type: "vital", url: "https://admin.copsandrobbers.app/admin", route: "/admin" }), null);
});
