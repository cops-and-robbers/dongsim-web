import assert from "node:assert/strict";
import { test } from "node:test";
import { csvRows, editedAfter, fromAsc, fromPlay, fromPlayCsv, listFor, replyProblem, stateOf, waitingCount } from "./model.ts";

const r = (over) => ({ platform: "ios", id: "a", rating: 5, title: "", body: "좋아요", translated: null, author: "", place: null, appVersion: null, device: null, reviewedAt: "2026-11-01T00:00:00Z", reply: null, replyAt: null, replyState: null, replyBy: null, skippedBy: null, skippedAt: null, draft: null, draftBy: null, ...over });

test("답글도 넘기기도 없으면 대기, 있으면 끝난다", () => {
  assert.equal(stateOf(r({})), "waiting");
  assert.equal(stateOf(r({ reply: "고마워요", replyAt: "2026-11-02T00:00:00Z" })), "replied");
  assert.equal(stateOf(r({ skippedAt: "2026-11-02T00:00:00Z" })), "skipped");
});

test("답글이나 넘기기 뒤에 리뷰가 고쳐지면 다시 대기로 돌아온다", () => {
  const replied = r({ reply: "고마워요", replyAt: "2026-11-02T00:00:00Z", reviewedAt: "2026-11-03T00:00:00Z" });
  assert.equal(editedAfter(replied), true);
  assert.equal(stateOf(replied), "waiting");
  assert.equal(stateOf(r({ skippedAt: "2026-11-02T00:00:00Z", reviewedAt: "2026-11-03T00:00:00Z" })), "waiting");
});

test("답글 대기는 낮은 별점 먼저, 같은 별점은 최근 것 먼저", () => {
  const list = [r({ id: "new5", rating: 5, reviewedAt: "2026-11-05T00:00:00Z" }), r({ id: "old1", rating: 1, reviewedAt: "2026-10-01T00:00:00Z" }), r({ id: "new1", rating: 1, reviewedAt: "2026-11-02T00:00:00Z" }), r({ id: "done", skippedAt: "2026-11-09T00:00:00Z" })];
  assert.deepEqual(listFor("waiting", list, "all").map((x) => x.id), ["new1", "old1", "new5"]);
  assert.deepEqual(listFor("done", list, "all").map((x) => x.id), ["done"]);
  assert.deepEqual(listFor("all", list, "android"), []);
  assert.equal(waitingCount(list), 3);
});

test("Play 답글은 350자까지, 빈 답글은 안 된다", () => {
  assert.equal(replyProblem("android", "가".repeat(350)), null);
  assert.match(replyProblem("android", "가".repeat(351)), /350자/);
  assert.equal(replyProblem("ios", "가".repeat(351)), null);
  assert.match(replyProblem("ios", "   "), /써 주세요/);
});

test("App Store 리뷰와 답글 상태를 읽는다", () => {
  const out = fromAsc({ id: "x", attributes: { rating: 4, title: "제목", body: "본문", reviewerNickname: "별명", territory: "KOR", createdDate: "2026-05-01T00:00:00-07:00" }, relationships: { response: { data: { id: "res" } } } }, [{ id: "res", attributes: { responseBody: "답", lastModifiedDate: "2026-05-02T00:00:00-07:00", state: "PENDING_PUBLISH" } }]);
  assert.deepEqual([out.rating, out.title, out.place, out.reply, out.replyState], [4, "제목", "KOR", "답", "pending"]);
  assert.equal(fromAsc({ id: "y", attributes: { rating: 5, createdDate: "2026-05-01T00:00:00Z" }, relationships: { response: {} } }, []).reply, null);
});

test("Play 리뷰의 원문과 번역, 제목을 나눈다", () => {
  const out = fromPlay({ reviewId: "p", authorName: "A", comments: [{ userComment: { text: "번역 제목 번역 본문", originalText: "Title\tBody text", starRating: 2, reviewerLanguage: "en", device: "a54x", appVersionName: "3.2.7", lastModified: { seconds: "1794000000" } } }, { developerComment: { text: "thanks", lastModified: { seconds: "1794000100" } } }] });
  assert.deepEqual([out.title, out.body, out.translated, out.rating, out.reply, out.replyState], ["Title", "Body text", "번역 제목 번역 본문", 2, "thanks", "published"]);
  const plain = fromPlay({ reviewId: "q", comments: [{ userComment: { text: "한국어 리뷰", starRating: 5, lastModified: { seconds: "1794000000" } } }] });
  assert.deepEqual([plain.title, plain.body, plain.translated, plain.reply], ["", "한국어 리뷰", null, null]);
});

const HEAD = "Package Name,App Version Code,App Version Name,Reviewer Language,Device,Review Submit Date and Time,Review Submit Millis Since Epoch,Review Last Update Date and Time,Review Last Update Millis Since Epoch,Star Rating,Review Title,Review Text,Developer Reply Date and Time,Developer Reply Millis Since Epoch,Developer Reply Text,Review Link";

test("CSV 칸 안의 쉼표, 따옴표, 줄바꿈을 읽는다", () => {
  assert.deepEqual(csvRows('a,b\n"1,2","줄\n바꿈 ""따옴표"""\n'), [["a", "b"], ["1,2", '줄\n바꿈 "따옴표"']]);
});

test("Play 리뷰 파일에서 글이 있는 리뷰만 읽는다", () => {
  const link = "https://play.google.com/console/developers/1/app/2/user-feedback/review-details?reviewId=gp:AOq1&corpus=PUBLIC";
  const text = [HEAD, `com.x,412,3.2.7,ko,a54x,2026-05-01,1777600000000,2026-05-02,1777690000000,4,제목,"좋아요, 재밌어요",2026-05-03,1777780000000,고마워요,${link}`, `com.x,412,3.2.7,en,a54x,2026-05-01,1777600000000,2026-05-01,1777600000000,5,,,,,,`].join("\n");
  const out = fromPlayCsv(text);
  assert.equal(out.length, 1);
  assert.deepEqual([out[0].id, out[0].rating, out[0].title, out[0].body, out[0].place, out[0].appVersion, out[0].reply, out[0].replyState], ["gp:AOq1", 4, "제목", "좋아요, 재밌어요", "ko", "3.2.7", "고마워요", "published"]);
  assert.equal(out[0].reviewedAt, new Date(1777690000000).toISOString());
});

test("Play 리뷰 파일의 열이 바뀌면 조용히 넘어가지 않는다", () => {
  assert.throws(() => fromPlayCsv("Date,X\n1,2"), /열이 달라요/);
});
