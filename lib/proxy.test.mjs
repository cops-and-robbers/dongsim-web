// 미들웨어(proxy.ts)가 필요한 요청에만 도는지 시험한다(#335). 실행: pnpm test
import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server.js";
import { NextRequest } from "next/server.js";

// proxy.ts 는 Next 방식대로 "next/server" 를 확장자 없이 부른다. 노드 ESM 은 이걸 못 찾아서
// 시험에서만 "next/server.js" 로 이어 준다
register(
  "data:text/javascript,export async function resolve(s, c, n) { return n(s === 'next/server' ? 'next/server.js' : s, c); }",
  import.meta.url,
);
const { config, proxy } = await import("../proxy.ts");

const runs = (url) => unstable_doesMiddlewareMatch({ config, url: new URL(url).pathname + new URL(url).search, headers: { host: new URL(url).host } });

test("새 도메인의 일반 요청에는 돌지 않는다", () => {
  for (const url of [
    "https://copsandrobbers.app/",
    "https://copsandrobbers.app/online",
    "https://copsandrobbers.app/en/blog/korea-keidoro",
    "https://copsandrobbers.app/fonts/pretendard/1.3.9/pretendardvariable-dynamic-subset.css",
    "https://copsandrobbers.app/characters/police.svg",
    "https://copsandrobbers.app/api/admin/reviews?count=1",
    "https://copsandrobbers.app/administrator",
    "https://admin.copsandrobbers.app/api/admin/overview",
    "https://admin.copsandrobbers.app/characters/robber.svg",
    "https://dongsim-git-main.vercel.app/",
  ]) {
    assert.equal(runs(url), false, url);
  }
});

test("구 도메인은 모든 경로에서 돈다(_next 만 빼고)", () => {
  for (const url of [
    "https://copsnro66ers.site/",
    "https://copsnro66ers.site/blog/startup-story",
    "https://www.copsnro66ers.site/online",
    "https://admin.copsnro66ers.site/admin/users",
    "https://copsnro66ers.site/.well-known/assetlinks.json",
    "https://copsnro66ers.site:443/team",
  ]) {
    assert.equal(runs(url), true, url);
  }
  assert.equal(runs("https://copsnro66ers.site/_next/static/chunks/main.js"), false);
  // 이름이 비슷한 다른 도메인은 고르지 않는다
  assert.equal(runs("https://copsnro66ers.site.example.com/"), false);
  assert.equal(runs("https://notcopsnro66ers.site/"), false);
});

test("/admin 은 메인 도메인에서만 돈다(404 로 숨긴다)", () => {
  for (const url of [
    "https://copsandrobbers.app/admin",
    "https://copsandrobbers.app/admin/users/12",
    "https://dongsim-git-main.vercel.app/admin/metrics",
  ]) {
    assert.equal(runs(url), true, url);
  }
});

test("admin 서브도메인과 로컬의 /admin 은 통과시키기만 하니 돌지 않는다(#337)", () => {
  for (const url of [
    "https://admin.copsandrobbers.app/admin",
    "https://admin.copsandrobbers.app/admin/games/history/3",
    "https://admin.copsandrobbers.app:443/admin/reports",
    "http://admin.localhost:3000/admin/users",
    "http://localhost:3000/admin/metrics",
    "http://127.0.0.1:3000/admin",
  ]) {
    assert.equal(runs(url), false, url);
  }
  // 이름에 admin 이 들어간 다른 도메인은 빼지 않는다
  assert.equal(runs("https://notadmin.example.com/admin"), true);
});

test("admin 서브도메인 루트에서 돈다", () => {
  assert.equal(runs("https://admin.copsandrobbers.app/"), true);
  assert.equal(runs("http://admin.localhost:3000/"), true);
});

const call = (url) => proxy(new NextRequest(url, { headers: { host: new URL(url).host } }));

test("하는 일은 그대로다", () => {
  const moved = call("https://www.copsnro66ers.site/blog/a?x=1");
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get("location"), "https://copsandrobbers.app/blog/a?x=1");

  const movedAdmin = call("https://admin.copsnro66ers.site/admin/users");
  assert.equal(movedAdmin.headers.get("location"), "https://admin.copsandrobbers.app/admin/users");

  assert.equal(call("https://copsnro66ers.site/.well-known/assetlinks.json").headers.get("x-middleware-next"), "1");

  assert.equal(call("https://admin.copsandrobbers.app/").headers.get("x-middleware-rewrite"), "https://admin.copsandrobbers.app/admin");

  const hidden = call("https://copsandrobbers.app/admin/users");
  assert.equal(hidden.status, 404);
  assert.match(hidden.headers.get("x-middleware-rewrite") ?? "", /\/_not-found$/);

  assert.equal(call("https://admin.copsandrobbers.app/admin/users").headers.get("x-middleware-next"), "1");
  assert.equal(call("http://localhost:3000/admin").headers.get("x-middleware-next"), "1");
});
