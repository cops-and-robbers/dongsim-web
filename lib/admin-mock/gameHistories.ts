// 지난 게임 기록 목(MSW GraphQL 핸들러가 사용). BE PR #151·#156 계약을 따른다.

import type { MockArea, MockLatLng } from "./data";

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
  area: MockArea | null;
  createdAt: string;
  participants: MockHistoryParticipant[];
}

// 종료 스냅샷의 구역. 실제 데이터가 세 갈래로 섞여 있어 그대로 재현한다.
//  - area 자체가 없음: 좌표를 남기지 않던 시절의 기록
//  - 놀이터만 있음: 감옥 좌표 저장(2026-08-15 배포) 이전 기록
//  - 놀이터 + 감옥: 그 이후 기록
const PARKS = [
  { lat: 37.5445, lng: 127.0374 },
  { lat: 37.5202, lng: 127.1216 },
  { lat: 37.5301, lng: 127.0668 },
];
const M_PER_LAT = 111_320;

function buildArea(
  i: number,
  areaType: "CIRCLE" | "POLYGON",
  withJail: boolean
): MockArea {
  const park = PARKS[i % PARKS.length];
  const lat = +(park.lat + (i % 5) * 0.0006).toFixed(6);
  const lng = +(park.lng + (i % 4) * 0.0006).toFixed(6);
  const mPerLng = M_PER_LAT * Math.cos((lat * Math.PI) / 180);
  const radius = 40 + (i % 5) * 12;
  const at = (angle: number, meters: number): MockLatLng => ({
    latitude: +(lat + (meters * Math.cos(angle)) / M_PER_LAT).toFixed(6),
    longitude: +(lng + (meters * Math.sin(angle)) / mPerLng).toFixed(6),
  });

  if (areaType === "POLYGON") {
    const sides = 5 + (i % 3);
    return {
      areaType: "POLYGON",
      playgroundCenterLat: null,
      playgroundCenterLng: null,
      playgroundRadiusInMeters: null,
      jailCenterLat: null,
      jailCenterLng: null,
      jailRadiusInMeters: null,
      playgroundPolygon: Array.from({ length: sides }, (_, k) =>
        at((k / sides) * Math.PI * 2, radius)
      ),
      jailPolygon: withJail
        ? [0.25, 0.75, 1.25, 1.75].map((t) => at(Math.PI * t, 10))
        : null,
    };
  }

  const jail = at(Math.PI * ((i % 8) / 4), radius * 0.5);
  return {
    areaType: "CIRCLE",
    playgroundCenterLat: lat,
    playgroundCenterLng: lng,
    playgroundRadiusInMeters: radius,
    jailCenterLat: withJail ? jail.latitude : null,
    jailCenterLng: withJail ? jail.longitude : null,
    jailRadiusInMeters: withJail ? 8 + (i % 4) : null,
    playgroundPolygon: null,
    jailPolygon: null,
  };
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

  const areaType: "CIRCLE" | "POLYGON" = i % 3 === 0 ? "POLYGON" : "CIRCLE";

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
    areaType,
    // 7번째마다 좌표 없는 옛 기록, 그다음 두 건은 감옥 없는 기록으로 둔다.
    area: i % 7 === 6 ? null : buildArea(i, areaType, i % 7 < 4),
    createdAt: `2026-08-${String(1 + (i % 12)).padStart(2, "0")}T${String(
      13 + (i % 8)
    ).padStart(2, "0")}:20:00+09:00`,
    participants: buildParticipants(seq, policeCount, robberCount, arrestedCount),
  };
});

// 단건 조회. BE는 없는 id에 GAME_RESULT_NOT_FOUND 에러를 내므로 목도 null이 아닌 throw로 맞춘다.
export function queryGameHistory(id: string): MockGameHistory {
  const found = histories.find((h) => h.id === String(id));
  if (!found) throw new Error("GAME_RESULT_NOT_FOUND");
  return found;
}

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
