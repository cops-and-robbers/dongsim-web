/**
 * 출시 보드의 판단 (docs/admin-ui.md "출시").
 *
 * 두 스토어는 출시하는 방식이 다르다. 그래서 같은 칸에 억지로 넣지 않고 스토어마다 고유한 단계로 그린다.
 * - App Store: 버전 칸 → 빌드 붙이기 → 심사 제출 → 애플 심사 → 출시 → 단계적 출시(7일) → 나라별 반영
 * - Google Play: 내부 테스트 빌드 → 프로덕션 출시 만들기 → 구글 심사 → 게시(관리형 게시) → 단계적 출시(비율)
 * 단계마다 누가 해야 하는지(우리, 애플, 구글, 자동)를 붙여 "지금 공이 누구한테 있나"를 바로 보이게 한다.
 *
 * 스토어를 부르는 일은 stores.ts 가 하고, 여기는 순수 함수만 둔다. 실제로 읽은 응답(fixtures.ts)과 상황별 값으로
 * 그대로 테스트하고, 로컬 가짜 화면도 이 함수를 거친다.
 *
 * 색(Tone) 원칙: 노랑(turn)은 "우리가 지금 할 수 있는 일"에만, 남을 기다리는 일은 파랑(wait), 빨강(bad)은 반려와 읽기 실패만, 초록(done)은 끝남.
 */

import { consoleLinks } from "./links.ts";
import type { Option } from "./options.ts";
import { kstShort, since } from "./time.ts";

export type Platform = "ios" | "android";
export type Tone = "done" | "wait" | "turn" | "bad" | "idle";
/** 그 단계를 하는 쪽. 우리만 진하게 보인다 */
export type Who = "us" | "apple" | "google" | "auto";
export const WHO_LABEL: Record<Who, string> = { us: "우리", apple: "애플", google: "구글", auto: "자동" };

export type Step = {
  key: string;
  /** 단계 이름. "빌드 붙이기" */
  label: string;
  who: Who;
  /** 지금 상태. 아직 안 온 단계는 비워 두고 hint 를 보여 준다 */
  state?: string;
  tone: Tone;
  /** 아직 안 온 단계에서 그때 무슨 일이 생기는지 */
  hint?: string;
  /** 그 상태가 된 시각(ISO). 화면이 한국 시각과 상대 시각으로 쓴다 */
  at?: string;
  /** "since" 면 "3시간째" */
  atKind?: "at" | "since";
  detail?: string;
  /** 왜 이런 상태가 됐는지(펼쳐 보는 설명) */
  why?: string;
  /** 칸 이름을 맞출 버전(빌드 안 버전) */
  fixTo?: string;
  /** 이 단계를 처리하는 콘솔 화면 */
  href?: string;
};

export type Live = { version: string; build?: string };
export type Action = { tone: Tone; title: string; reason?: string; why?: string; platform?: Platform; action?: { label: string; href: string } };

/** 단계적 출시. iOS 는 7일 단계(day), Android 는 우리가 정한 비율 */
export type Rollout = { percent: number; day?: number; paused: boolean };
/** Play 관리형 게시 대기열. 승인됐지만 아직 안 나간 것들 */
export type PublishQueue = { release: string | null; listing: string[] };

export type Track =
  | {
      platform: Platform;
      ok: true;
      live: Live | null;
      /** 진행 중인 버전. Android 는 내부 테스트 빌드만 있을 때 version 이 빈 문자열이다 */
      inflight: { version: string; build?: string } | null;
      steps: Step[];
      /** 지금 단계(steps 의 칸 번호) */
      current: number;
      /** 상태 알약. "진행 가능", "애플 심사 중" */
      status: { tone: Tone; label: string };
      /** 이 스토어에서 지금 할 일. 다 끝났으면 null */
      action: Action | null;
      rollout: Rollout | null;
      /** Android 만 */
      queue?: PublishQueue;
      /** 어드민에서 바로 할 수 있는 조작(options.ts). 서버가 붙인다 */
      options?: Option[];
      /** 심사 상태를 몇 분 전에 읽은 값이면 그 시각(Android) */
      staleSince?: string;
    }
  | { platform: Platform; ok: false; error: string; href: string };

export type ReachCountry = { code: string; label: string; version: string | null };
export type Reach = { target: string; countries: ReachCountry[]; euBlocked: boolean } | null;
export type HistoryItem = { version: string; ios?: string; android?: string };

export type ReleaseBoard = {
  readAt: string;
  ios: Track;
  android: Track;
  reach: Reach;
  /** 두 스토어를 통틀어 가장 먼저 할 일(알림, 요약에 쓴다) */
  next: Action;
  /** 두 스토어 공통으로 알릴 것(빌드 번호가 다름 등) */
  notes: Action[];
  history: HistoryItem[];
  /** 최근 출시 조작 기록 */
  actions?: { id: number; platform: string; action: string; version: string; status: string; message: string | null; actor: string; createdAt: string }[];
  /** 조작 버튼을 켤지. 운영 배포이고 기록 표가 있을 때만 */
  writable?: boolean;
  /** 왜 버튼이 꺼졌는지 */
  readOnlyReason?: string;
};

// ---------- 스토어에서 읽은 값 (stores.ts 가 채운다) ----------

/** version 은 빌드 안에 적힌 버전(CFBundleShortVersionString). 스토어 버전 칸 이름과 같아야 그 칸에 붙는다 */
export type IosBuild = { id?: string; number: string; state: string; uploadedAt: string; version?: string };
export type IosVersion = {
  id: string;
  version: string;
  /** appVersionState */
  state: string;
  createdAt: string;
  /** MANUAL, AFTER_APPROVAL, SCHEDULED */
  releaseType?: string | null;
  earliestReleaseDate?: string | null;
  build: IosBuild | null;
  /** 단계적 출시를 켰을 때만. state: INACTIVE, ACTIVE, PAUSED, COMPLETE */
  phased: { id?: string; state: string; day: number; startDate?: string | null } | null;
};
export type IosRaw = {
  /** 새 것 먼저 */
  versions: IosVersion[];
  /** 가장 최근에 올라온 빌드(버전에 안 붙은 것 포함) */
  latestBuild: IosBuild | null;
  /** 심사 제출 묶음. 새 것 먼저 */
  submissions: { id?: string; state: string; submittedAt: string | null; versionId?: string | null }[];
};

export type PlayRelease = {
  name: string;
  codes: number[];
  /** releaseLifecycleState 에서 앞의 RELEASE_LIFECYCLE_STATE_ 를 뗀 것. DRAFT, IN_REVIEW, PUBLISHED ... */
  lifecycle: string;
  /** edits.tracks 의 status. completed, inProgress, halted, draft */
  status?: string;
  fraction?: number;
  /** 출시 노트(언어별). CI 는 내부 테스트 초안에 한국어만 넣는다 */
  notes?: { language: string; text: string }[];
};
export type AndroidRaw = {
  production: PlayRelease[];
  internal: PlayRelease[];
  /** 언어마다 승인된 이름과 스토어에 실제로 보이는 이름. 다르면 게시 안 된 변경이 있다 */
  listing: { language: string; approved: string; live: string | null }[];
  /** 출시 목록(심사 상태)을 언제 읽었나. 구글 한도 때문에 몇 분 전 값일 수 있다 */
  listedAt?: string;
};

export type BoardInput = {
  now: string;
  ios: IosRaw | { error: string };
  android: AndroidRaw | { error: string };
  /** 나라마다 App Store 에 보이는 버전. EU 확인용 de 를 함께 받는다 */
  lookup: Record<string, string | null> | null;
  history: HistoryItem[];
};

// ---------- 공용 ----------

const REACH_COUNTRIES: [string, string][] = [
  ["kr", "한국"],
  ["jp", "일본"],
  ["us", "미국"],
  ["au", "호주"],
  ["gb", "영국"],
];

/** 버전 비교. "3.2.10" > "3.2.9" */
export function versionGt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

/** "382 (3.2.7)" → 3.2.7. 괄호가 없으면 이름 그대로 */
export const playVersionName = (name: string) => name.match(/\(([^)]+)\)/)?.[1]?.trim() ?? name.trim();
const maxCode = (r: PlayRelease) => Math.max(0, ...r.codes);

/** 애플 단계적 출시 날짜별 비율(7일). 멈춘 날은 세지 않는다 */
export const PHASED_PERCENT = [1, 2, 5, 10, 20, 50, 100];
export const phasedPercent = (day: number) => PHASED_PERCENT[Math.min(Math.max(day, 1), 7) - 1];

const isError = (x: unknown): x is { error: string } => typeof x === "object" && x !== null && "error" in x;

/** 받침이 있는지. 숫자로 끝나면 읽는 소리(영, 일, 이, 삼 ...)로, 영문은 대충 소리로 */
function hasBatchim(word: string): boolean {
  const last = word.trim().slice(-1);
  const digit: Record<string, boolean> = { "0": true, "1": true, "2": false, "3": true, "4": false, "5": false, "6": true, "7": true, "8": true, "9": false };
  if (last in digit) return digit[last];
  const c = last.charCodeAt(0) - 0xac00;
  if (c >= 0 && c <= 11171) return c % 28 !== 0;
  return /[lmnLMN]$/.test(last);
}
/** 주격 조사. "3.2.8이", "3.2.9가" */
export const subj = (w: string) => `${w}${hasBatchim(w) ? "이" : "가"}`;
/** 목적격 조사. "3.2.8을", "3.2.9를" */
export const obj = (w: string) => `${w}${hasBatchim(w) ? "을" : "를"}`;
/** 보조사. "iOS는", "Android는" */
export const topic = (w: string) => `${w}${hasBatchim(w) ? "은" : "는"}`;
/** 방향 조사. 받침이 없거나 ㄹ 이면 "로". "3.2.17로", "3.2.10으로" */
export function ro(w: string): string {
  const last = w.trim().slice(-1);
  const digit: Record<string, string> = { "0": "으로", "3": "으로", "6": "으로" };
  if (/\d/.test(last)) return `${w}${digit[last] ?? "로"}`;
  const c = last.charCodeAt(0) - 0xac00;
  if (c >= 0 && c <= 11171) return `${w}${c % 28 === 0 || c % 28 === 8 ? "로" : "으로"}`;
  return `${w}로`;
}
/** "심사 중이에요", "단계적 출시 20%예요" */
export const copula = (w: string) => `${w}${hasBatchim(w) ? "이에요" : "예요"}`;

/** 지금 단계: 끝나지 않은 첫 칸. 다 끝났으면 마지막 칸 */
function currentStep(steps: Step[]): number {
  const i = steps.findIndex((s) => s.tone !== "done");
  return i === -1 ? Math.max(steps.length - 1, 0) : i;
}

/** 상태 알약. 지금 단계의 색과 누가 하는지로 */
function statusOf(step: Step | undefined): { tone: Tone; label: string } {
  if (!step || step.tone === "done") return { tone: "done", label: "최신" };
  if (step.tone === "bad") return { tone: "bad", label: step.state?.includes("반려") ? "반려" : "확인 필요" };
  if (step.tone === "turn") return { tone: "turn", label: "진행 가능" };
  if (step.tone === "wait") {
    if (step.key === "reach") return { tone: "wait", label: "나라별 반영 중" };
    if (step.key === "rollout") return { tone: "wait", label: "단계적 출시 중" };
    if (step.who === "apple" || step.who === "google") return { tone: "wait", label: `${WHO_LABEL[step.who]} ${step.key === "review" ? "심사 중" : "처리 중"}` };
    return { tone: "wait", label: "기다리는 중" };
  }
  return { tone: "idle", label: "다음 빌드 기다림" };
}

// ---------- iOS ----------

/** 아직 나가지 않은 버전의 상태 */
const IOS_PRE = new Set([
  "PREPARE_FOR_SUBMISSION",
  "WAITING_FOR_EXPORT_COMPLIANCE",
  "READY_FOR_REVIEW",
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY",
  "DEVELOPER_REJECTED",
  "PENDING_DEVELOPER_RELEASE",
  "PENDING_APPLE_RELEASE",
  "PROCESSING_FOR_DISTRIBUTION",
  "ACCEPTED",
]);
const IOS_SUBMITTED = new Set(["WAITING_FOR_REVIEW", "IN_REVIEW", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY", "PENDING_DEVELOPER_RELEASE", "PENDING_APPLE_RELEASE", "PROCESSING_FOR_DISTRIBUTION", "ACCEPTED", "READY_FOR_DISTRIBUTION"]);
const IOS_APPROVED = new Set(["PENDING_DEVELOPER_RELEASE", "PENDING_APPLE_RELEASE", "PROCESSING_FOR_DISTRIBUTION", "ACCEPTED", "READY_FOR_DISTRIBUTION"]);

const buildWord = (state: string) => (state === "PROCESSING" ? "처리 중" : state === "FAILED" ? "처리 실패" : state === "INVALID" ? "쓸 수 없음" : state);

/** 나가 있는 버전, 단계적 출시 중인 버전, 진행 중인 버전. 출시 조작(options.ts)도 같은 판단을 쓴다 */
export function pickIos(raw: IosRaw) {
  const live = raw.versions.find((v) => v.state === "READY_FOR_DISTRIBUTION") ?? null;
  // 단계적 출시가 아직 끝나지 않았으면 나가 있는 버전이 곧 진행 중인 버전이다
  const rolling = live?.phased && (live.phased.state === "ACTIVE" || live.phased.state === "PAUSED") ? live : null;
  const inflight = raw.versions.find((v) => IOS_PRE.has(v.state) && (!live || versionGt(v.version, live.version))) ?? rolling;
  return { live, rolling, inflight };
}

/**
 * 칸 이름과 빌드 버전이 왜 어긋났는지. 앱 저장소(cops-and-robbers-FE)는 main 에 PR 이 머지될 때마다
 * 버전 셋째 자리와 빌드 번호를 하나씩 올린다(PROJECT-COMMON-VERSION-CONTROL). 칸을 미리 만들어 두면 그 뒤 머지만큼 어긋난다
 */
function mismatchWhy(v: IosVersion, b: IosBuild, live: string | undefined): string {
  const made = kstShort(v.createdAt).split(" ")[0];
  const parts = (b.version ?? "").split(".").map(Number);
  const prev = parts.length === 3 && parts[2] > 0 ? `${parts[0]}.${parts[1]}.${parts[2] - 1}` : null;
  const between = prev && versionGt(prev, v.version) ? `${v.version}~${prev}` : v.version;
  const lines = [
    `${v.version} 칸은 ${made}에 만들었어요.`,
    `앱 저장소는 main 에 PR 이 머지될 때마다 앱 버전을 하나씩 올려요. 그 사이 머지가 쌓여 빌드 ${b.number} 안의 버전이 ${subj(b.version ?? "")} 됐어요.`,
    "애플은 빌드 안 버전과 칸 이름이 같아야 그 칸에 빌드를 붙여 줘요. 그래서 칸 이름을 빌드에 맞추면 돼요.",
  ];
  if (live && b.version && versionGt(b.version, live))
    lines.push(`${topic(between)} 한 번도 스토어에 나간 적 없는 번호라 건너뛰어도 괜찮아요. 사용자에게는 ${live} 다음 업데이트가 ${copula(b.version)}.`);
  // 한 줄에 하나씩(화면이 줄마다 나눠 보여 준다)
  return lines.join("\n");
}

export function iosTrack(raw: IosRaw, lookup: BoardInput["lookup"], now = Date.now()): Track {
  const links = consoleLinks();
  const { live, rolling, inflight } = pickIos(raw);
  const v = inflight ?? live;
  const liveOut: Live | null = live ? { version: live.version, build: live.build?.number } : null;
  if (!v) return { platform: "ios", ok: true, live: null, inflight: null, steps: [], current: 0, status: statusOf(undefined), action: null, rollout: null };
  const href = inflight && inflight !== rolling ? links.iosInflight : links.iosVersions;
  const s = v.state;
  const manual = (v.releaseType ?? "MANUAL") === "MANUAL";

  const slot: Step = { key: "slot", label: "버전 칸", who: "us", state: v.version, tone: "done", at: v.createdAt };

  // 빌드 붙이기
  let build: Step;
  if (!v.build) {
    const latest = raw.latestBuild;
    const mismatch = !!latest?.version && latest.version !== v.version;
    let detail = "올라온 빌드가 없어요";
    let why: string | undefined;
    if (latest) {
      detail = `가장 최근 빌드는 ${latest.number}${latest.state === "VALID" ? "" : `(${buildWord(latest.state)})`}`;
      // 빌드 안의 버전이 칸 이름과 다르면 애플이 그 칸에 붙여 주지 않는다. 콘솔에서는 빌드 고르기 목록이 비어 보일 뿐이라 이유를 적는다
      if (mismatch) {
        detail = `지금 칸 이름은 ${v.version}이고, 빌드 ${latest.number} 안의 버전은 ${copula(latest.version!)}. 애플은 둘이 같아야 빌드를 붙여 줘요`;
        why = mismatchWhy(v, latest, live?.version);
      }
    }
    build = { key: "build", label: "빌드 붙이기", who: "us", state: mismatch ? "붙일 빌드 없음" : "빌드 없음", tone: "turn", href, detail, ...(why ? { why, fixTo: latest?.version } : {}) };
  } else if (v.build.state === "VALID") {
    build = { key: "build", label: "빌드 붙이기", who: "us", state: `빌드 ${v.build.number}`, tone: "done", at: v.build.uploadedAt };
  } else if (v.build.state === "PROCESSING") {
    build = { key: "build", label: "빌드 붙이기", who: "apple", state: `빌드 ${v.build.number} 처리 중`, tone: "wait", at: v.build.uploadedAt, detail: "애플이 빌드를 확인하는 중이에요" };
  } else {
    build = { key: "build", label: "빌드 붙이기", who: "us", state: `빌드 ${v.build.number} ${buildWord(v.build.state)}`, tone: "bad", href, at: v.build.uploadedAt, detail: "다른 빌드를 붙일 수 있어요" };
  }

  // 심사 제출
  const sub = raw.submissions.find((x) => x.submittedAt && x.submittedAt >= v.createdAt) ?? null;
  const submitBase = { key: "submit", label: "심사 제출", who: "us" as Who };
  let submit: Step;
  if (IOS_SUBMITTED.has(s)) submit = { ...submitBase, state: "제출함", tone: "done", at: sub?.submittedAt ?? undefined };
  else if (s === "WAITING_FOR_EXPORT_COMPLIANCE") submit = { ...submitBase, state: "수출 규정 답 필요", tone: "turn", href, detail: "암호화 사용 여부를 답하면 제출할 수 있어요" };
  else if (s === "DEVELOPER_REJECTED") submit = { ...submitBase, state: "제출 취소함", tone: "turn", href, detail: "고친 뒤 다시 제출할 수 있어요" };
  else if (s === "READY_FOR_REVIEW") submit = { ...submitBase, state: "제출 준비됨", tone: "turn", href };
  else if (v.build?.state === "VALID") submit = { ...submitBase, state: "제출 전", tone: "turn", href, detail: `빌드 ${v.build.number}로 준비됐어요` };
  else submit = { ...submitBase, tone: "idle", hint: "빌드를 붙이면 문구와 함께 심사에 낼 수 있어요" };

  // 애플 심사
  const reviewBase = { key: "review", label: "애플 심사", who: "apple" as Who };
  let review: Step;
  if (s === "WAITING_FOR_REVIEW") review = { ...reviewBase, state: "순서 기다림", tone: "wait", at: sub?.submittedAt ?? undefined, atKind: "since" };
  else if (s === "IN_REVIEW") review = { ...reviewBase, state: "심사 중", tone: "wait", at: sub?.submittedAt ?? undefined, atKind: "since" };
  else if (s === "REJECTED" || s === "METADATA_REJECTED" || s === "INVALID_BINARY")
    review = { ...reviewBase, state: s === "METADATA_REJECTED" ? "문구 반려" : s === "INVALID_BINARY" ? "빌드 반려" : "반려", tone: "bad", href, detail: "사유는 App Store Connect 에서 볼 수 있어요" };
  else if (IOS_APPROVED.has(s)) review = { ...reviewBase, state: "승인", tone: "done" };
  else review = { ...reviewBase, tone: "idle", hint: "제출하면 애플이 봐요" };

  // 출시
  const releaseBase = { key: "release", label: "출시", who: (manual ? "us" : "auto") as Who };
  let release: Step;
  if (s === "PENDING_DEVELOPER_RELEASE") release = { ...releaseBase, state: "출시 기다림", tone: "turn", href, detail: "출시를 누르면 App Store 에 나가요. 나라마다 보이기까지 최대 24시간이 걸려요" };
  else if (s === "PENDING_APPLE_RELEASE") release = { ...releaseBase, who: "auto", state: "예약 출시", tone: "wait", at: v.earliestReleaseDate ?? undefined, detail: "정한 시각에 애플이 내보내요" };
  else if (s === "PROCESSING_FOR_DISTRIBUTION" || s === "ACCEPTED") release = { ...releaseBase, who: "apple", state: "출시 처리 중", tone: "wait" };
  else if (s === "READY_FOR_DISTRIBUTION") release = { ...releaseBase, state: "출시함", tone: "done", at: v.phased?.startDate ?? undefined };
  else release = { ...releaseBase, tone: "idle", hint: manual ? "승인되면 원하는 때 출시할 수 있어요(수동 출시)" : "승인되면 바로 나가요" };

  // 단계적 출시 (켰을 때만 7일)
  const p = v.phased;
  const phasedOn = !!p && p.state !== "INACTIVE";
  const rolloutBase = { key: "rollout", label: "단계적 출시", who: "auto" as Who };
  let rollout: Step;
  let rolloutOut: Rollout | null = null;
  if (s !== "READY_FOR_DISTRIBUTION") {
    rollout = { ...rolloutBase, tone: "idle", hint: p ? "7일 동안 1%에서 100%로, 자동 업데이트에만" : "꺼져 있어요. 출시하면 바로 모두에게" };
  } else if (p?.state === "ACTIVE") {
    rolloutOut = { percent: phasedPercent(p.day), day: p.day, paused: false };
    rollout = { ...rolloutBase, state: `${phasedPercent(p.day)}% · ${p.day}일째`, tone: "wait", href: links.iosVersions, detail: "자동 업데이트에만 적용돼요. 손으로 업데이트하면 바로 받아요" };
  } else if (p?.state === "PAUSED") {
    rolloutOut = { percent: phasedPercent(p.day), day: p.day, paused: true };
    rollout = { ...rolloutBase, who: "us", state: `${phasedPercent(p.day)}%에서 멈춤`, tone: "turn", href: links.iosVersions, detail: "멈춘 동안은 날짜가 가지 않아요. 다시 이어 가거나 바로 모두에게 낼 수 있어요" };
  } else {
    rolloutOut = phasedOn ? { percent: 100, day: 7, paused: false } : null;
    rollout = { ...rolloutBase, state: phasedOn ? "100%" : "모두에게", tone: "done" };
  }

  // 나라별 반영
  const reachBase = { key: "reach", label: "나라별 반영", who: "apple" as Who };
  let reach: Step;
  if (s !== "READY_FOR_DISTRIBUTION") reach = { ...reachBase, tone: "idle", hint: "나라마다 반영에 최대 24시간" };
  else if (!lookup) reach = { ...reachBase, state: "확인 못 함", tone: "idle", detail: "App Store 조회가 안 됐어요" };
  else {
    const seen = REACH_COUNTRIES.filter(([c]) => lookup[c] === v.version).length;
    reach =
      seen === REACH_COUNTRIES.length
        ? { ...reachBase, state: "5개 나라 모두", tone: "done" }
        : { ...reachBase, state: `${seen}/${REACH_COUNTRIES.length}개 나라`, tone: "wait", detail: "애플은 나라마다 반영에 최대 24시간이 걸려요" };
  }

  const steps = [slot, build, submit, review, release, rollout, reach];
  const current = currentStep(steps);
  const track = { platform: "ios" as const, ok: true as const, live: liveOut, inflight: inflight ? { version: inflight.version, build: inflight.build?.number } : null, steps, current, rollout: rolloutOut };
  return { ...track, status: statusOf(steps[current]), action: actionOf("ios", steps[current], track.inflight ?? liveOut, now) };
}

// ---------- Android ----------

/** 나가 있는 출시, 프로덕션에서 아직 안 나간 출시, 단계적 출시 중인 출시, 프로덕션에 아직 안 올린 새 빌드 */
export function pickAndroid(raw: AndroidRaw) {
  const published = raw.production.filter((r) => r.lifecycle === "PUBLISHED").sort((a, b) => maxCode(b) - maxCode(a));
  const liveRel = published[0] ?? null;
  const liveCode = liveRel ? maxCode(liveRel) : 0;
  // 프로덕션에 올라가 아직 안 나간 출시(심사 중, 승인, 반려, 초안)
  const pending = raw.production.filter((r) => r.lifecycle !== "PUBLISHED" && maxCode(r) > liveCode).sort((a, b) => maxCode(b) - maxCode(a))[0] ?? null;
  // 단계적 출시 중이면 나가 있는 출시가 곧 진행 중인 버전
  const rolling = liveRel && (liveRel.status === "inProgress" || liveRel.status === "halted") ? liveRel : null;
  // 프로덕션에 아직 안 올린 새 빌드(CI 가 내부 테스트에 초안으로 올린다)
  const candidate = !pending ? (raw.internal.filter((r) => maxCode(r) > liveCode).sort((a, b) => maxCode(b) - maxCode(a))[0] ?? null) : null;
  return { published, liveRel, liveCode, pending, rolling, candidate };
}

export const maxCodeOf = maxCode;

export function androidTrack(raw: AndroidRaw, now = Date.now()): Track {
  const links = consoleLinks();
  const { published, liveRel, liveCode, pending, rolling, candidate } = pickAndroid(raw);
  const rel = pending ?? rolling;

  // 단계적 출시 중이면 대부분의 사람은 이전 버전을 받는다. "지금 나가 있는" 버전은 그 이전 버전으로 보여 준다
  const shown = rolling ? (published.find((r) => r !== rolling) ?? rolling) : liveRel;
  const live: Live | null = shown ? { version: playVersionName(shown.name), build: String(maxCode(shown)) } : null;
  // 내부 테스트 출시 이름(예: "1.1.31")은 CI 가 붙인 것이라 스토어 버전이 아니다. 버전은 비워 두고 빌드 번호로 부른다
  const inflight = rel ? { version: playVersionName(rel.name), build: String(maxCode(rel)) } : candidate ? { version: "", build: String(maxCode(candidate)) } : null;
  const code = inflight?.build ?? (liveRel ? String(liveCode) : null);
  const l = pending?.lifecycle;
  const settled = !pending && !candidate;
  const listing = pendingListing(raw);

  if (!code) return { platform: "android", ok: true, live, inflight, steps: [], current: 0, status: statusOf(undefined), action: null, rollout: null, queue: { release: null, listing } };

  const steps: Step[] = [{ key: "build", label: "내부 테스트 빌드", who: "auto", state: `빌드 ${code}`, tone: "done", detail: "CI 가 내부 테스트에 올려요" }];

  // 프로덕션 출시 만들기 (= 검토로 보내기)
  const submitBase = { key: "submit", label: "프로덕션 출시 만들기", who: "us" as Who };
  if (candidate) steps.push({ ...submitBase, state: "만들기 전", tone: "turn", href: links.playProduction, detail: "프로덕션에 이 빌드로 새 출시를 만들어 검토로 보낼 수 있어요" });
  else if (l === "DRAFT") steps.push({ ...submitBase, state: "초안", tone: "turn", href: links.playPublishing, detail: "초안을 검토로 보내면 심사가 시작돼요" });
  else if (l === "NOT_SENT_FOR_REVIEW") steps.push({ ...submitBase, state: "검토 보내기 전", tone: "turn", href: links.playPublishing, detail: "게시 개요에서 검토로 보낼 수 있어요" });
  else steps.push({ ...submitBase, state: "검토로 보냄", tone: "done" });

  // 구글 심사
  const reviewBase = { key: "review", label: "구글 심사", who: "google" as Who };
  if (l === "IN_REVIEW") steps.push({ ...reviewBase, state: "심사 중", tone: "wait", detail: "구글은 심사 시작 시각을 알려 주지 않아요" });
  else if (l === "NOT_APPROVED") steps.push({ ...reviewBase, state: "반려", tone: "bad", href: links.playPublishing, detail: "사유는 Play Console 에서 볼 수 있어요" });
  else if (l === "APPROVED_NOT_PUBLISHED" || settled || rolling) steps.push({ ...reviewBase, state: "승인", tone: "done" });
  else steps.push({ ...reviewBase, tone: "idle", hint: "검토로 보내면 구글이 봐요" });

  // 게시 (관리형 게시)
  const publishBase = { key: "publish", label: "게시", who: "us" as Who };
  if (l === "APPROVED_NOT_PUBLISHED") steps.push({ ...publishBase, state: "게시 대기", tone: "turn", href: links.playPublishing, detail: "관리형 게시라 게시 개요에서 게시하면 나가요" });
  else if (settled || rolling) steps.push({ ...publishBase, state: "게시함", tone: "done" });
  else steps.push({ ...publishBase, tone: "idle", hint: "승인되면 게시 개요에서 원하는 때 게시할 수 있어요(관리형 게시)" });

  // 단계적 출시
  const rolloutBase = { key: "rollout", label: "단계적 출시", who: "us" as Who };
  let rolloutOut: Rollout | null = null;
  if (rolling && !pending) {
    const pct = Math.round((rolling.fraction ?? 0) * 1000) / 10;
    rolloutOut = { percent: pct, paused: rolling.status === "halted" };
    steps.push(
      rolling.status === "halted"
        ? { ...rolloutBase, state: `${pct}%에서 멈춤`, tone: "turn", href: links.playProduction, detail: "멈춘 동안 새로 받는 사람은 이전 버전을 받아요. 다시 이어 갈 수 있어요" }
        : { ...rolloutBase, state: `${pct}%`, tone: "wait", href: links.playProduction, detail: "비율을 올리거나 바로 모두에게 낼 수 있어요" },
    );
  } else if (settled) {
    rolloutOut = { percent: 100, paused: false };
    steps.push({ ...rolloutBase, state: "100%", tone: "done" });
  } else steps.push({ ...rolloutBase, tone: "idle", hint: "게시할 때 비율을 정하고 나중에 올릴 수 있어요" });

  const staleSince = raw.listedAt && now - Date.parse(raw.listedAt) > 90_000 ? raw.listedAt : undefined;
  const queue: PublishQueue = { release: l === "APPROVED_NOT_PUBLISHED" && inflight ? `앱 출시 ${inflight.version || `빌드 ${inflight.build}`}` : null, listing };
  const current = currentStep(steps);
  return { platform: "android", ok: true, live, inflight, steps, current, status: statusOf(steps[current]), action: actionOf("android", steps[current], inflight ?? live, now), rollout: rolloutOut, queue, ...(staleSince ? { staleSince } : {}) };
}

const LANG: Record<string, string> = { "en-US": "영어", "ko-KR": "한국어", "ja-JP": "일본어" };
export const langName = (l: string) => LANG[l] ?? l;

/** 승인됐지만 아직 안 나간 스토어 변경(이름)의 언어. 관리형 게시라 콘솔에서 게시를 눌러야 나간다 */
export function pendingListing(raw: AndroidRaw): string[] {
  return raw.listing.filter((l) => l.live !== null && l.approved.trim() !== l.live.trim()).map((l) => l.language);
}

// ---------- 할 일 ----------

const CONSOLE: Record<Platform, string> = { ios: "App Store Connect", android: "Play Console" };

/** 한 스토어에서 지금 할 일. 카드 안에서 쓰니 스토어 이름은 붙이지 않는다 */
function actionOf(p: Platform, st: Step | undefined, ver: { version: string; build?: string } | null, now: number): Action | null {
  if (!st || st.tone === "done" || st.tone === "idle") return null;
  const name = ver ? ver.version || `빌드 ${ver.build}` : "";
  const go = (label: string) => (st.href ? { label, href: st.href } : undefined);
  const base = { tone: st.tone, platform: p };
  if (st.tone === "bad") return { ...base, title: st.key === "build" ? `${name} 빌드를 쓸 수 없어요` : `${subj(name)} 반려됐어요`, reason: st.detail, action: go("사유 보기") };
  if (st.tone === "turn") {
    if (st.key === "build") {
      // 문제가 아니라 할 수 있는 일로 말한다. 칸 이름만 맞추면 되는 경우가 대부분이다(앱 저장소가 머지마다 버전을 올린다)
      const to = st.fixTo;
      const title = st.state === "붙일 빌드 없음" && to ? `칸 이름만 ${ro(to)} 맞추면 빌드를 붙일 수 있어요` : st.state === "붙일 빌드 없음" ? `${name}에 붙일 수 있는 빌드가 아직 없어요` : `${name}에 빌드를 붙일 수 있어요`;
      return { ...base, title, reason: st.detail, ...(st.why ? { why: st.why } : {}), action: go("버전 화면 열기") };
    }
    if (st.key === "submit") return { ...base, title: `${obj(name)} 심사에 낼 수 있어요`, reason: st.detail, action: go(p === "ios" ? "버전 화면 열기" : "프로덕션 트랙 열기") };
    if (st.key === "release") return { ...base, title: `${subj(name)} 승인됐어요. 지금 출시할 수 있어요`, reason: st.detail, action: go("버전 화면 열기") };
    if (st.key === "publish") return { ...base, title: `${subj(name)} 승인됐어요. 지금 게시할 수 있어요`, reason: st.detail, action: go("게시 개요 열기") };
    if (st.key === "rollout") return { ...base, title: "단계적 출시가 멈춰 있어요", reason: st.detail, action: go("단계적 출시 보기") };
    return { ...base, title: `${st.label}: ${st.state ?? ""}`.trim(), reason: st.detail, action: go(`${CONSOLE[p]} 열기`) };
  }
  // 기다리는 일
  if (st.key === "review") {
    const title = st.state === "순서 기다림" ? `${subj(name)} 심사 순서를 기다리고 있어요` : `${name} ${copula(st.state ?? "심사 중")}`;
    const reason = st.at ? `제출한 지 ${since(st.at, now)}예요. 기다리면 돼요` : (st.detail ? `${st.detail}. 기다리면 돼요` : "기다리면 돼요");
    return { ...base, title, reason };
  }
  if (st.key === "rollout") return { ...base, title: `단계적 출시 ${copula(st.state?.split(" ·")[0] ?? "")}`, reason: st.detail, action: go("단계적 출시 보기") };
  if (st.key === "reach") return { ...base, title: `${subj(name)} 나라마다 퍼지는 중이에요`, reason: st.detail };
  return { ...base, title: `${name} ${copula(st.state ?? "기다리는 중")}`, reason: st.detail };
}

const NAME: Record<Platform, string> = { ios: "iOS", android: "Android" };
const RANK: Record<Tone, number> = { bad: 1, turn: 2, wait: 3, idle: 9, done: 9 };

export function buildBoard(input: BoardInput): ReleaseBoard {
  const links = consoleLinks();
  const now = Date.parse(input.now);
  const ios: Track = isError(input.ios) ? { platform: "ios", ok: false, error: input.ios.error, href: links.iosVersions } : iosTrack(input.ios, input.lookup, now);
  const android: Track = isError(input.android) ? { platform: "android", ok: false, error: input.android.error, href: links.playPublishing } : androidTrack(input.android, now);

  // 두 스토어를 통틀어 가장 먼저 할 일. 같은 급이면 iOS 먼저(심사가 더 오래 걸린다)
  const actions = [ios, android]
    .filter((t): t is Extract<Track, { ok: true }> => t.ok && !!t.action)
    .map((t) => ({ ...t.action!, title: `${NAME[t.platform]} ${t.action!.title}` }))
    .sort((a, b) => RANK[a.tone] - RANK[b.tone]);
  const failed = [ios, android].filter((t) => !t.ok).map((t) => NAME[t.platform]);
  const next: Action =
    actions[0] ??
    (failed.length === 2
      ? { tone: "bad", title: "두 스토어를 모두 읽지 못했어요", reason: "잠시 뒤 다시 읽어 주세요. 계속 안 되면 키가 바뀌지 않았는지 확인해요" }
      : { tone: "done", title: failed.length ? `${topic(failed[0] === "iOS" ? "Android" : "iOS")} 최신이에요` : "두 스토어 모두 최신이에요", reason: "다음 빌드를 기다리는 중이에요" });

  const notes: Action[] = [];
  const iosBuild = isError(input.ios) ? null : input.ios.latestBuild?.number;
  const androidBuild = android.ok && android.inflight?.build;
  if (iosBuild && androidBuild && iosBuild !== androidBuild)
    notes.push({ tone: "idle", title: `두 스토어의 새 빌드 번호가 달라요 (iOS ${iosBuild}, Android ${androidBuild})`, reason: "두 스토어에 같은 코드가 나가는지 확인할 수 있어요" });

  const reach: Reach = input.lookup
    ? {
        target: ios.ok ? (ios.inflight?.version ?? ios.live?.version ?? "") : "",
        countries: REACH_COUNTRIES.map(([code, label]) => ({ code, label, version: input.lookup?.[code] ?? null })),
        euBlocked: input.lookup.de === null,
      }
    : null;

  return { readAt: input.now, ios, android, reach, next, notes, history: input.history };
}
