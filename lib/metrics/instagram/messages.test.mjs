// 리포트 문구 테스트 (#140). 기대 문장이 곧 디스코드에 나가는 모양이다.
// 숫자와 올린 시각은 실제 계정의 게시물 12개 값이다 (2026-10-05 실측). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { webhookBody } from "../discord.ts";
import {
  DISCORD_CONTENT_LIMIT,
  buildPostReport,
  buildSpikeAlert,
  captionLine,
  formatMultiple,
  withCopula,
} from "./messages.ts";
import { standingOf } from "./rules.ts";

const metrics = (m) => ({
  views: null, reach: null, likes: null, comments: null, saved: null, shares: null,
  totalInteractions: null, profileVisits: null, follows: null, bioLinkClicks: null,
  avgWatchMs: null, totalWatchMs: null, skipRate: null, ...m,
});

const recruit = {
  id: "recruit",
  permalink: "https://www.instagram.com/p/Dc2t6nKIJOg/",
  caption: "<청춘대로> '경찰과 도둑: 건국대 VS 세종대' 참가자 모집\n안녕하세요, '경찰과 도둑' 앱을 운영하고 있어요",
  mediaType: "CAROUSEL_ALBUM",
  productType: "FEED",
  postedAt: "2026-09-04T06:13:56.000Z",
  latest: metrics({
    views: 10166, reach: 5310, likes: 36, comments: 2, saved: 4, shares: 218,
    profileVisits: 122, follows: 2, bioLinkClicks: 13,
  }),
};

const festival = {
  id: "festival",
  permalink: "https://www.instagram.com/p/Dd_KuLGIBlw/",
  caption: "50만 줄의 코딩은 지금 이 순간을 위해 존재했던 것 아닐까요?",
  mediaType: "CAROUSEL_ALBUM",
  productType: "FEED",
  postedAt: "2026-10-02T09:30:58.000Z",
  latest: metrics({
    views: 660, reach: 252, likes: 15, comments: 2, saved: 1, shares: 6,
    profileVisits: 24, follows: 0, bioLinkClicks: 0,
  }),
};

const reel = {
  id: "reel",
  permalink: "https://www.instagram.com/reel/DdWsq5OTj34/",
  caption: "건대생들도대체다어디갔나요........",
  mediaType: "VIDEO",
  productType: "REELS",
  postedAt: "2026-09-16T16:19:45.000Z",
  latest: metrics({
    views: 3611, reach: 2279, likes: 33, comments: 11, saved: 1, shares: 88,
    avgWatchMs: 7891, skipRate: 66.8,
  }),
};

// 나머지 9개 게시물의 올린 시각, 종류, 도달, 공유
const others = [
  ["2026-10-04T14:43:57Z", "FEED", 68, 0],
  ["2026-09-26T14:36:01Z", "REELS", 167, 1],
  ["2026-09-23T09:34:10Z", "FEED", 181, 7],
  ["2026-09-15T10:26:00Z", "FEED", 849, 21],
  ["2026-09-13T12:29:18Z", "FEED", 385, 7],
  ["2026-09-11T07:15:32Z", "FEED", 592, 6],
  ["2026-09-09T10:40:58Z", "FEED", 515, 21],
  ["2026-09-02T07:19:48Z", "FEED", 226, 12],
  ["2026-08-25T09:23:14Z", "FEED", 588, 18],
].map(([postedAt, productType, reach, shares], i) => ({
  id: `o${i}`,
  permalink: `https://www.instagram.com/p/o${i}/`,
  caption: null,
  mediaType: "CAROUSEL_ALBUM",
  productType,
  postedAt: new Date(postedAt).toISOString(),
  latest: metrics({ reach, shares }),
}));

const all = [recruit, festival, reel, ...others];
const byReach = (m) => m.latest?.reach ?? null;
const byShares = (m) => m.latest?.shares ?? null;
const report = (post, now, media = all) =>
  buildPostReport(post, new Date(now), standingOf(post, media, byReach), standingOf(post, media, byShares));

test("받침에 맞는 예요/이에요", () => {
  assert.equal(withCopula("12배쯤"), "12배쯤이에요");
  assert.equal(withCopula("4.5배"), "4.5배예요");
  assert.equal(withCopula("게시물"), "게시물이에요");
  assert.equal(withCopula("릴스"), "릴스예요");
});

test("배수 표기", () => {
  assert.equal(formatMultiple(11.8), "12배쯤");
  assert.equal(formatMultiple(3.876), "3.9배");
  assert.equal(formatMultiple(8.97), "9배");
});

test("캡션은 첫 줄 80자까지, 서식 기호는 글자로", () => {
  assert.equal(captionLine("\n\n  첫 줄 *굵게* _기울임_\n둘째 줄"), "첫 줄 \\*굵게\\* \\_기울임\\_");
  assert.equal(captionLine("<청춘대로> (모집)"), "<청춘대로> (모집)");
  assert.equal(captionLine("   "), null);
  assert.equal(captionLine(null), null);
  assert.equal(captionLine("가".repeat(100)), `${"가".repeat(80)}...`);
});

test("피드 게시물 리포트 - 먼저 올린 게시물이 적으면 비교 문장을 빼고 순위만", () => {
  assert.equal(
    report(recruit, "2026-09-07T09:00:00.000Z"),
    [
      "**9월 4일 게시물을 올리고 3일 동안 5,310명이 봤어요**",
      "이 게시물까지 올린 3개 중 가장 많이 봤어요.",
      "",
      "**본 사람**",
      "- 조회 10,166회",
      "- 도달 5,310명",
      "",
      "**프로필까지 온 사람**",
      "- 프로필 방문 122회",
      "- 프로필 링크 클릭 13회",
      "- 팔로우 2명",
      "",
      "**반응**",
      "- 공유 218회 (3개 중 1위)",
      "- 좋아요 36개",
      "- 댓글 2개",
      "- 저장 4회",
      "",
      "-# <청춘대로> '경찰과 도둑: 건국대 VS 세종대' 참가자 모집",
      "-# <https://www.instagram.com/p/Dc2t6nKIJOg/>",
    ].join("\n"),
  );
});

test("피드 게시물 리포트 - 보통보다 적게 본 경우", () => {
  assert.equal(
    report(festival, "2026-10-05T10:00:00.000Z"),
    [
      "**10월 2일 게시물을 올리고 3일 동안 252명이 봤어요**",
      "이 게시물까지 올린 11개 중 8번째로 많이 봤어요. 보통 게시물(552명)보다 적은 사람이 봤어요.",
      "",
      "**본 사람**",
      "- 조회 660회",
      "- 도달 252명",
      "",
      "**프로필까지 온 사람**",
      "- 프로필 방문 24회",
      "- 프로필 링크 클릭 0회",
      "- 팔로우 0명",
      "",
      "**반응**",
      "- 공유 6회",
      "- 좋아요 15개",
      "- 댓글 2개",
      "- 저장 1회",
      "",
      "-# 50만 줄의 코딩은 지금 이 순간을 위해 존재했던 것 아닐까요?",
      "-# <https://www.instagram.com/p/Dd_KuLGIBlw/>",
      "-# 보통 게시물은 이 게시물보다 먼저 올린 10개를 본 사람 수로 줄 세운 가운데 값이에요.",
    ].join("\n"),
  );
});

test("릴스 리포트는 프로필 대신 시청 지표, 날짜는 한국 시간", () => {
  assert.equal(
    report(reel, "2026-09-20T00:30:00.000Z"),
    [
      "**9월 17일 릴스를 올리고 3일 동안 2,279명이 봤어요**",
      "이 릴스까지 올린 8개 중 2번째로 많이 봤어요. 보통 게시물(588명)의 3.9배예요.",
      "",
      "**본 사람**",
      "- 조회 3,611회",
      "- 도달 2,279명",
      "- 처음 3초 안에 넘긴 비율 66.8%",
      "- 평균 시청 7.9초",
      "",
      "**반응**",
      "- 공유 88회 (8개 중 2위)",
      "- 좋아요 33개",
      "- 댓글 11개",
      "- 저장 1회",
      "",
      "-# 건대생들도대체다어디갔나요........",
      "-# <https://www.instagram.com/reel/DdWsq5OTj34/>",
      "-# 보통 게시물은 이 릴스보다 먼저 올린 7개를 본 사람 수로 줄 세운 가운데 값이에요.",
    ].join("\n"),
  );
});

test("꼴찌면 가장 적게 봤다고 쓴다", () => {
  const latest = { ...festival, id: "latest", postedAt: "2026-10-05T00:00:00.000Z", latest: metrics({ reach: 10 }) };
  assert.match(report(latest, "2026-10-08T01:00:00.000Z", [...all, latest]), /\n이 게시물까지 올린 13개 중 가장 적게 봤어요\. /);
});

test("값이 없는 지표는 줄째로, 줄이 다 빠진 묶음은 소제목째로 뺀다", () => {
  const lone = { ...recruit, latest: metrics({ reach: 40, views: 90 }) };
  assert.equal(
    report(lone, "2026-09-07T09:00:00.000Z", [lone]),
    [
      "**9월 4일 게시물을 올리고 3일 동안 40명이 봤어요**",
      "",
      "**본 사람**",
      "- 조회 90회",
      "- 도달 40명",
      "",
      "-# <청춘대로> '경찰과 도둑: 건국대 VS 세종대' 참가자 모집",
      "-# <https://www.instagram.com/p/Dc2t6nKIJOg/>",
    ].join("\n"),
  );
});

const spikeDay = {
  day: "2026-09-13",
  dayStart: "2026-09-13T07:00:00.000Z",
  dayEnd: "2026-09-14T07:00:00.000Z",
  reach: 2152, views: null, profileViews: null, websiteClicks: null, accountsEngaged: null, totalInteractions: null,
};

test("급상승 알림 - 첫 줄에 배수까지", () => {
  // since 는 그 하루가 시작되기 전 마지막 수집 (9월 13일 오전 9시)
  const content = buildSpikeAlert(
    { day: spikeDay, baseline: 240, multiple: 2152 / 240 },
    { media: recruit, gained: 1820, since: "2026-09-13T00:00:00.000Z" },
  );
  assert.equal(
    content,
    [
      "**9월 13일 하루 동안 2,152명이 우리 인스타를 봤어요. 평소의 9배예요**",
      "평소에는 하루 240명쯤 봤어요.",
      "이 무렵 조회가 가장 많이 늘어난 건 9월 4일 게시물이에요.",
      "9월 13일 오전 9시 이후 1,820회 늘었어요.",
      "",
      "-# <https://www.instagram.com/p/Dc2t6nKIJOg/>",
      "-# 게시물, 릴스, 스토리를 여러 개 본 사람도 한 명으로 셌어요. 평소는 직전 14일의 가운데 값이에요.",
      "-# 9월 13일은 미국 서부 시간 기준이에요. 한국 시간으로는 9월 13일 오후 4시부터 다음 날 오후 4시까지예요.",
    ].join("\n"),
  );
});

test("평소가 0명이었으면 배수 대신 그렇게 말하고, 늘어난 게시물을 모르면 그 줄을 뺀다", () => {
  const content = buildSpikeAlert({ day: spikeDay, baseline: 0, multiple: 2152 }, null);
  assert.match(content, /^\*\*9월 13일 하루 동안 2,152명이 우리 인스타를 봤어요\*\*\n직전 2주 동안은 거의 보는 사람이 없었어요\./);
  assert.doesNotMatch(content, /배/);
  assert.doesNotMatch(content, /늘어난|평소는/);
});

test("서머타임이 끝난 뒤에는 한국 시간 경계가 오후 5시다", () => {
  const winter = { ...spikeDay, day: "2026-11-10", dayStart: "2026-11-10T08:00:00.000Z", dayEnd: "2026-11-11T08:00:00.000Z" };
  assert.match(buildSpikeAlert({ day: winter, baseline: 100, multiple: 21.5 }, null), /11월 10일 오후 5시부터 다음 날 오후 5시까지예요\.$/);
});

test("모든 메시지가 디스코드 상한 안이고 긴 대시를 쓰지 않는다", () => {
  const huge = { ...recruit, caption: "*".repeat(5000) };
  const contents = [
    report(huge, "2026-09-07T09:00:00.000Z"),
    report(reel, "2026-09-20T00:30:00.000Z"),
    buildSpikeAlert({ day: spikeDay, baseline: 240, multiple: 9 }, null),
  ];
  for (const c of contents) {
    assert.ok(c.length <= DISCORD_CONTENT_LIMIT);
    assert.doesNotMatch(c, /[\u2014\u2013]/); // 긴 대시 (저장소 규칙)
  }
});

test("웹후크 본문은 어떤 멘션도 울리지 않는다", () => {
  assert.deepEqual(webhookBody("@everyone 안녕"), { content: "@everyone 안녕", allowed_mentions: { parse: [] } });
});
