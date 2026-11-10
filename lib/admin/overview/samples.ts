// 개요 카드 예시 값. 역할을 고칠 때 카드가 어떻게 보이는지 보여 주는 데 쓴다. 실제 숫자가 아니다.
import type { CardKey, CardResult, LiveValues } from "./cards";

const ymd = (daysAgo: number) => new Date(Date.now() + 9 * 3_600_000 - daysAgo * 86_400_000).toISOString().slice(0, 10);

/** 서버 카드 예시. 역할 편집 창의 카드 모양과 로컬 가짜 응답이 같이 쓴다 */
export const SAMPLE_CARDS: Partial<Record<CardKey, CardResult>> = {
  newu: { kind: "trend", total: 142, previous: 118, daily: [14, 22, 18, 25, 19, 21, 23], previousDaily: [12, 15, 17, 19, 16, 20, 19], until: ymd(1), unit: "count" },
  ig: { kind: "trend", total: 12380, previous: 11902, daily: [1500, 1620, 1880, 1700, 1950, 1830, 1900], previousDaily: [1600, 1700, 1650, 1720, 1800, 1700, 1732], until: ymd(1), unit: "count" },
  views: { kind: "trend", total: 1204, previous: 1290, daily: [160, 172, 158, 190, 181, 166, 177], previousDaily: [190, 180, 185, 170, 188, 182, 195], until: ymd(4), unit: "count" },
  ad: { kind: "trend", total: 3.12, previous: 2.97, daily: [0.4, 0.42, 0.45, 0.48, 0.44, 0.46, 0.47], previousDaily: [0.39, 0.41, 0.43, 0.42, 0.44, 0.43, 0.45], until: ymd(1), unit: "usd" },
  site: { kind: "ratio", num: 46, den: 1210, previous: { num: 41, den: 1180 }, unit: "visits" },
  fun: { kind: "ratio", num: 52, den: 137, previous: { num: 44, den: 128 }, unit: "people" },
  ret: { kind: "ratio", num: 29, den: 138, previous: { num: 24, den: 130 }, unit: "people" },
  d7: { kind: "ratio", num: 9, den: 22, previous: null, unit: "people" },
  post: { kind: "post", rate: 0.064, reach: 1820, postedAt: `${ymd(3)}T10:00:00+09:00`, permalink: "https://www.instagram.com/", small: false },
  crash: { kind: "limit", rate: 0.0042, limit: 0.0109 },
  anr: { kind: "limit", rate: 0.0011, limit: 0.0047 },
  rel: { kind: "stage", tracks: [{ platform: "ios", label: "애플 심사 중", tone: "wait", live: "3.2.7" }, { platform: "android", label: "출시 완료", tone: "done", live: "3.2.7" }] },
  chk: { kind: "due", title: "Google Play 판매자 상태를 신고해 주세요", due: "2027-02-01", daysLeft: 83, open: 2 },
  ev: { kind: "event", label: "학교 축제 부스", day: ymd(-5), done: 4, total: 6, next: "시험 인쇄를 해 주세요", frames: 2, builtinFrame: false },
  frame: { kind: "event", label: "학교 축제 부스", day: ymd(-5), done: 4, total: 6, next: "시험 인쇄를 해 주세요", frames: 2, builtinFrame: false },
  draft: { kind: "count", count: 3, detail: "App Store 2칸, Google Play 1칸" },
};

export const SAMPLE_LIVE: LiveValues = {
  weeklyGames: 86,
  win: { police: 48, robber: 52 },
  ends: [
    { endReason: "ALL_ARRESTED", count: 31 },
    { endReason: "TIME_OVER", count: 38 },
    { endReason: "ROBBER_FORFEITED", count: 6 },
    { endReason: "POLICE_FORFEITED", count: 4 },
  ],
  games: [
    { id: "s1", inviteCode: "ABCD12", status: "IN_PROGRESS", participantCount: 6, maxParticipants: 10 },
    { id: "s2", inviteCode: "XK29LM", status: "FINISHED", participantCount: 5, maxParticipants: 8 },
    { id: "s3", inviteCode: "QW81ZZ", status: "FINISHED", participantCount: 8, maxParticipants: 12 },
  ],
  pending: { reports: 1, bugs: 4, reviews: 2 },
};
