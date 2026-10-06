// /download UTM 이어 넘기기 테스트 (#144). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { appStoreCampaignToken, readUtm, storeLinksWithUtm } from "./campaign.ts";

const LINKS = {
  googlePlay: "https://play.google.com/store/apps/details?id=com.elipair.copsandrobbers",
  appStore: "https://apps.apple.com/app/id6756843948",
};
// 링크트리 다운로드 버튼에 실제로 붙인 꼬리표
const LINKTREE = "?utm_source=instagram&utm_medium=bio&utm_campaign=always&utm_content=download";

test("UTM 이 없으면(일반 QR) 원래 주소 그대로", () => {
  assert.deepEqual(storeLinksWithUtm(LINKS, "", "123456"), { ...LINKS, campaign: null });
  assert.deepEqual(storeLinksWithUtm(LINKS, "?foo=bar", "123456"), { ...LINKS, campaign: null });
});

test("Play 는 referrer 에 UTM 을 담는다", () => {
  const { googlePlay } = storeLinksWithUtm(LINKS, LINKTREE, undefined);
  const url = new URL(googlePlay);
  assert.equal(url.searchParams.get("id"), "com.elipair.copsandrobbers");
  assert.equal(
    url.searchParams.get("referrer"),
    "utm_source=instagram&utm_medium=bio&utm_campaign=always&utm_content=download",
  );
});

test("App Store 는 공급자 토큰이 있을 때만 캠페인 토큰을 붙인다", () => {
  const withPt = new URL(storeLinksWithUtm(LINKS, LINKTREE, "118240871").appStore);
  assert.equal(withPt.pathname, "/app/id6756843948");
  assert.equal(withPt.searchParams.get("pt"), "118240871");
  assert.equal(withPt.searchParams.get("ct"), "instagram-always-download");
  assert.equal(withPt.searchParams.get("mt"), "8");

  // 공급자 토큰이 없으면 ct 만으로는 집계되지 않으므로 원래 주소 그대로
  assert.equal(storeLinksWithUtm(LINKS, LINKTREE, undefined).appStore, LINKS.appStore);
  // 숫자가 아닌 토큰은 받지 않는다
  assert.equal(storeLinksWithUtm(LINKS, LINKTREE, "abc").appStore, LINKS.appStore);
});

test("캠페인 토큰은 30자를 넘지 않는다", () => {
  const ct = appStoreCampaignToken({ utm_source: "instagram", utm_campaign: "a".repeat(60) });
  assert.equal(ct.length, 30);
});

test("주소를 깨뜨리거나 흉내 낼 수 있는 값은 버린다", () => {
  assert.deepEqual(readUtm("?utm_source=insta%26gram&utm_campaign=ok"), { utm_campaign: "ok" });
  assert.deepEqual(readUtm("?utm_source=%3Cscript%3E"), null);
  assert.deepEqual(readUtm(`?utm_source=${"a".repeat(65)}`), null);
});
