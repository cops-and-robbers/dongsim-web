/**
 * 출시 보드에서 어드민이 직접 할 수 있는 조작 (docs/admin-ui.md "출시 조작").
 *
 * 지금 두 스토어 상태에서 할 수 있는 것만 고른다. 화면은 이 목록으로 버튼을 그리고, 서버는 누르는 순간 스토어를 다시 읽어
 * 같은 목록을 만든 뒤 화면이 보낸 것(id 와 expect)이 그대로 있을 때만 한다. 그 사이 상태가 바뀌었으면 하지 않는다.
 *
 * 단계(level)
 * - 1: 확인창. 되돌릴 수 있거나 사용자에게 닿지 않는 것(버전 칸 이름, 빌드 붙이기, 제출 취소, 단계적 출시 멈춤과 이어 가기)
 * - 2: 확인창 + 버전 번호를 직접 입력. 되돌릴 수 없거나 사용자에게 닿는 것(심사 제출, 출시, 바로 모두에게, 비율 올리기)
 *
 * 관리형 게시의 "게시"와 반려 사유 보기는 API 가 없어 콘솔 바로가기로 둔다.
 */
import { maxCodeOf, obj, pickAndroid, pickIos, playVersionName, ro, subj, type AndroidRaw, type IosRaw, type Platform, type PlayRelease } from "./board.ts";

export type ActionId =
  | "ios.renameVersion"
  | "ios.attachBuild"
  | "ios.submit"
  | "ios.cancelSubmission"
  | "ios.release"
  | "ios.phasedPause"
  | "ios.phasedResume"
  | "ios.phasedComplete"
  | "android.createRelease"
  | "android.rolloutSet"
  | "android.halt"
  | "android.resume"
  | "android.complete";

export type OptionParams = {
  versionId?: string;
  to?: string;
  buildId?: string;
  submissionId?: string;
  phasedId?: string;
  code?: number;
  /** Android 단계적 출시 지금 비율(0~1) */
  fraction?: number;
  notes?: { language: string; text: string }[];
  /** 지금 나가 있는 출시의 노트(새 노트를 쓸 때 본보기) */
  lastNotes?: { language: string; text: string }[];
};

/** Play 출시 노트 언어(우리 스토어 등록정보 언어)와 언어마다 글자 수 한도 */
export const NOTE_LANGS = [
  { language: "ko-KR", label: "한국어" },
  { language: "en-US", label: "영어" },
  { language: "ja-JP", label: "일본어" },
];
export const NOTE_MAX = 500;

export type Option = {
  id: ActionId;
  platform: Platform;
  /** 버튼 말. "칸 이름을 3.2.17로 바꾸기" */
  label: string;
  level: 1 | 2;
  /** 단계 2에서 그대로 입력해야 하는 말(버전 번호) */
  confirmWord: string;
  /** 화면을 연 때의 상태. 서버가 다시 읽은 값과 다르면 하지 않는다 */
  expect: string;
  /** 누르면 무슨 일이 생기나 */
  what: string;
  /** 되돌릴 수 있나 */
  undo: string;
  /** 사용자에게 닿나 */
  reachesUsers: boolean;
  /** 버튼을 강조할지(그 스토어에서 가장 자연스러운 다음 조작) */
  primary: boolean;
  params: OptionParams;
};

// ---------- iOS ----------

const SUBMITTABLE = new Set(["PREPARE_FOR_SUBMISSION", "READY_FOR_REVIEW", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"]);

export function iosOptions(raw: IosRaw): Option[] {
  const { inflight, live } = pickIos(raw);
  const out: Option[] = [];
  const v = inflight ?? live;
  if (!v) return out;
  const sig = (extra = "") => `${v.id}|${v.version}|${v.state}|${v.build?.number ?? "-"}${extra}`;
  const base = { platform: "ios" as const, confirmWord: v.version };

  if (inflight && v.state === "PREPARE_FOR_SUBMISSION" && !v.build) {
    const b = raw.latestBuild;
    if (b?.id && b.state === "VALID" && b.version && b.version !== v.version) {
      out.push({
        ...base,
        id: "ios.renameVersion",
        label: `칸 이름을 ${ro(b.version)} 바꾸기`,
        level: 1,
        expect: sig(`|${b.number}`),
        what: `App Store Connect 의 버전 칸 이름이 ${v.version}에서 ${ro(b.version)} 바뀌어요. 그러면 ${obj(`빌드 ${b.number}`)} 붙일 수 있어요. 사용자에게는 아무 일도 없어요.`,
        undo: "다시 바꿀 수 있어요.",
        reachesUsers: false,
        primary: true,
        params: { versionId: v.id, to: b.version },
      });
    } else if (b?.id && b.state === "VALID" && (!b.version || b.version === v.version)) {
      out.push({
        ...base,
        id: "ios.attachBuild",
        label: `빌드 ${b.number} 붙이기`,
        level: 1,
        expect: sig(`|${b.number}`),
        what: `${obj(`빌드 ${b.number}`)} ${v.version} 칸에 붙여요. 사용자에게는 아무 일도 없어요.`,
        undo: "다른 빌드로 바꿀 수 있어요.",
        reachesUsers: false,
        primary: true,
        params: { versionId: v.id, buildId: b.id },
      });
    }
  }

  if (inflight && SUBMITTABLE.has(v.state) && v.build?.state === "VALID") {
    out.push({
      ...base,
      id: "ios.submit",
      label: "심사에 내기",
      level: 2,
      expect: sig(),
      what: `${v.version}(${obj(`빌드 ${v.build.number}`)}) 지금 적힌 문구와 함께 애플 심사에 내요. 심사 중에는 이 칸의 문구와 빌드를 바꿀 수 없어요.`,
      undo: "심사가 끝나기 전에는 제출을 취소할 수 있어요.",
      reachesUsers: false,
      primary: true,
      params: { versionId: v.id },
    });
  }

  if (inflight && (v.state === "WAITING_FOR_REVIEW" || v.state === "IN_REVIEW")) {
    const sub = raw.submissions.find((x) => x.versionId === v.id && (x.state === "WAITING_FOR_REVIEW" || x.state === "IN_REVIEW"));
    if (sub?.id)
      out.push({
        ...base,
        id: "ios.cancelSubmission",
        label: "제출 취소",
        level: 1,
        expect: sig(`|${sub.id}`),
        what: "심사를 멈추고 제출 전으로 돌아가요. 문구와 빌드를 다시 고칠 수 있어요.",
        undo: "다시 제출할 수 있어요. 심사 순서는 처음부터예요.",
        reachesUsers: false,
        primary: false,
        params: { submissionId: sub.id },
      });
  }

  if (inflight && v.state === "PENDING_DEVELOPER_RELEASE") {
    // 단계적 출시를 켜 둔 버전은 출시 전에도 phased 가 있다(INACTIVE)
    const phased = !!v.phased;
    out.push({
      ...base,
      id: "ios.release",
      label: "지금 출시하기",
      level: 2,
      expect: sig(),
      what: phased
        ? `${subj(v.version)} App Store 에 나가요. 단계적 출시가 켜져 있어 자동 업데이트는 7일 동안 나눠 나가고, 손으로 업데이트하는 사람은 바로 받아요.`
        : `${subj(v.version)} 모든 나라 App Store 에 나가요. 나라마다 보이기까지 최대 24시간이 걸려요.`,
      undo: "되돌릴 수 없어요. 문제가 생기면 새 버전을 내야 해요.",
      reachesUsers: true,
      primary: true,
      params: { versionId: v.id },
    });
  }

  const p = v.state === "READY_FOR_DISTRIBUTION" ? v.phased : null;
  if (p?.id && (p.state === "ACTIVE" || p.state === "PAUSED")) {
    const s = sig(`|${p.state}|${p.day}`);
    if (p.state === "ACTIVE")
      out.push({
        ...base,
        id: "ios.phasedPause",
        label: "단계적 출시 멈추기",
        level: 1,
        expect: s,
        what: "자동 업데이트로 나가는 것을 멈춰요. 손으로 업데이트하는 사람과 새로 받는 사람은 계속 받아요.",
        undo: "다시 이어 갈 수 있어요. 멈춘 동안은 날짜가 가지 않아요(최대 30일).",
        reachesUsers: false,
        primary: false,
        params: { phasedId: p.id },
      });
    else
      out.push({
        ...base,
        id: "ios.phasedResume",
        label: "단계적 출시 이어 가기",
        level: 1,
        expect: s,
        what: "멈춘 날부터 다시 7일 단계를 이어 가요.",
        undo: "다시 멈출 수 있어요.",
        reachesUsers: true,
        primary: true,
        params: { phasedId: p.id },
      });
    out.push({
      ...base,
      id: "ios.phasedComplete",
      label: "바로 모두에게",
      level: 2,
      expect: s,
      what: "남은 단계를 건너뛰고 자동 업데이트를 켠 모든 사람에게 바로 나가요.",
      undo: "되돌릴 수 없어요.",
      reachesUsers: true,
      primary: false,
      params: { phasedId: p.id },
    });
  }
  return out;
}

// ---------- Android ----------

/** 단계적 출시 비율 고르기(올리기만) */
export const ROLLOUT_STEPS = [0.01, 0.05, 0.1, 0.2, 0.5];

const pct = (f: number) => `${Math.round(f * 1000) / 10}%`;
const relSig = (r: PlayRelease) => `${maxCodeOf(r)}|${r.lifecycle}|${r.status ?? "-"}|${r.fraction ?? "-"}`;

export function androidOptions(raw: AndroidRaw): Option[] {
  const { pending, rolling, candidate, liveRel } = pickAndroid(raw);
  const out: Option[] = [];

  if (candidate && !pending) {
    const code = maxCodeOf(candidate);
    out.push({
      platform: "android",
      id: "android.createRelease",
      label: "프로덕션 출시 만들고 심사에 내기",
      level: 2,
      confirmWord: String(code),
      expect: `candidate|${relSig(candidate)}`,
      what: `프로덕션에 빌드 ${ro(String(code))} 새 출시를 만들고 구글 심사로 보내요. 승인되면 게시 개요에서 게시해야 사용자에게 나가요(관리형 게시).`,
      undo: "심사 중에는 Play Console 에서 취소할 수 있어요.",
      reachesUsers: false,
      primary: true,
      params: { code, notes: candidate.notes ?? [], lastNotes: liveRel?.notes ?? [] },
    });
  }

  if (rolling && !pending) {
    const code = maxCodeOf(rolling);
    const name = playVersionName(rolling.name) || String(code);
    const f = rolling.fraction ?? 0;
    const base = { platform: "android" as const, confirmWord: name, expect: `rolling|${relSig(rolling)}`, params: { code, fraction: f } };
    if (rolling.status === "inProgress") {
      if (ROLLOUT_STEPS.some((x) => x > f))
        out.push({
          ...base,
          id: "android.rolloutSet",
          label: "비율 올리기",
          level: 2,
          what: `${obj(name)} 받는 사람의 비율을 ${pct(f)}에서 고른 비율로 올려요.`,
          undo: "비율은 내릴 수 없어요. 멈출 수는 있어요.",
          reachesUsers: true,
          primary: true,
        });
      out.push({
        ...base,
        id: "android.halt",
        label: "단계적 출시 멈추기",
        level: 1,
        what: `${obj(name)} 새로 받는 사람이 없게 멈춰요. 이미 받은 사람은 그대로예요.`,
        undo: "다시 이어 갈 수 있어요.",
        reachesUsers: false,
        primary: false,
      });
    } else if (rolling.status === "halted") {
      out.push({
        ...base,
        id: "android.resume",
        label: "단계적 출시 이어 가기",
        level: 1,
        what: `${pct(f)} 비율로 다시 나가요.`,
        undo: "다시 멈출 수 있어요.",
        reachesUsers: true,
        primary: true,
      });
    }
    out.push({
      ...base,
      id: "android.complete",
      label: "바로 모두에게",
      level: 2,
      what: `${obj(name)} 모든 사람에게 내요(100%).`,
      undo: "되돌릴 수 없어요.",
      reachesUsers: true,
      primary: false,
    });
  }
  return out;
}

export const optionsFor = (platform: Platform, raw: IosRaw | AndroidRaw): Option[] => (platform === "ios" ? iosOptions(raw as IosRaw) : androidOptions(raw as AndroidRaw));
