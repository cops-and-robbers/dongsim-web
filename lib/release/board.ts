/**
 * 출시 보드의 판단 (docs/admin-ui.md "출시").
 *
 * 두 스토어에서 읽은 값(IosRaw, AndroidRaw)을 같은 다섯 단계(빌드, 제출, 심사, 출시, 보임)와 같은 한국어로 바꾸고,
 * 지금 가장 먼저 할 일 하나를 고른다. 스토어를 부르는 일은 stores.ts 가 하고, 여기는 순수 함수만 둔다.
 * 그래서 실제로 읽은 응답(fixtures.ts)과 상황별 가짜 응답으로 그대로 테스트하고, 로컬 가짜 화면도 이 함수를 거친다.
 *
 * 색(Tone) 원칙: 노랑(turn)은 "우리가 할 차례"에만, 기다리는 일(심사)은 파랑(wait), 빨강(bad)은 반려와 읽기 실패만.
 */

import { consoleLinks } from "./links.ts";
import { since } from "./time.ts";

export type Platform = "ios" | "android";
export type Tone = "done" | "wait" | "turn" | "bad" | "idle";
export type StepKey = "build" | "submit" | "review" | "release" | "reach";

export const STEP_LABELS: Record<StepKey, string> = { build: "빌드", submit: "제출", review: "심사", release: "출시", reach: "사용자에게 보임" };

export type Step = {
  key: StepKey;
  /** 상태 말. "빌드 392", "심사 중" */
  state: string;
  tone: Tone;
  /** 그 상태가 된 시각(ISO). 화면이 한국 시각과 상대 시각으로 쓴다 */
  at?: string;
  /** 시각을 무엇으로 읽을지. "since" 면 "3시간째" */
  atKind?: "at" | "since";
  detail?: string;
  /** 이 단계를 처리하는 콘솔 화면 */
  href?: string;
};

export type Live = { version: string; build?: string };

export type Track =
  | {
      platform: Platform;
      ok: true;
      live: Live | null;
      /** 진행 중인 버전. 없으면 steps 는 지금 나가 있는 버전의 지나온 길 */
      inflight: { version: string; build?: string } | null;
      steps: Step[];
      /** 지금 단계(steps 의 칸 번호) */
      current: number;
    }
  | { platform: Platform; ok: false; error: string; href: string };

export type ReachCountry = { code: string; label: string; version: string | null };
export type Reach = { target: string; countries: ReachCountry[]; euBlocked: boolean } | null;

export type Action = { tone: Tone; title: string; reason?: string; platform?: Platform; action?: { label: string; href: string } };

export type HistoryItem = { version: string; ios?: string; android?: string };

export type ReleaseBoard = {
  readAt: string;
  ios: Track;
  android: Track;
  reach: Reach;
  next: Action;
  /** 다음 할 일 아래 작은 줄들 */
  notes: Action[];
  history: HistoryItem[];
};

// ---------- 스토어에서 읽은 값 (stores.ts 가 채운다) ----------

/** version 은 빌드 안에 적힌 버전(CFBundleShortVersionString). 스토어 버전 칸 이름과 같아야 그 칸에 붙는다 */
export type IosBuild = { number: string; state: string; uploadedAt: string; version?: string };
export type IosVersion = {
  id: string;
  version: string;
  /** appVersionState */
  state: string;
  createdAt: string;
  earliestReleaseDate?: string | null;
  build: IosBuild | null;
  phased: { state: string; day: number; startDate?: string | null } | null;
};
export type IosRaw = {
  /** 새 것 먼저 */
  versions: IosVersion[];
  /** 가장 최근에 올라온 빌드(버전에 안 붙은 것 포함) */
  latestBuild: IosBuild | null;
  /** 심사 제출 묶음. 새 것 먼저 */
  submissions: { state: string; submittedAt: string | null }[];
};

export type PlayRelease = {
  name: string;
  codes: number[];
  /** releaseLifecycleState 에서 앞의 RELEASE_LIFECYCLE_STATE_ 를 뗀 것. DRAFT, IN_REVIEW, PUBLISHED ... */
  lifecycle: string;
  /** edits.tracks 의 status. completed, inProgress, halted, draft */
  status?: string;
  fraction?: number;
};
export type AndroidRaw = {
  production: PlayRelease[];
  internal: PlayRelease[];
  /** 언어마다 승인된 이름과 스토어에 실제로 보이는 이름. 다르면 게시 안 된 변경이 있다 */
  listing: { language: string; approved: string; live: string | null }[];
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

const step = (key: StepKey, state: string, tone: Tone, extra: Partial<Step> = {}): Step => ({ key, state, tone, ...extra });
const isError = (x: unknown): x is { error: string } => typeof x === "object" && x !== null && "error" in x;

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

export function iosTrack(raw: IosRaw, lookup: BoardInput["lookup"]): Track {
  const links = consoleLinks();
  const live = raw.versions.find((v) => v.state === "READY_FOR_DISTRIBUTION") ?? null;
  // 단계적 출시가 아직 끝나지 않았으면 나가 있는 버전이 곧 진행 중인 버전이다
  const rolling = live?.phased && (live.phased.state === "ACTIVE" || live.phased.state === "PAUSED") ? live : null;
  const inflight = raw.versions.find((v) => IOS_PRE.has(v.state) && (!live || versionGt(v.version, live.version))) ?? rolling;
  const v = inflight ?? live;
  if (!v) return { platform: "ios", ok: true, live: null, inflight: null, steps: [], current: 0 };
  const href = inflight ? links.iosInflight : links.iosVersions;
  const s = v.state;

  // 빌드
  let build: Step;
  if (!v.build) {
    const latest = raw.latestBuild;
    let detail = "올라온 빌드가 없어요";
    if (latest) {
      detail = `가장 최근 빌드는 ${latest.number}${latest.state === "VALID" ? "" : `(${buildWord(latest.state)})`}`;
      // 빌드 안의 버전이 칸 이름과 다르면 애플이 그 칸에 붙여 주지 않는다. 콘솔에서는 빌드 고르기 목록이 비어 보일 뿐이라 이유를 적는다
      if (latest.version && latest.version !== v.version)
        detail = `가장 최근 빌드 ${topic(latest.number)} ${latest.version} 버전이라 이 칸에 안 붙어요. 칸 이름을 ${ro(latest.version)} 바꾸거나 ${v.version} 빌드를 올려야 해요`;
    }
    const mismatch = !!latest?.version && latest.version !== v.version;
    build = step("build", mismatch ? "붙일 빌드 없음" : "빌드 없음", "turn", { href, detail });
  } else if (v.build.state === "VALID") {
    build = step("build", `빌드 ${v.build.number}`, "done", { at: v.build.uploadedAt });
  } else if (v.build.state === "PROCESSING") {
    build = step("build", `빌드 ${v.build.number} 처리 중`, "wait", { at: v.build.uploadedAt, detail: "애플이 빌드를 확인하는 중이에요" });
  } else {
    build = step("build", `빌드 ${v.build.number} ${buildWord(v.build.state)}`, "bad", { href, at: v.build.uploadedAt, detail: "다른 빌드를 붙여야 해요" });
  }

  // 제출
  const sub = raw.submissions.find((x) => x.submittedAt && x.submittedAt >= v.createdAt) ?? null;
  let submit: Step;
  if (IOS_SUBMITTED.has(s)) submit = step("submit", "제출함", "done", { at: sub?.submittedAt ?? undefined });
  else if (s === "WAITING_FOR_EXPORT_COMPLIANCE") submit = step("submit", "수출 규정 답 필요", "turn", { href, detail: "암호화 사용 여부를 답해야 제출돼요" });
  else if (s === "DEVELOPER_REJECTED") submit = step("submit", "제출 취소함", "turn", { href, detail: "고친 뒤 다시 제출해요" });
  else if (s === "READY_FOR_REVIEW") submit = step("submit", "제출 준비됨", "turn", { href });
  else submit = step("submit", "제출 전", v.build?.state === "VALID" ? "turn" : "idle", v.build?.state === "VALID" ? { href } : {});

  // 심사
  let review: Step;
  if (s === "WAITING_FOR_REVIEW") review = step("review", "심사 기다림", "wait", { at: sub?.submittedAt ?? undefined, atKind: "since" });
  else if (s === "IN_REVIEW") review = step("review", "심사 중", "wait", { at: sub?.submittedAt ?? undefined, atKind: "since" });
  else if (s === "REJECTED" || s === "METADATA_REJECTED" || s === "INVALID_BINARY")
    review = step("review", s === "METADATA_REJECTED" ? "문구 반려" : s === "INVALID_BINARY" ? "빌드 반려" : "반려", "bad", { href, detail: "사유는 App Store Connect 에서 볼 수 있어요" });
  else if (IOS_APPROVED.has(s)) review = step("review", "승인", "done");
  else review = step("review", "심사 전", "idle");

  // 출시
  let release: Step;
  if (s === "PENDING_DEVELOPER_RELEASE") release = step("release", "출시 기다림", "turn", { href, detail: "승인됐어요. 우리가 출시를 눌러야 나가요" });
  else if (s === "PENDING_APPLE_RELEASE") release = step("release", "예약 출시", "wait", { at: v.earliestReleaseDate ?? undefined, detail: "정한 시각에 애플이 내보내요" });
  else if (s === "PROCESSING_FOR_DISTRIBUTION" || s === "ACCEPTED") release = step("release", "출시 처리 중", "wait");
  else if (s === "READY_FOR_DISTRIBUTION") {
    const p = v.phased;
    if (p?.state === "ACTIVE") release = step("release", `단계적 출시 ${phasedPercent(p.day)}%`, "wait", { at: p.startDate ?? undefined, detail: `${p.day}일째 · 7일째에 모두에게`, href: links.iosVersions });
    else if (p?.state === "PAUSED") release = step("release", `단계적 출시 멈춤 ${phasedPercent(p.day)}%`, "turn", { href: links.iosVersions, detail: "멈춘 동안은 날짜가 가지 않아요" });
    else release = step("release", "출시됨", "done", { at: p?.startDate ?? undefined });
  } else release = step("release", "출시 전", "idle");

  // 보임
  const reach = reachStep(v.version, s === "READY_FOR_DISTRIBUTION", lookup);

  const steps = [build, submit, review, release, reach];
  return { platform: "ios", ok: true, live: live ? { version: live.version, build: live.build?.number } : null, inflight: inflight ? { version: inflight.version, build: inflight.build?.number } : null, steps, current: currentStep(steps) };
}

const buildWord = (state: string) => (state === "PROCESSING" ? "처리 중" : state === "FAILED" ? "처리 실패" : state === "INVALID" ? "쓸 수 없음" : state);

function reachStep(version: string, released: boolean, lookup: BoardInput["lookup"]): Step {
  if (!released) return step("reach", "출시 뒤 확인", "idle");
  if (!lookup) return step("reach", "확인 못 함", "idle", { detail: "App Store 조회가 안 됐어요" });
  const seen = REACH_COUNTRIES.filter(([c]) => lookup[c] === version).length;
  if (seen === REACH_COUNTRIES.length) return step("reach", "5개 나라 모두", "done");
  return step("reach", `${seen}/${REACH_COUNTRIES.length}개 나라`, "wait", { detail: "애플은 나라마다 반영에 최대 24시간이 걸려요" });
}

// ---------- Android ----------

export function androidTrack(raw: AndroidRaw): Track {
  const links = consoleLinks();
  const published = raw.production.filter((r) => r.lifecycle === "PUBLISHED").sort((a, b) => maxCode(b) - maxCode(a));
  const liveRel = published[0] ?? null;
  const liveCode = liveRel ? maxCode(liveRel) : 0;
  // 프로덕션에 올라가 아직 안 나간 출시(심사 중, 승인, 반려, 초안)
  const pending = raw.production.filter((r) => r.lifecycle !== "PUBLISHED" && maxCode(r) > liveCode).sort((a, b) => maxCode(b) - maxCode(a))[0] ?? null;
  // 단계적 출시 중이면 나가 있는 출시가 곧 진행 중인 버전
  const rolling = liveRel && (liveRel.status === "inProgress" || liveRel.status === "halted") ? liveRel : null;
  // 프로덕션에 아직 안 올린 새 빌드(CI 가 내부 테스트에 초안으로 올린다)
  const candidate = !pending ? raw.internal.filter((r) => maxCode(r) > liveCode).sort((a, b) => maxCode(b) - maxCode(a))[0] ?? null : null;

  const live: Live | null = liveRel ? { version: playVersionName(liveRel.name), build: String(liveCode) } : null;
  const steps: Step[] = [];
  let inflight: { version: string; build?: string } | null = null;

  if (pending) {
    const code = String(maxCode(pending));
    inflight = { version: playVersionName(pending.name), build: code };
    const l = pending.lifecycle;
    steps.push(step("build", `빌드 ${code}`, "done"));
    if (l === "DRAFT" || l === "NOT_SENT_FOR_REVIEW") {
      steps.push(step("submit", l === "DRAFT" ? "프로덕션 초안" : "검토 보내기 전", "turn", { href: links.playPublishing, detail: "Play 게시 개요에서 검토로 보내요" }));
      steps.push(step("review", "심사 전", "idle"));
      steps.push(step("release", "출시 전", "idle"));
    } else {
      steps.push(step("submit", "제출함", "done"));
      if (l === "IN_REVIEW") {
        steps.push(step("review", "심사 중", "wait"));
        steps.push(step("release", "출시 전", "idle"));
      } else if (l === "NOT_APPROVED") {
        steps.push(step("review", "반려", "bad", { href: links.playPublishing, detail: "사유는 Play Console 에서 볼 수 있어요" }));
        steps.push(step("release", "출시 전", "idle"));
      } else if (l === "APPROVED_NOT_PUBLISHED") {
        steps.push(step("review", "승인", "done"));
        steps.push(step("release", "게시 기다림", "turn", { href: links.playPublishing, detail: "관리형 게시라 우리가 게시를 눌러야 나가요" }));
      } else {
        steps.push(step("review", l, "idle"));
        steps.push(step("release", "출시 전", "idle"));
      }
    }
    steps.push(step("reach", "출시 뒤 확인", "idle"));
  } else if (rolling) {
    const code = String(maxCode(rolling));
    inflight = { version: playVersionName(rolling.name), build: code };
    const pct = Math.round((rolling.fraction ?? 0) * 1000) / 10;
    steps.push(step("build", `빌드 ${code}`, "done"), step("submit", "제출함", "done"), step("review", "승인", "done"));
    steps.push(
      rolling.status === "halted"
        ? step("release", `단계적 출시 멈춤 ${pct}%`, "turn", { href: links.playProduction, detail: "멈춘 동안 새 사용자는 이전 버전을 받아요" })
        : step("release", `단계적 출시 ${pct}%`, "wait", { href: links.playProduction, detail: "비율을 올리거나 전체로 낼 수 있어요" }),
    );
    steps.push(step("reach", "나라별 확인 불가", "idle", { detail: "Play 는 나라별로 보이는 버전을 알려 주지 않아요" }));
  } else if (candidate) {
    const code = String(maxCode(candidate));
    // 내부 테스트 출시 이름(예: "1.1.31")은 CI 가 붙인 것이라 스토어 버전이 아니다. 버전은 비워 두고 빌드 번호로 부른다
    inflight = { version: "", build: code };
    steps.push(step("build", `빌드 ${code}`, "done", { detail: "내부 테스트에 올라와 있어요" }));
    steps.push(step("submit", "제출 전", "turn", { href: links.playProduction, detail: "프로덕션에 새 버전을 만들어 검토로 보내요" }));
    steps.push(step("review", "심사 전", "idle"), step("release", "출시 전", "idle"), step("reach", "출시 뒤 확인", "idle"));
  } else if (liveRel) {
    steps.push(step("build", `빌드 ${liveCode}`, "done"), step("submit", "제출함", "done"), step("review", "승인", "done"), step("release", "출시됨", "done"));
    steps.push(step("reach", "나라별 확인 불가", "idle", { detail: "Play 는 나라별로 보이는 버전을 알려 주지 않아요" }));
  }
  return { platform: "android", ok: true, live, inflight, steps, current: currentStep(steps) };
}

/** 승인됐지만 아직 안 나간 스토어 변경(이름). 관리형 게시라 콘솔에서 게시를 눌러야 나간다 */
export function pendingListing(raw: AndroidRaw): string[] {
  return raw.listing.filter((l) => l.live !== null && l.approved.trim() !== l.live.trim()).map((l) => l.language);
}

/** 지금 단계: 끝나지 않은 첫 칸. 다 끝났으면 마지막 칸 */
function currentStep(steps: Step[]): number {
  const i = steps.findIndex((s) => s.tone !== "done");
  return i === -1 ? Math.max(steps.length - 1, 0) : i;
}

// ---------- 다음 할 일 ----------

const NAME: Record<Platform, string> = { ios: "iOS", android: "Android" };

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

/** 한 스토어의 할 일과 급한 정도(작을수록 먼저) */
function trackAction(t: Track, now: number): { rank: number; action: Action } | null {
  if (!t.ok) return null;
  const st = t.steps[t.current];
  if (!st) return null;
  const label = t.inflight ? t.inflight.version || `빌드 ${t.inflight.build}` : (t.live?.version ?? "");
  const who = `${NAME[t.platform]} ${label}`.trim();
  const go = (label: string) => (st.href ? { label, href: st.href } : undefined);
  const con = t.platform === "ios" ? "App Store Connect" : "Play Console";
  const p = t.platform;
  if (st.tone === "bad") {
    const title = st.key === "build" ? `${who} 빌드를 쓸 수 없어요` : `${subj(who)} 반려됐어요`;
    return { rank: 1, action: { tone: "bad", platform: p, title, reason: st.detail, action: go(`${con}에서 보기`) } };
  }
  if (st.tone === "turn") {
    if (st.key === "release" && st.state.startsWith("단계적")) return { rank: 2, action: { tone: "turn", platform: p, title: `${who} 단계적 출시가 멈춰 있어요`, reason: st.detail, action: go(`${con}에서 보기`) } };
    if (st.key === "release") {
      const title = p === "ios" ? `${subj(who)} 승인됐어요. 출시할 시간을 골라 주세요` : `${subj(who)} 승인됐어요. Play 에서 게시를 눌러야 나가요`;
      return { rank: 2, action: { tone: "turn", platform: p, title, reason: st.detail, action: go(p === "ios" ? "App Store Connect 에서 출시" : "Play 게시 개요 열기") } };
    }
    if (st.key === "build") {
      const title = st.state === "붙일 빌드 없음" ? `${who}에 붙일 빌드가 없어요` : `${who}에 빌드를 붙여 주세요`;
      return { rank: 3, action: { tone: "turn", platform: p, title, reason: st.detail, action: go("버전 화면 열기") } };
    }
    const reason = st.detail ?? (t.inflight?.version && t.inflight.build ? `빌드 ${t.inflight.build}로 준비됐어요` : undefined);
    return { rank: 3, action: { tone: "turn", platform: p, title: `${obj(who)} 심사에 낼 차례예요`, reason, action: go(`${con}에서 제출`) } };
  }
  if (st.tone === "wait") {
    if (st.key === "review" || st.key === "submit") {
      const title = st.state === "심사 기다림" ? `${subj(who)} 심사 순서를 기다리고 있어요` : `${who} ${copula(st.state)}`;
      const reason = st.at ? `제출한 지 ${since(st.at, now)}예요. 기다리면 돼요` : (st.detail ?? "기다리면 돼요");
      return { rank: 4, action: { tone: "wait", platform: p, title, reason } };
    }
    if (st.key === "release") return { rank: 5, action: { tone: "wait", platform: p, title: `${who} ${copula(st.state)}`, reason: st.detail, action: go(`${con}에서 보기`) } };
    if (st.key === "build") return { rank: 5, action: { tone: "wait", platform: p, title: `${who} ${copula(st.state)}`, reason: st.detail } };
    return { rank: 6, action: { tone: "wait", platform: p, title: `${subj(who)} 출시됐어요. 일부 나라 스토어에는 아직 안 보여요`, reason: st.detail } };
  }
  return null;
}

export function buildBoard(input: BoardInput): ReleaseBoard {
  const links = consoleLinks();
  const ios: Track = isError(input.ios) ? { platform: "ios", ok: false, error: input.ios.error, href: links.iosVersions } : iosTrack(input.ios, input.lookup);
  const android: Track = isError(input.android) ? { platform: "android", ok: false, error: input.android.error, href: links.playPublishing } : androidTrack(input.android);

  const nowMs = Date.parse(input.now);
  const ranked = [trackAction(ios, nowMs), trackAction(android, nowMs)].filter((x): x is { rank: number; action: Action } => !!x).sort((a, b) => a.rank - b.rank);
  const failed = [ios, android].filter((t) => !t.ok).map((t) => NAME[t.platform]);
  let next: Action;
  if (ranked.length) next = ranked[0].action;
  else if (failed.length === 2) next = { tone: "bad", title: "두 스토어를 모두 읽지 못했어요", reason: "잠시 뒤 다시 읽어 주세요. 계속 안 되면 키가 바뀌지 않았는지 확인해요" };
  else next = { tone: "done", title: failed.length ? `${topic(failed[0] === "iOS" ? "Android" : "iOS")} 최신이에요` : "두 스토어 모두 최신이에요", reason: "다음 빌드를 기다리는 중이에요" };

  const notes: Action[] = ranked.slice(1).map((r) => r.action);
  if (failed.length === 1) notes.push({ tone: "bad", title: `${obj(failed[0])} 읽지 못해 ${failed[0] === "iOS" ? "Android" : "iOS"}만 보고 말해요` });
  const iosBuild = isError(input.ios) ? null : input.ios.latestBuild?.number;
  const androidBuild = android.ok && android.inflight?.build;
  if (iosBuild && androidBuild && iosBuild !== androidBuild)
    notes.push({ tone: "idle", title: `두 스토어의 새 빌드 번호가 달라요 (iOS ${iosBuild}, Android ${androidBuild})`, reason: "같은 코드를 내는지 확인해 주세요" });
  if (!isError(input.android)) {
    const langs = pendingListing(input.android);
    if (langs.length)
      notes.push({
        tone: "turn",
        platform: "android",
        title: "Play 에 승인됐지만 아직 안 나간 스토어 변경이 있어요",
        reason: `${langs.map(langName).join(", ")} 앱 이름이 스토어에 보이는 것과 달라요. 관리형 게시라 게시를 눌러야 나가요`,
        action: { label: "Play 게시 개요 열기", href: links.playPublishing },
      });
  }

  const reach: Reach = input.lookup
    ? {
        target: ios.ok ? (ios.inflight?.version ?? ios.live?.version ?? "") : "",
        countries: REACH_COUNTRIES.map(([code, label]) => ({ code, label, version: input.lookup?.[code] ?? null })),
        euBlocked: input.lookup.de === null,
      }
    : null;

  return { readAt: input.now, ios, android, reach, next, notes, history: input.history };
}

const LANG: Record<string, string> = { "en-US": "영어", "ko-KR": "한국어", "ja-JP": "일본어" };
const langName = (l: string) => LANG[l] ?? l;
