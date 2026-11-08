// 출시 보드 판단 테스트. 실행: pnpm test
// 실제로 읽은 값(2026-11-08)과 상황별 값이 콘솔과 같은 말을 하는지, 스토어마다 할 수 있는 일과 "누가"가 맞는지 본다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { androidTrack, buildBoard, copula, iosTrack, obj, pendingListing, phasedPercent, playVersionName, ro, subj, versionGt } from "./board.ts";
import { SCENARIOS } from "./fixtures.ts";

const board = (name) => buildBoard(SCENARIOS[name].input);
/** "key:상태:색:누가" 줄. 아직 안 온 단계는 상태 대신 "-" */
const states = (t) => t.steps.map((s) => `${s.key}:${s.state ?? "-"}:${s.tone}:${s.who}`);
const cur = (t) => t.steps[t.current];

test("실제 값(11/8) iOS: 3.2.8 칸에 붙일 빌드가 없는 이유를 말한다", () => {
  const { ios } = board("real");
  assert.deepEqual(ios.live, { version: "3.2.7", build: "382" });
  assert.deepEqual(ios.inflight, { version: "3.2.8", build: undefined });
  assert.deepEqual(states(ios), [
    "slot:3.2.8:done:us",
    "build:붙일 빌드 없음:turn:us",
    "submit:-:idle:us",
    "review:-:idle:apple",
    "release:-:idle:us",
    "rollout:-:idle:auto",
    "reach:-:idle:apple",
  ]);
  // 가장 최근 빌드 392 안의 버전은 3.2.17 이라 3.2.8 칸에는 안 붙는다. 콘솔은 목록이 비어 보일 뿐이라 이유를 말한다
  assert.equal(cur(ios).detail, "지금 칸 이름은 3.2.8이고, 빌드 392의 버전은 3.2.17이에요");
  // 왜 어긋났는지(앱 저장소가 머지마다 버전을 올림)와, 건너뛰는 번호가 나간 적 없다는 것까지
  // 한 줄에 하나씩: 언제 만들었나, 왜 어긋났나, 애플 규칙, 건너뛰어도 되는 이유
  const why = cur(ios).why.split("\n");
  assert.equal(why.length, 4);
  assert.equal(why[0], "3.2.8 칸은 11/3에 만들었어요.");
  assert.match(why[1], /^개발 내용이 합쳐질 때마다 앱 버전이 자동으로 하나씩 올라가요\./);
  assert.match(cur(ios).why, /3\.2\.8~3\.2\.16은 한 번도 스토어에 나간 적 없는 번호라 건너뛰어도 괜찮아요\. 사용자에게는 3\.2\.7 다음 업데이트가 3\.2\.17이에요\.$/);
  assert.deepEqual(ios.status, { tone: "turn", label: "진행 가능" });
  assert.equal(ios.action.title, "칸 이름만 3.2.17로 맞추면 빌드를 붙일 수 있어요");
  assert.equal(ios.action.why, cur(ios).why);
  assert.ok(ios.action.action.href.endsWith("/ios/version/inflight"));
  // 아직 안 온 단계는 그때 무엇을 할 수 있는지 말한다(수동 출시, 단계적 출시 꺼짐)
  assert.equal(ios.steps[4].hint, "승인되면 원하는 때 출시할 수 있어요");
  assert.equal(ios.steps[5].hint, "꺼져 있어요. 출시하면 바로 모두에게");
});

test("실제 값(11/8) Android: 내부 테스트 392 를 프로덕션으로 낼 수 있고, 게시 대기열에 영어 이름 변경", () => {
  const { android } = board("real");
  assert.deepEqual(android.live, { version: "3.2.7", build: "382" });
  // 내부 테스트 이름 "1.1.31" 은 스토어 버전이 아니라 쓰지 않고 빌드 번호로 부른다
  assert.deepEqual(android.inflight, { version: "", build: "392" });
  assert.deepEqual(states(android), [
    "build:빌드 392:done:auto",
    "submit:만들기 전:turn:us",
    "review:-:idle:google",
    "publish:-:idle:us",
    "rollout:-:idle:us",
  ]);
  assert.equal(android.action.title, "빌드 392를 심사에 낼 수 있어요");
  assert.ok(android.action.action.href.includes("/tracks/production?authuser="));
  assert.deepEqual(android.queue, { release: null, listing: ["en-US"] });
  // 스토어 이름을 못 읽은 언어(live null)는 다르다고 하지 않는다
  assert.deepEqual(pendingListing({ production: [], internal: [], listing: [{ language: "en-US", approved: "A", live: null }] }), []);
});

test("실제 값(11/8): 두 스토어를 통틀어 가장 먼저 할 수 있는 일과 나라별 반영", () => {
  const b = board("real");
  assert.equal(b.next.title, "iOS 칸 이름만 3.2.17로 맞추면 빌드를 붙일 수 있어요");
  assert.deepEqual(b.notes, []);
  assert.equal(b.reach.target, "3.2.8");
  assert.equal(b.reach.euBlocked, true);
  assert.deepEqual(b.reach.countries.map((c) => c.label), ["한국", "일본", "미국", "호주", "영국"]);
});

test("심사 중: 공이 애플, 구글에 있고 버튼 없이 기다리면 된다고만. iOS 는 제출 시각부터 센다", () => {
  const { ios, android, next } = board("review");
  assert.deepEqual(ios.status, { tone: "wait", label: "애플 심사 중" });
  assert.deepEqual(android.status, { tone: "wait", label: "구글 심사 중" });
  assert.equal(cur(ios).at, "2026-11-08T00:10:00Z");
  assert.equal(ios.action.title, "3.2.8 심사 중이에요");
  assert.equal(ios.action.reason, "제출한 지 2시간째예요. 기다리면 돼요");
  assert.equal(ios.action.action, undefined);
  assert.equal(android.action.reason, "기다리면 돼요. 몇 분마다 다시 확인해요");
  assert.equal(next.title, "iOS 3.2.8 심사 중이에요");
});

test("반려가 승인보다 먼저다", () => {
  const b = board("rejected");
  assert.deepEqual(b.ios.status, { tone: "bad", label: "반려" });
  assert.equal(b.next.title, "iOS 3.2.8이 반려됐어요");
  assert.equal(b.android.action.title, "3.2.8이 승인됐어요. 지금 게시할 수 있어요");
  assert.equal(b.android.queue.release, "앱 출시 3.2.8");
});

test("두 스토어 승인: iOS 는 출시, Play 는 게시를 할 수 있다", () => {
  const { ios, android } = board("approved");
  assert.equal(cur(ios).key, "release");
  assert.equal(ios.action.title, "3.2.8이 승인됐어요. 지금 출시할 수 있어요");
  assert.equal(cur(android).key, "publish");
  assert.ok(android.action.action.href.includes("/publishing?authuser="));
});

test("출시 직후: iOS 7일 단계적 출시와 나라별 반영, Android 는 우리가 정한 비율", () => {
  const { ios, android } = board("rolling");
  // 단계적 출시 중이면 나가 있는 버전이 곧 진행 중인 버전
  assert.deepEqual(ios.inflight, { version: "3.2.8", build: "392" });
  assert.deepEqual(ios.rollout, { percent: 5, day: 3, paused: false });
  assert.equal(cur(ios).state, "5% · 3일째");
  assert.deepEqual(ios.status, { tone: "wait", label: "단계적 출시 중" });
  assert.equal(ios.action.title, "단계적 출시 5%예요");
  assert.equal(ios.steps[6].state, "3/5개 나라");
  // Android 는 대부분이 받는 이전 버전을 "나가 있음"으로, 새 버전은 비율로
  assert.deepEqual(android.live, { version: "3.2.7", build: "382" });
  assert.deepEqual(android.inflight, { version: "3.2.8", build: "392" });
  assert.deepEqual(android.rollout, { percent: 20, paused: false });
  assert.equal(cur(android).state, "20%");
});

test("둘 다 최신이면 할 일이 없다", () => {
  const b = board("latest");
  assert.equal(b.ios.inflight, null);
  assert.equal(b.android.inflight, null);
  assert.equal(b.ios.action, null);
  assert.deepEqual(b.ios.status, { tone: "done", label: "최신" });
  assert.equal(b.ios.steps[6].state, "5개 나라 모두");
  assert.equal(b.android.rollout.percent, 100);
  assert.equal(b.next.title, "두 스토어 모두 최신이에요");
});

test("한쪽을 못 읽으면 그 카드만 실패, 가장 먼저 할 일은 읽은 쪽 기준", () => {
  const b = board("androidFail");
  assert.equal(b.android.ok, false);
  assert.equal(b.android.error, "지금은 상태를 가져오지 못했어요. 잠시 뒤 다시 확인해 주세요.");
  assert.equal(b.next.title, "iOS 3.2.8이 심사 순서를 기다리고 있어요");
});

test("빌드가 없을 때: 버전이 맞는 빌드가 있으면 붙일 수 있다고, 없으면 왜 없는지", () => {
  const raw = SCENARIOS.real.input.ios;
  const same = iosTrack({ ...raw, latestBuild: { ...raw.latestBuild, version: "3.2.8" } }, null);
  assert.deepEqual([cur(same).state, cur(same).detail, same.action.title], ["빌드 없음", "가장 최근 빌드는 392", "3.2.8에 빌드를 붙일 수 있어요"]);
  const none = iosTrack({ ...raw, latestBuild: null }, null);
  assert.equal(cur(none).detail, "올라온 빌드가 없어요");
});

test("iOS 빌드 처리 상태, 수출 규정, 자동 출시, 단계적 출시 멈춤", () => {
  const raw = SCENARIOS.ready.input.ios;
  const head = raw.versions[0];
  const with_ = (patch) => iosTrack({ ...raw, versions: [{ ...head, ...patch }, ...raw.versions.slice(1)] }, null);
  const processing = with_({ build: { number: "393", state: "PROCESSING", uploadedAt: "2026-11-08T02:00:00Z" } });
  assert.deepEqual([cur(processing).state, cur(processing).tone, cur(processing).who], ["빌드 393 처리 중", "wait", "apple"]);
  assert.equal(with_({ build: { number: "393", state: "INVALID", uploadedAt: "2026-11-08T02:00:00Z" } }).status.tone, "bad");
  const exp = with_({ state: "WAITING_FOR_EXPORT_COMPLIANCE" });
  assert.deepEqual([cur(exp).state, cur(exp).tone], ["수출 규정 답 필요", "turn"]);
  const auto = with_({ releaseType: "AFTER_APPROVAL" });
  assert.deepEqual([auto.steps[4].who, auto.steps[4].hint], ["auto", "승인되면 바로 나가요"]);
  const paused = with_({ state: "READY_FOR_DISTRIBUTION", phased: { state: "PAUSED", day: 4 } });
  assert.deepEqual([cur(paused).state, cur(paused).tone, cur(paused).who], ["10%에서 멈춤", "turn", "us"]);
  assert.deepEqual(paused.rollout, { percent: 10, day: 4, paused: true });
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
  assert.deepEqual([cur(draft).state, cur(draft).tone], ["초안", "turn"]);
  const rej = androidTrack({ ...base, production: [{ name: "392 (3.2.8)", codes: [392], lifecycle: "NOT_APPROVED" }, pub] });
  assert.deepEqual([cur(rej).key, cur(rej).tone], ["review", "bad"]);
  const halted = androidTrack({ ...base, production: [{ name: "392 (3.2.8)", codes: [392], lifecycle: "PUBLISHED", status: "halted", fraction: 0.05 }, pub] });
  assert.deepEqual([cur(halted).state, cur(halted).tone], ["5%에서 멈춤", "turn"]);
  assert.equal(halted.action.title, "단계적 출시가 멈춰 있어요");
});

test("조사와 버전 도우미", () => {
  assert.equal(subj("3.2.8"), "3.2.8이");
  assert.equal(subj("3.2.9"), "3.2.9가");
  assert.equal(subj("1.1.32"), "1.1.32가");
  assert.equal(obj("빌드 392"), "빌드 392를");
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
