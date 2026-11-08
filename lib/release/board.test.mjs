// 출시 보드 판단 테스트. 실행: pnpm test
// 실제로 읽은 값(2026-11-08)과 상황별 값이 콘솔과 같은 말을 하는지, 다음 할 일이 하나로 맞게 고르는지 본다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { androidTrack, buildBoard, copula, iosTrack, obj, ro, pendingListing, phasedPercent, playVersionName, subj, versionGt } from "./board.ts";
import { SCENARIOS } from "./fixtures.ts";

const board = (name) => buildBoard(SCENARIOS[name].input);
const states = (t) => t.steps.map((s) => `${s.key}:${s.state}:${s.tone}`);

test("실제 값(11/8): iOS 3.2.8 은 빌드가 없어 빌드를 붙이라고 한다", () => {
  const b = board("real");
  assert.equal(b.ios.ok, true);
  assert.deepEqual(b.ios.live, { version: "3.2.7", build: "382" });
  assert.deepEqual(b.ios.inflight, { version: "3.2.8", build: undefined });
  assert.equal(b.ios.steps[0].state, "붙일 빌드 없음");
  assert.equal(b.ios.steps[0].tone, "turn");
  // 가장 최근 빌드 392 안의 버전은 3.2.17 이라 3.2.8 칸에는 안 붙는다. 콘솔은 목록이 비어 보일 뿐이라 이유를 말한다
  assert.equal(b.ios.steps[0].detail, "가장 최근 빌드 392는 3.2.17 버전이라 이 칸에 안 붙어요. 칸 이름을 3.2.17로 바꾸거나 3.2.8 빌드를 올려야 해요");
  assert.equal(b.ios.current, 0);
  // Android 는 내부 테스트에 392 가 올라와 있고 프로덕션에는 아직 없다
  assert.deepEqual(b.android.live, { version: "3.2.7", build: "382" });
  // 내부 테스트 이름 "1.1.31" 은 스토어 버전이 아니라 쓰지 않고 빌드 번호로 부른다
  assert.deepEqual(b.android.inflight, { version: "", build: "392" });
  assert.deepEqual(states(b.android).slice(0, 2), ["build:빌드 392:done", "submit:제출 전:turn"]);
  // 둘 다 우리 차례면 빌드를 붙이는 쪽과 제출 쪽 중 하나만 크게(같은 순위면 iOS 먼저), 나머지는 작은 줄
  assert.equal(b.next.title, "iOS 3.2.8에 붙일 빌드가 없어요");
  assert.equal(b.next.action.href.endsWith("/ios/version/inflight"), true);
  assert.ok(b.notes.some((n) => n.platform === "android" && n.title === "Android 빌드 392를 심사에 낼 차례예요"));
});

test("실제 값(11/8): Play 에 승인됐지만 안 나간 영어 이름 변경을 잡는다", () => {
  const b = board("real");
  const note = b.notes.find((n) => n.title.startsWith("Play 에 승인됐지만"));
  assert.ok(note);
  assert.match(note.reason, /^영어 앱 이름/);
  assert.equal(note.action.href.includes("/publishing?authuser="), true);
  // 스토어 이름을 못 읽은 언어(live null)는 다르다고 하지 않는다
  assert.deepEqual(pendingListing({ production: [], internal: [], listing: [{ language: "en-US", approved: "A", live: null }] }), []);
});

test("실제 값(11/8): 나라별 반영과 EU 판매 막힘", () => {
  const b = board("real");
  assert.equal(b.reach.target, "3.2.8");
  assert.equal(b.reach.euBlocked, true);
  assert.deepEqual(b.reach.countries.map((c) => c.label), ["한국", "일본", "미국", "호주", "영국"]);
});

test("심사 중이면 기다리라고만 하고 버튼이 없다. 제출 시각부터 센다", () => {
  const b = board("review");
  assert.deepEqual(states(b.ios), ["build:빌드 392:done", "submit:제출함:done", "review:심사 중:wait", "release:출시 전:idle", "reach:출시 뒤 확인:idle"]);
  assert.equal(b.ios.steps[2].at, "2026-11-08T00:10:00Z");
  assert.equal(b.ios.steps[2].atKind, "since");
  assert.equal(b.next.tone, "wait");
  assert.equal(b.next.title, "iOS 3.2.8 심사 중이에요");
  assert.equal(b.next.reason, "제출한 지 2시간째예요. 기다리면 돼요");
  assert.equal(b.next.action, undefined);
  assert.equal(b.android.steps[2].state, "심사 중");
});

test("반려가 승인보다 먼저다", () => {
  const b = board("rejected");
  assert.equal(b.next.tone, "bad");
  assert.equal(b.next.title, "iOS 3.2.8이 반려됐어요");
  assert.ok(b.notes.some((n) => n.title === "Android 3.2.8이 승인됐어요. Play 에서 게시를 눌러야 나가요"));
});

test("두 스토어 승인: iOS 출시와 Play 게시가 각각 우리 차례", () => {
  const b = board("approved");
  assert.equal(b.ios.steps[3].state, "출시 기다림");
  assert.equal(b.ios.steps[3].tone, "turn");
  assert.equal(b.android.steps[3].state, "게시 기다림");
  assert.equal(b.next.title, "iOS 3.2.8이 승인됐어요. 출시할 시간을 골라 주세요");
  assert.equal(b.notes[0].action.href.includes("/publishing?authuser="), true);
});

test("출시 직후: 단계적 출시 비율과 나라별 반영", () => {
  const b = board("rolling");
  assert.equal(b.ios.steps[3].state, "단계적 출시 5%");
  // 단계적 출시 중이면 나가 있는 버전이 곧 진행 중인 버전
  assert.deepEqual(b.ios.inflight, { version: "3.2.8", build: "392" });
  assert.equal(b.ios.steps[3].detail, "3일째 · 7일째에 모두에게");
  assert.equal(b.ios.steps[4].state, "3/5개 나라");
  assert.equal(b.android.steps[3].state, "단계적 출시 20%");
  assert.deepEqual(b.android.inflight, { version: "3.2.8", build: "392" });
  assert.equal(b.next.title, "iOS 3.2.8 단계적 출시 5%예요");
});

test("둘 다 최신이면 할 일이 없다고 말한다", () => {
  const b = board("latest");
  assert.equal(b.ios.inflight, null);
  assert.equal(b.android.inflight, null);
  assert.equal(b.ios.steps[4].state, "5개 나라 모두");
  assert.equal(b.next.tone, "done");
  assert.equal(b.next.title, "두 스토어 모두 최신이에요");
});

test("한쪽을 못 읽으면 그 줄만 실패, 다음 할 일은 읽은 쪽 기준이고 그렇다고 밝힌다", () => {
  const b = board("androidFail");
  assert.equal(b.android.ok, false);
  assert.match(b.android.error, /PLAY_RELEASE_SERVICE_ACCOUNT_JSON/);
  assert.equal(b.next.title, "iOS 3.2.8이 심사 순서를 기다리고 있어요");
  assert.ok(b.notes.some((n) => n.tone === "bad" && n.title === "Android를 읽지 못해 iOS만 보고 말해요"));
});

test("빌드가 없을 때: 버전이 맞는 빌드가 있으면 붙이라고, 없으면 왜 없는지", () => {
  const raw = SCENARIOS.real.input.ios;
  const same = iosTrack({ ...raw, latestBuild: { ...raw.latestBuild, version: "3.2.8" } }, null);
  assert.deepEqual([same.steps[0].state, same.steps[0].detail], ["빌드 없음", "가장 최근 빌드는 392"]);
  const none = iosTrack({ ...raw, latestBuild: null }, null);
  assert.equal(none.steps[0].detail, "올라온 빌드가 없어요");
});

test("iOS 빌드 처리 상태와 수출 규정", () => {
  const raw = SCENARIOS.ready.input.ios;
  const processing = iosTrack({ ...raw, versions: [{ ...raw.versions[0], build: { number: "393", state: "PROCESSING", uploadedAt: "2026-11-08T02:00:00Z" } }, ...raw.versions.slice(1)] }, null);
  assert.deepEqual([processing.steps[0].state, processing.steps[0].tone], ["빌드 393 처리 중", "wait"]);
  const invalid = iosTrack({ ...raw, versions: [{ ...raw.versions[0], build: { number: "393", state: "INVALID", uploadedAt: "2026-11-08T02:00:00Z" } }, ...raw.versions.slice(1)] }, null);
  assert.equal(invalid.steps[0].tone, "bad");
  const export_ = iosTrack({ ...raw, versions: [{ ...raw.versions[0], state: "WAITING_FOR_EXPORT_COMPLIANCE" }, ...raw.versions.slice(1)] }, null);
  assert.deepEqual([export_.steps[1].state, export_.steps[1].tone], ["수출 규정 답 필요", "turn"]);
});

test("이전 버전 칸이 남아 있어도 나가 있는 버전보다 낮으면 진행 중으로 보지 않는다", () => {
  const raw = SCENARIOS.latest.input.ios;
  const t = iosTrack({ ...raw, versions: [raw.versions[0], { ...raw.versions[1], state: "DEVELOPER_REJECTED" }] }, null);
  assert.equal(t.inflight, null);
});

test("Android: 프로덕션 초안, 반려, 단계적 출시 멈춤", () => {
  const base = SCENARIOS.real.input.android;
  const pub = base.production[0];
  const draft = androidTrack({ ...base, production: [{ name: "392 (3.2.8)", codes: [392], lifecycle: "DRAFT" }, pub] });
  assert.deepEqual([draft.steps[1].state, draft.steps[1].tone], ["프로덕션 초안", "turn"]);
  const rej = androidTrack({ ...base, production: [{ name: "392 (3.2.8)", codes: [392], lifecycle: "NOT_APPROVED" }, pub] });
  assert.deepEqual([rej.steps[2].state, rej.steps[2].tone], ["반려", "bad"]);
  const halted = androidTrack({ ...base, production: [{ ...pub, status: "halted", fraction: 0.05 }] });
  assert.deepEqual([halted.steps[3].state, halted.steps[3].tone], ["단계적 출시 멈춤 5%", "turn"]);
});

test("조사와 버전 도우미", () => {
  assert.equal(subj("3.2.8"), "3.2.8이");
  assert.equal(subj("3.2.9"), "3.2.9가");
  assert.equal(subj("1.1.32"), "1.1.32가");
  assert.equal(obj("Android 1.1.31"), "Android 1.1.31을");
  assert.equal(obj("iOS"), "iOS를");
  assert.equal(copula("출시 처리 중"), "출시 처리 중이에요");
  assert.equal(copula("단계적 출시 20%"), "단계적 출시 20%예요");
  assert.equal(versionGt("3.2.10", "3.2.9"), true);
  assert.equal(versionGt("3.2.7", "3.2.7"), false);
  assert.equal(playVersionName("382 (3.2.7)"), "3.2.7");
  assert.equal(playVersionName(" 72 (1.1.30)"), "1.1.30");
  assert.equal(playVersionName("1.1.31"), "1.1.31");
  assert.deepEqual([1, 3, 7, 9].map(phasedPercent), [1, 5, 100, 100]);
  assert.deepEqual(["3.2.17", "3.2.10", "3.2.8", "3.2.3"].map(ro), ["3.2.17로", "3.2.10으로", "3.2.8로", "3.2.3으로"]);
});
