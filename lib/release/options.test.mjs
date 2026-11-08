// 출시 조작 고르기와 스토어에 보내는 요청 모양 테스트. 실행: pnpm test
// 요청 모양은 공식 명세(App Store Connect OpenAPI 4.6, androidpublisher v3 discovery)의 이름과 필수 칸 그대로다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { androidOptions, iosOptions } from "./options.ts";
import { SCENARIOS } from "./fixtures.ts";
import { ascRequests, productionReleases } from "./requests.ts";

const ids = (opts) => opts.map((o) => `${o.id}:${o.level}`);
const raw = (name, p) => SCENARIOS[name].input[p];

test("실제 값(11/8) iOS: 칸 이름을 3.2.17 로 바꾸는 것만 할 수 있다(빌드 392 안 버전이 3.2.17)", () => {
  const opts = iosOptions(raw("real", "ios"));
  assert.deepEqual(ids(opts), ["ios.renameVersion:1"]);
  const o = opts[0];
  assert.equal(o.label, "칸 이름을 3.2.17로 바꾸기");
  assert.deepEqual(o.params, { versionId: "v328", to: "3.2.17" });
  assert.equal(o.reachesUsers, false);
  assert.equal(o.what, "App Store Connect 의 버전 칸 이름이 3.2.8에서 3.2.17로 바뀌어요.");
  assert.deepEqual(o.changes, [{ key: "버전 칸 이름", label: "버전 칸 이름", before: "3.2.8", after: "3.2.17" }]);
  assert.equal(o.then, "빌드 392를 이 칸에 붙일 수 있게 돼요.");
  // 화면이 본 상태. 버전 칸, 상태, 붙은 빌드, 가장 최근 빌드가 같아야 서버가 한다
  assert.equal(o.expect, "v328|3.2.8|PREPARE_FOR_SUBMISSION|-|392");
});

test("빌드 안 버전이 칸 이름과 같으면 빌드를 붙일 수 있다", () => {
  const r = raw("real", "ios");
  const opts = iosOptions({ ...r, latestBuild: { ...r.latestBuild, id: "b392", version: "3.2.8" } });
  assert.deepEqual(ids(opts), ["ios.attachBuild:1"]);
  assert.deepEqual(opts[0].params, { versionId: "v328", buildId: "b392" });
});

test("빌드가 붙으면 심사에 낼 수 있고(단계 2), 심사 중이면 제출 취소만", () => {
  const ready = iosOptions(raw("ready", "ios"));
  assert.deepEqual(ids(ready), ["ios.submit:2"]);
  assert.equal(ready[0].confirmWord, "3.2.8");
  const r = raw("review", "ios");
  const inReview = iosOptions({ ...r, submissions: [{ id: "s1", state: "IN_REVIEW", submittedAt: "2026-11-08T00:10:00Z", versionId: "v328" }] });
  assert.deepEqual(ids(inReview), ["ios.cancelSubmission:1"]);
  assert.deepEqual(inReview[0].params, { submissionId: "s1" });
  // 어느 버전의 제출인지 모르면 취소 버튼을 내지 않는다
  assert.deepEqual(ids(iosOptions(r)), []);
});

test("승인되면 출시(단계 2, 되돌릴 수 없음), 단계적 출시 중이면 멈춤과 바로 모두에게", () => {
  const approved = iosOptions(raw("approved", "ios"));
  assert.deepEqual(ids(approved), ["ios.release:2"]);
  assert.equal(approved[0].reachesUsers, true);
  assert.match(approved[0].undo, /되돌릴 수 없어요/);
  const r = raw("rolling", "ios");
  const v = { ...r.versions[0], phased: { ...r.versions[0].phased, id: "ph1" } };
  assert.deepEqual(ids(iosOptions({ ...r, versions: [v, ...r.versions.slice(1)] })), ["ios.phasedPause:1", "ios.phasedComplete:2"]);
  const paused = { ...v, phased: { ...v.phased, state: "PAUSED" } };
  assert.deepEqual(ids(iosOptions({ ...r, versions: [paused, ...r.versions.slice(1)] })), ["ios.phasedResume:1", "ios.phasedComplete:2"]);
});

test("다 나가 있으면 할 조작이 없다", () => {
  assert.deepEqual(iosOptions(raw("latest", "ios")), []);
  assert.deepEqual(androidOptions(raw("latest", "android")), []);
});

test("실제 값(11/8) Android: 내부 테스트 392 로 프로덕션 출시를 만들 수 있다(단계 2, 빌드 번호 입력)", () => {
  const opts = androidOptions(raw("real", "android"));
  assert.deepEqual(ids(opts), ["android.createRelease:2"]);
  assert.equal(opts[0].confirmWord, "392");
  assert.equal(opts[0].params.code, 392);
  // 한국어 노트는 내부 테스트에서, 지난 출시(세 언어) 노트는 본보기로
  assert.deepEqual(opts[0].params.notes.map((n) => n.language), ["ko-KR"]);
  assert.deepEqual(opts[0].params.lastNotes.map((n) => n.language), ["ko-KR", "en-US", "ja-JP"]);
  assert.match(opts[0].what, /게시 개요에서 게시해야/);
});

test("Android 심사 중, 승인 대기는 어드민에서 할 게 없다(게시는 API 가 없다)", () => {
  assert.deepEqual(androidOptions(raw("review", "android")), []);
  assert.deepEqual(androidOptions(raw("approved", "android")), []);
});

test("Android 단계적 출시: 진행 중이면 비율 올리기, 멈춤, 바로 모두에게. 멈춰 있으면 이어 가기", () => {
  const opts = androidOptions(raw("rolling", "android"));
  assert.deepEqual(ids(opts), ["android.rolloutSet:2", "android.halt:1", "android.complete:2"]);
  assert.equal(opts[0].confirmWord, "3.2.8");
  const base = raw("rolling", "android");
  const halted = { ...base, production: [{ ...base.production[0], status: "halted" }, base.production[1]] };
  assert.deepEqual(ids(androidOptions(halted)), ["android.resume:1", "android.complete:2"]);
});

// ---------- 요청 모양 ----------

test("App Store 요청은 공식 명세의 경로, 종류(type), 필수 칸 그대로", () => {
  assert.deepEqual(ascRequests.renameVersion("v1", "3.2.17"), { method: "PATCH", path: "/v1/appStoreVersions/v1", body: { data: { type: "appStoreVersions", id: "v1", attributes: { versionString: "3.2.17" } } } });
  assert.deepEqual(ascRequests.attachBuild("v1", "b1"), { method: "PATCH", path: "/v1/appStoreVersions/v1/relationships/build", body: { data: { type: "builds", id: "b1" } } });
  assert.deepEqual(ascRequests.createSubmission("app").body, { data: { type: "reviewSubmissions", attributes: { platform: "IOS" }, relationships: { app: { data: { type: "apps", id: "app" } } } } });
  assert.deepEqual(ascRequests.addSubmissionItem("s1", "v1").body.data.relationships, { reviewSubmission: { data: { type: "reviewSubmissions", id: "s1" } }, appStoreVersion: { data: { type: "appStoreVersions", id: "v1" } } });
  assert.deepEqual(ascRequests.submit("s1").body.data.attributes, { submitted: true });
  assert.deepEqual(ascRequests.cancelSubmission("s1").body.data.attributes, { canceled: true });
  assert.deepEqual(ascRequests.release("v1"), { method: "POST", path: "/v1/appStoreVersionReleaseRequests", body: { data: { type: "appStoreVersionReleaseRequests", relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: "v1" } } } } } });
  assert.deepEqual(ascRequests.phased("p1", "PAUSED").body, { data: { type: "appStoreVersionPhasedReleases", id: "p1", attributes: { phasedReleaseState: "PAUSED" } } });
});

test("Play 프로덕션 트랙: 새 출시(모두에게, 일부), 비율, 멈춤, 바로 모두에게", () => {
  const live = { name: "382 (3.2.7)", versionCodes: ["382"], status: "completed" };
  const notes = [{ language: "ko-KR", text: "버그를 고쳤어요" }];
  assert.deepEqual(productionReleases("createRelease", [live], { code: 392, notes }), [{ versionCodes: ["392"], status: "completed", releaseNotes: notes }]);
  // 일부에게면 지금 나가 있는 출시를 남겨 나머지 사람이 계속 받게 한다
  assert.deepEqual(productionReleases("createRelease", [live], { code: 392, fraction: 0.2 }), [{ versionCodes: ["392"], status: "inProgress", userFraction: 0.2 }, live]);
  const rolling = { name: "392 (3.2.8)", versionCodes: ["392"], status: "inProgress", userFraction: 0.2, releaseNotes: notes };
  assert.deepEqual(productionReleases("rolloutSet", [rolling, live], { code: 392, fraction: 0.5 }), [{ ...rolling, userFraction: 0.5 }, live]);
  assert.deepEqual(productionReleases("halt", [rolling, live], { code: 392 }), [{ ...rolling, status: "halted" }, live]);
  assert.deepEqual(productionReleases("resume", [{ ...rolling, status: "halted" }, live], { code: 392 }), [rolling, live]);
  // 모두에게면 비율을 빼고, 이전 completed 출시는 뺀다
  assert.deepEqual(productionReleases("complete", [rolling, live], { code: 392 }), [{ name: "392 (3.2.8)", versionCodes: ["392"], status: "completed", releaseNotes: notes }]);
  assert.throws(() => productionReleases("halt", [live], { code: 392 }), /빌드 392 출시가 없어요/);
});

test("Play 조작 직전 편집으로 읽은 지금 트랙 확인: 이미 있으면, 상태가 다르면 하지 않는다", async () => {
  const { guardTrack } = await import("./actions.ts");
  const live = { versionCodes: ["382"], status: "completed" };
  assert.equal(guardTrack("createRelease", [live], 392), null);
  // 그 사이 콘솔에서 같은 빌드로 출시를 만들었으면(출시 목록은 몇 분 전 값이라 모를 수 있다)
  assert.equal(guardTrack("createRelease", [{ versionCodes: ["392"], status: "completed" }], 392), "프로덕션에 이미 빌드 392 출시가 있어요.");
  const rolling = { versionCodes: ["392"], status: "inProgress", userFraction: 0.2 };
  assert.equal(guardTrack("halt", [rolling, live], 392), null);
  assert.equal(guardTrack("resume", [rolling, live], 392), "빌드 392 출시가 지금 단계적 출시 중 상태예요.");
  assert.equal(guardTrack("complete", [{ ...rolling, status: "halted" }, live], 392), null);
  assert.equal(guardTrack("rolloutSet", [live], 392), "프로덕션에 빌드 392 출시가 없어요.");
});
