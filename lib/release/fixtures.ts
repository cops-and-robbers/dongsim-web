/**
 * 출시 보드 상황별 입력. 테스트(board.test.mjs)와 로컬 가짜 화면(lib/admin-mock/release.ts)이 같이 쓴다.
 * "real" 은 2026-11-08 오전에 두 스토어에서 실제로 읽은 값을 줄인 것이고, 나머지는 거기서 한 곳씩 바꾼 상황이다.
 */
import type { AndroidRaw, BoardInput, IosRaw, IosVersion } from "./board.ts";

const NOW = "2026-11-08T03:00:00Z";

const v327: IosVersion = {
  id: "v327",
  version: "3.2.7",
  state: "READY_FOR_DISTRIBUTION",
  createdAt: "2026-11-01T12:44:44Z",
  releaseType: "MANUAL",
  build: { number: "382", state: "VALID", uploadedAt: "2026-11-01T12:13:21Z" },
  phased: null,
};
const v326: IosVersion = { ...v327, id: "v326", version: "3.2.6", state: "REPLACED_WITH_NEW_VERSION", createdAt: "2026-10-27T07:21:39Z", build: { number: "381", state: "VALID", uploadedAt: "2026-10-27T14:05:15Z" } };
const v328: IosVersion = { id: "v328", version: "3.2.8", state: "PREPARE_FOR_SUBMISSION", createdAt: "2026-11-03T08:49:26Z", releaseType: "MANUAL", build: null, phased: null };
// 실제로 가장 최근 빌드 392 안의 버전은 3.2.17 이었다(버전 칸 3.2.8 과 다름). 상황 예시에서는 칸 이름과 맞춘 빌드를 붙인다
const build392 = { id: "b392", number: "392", state: "VALID", uploadedAt: "2026-11-07T15:48:56Z", version: "3.2.17" };
const attached = { ...build392, version: "3.2.8" };

const iosReal: IosRaw = {
  versions: [v328, v327, v326],
  latestBuild: build392,
  submissions: [
    { state: "COMPLETE", submittedAt: "2026-11-01T12:47:58Z" },
    { state: "COMPLETE", submittedAt: "2026-10-27T14:37:02Z" },
  ],
};

const androidReal: AndroidRaw = {
  production: [
    {
      name: "382 (3.2.7)",
      codes: [382],
      lifecycle: "PUBLISHED",
      status: "completed",
      notes: [
        { language: "ko-KR", text: "v3.2.7\n\n- 목록을 당겨서 새로고침할 때 사이렌 모양 표시와 파동 효과가 나타납니다\n- 안정성 개선 및 버그 수정" },
        { language: "en-US", text: "v3.2.7\n\n- Pulling down to refresh a list now shows a siren indicator with a wave effect\n- Stability improvements and bug fixes" },
        { language: "ja-JP", text: "v3.2.7\n\n- リストを引っ張って更新するとき、サイレンの表示と波のエフェクトが表示されます\n- 安定性の改善とバグ修正" },
      ],
    },
  ],
  internal: [
    // 실제로 CI 가 넣은 노트는 한국어 하나뿐이고 마크다운(**)이 들어 있었다
    { name: "1.1.31", codes: [392], lifecycle: "DRAFT", status: "draft", notes: [{ language: "ko-KR", text: "버전 3.2.17 업데이트\n\n**새로운 기능**\n- 출동 5초 전부터 카운트다운을 표시합니다." }] },
    { name: " 72 (1.1.30)", codes: [72], lifecycle: "PUBLISHED", status: "completed" },
  ],
  listing: [
    { language: "en-US", approved: "Cops and Robbers:Hide and Seek", live: "Cops and Robbers" },
    { language: "ko-KR", approved: "경찰과도둑", live: "경찰과도둑" },
    { language: "ja-JP", approved: "ケイドロ", live: "ケイドロ" },
  ],
};

const lookupReal = { kr: "3.2.7", jp: "3.2.7", us: "3.2.7", au: "3.2.7", gb: "3.2.7", de: null };

const history = [
  { version: "3.2.7", ios: "2026-11-02", android: "2026-11-02" },
  { version: "3.2.6", ios: "2026-10-28", android: "2026-10-28" },
  { version: "3.2.1", ios: "2026-10-19", android: "2026-10-20" },
];

const base: BoardInput = { now: NOW, ios: iosReal, android: androidReal, lookup: lookupReal, history };

const ios = (patch: Partial<IosVersion>, extra: Partial<IosRaw> = {}): IosRaw => ({
  ...iosReal,
  versions: [{ ...v328, build: attached, ...patch }, v327, v326],
  ...extra,
});
const android = (prod: AndroidRaw["production"], extra: Partial<AndroidRaw> = {}): AndroidRaw => ({ ...androidReal, listing: androidReal.listing.map((l) => ({ ...l, live: l.approved })), production: prod, ...extra });
const published = androidReal.production[0];

export const SCENARIOS: Record<string, { label: string; input: BoardInput }> = {
  real: { label: "지금 실제 (11/8)", input: base },
  ready: {
    label: "빌드 붙임, 제출 전",
    input: { ...base, ios: ios({}), android: android([published]) },
  },
  review: {
    label: "두 스토어 심사 중",
    input: {
      ...base,
      ios: ios({ state: "IN_REVIEW" }, { submissions: [{ state: "IN_REVIEW", submittedAt: "2026-11-08T00:10:00Z" }, ...iosReal.submissions] }),
      android: android([{ name: "392 (3.2.8)", codes: [392], lifecycle: "IN_REVIEW", status: "completed" }, published]),
    },
  },
  rejected: {
    label: "iOS 반려, Android 승인",
    input: {
      ...base,
      ios: ios({ state: "REJECTED" }, { submissions: [{ state: "UNRESOLVED_ISSUES", submittedAt: "2026-11-07T22:00:00Z" }] }),
      android: android([{ name: "392 (3.2.8)", codes: [392], lifecycle: "APPROVED_NOT_PUBLISHED", status: "completed" }, published]),
    },
  },
  approved: {
    label: "두 스토어 승인, 출시 기다림",
    input: {
      ...base,
      ios: ios({ state: "PENDING_DEVELOPER_RELEASE" }, { submissions: [{ state: "COMPLETE", submittedAt: "2026-11-07T22:00:00Z" }] }),
      android: android([{ name: "392 (3.2.8)", codes: [392], lifecycle: "APPROVED_NOT_PUBLISHED", status: "completed" }, published]),
    },
  },
  rolling: {
    label: "출시 직후, 나라 반영과 단계적 출시",
    input: {
      ...base,
      ios: { ...iosReal, versions: [{ ...v328, build: attached, state: "READY_FOR_DISTRIBUTION", phased: { state: "ACTIVE", day: 3, startDate: "2026-11-06T01:00:00Z" } }, { ...v327, state: "REPLACED_WITH_NEW_VERSION" }] },
      android: android([{ name: "392 (3.2.8)", codes: [392], lifecycle: "PUBLISHED", status: "inProgress", fraction: 0.2 }, { ...published }]),
      lookup: { kr: "3.2.8", jp: "3.2.8", us: "3.2.7", au: "3.2.8", gb: "3.2.7", de: null },
    },
  },
  latest: {
    label: "두 스토어 모두 최신",
    input: {
      ...base,
      ios: { ...iosReal, versions: [v327, v326] },
      android: android([published], { internal: [] }),
    },
  },
  androidFail: {
    label: "Android 를 못 읽음",
    input: { ...base, ios: ios({ state: "WAITING_FOR_REVIEW" }, { submissions: [{ state: "WAITING_FOR_REVIEW", submittedAt: "2026-11-08T01:30:00Z" }] }), android: { error: "Play 키가 없어요. Vercel 에 PLAY_RELEASE_SERVICE_ACCOUNT_JSON 을 넣어 주세요" } },
  },
};
