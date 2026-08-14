// 지난 게임 기록 목(MSW GraphQL 핸들러가 사용). BE PR #151 계약을 따른다.

export type GameEndReason =
  | "ALL_ARRESTED"
  | "TIME_OVER"
  | "POLICE_FORFEITED"
  | "ROBBER_FORFEITED";
type Team = "POLICE" | "ROBBER";
type ParticipantStatus = "WAITING" | "ALIVE" | "JAILED" | "POLICE_WAITING";

export interface MockHistoryParticipant {
  userId: string;
  nickname: string;
  team: Team;
  status: ParticipantStatus;
}

export interface MockGameHistory {
  id: string;
  gameId: string;
  winnerTeam: Team;
  endReason: GameEndReason;
  totalPoliceCount: number;
  totalRobberCount: number;
  arrestedRobberCount: number;
  totalArrestCount: number;
  durationSeconds: number;
  areaType: "CIRCLE" | "POLYGON";
  createdAt: string;
  participants: MockHistoryParticipant[];
}

const NICKS = [
  "집요한수사관4512",
  "날쌘도둑",
  "은밀한냥파",
  "잽싼여우",
  "명랑한삵",
  "수상한수달",
  "대담한고양이",
  "조용한토끼",
  "느긋한너구리",
  "성실한오소리",
];

// 종료 사유별 승리팀은 백엔드 로직과 동일하게 맞춘다.
const WINNER_BY_REASON: Record<GameEndReason, Team> = {
  ALL_ARRESTED: "POLICE",
  TIME_OVER: "ROBBER",
  POLICE_FORFEITED: "ROBBER",
  ROBBER_FORFEITED: "POLICE",
};

const REASONS: GameEndReason[] = [
  "ALL_ARRESTED",
  "TIME_OVER",
  "ALL_ARRESTED",
  "ROBBER_FORFEITED",
  "TIME_OVER",
  "ALL_ARRESTED",
  "POLICE_FORFEITED",
  "TIME_OVER",
  "ALL_ARRESTED",
  "TIME_OVER",
  "ROBBER_FORFEITED",
  "ALL_ARRESTED",
];

function buildParticipants(
  seq: number,
  policeCount: number,
  robberCount: number,
  arrestedCount: number
): MockHistoryParticipant[] {
  const out: MockHistoryParticipant[] = [];
  for (let i = 0; i < policeCount; i += 1) {
    out.push({
      userId: String(100 + seq * 10 + i),
      nickname: NICKS[(seq + i) % NICKS.length],
      team: "POLICE",
      status: "ALIVE",
    });
  }
  for (let i = 0; i < robberCount; i += 1) {
    out.push({
      userId: String(200 + seq * 10 + i),
      nickname: NICKS[(seq + i + 3) % NICKS.length],
      team: "ROBBER",
      status: i < arrestedCount ? "JAILED" : "ALIVE",
    });
  }
  return out;
}

const histories: MockGameHistory[] = REASONS.map((endReason, i) => {
  const seq = i + 1;
  // 기권 게임은 마지막 이탈자가 이미 삭제된 뒤에 스냅샷이 찍혀 인원이 0이 된다.
  // 백엔드도 totalCount를 같은 시점에 세므로 스냅샷과 값이 일치한다.
  const policeCount = endReason === "POLICE_FORFEITED" ? 0 : 2 + (i % 3);
  const robberCount = endReason === "ROBBER_FORFEITED" ? 1 + (i % 2) : 2 + ((i + 1) % 3);
  const arrestedCount =
    endReason === "ALL_ARRESTED"
      ? robberCount
      : endReason === "ROBBER_FORFEITED"
        ? robberCount
        : i % 2;

  return {
    id: String(seq),
    gameId: String(1000 + seq),
    winnerTeam: WINNER_BY_REASON[endReason],
    endReason,
    totalPoliceCount: policeCount,
    totalRobberCount: robberCount,
    arrestedRobberCount: arrestedCount,
    totalArrestCount: arrestedCount + (i % 2),
    durationSeconds: 420 + i * 63,
    areaType: i % 3 === 0 ? "POLYGON" : "CIRCLE",
    createdAt: `2026-08-${String(1 + (i % 12)).padStart(2, "0")}T${String(
      13 + (i % 8)
    ).padStart(2, "0")}:20:00+09:00`,
    participants: buildParticipants(seq, policeCount, robberCount, arrestedCount),
  };
});

export function queryGameHistories(args: {
  page?: number;
  size?: number;
  endReason?: GameEndReason;
  sortDirection?: "ASC" | "DESC";
}) {
  const page = args.page ?? 0;
  const size = args.size ?? 20;
  const items = args.endReason
    ? histories.filter((h) => h.endReason === args.endReason)
    : [...histories];
  items.sort((a, b) =>
    args.sortDirection === "ASC"
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt)
  );
  const totalElements = items.length;
  return {
    content: items.slice(page * size, page * size + size),
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / size)),
    page,
    size,
  };
}
