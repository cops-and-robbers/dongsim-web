// 행사 링크 짧은 주소 테스트 (#171). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { campaignToken, downloadPath, isCode, linkFieldsOf, linkResult } from "./links.ts";
import { appStoreCampaignToken, readUtm } from "./campaign.ts";

const BOOTH = { code: "nowon", label: "노원 축제 부스", source: "booth", campaign: "nowon-festival-2026" };

test("주소 코드는 소문자, 숫자, 하이픈 2~24자", () => {
  for (const ok of ["nowon", "blog", "a1", "seoul-0919", "x".repeat(24)]) assert.equal(isCode(ok), true, ok);
  for (const bad of ["", "a", "-a", "a-", "Nowon", "노원", "a b", "a/b", "x".repeat(25)]) assert.equal(isCode(bad), false, bad);
});

test("매체를 비우면 qr, 코드는 소문자로 맞춘다", () => {
  const f = linkFieldsOf({ ...BOOTH, code: "NoWon" }, false);
  assert.equal(typeof f, "object");
  assert.equal(f.code, "nowon");
  assert.equal(f.utm_medium, "qr");
  assert.equal(f.utm_content, null);
  assert.equal(f.event_id, null);
});

test("/download 가 버리는 글자는 등록할 때 막는다", () => {
  assert.match(linkFieldsOf({ ...BOOTH, campaign: "노원 축제" }, false), /영문, 숫자/);
  assert.match(linkFieldsOf({ ...BOOTH, source: "" }, false), /출처를 적어/);
  assert.match(linkFieldsOf({ ...BOOTH, content: "a b" }, false), /구분은/);
  assert.match(linkFieldsOf({ ...BOOTH, label: "" }, false), /이름을 적어/);
});

test("App Store 캠페인 토큰이 30자를 넘으면 막는다", () => {
  // booth-nowon-festival-2026-poster = 31자
  assert.match(linkFieldsOf({ ...BOOTH, content: "poster" }, false), /App Store/);
  assert.equal(typeof linkFieldsOf({ ...BOOTH, content: "a" }, false), "object");
});

test("하나만 고쳐도 지금 값과 합쳐 토큰 길이를 본다", () => {
  const current = { utm_source: "booth", utm_campaign: "nowon-festival-2026", utm_content: null };
  assert.match(linkFieldsOf({ content: "poster" }, true, current), /App Store/);
  assert.deepEqual(linkFieldsOf({ label: "노원 부스" }, true, current), { label: "노원 부스" });
});

test("짧은 주소가 보내는 /download 꼬리표를 /download 가 그대로 읽는다", () => {
  const link = { source: "booth", medium: "qr", campaign: "nowon-festival-2026", content: "a" };
  const path = downloadPath(link);
  assert.equal(path, "/download?utm_source=booth&utm_medium=qr&utm_campaign=nowon-festival-2026&utm_content=a");
  assert.deepEqual(readUtm(path.slice(path.indexOf("?"))), {
    utm_source: "booth",
    utm_medium: "qr",
    utm_campaign: "nowon-festival-2026",
    utm_content: "a",
  });
  assert.equal(downloadPath({ ...link, content: null }).includes("utm_content"), false);
});

test("토큰은 /download 가 App Store 로 넘기는 것과 같다(30자 안일 때)", () => {
  const utm = { utm_source: "chanbin-blog", utm_campaign: "metrics", utm_content: "qr1" };
  assert.equal(campaignToken("chanbin-blog", "metrics", "qr1"), appStoreCampaignToken(utm));
  assert.equal(campaignToken("booth", "nowon", null), appStoreCampaignToken({ utm_source: "booth", utm_campaign: "nowon" }));
});

test("링크별 결과는 출처, 매체, 캠페인이 같은 줄만 더한다", () => {
  const d = {
    webCampaigns: [
      { source: "booth", medium: "qr", campaign: "nowon", sessions: 5 },
      { source: "booth", medium: "qr", campaign: "nowon", sessions: 2 }, // 구분이 달라도 같은 링크
      { source: "booth", medium: "qr", campaign: "seoul", sessions: 9 },
      { source: "instagram", medium: "bio", campaign: "always", sessions: 30 },
    ],
    appCampaigns: [
      { source: "booth", medium: "qr", campaign: "nowon", sessions: 3 },
      { source: "booth", medium: "qr", campaign: "nowon", sessions: 1 },
    ],
    downloadCampaigns: [{ source: "booth", medium: "qr", campaign: "nowon", clicks: 4 }],
  };
  assert.deepEqual(linkResult({ source: "booth", medium: "qr", campaign: "nowon" }, d), { visits: 7, storeMoves: 4, androidFirstOpens: 4 });
  assert.deepEqual(linkResult({ source: "booth", medium: "qr", campaign: "none" }, d), { visits: 0, storeMoves: 0, androidFirstOpens: 0 });
});

test("자동 캠페인: 일정은 날짜와 번호, 없으면 오늘, 겹치면 번호를 붙인다", async () => {
  const { autoCampaign } = await import("./links.ts");
  const ev = { id: 12, day: "2026-10-24" };
  assert.equal(autoCampaign(ev, "2026-10-19", "booth", []), "ev-20261024-12");
  assert.equal(autoCampaign(null, "2026-10-19", "blog", []), "link-20261019");
  const taken = [
    { source: "booth", medium: "qr", campaign: "ev-20261024-12" },
    { source: "booth", medium: "qr", campaign: "ev-20261024-12-2" },
    { source: "poster", medium: "qr", campaign: "ev-20261024-12" },
  ];
  assert.equal(autoCampaign(ev, "2026-10-19", "booth", taken), "ev-20261024-12-3");
  assert.equal(autoCampaign(ev, "2026-10-19", "flyer", taken), "ev-20261024-12");
});

test("자동 코드: 헷갈리는 글자 없이 5자, 이미 쓰는 코드는 피한다", async () => {
  const { freshCode, randomCode, isCode, linkFieldsOf, autoCampaign, PLACES } = await import("./links.ts");
  for (let i = 0; i < 200; i++) {
    const c = randomCode();
    assert.equal(c.length, 5);
    assert.equal(isCode(c), true, c);
    assert.doesNotMatch(c, /[01oil]/);
  }
  let k = 0;
  const seq = [0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5];
  const rnd = () => seq[k++];
  assert.equal(freshCode(["aaaaa"], rnd), "ppppp".replace(/p/g, "abcdefghjkmnpqrstuvwxyz23456789"[15]));
  // 자동으로 지은 값은 등록 검사를 늘 통과한다(가장 긴 출처 + 가장 긴 캠페인)
  const longest = PLACES.reduce((a, p) => (p.source.length > a.length ? p.source : a), "");
  const fields = linkFieldsOf(
    { label: "노원 청소년축제 부스", code: randomCode(), source: longest, campaign: autoCampaign({ id: 99999, day: "2026-12-31" }, "2026-10-19", longest, []) + "-12" },
    false,
  );
  assert.equal(typeof fields, "object", String(fields));
});
