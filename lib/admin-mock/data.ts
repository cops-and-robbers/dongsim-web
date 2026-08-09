// 어드민 목서버용 인메모리 데이터셋.
// 시드 고정 PRNG로 모듈 로드 시 1회 생성 → 목록과 상세가 항상 같은 값을 본다.
// 실제 백엔드가 붙으면 이 파일과 handlers.ts만 지우면 된다.

export type SocialType = "KAKAO" | "GOOGLE" | "APPLE";
export type Role = "USER" | "ADMIN";
export type DeviceType = "IOS" | "ANDROID";
export type Team = "POLICE" | "ROBBER";
export type ParticipantStatus =
  | "WAITING"
  | "ALIVE"
  | "JAILED"
  | "POLICE_WAITING";
export type GameStatus = "WAITING" | "IN_PROGRESS" | "FINISHED" | "CANCELED";
export type GameEndReason =
  | "ALL_ARRESTED"
  | "TIME_OVER"
  | "POLICE_FORFEITED"
  | "ROBBER_FORFEITED";

export interface MockDevice {
  deviceType: DeviceType;
  createdAt: string;
}

export interface MockUser {
  id: string;
  nickname: string;
  socialType: SocialType;
  role: Role;
  termsOfServiceAgreed: boolean;
  privacyPolicyAgreed: boolean;
  locationTermsAgreed: boolean;
  createdAt: string;
  device: MockDevice | null;
}

export interface MockLatLng {
  latitude: number;
  longitude: number;
}

export interface MockArea {
  areaType: "CIRCLE" | "POLYGON";
  playgroundCenterLat: number | null;
  playgroundCenterLng: number | null;
  playgroundRadiusInMeters: number | null;
  jailCenterLat: number | null;
  jailCenterLng: number | null;
  jailRadiusInMeters: number | null;
  playgroundPolygon: MockLatLng[] | null;
  jailPolygon: MockLatLng[] | null;
}

export interface MockResult {
  winnerTeam: Team;
  endReason: GameEndReason;
  totalPoliceCount: number;
  totalRobberCount: number;
  arrestedRobberCount: number;
  durationSeconds: number;
}

export interface MockGame {
  id: string;
  inviteCode: string;
  status: GameStatus;
  roundDurationMinutes: number;
  locationRevealIntervalMinutes: number;
  policeWaitMinutes: number;
  maxParticipants: number;
  isEventGame: boolean;
  createdAt: string;
  startedAt: string | null;
  area: MockArea | null;
  result: MockResult | null;
}

export interface MockParticipant {
  gameId: string;
  userId: string;
  team: Team | null;
  status: ParticipantStatus;
  isHost: boolean;
  createdAt: string;
}

// ── 시드 PRNG (mulberry32) ──
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260723);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const range = (min: number, max: number): number =>
  min + Math.floor(rand() * (max - min + 1));
const chance = (p: number): boolean => rand() < p;

// 기준 시각 고정(결정적). 2026-07-23 12:00 KST
const BASE = Date.parse("2026-07-23T12:00:00+09:00");
const DAY = 86_400_000;
const isoBefore = (maxDaysAgo: number): string => {
  const ms = BASE - Math.floor(rand() * maxDaysAgo * DAY);
  // KST offset 유지한 ISO 문자열
  return new Date(ms).toISOString().replace("Z", "+00:00");
};

const ADJ = [
  "날쌘",
  "조용한",
  "은밀한",
  "용감한",
  "수상한",
  "귀여운",
  "든든한",
  "명랑한",
  "노련한",
  "신중한",
  "대담한",
  "엉뚱한",
  "재빠른",
  "잽싼",
  "느긋한",
] as const;
const NOUN = [
  "도둑",
  "경찰",
  "너구리",
  "여우",
  "토끼",
  "매",
  "늑대",
  "부엉이",
  "고양이",
  "두더지",
  "수달",
  "삵",
  "다람쥐",
  "고라니",
  "살쾡이",
] as const;

const SOCIALS: readonly SocialType[] = ["KAKAO", "GOOGLE", "APPLE"];
const PARKS = [
  { lat: 36.1194, lng: 128.1074, region: "김천 직지문화공원" },
  { lat: 37.5445, lng: 127.0374, region: "서울 성수" },
  { lat: 37.5202, lng: 127.1216, region: "서울 잠실" },
  { lat: 37.5301, lng: 127.0668, region: "서울 뚝섬" },
  { lat: 35.1687, lng: 129.0596, region: "부산시민공원" },
] as const;

const N_USERS = 137;
const N_GAMES = 84;

// ── 유저 생성 ──
const usedNicknames = new Set<string>();
function makeNickname(): string {
  for (let i = 0; i < 50; i++) {
    const base = `${pick(ADJ)}${pick(NOUN)}`;
    const name = chance(0.5) ? `${base}${range(1, 99)}` : base;
    if (!usedNicknames.has(name)) {
      usedNicknames.add(name);
      return name;
    }
  }
  const fallback = `유저${usedNicknames.size + 1}`;
  usedNicknames.add(fallback);
  return fallback;
}

export const users: MockUser[] = Array.from({ length: N_USERS }, (_, i) => {
  const createdAt = isoBefore(180);
  const hasDevice = chance(0.82);
  return {
    id: String(i + 1),
    nickname: makeNickname(),
    socialType: pick(SOCIALS),
    // 앞쪽 6명은 운영자(스펙 검증에서 확인된 실제 ADMIN 부여 방식과 유사)
    role: i < 6 ? "ADMIN" : "USER",
    termsOfServiceAgreed: true,
    privacyPolicyAgreed: true,
    locationTermsAgreed: chance(0.95),
    createdAt,
    device: hasDevice
      ? { deviceType: chance(0.55) ? "IOS" : "ANDROID", createdAt }
      : null,
  };
});

// ── 게임 + 참가자 생성 ──
const STATUS_POOL: GameStatus[] = [
  ...Array<GameStatus>(46).fill("FINISHED"),
  ...Array<GameStatus>(14).fill("CANCELED"),
  ...Array<GameStatus>(14).fill("WAITING"),
  ...Array<GameStatus>(10).fill("IN_PROGRESS"),
];
const END_REASONS: readonly GameEndReason[] = [
  "ALL_ARRESTED",
  "TIME_OVER",
  "POLICE_FORFEITED",
  "ROBBER_FORFEITED",
];
const P_STATUS_ACTIVE: readonly ParticipantStatus[] = [
  "ALIVE",
  "JAILED",
  "POLICE_WAITING",
];

function makeInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(rand() * chars.length)];
  return s;
}

export const games: MockGame[] = [];
export const participants: MockParticipant[] = [];

for (let i = 0; i < N_GAMES; i++) {
  const id = String(i + 1);
  const status = STATUS_POOL[i % STATUS_POOL.length];
  const createdAt = isoBefore(120);
  const maxParticipants = pick([4, 6, 6, 8, 8, 10, 12, 16, 20, 30, 50]);
  const started = status !== "WAITING";
  const park = pick(PARKS);
  const jitter = () => (rand() - 0.5) * 0.004;
  const playgroundRadius = range(30, 90);

  let area: MockArea | null = null;
  if (!(status === "WAITING" && chance(0.4))) {
    const pgLat = +(park.lat + jitter()).toFixed(6);
    const pgLng = +(park.lng + jitter()).toFixed(6);
    const mPerLat = 111_320;
    const mPerLng = 111_320 * Math.cos((pgLat * Math.PI) / 180);

    // 실제 게임처럼 원형·다각형 구역이 섞여 나오게 한다. (약 40% 다각형)
    if (chance(0.4)) {
      // 다각형: 놀이터 중심 주변에 5~7각형, 감옥은 그 안 작은 사각형.
      const sides = range(5, 7);
      const ringR = playgroundRadius; // m
      const rot = rand() * Math.PI * 2;
      const toPoint = (angle: number, rMeters: number): MockLatLng => ({
        latitude: +(pgLat + (rMeters * Math.cos(angle)) / mPerLat).toFixed(6),
        longitude: +(pgLng + (rMeters * Math.sin(angle)) / mPerLng).toFixed(6),
      });
      const playgroundPolygon = Array.from({ length: sides }, (_, k) =>
        toPoint(rot + (k / sides) * Math.PI * 2, ringR * (0.85 + rand() * 0.3))
      );
      const jailR = range(6, 14);
      const jailPolygon = [
        toPoint(Math.PI * 0.25, jailR),
        toPoint(Math.PI * 0.75, jailR),
        toPoint(Math.PI * 1.25, jailR),
        toPoint(Math.PI * 1.75, jailR),
      ];
      area = {
        areaType: "POLYGON",
        playgroundCenterLat: null,
        playgroundCenterLng: null,
        playgroundRadiusInMeters: null,
        jailCenterLat: null,
        jailCenterLng: null,
        jailRadiusInMeters: null,
        playgroundPolygon,
        jailPolygon,
      };
    } else {
      const jailRadius = range(5, 15);
      // 감옥은 놀이터 원 안에 위치: 중심에서 (놀이터반경 - 감옥반경) 이내로 배치
      const maxOffset = Math.max(playgroundRadius - jailRadius - 3, 0);
      const ang = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * maxOffset; // 원 안 균일 분포
      const dLat = (dist * Math.cos(ang)) / mPerLat;
      const dLng = (dist * Math.sin(ang)) / mPerLng;
      area = {
        areaType: "CIRCLE",
        playgroundCenterLat: pgLat,
        playgroundCenterLng: pgLng,
        playgroundRadiusInMeters: playgroundRadius,
        jailCenterLat: +(pgLat + dLat).toFixed(6),
        jailCenterLng: +(pgLng + dLng).toFixed(6),
        jailRadiusInMeters: jailRadius,
        playgroundPolygon: null,
        jailPolygon: null,
      };
    }
  }

  // 참가자 구성
  const count = Math.min(maxParticipants, range(2, Math.max(2, maxParticipants)));
  const chosen = new Set<number>();
  while (chosen.size < count) chosen.add(range(0, N_USERS - 1));
  const memberIds = [...chosen].map((u) => String(u + 1));

  const teamAssigned = status !== "WAITING";
  let policeCount = 0;
  let robberCount = 0;
  memberIds.forEach((userId, idx) => {
    let team: Team | null = null;
    if (teamAssigned) {
      // 대략 1:2 (경찰:도둑)
      team = idx % 3 === 0 ? "POLICE" : "ROBBER";
      if (team === "POLICE") policeCount++;
      else robberCount++;
    }
    const pStatus: ParticipantStatus =
      status === "WAITING"
        ? "WAITING"
        : status === "FINISHED" || status === "CANCELED"
          ? team === "ROBBER" && chance(0.5)
            ? "JAILED"
            : "ALIVE"
          : pick(P_STATUS_ACTIVE);
    participants.push({
      gameId: id,
      userId,
      team,
      status: pStatus,
      isHost: idx === 0,
      createdAt,
    });
  });

  const roundDurationMinutes = pick([10, 15, 20, 30, 45, 60]);
  const result: MockResult | null =
    status === "FINISHED" && area
      ? {
          winnerTeam: chance(0.5) ? "POLICE" : "ROBBER",
          endReason: pick(END_REASONS),
          totalPoliceCount: Math.max(1, policeCount),
          totalRobberCount: Math.max(1, robberCount),
          arrestedRobberCount: Math.min(
            robberCount,
            Math.floor(robberCount * rand())
          ),
          durationSeconds: roundDurationMinutes * 60 - range(0, 300),
        }
      : null;

  games.push({
    id,
    inviteCode: makeInviteCode(),
    status,
    roundDurationMinutes,
    locationRevealIntervalMinutes: pick([1, 2, 3, 5]),
    policeWaitMinutes: pick([0, 1, 2, 3]),
    maxParticipants,
    isEventGame: chance(0.15),
    createdAt,
    startedAt: started ? createdAt : null,
    area,
    result,
  });
}

// ── 조회 헬퍼 (오프셋 페이지네이션·필터·정렬·조인) ──

export interface PageArgs {
  page?: number | null;
  size?: number | null;
}

function paginate<T>(items: T[], page: number, size: number) {
  const totalElements = items.length;
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
  const start = page * size;
  return {
    content: items.slice(start, start + size),
    totalElements,
    totalPages,
    page,
    size,
  };
}

export function queryUsers(args: {
  page?: number | null;
  size?: number | null;
  nickname?: string | null;
  socialType?: SocialType | null;
  fromDate?: string | null;
  toDate?: string | null;
  sortBy?: "CREATED_AT" | "NICKNAME" | null;
  sortDirection?: "ASC" | "DESC" | null;
}) {
  const page = args.page ?? 0;
  const size = args.size ?? 20;
  let list = users.slice();

  if (args.nickname) {
    const q = args.nickname.toLowerCase();
    list = list.filter((u) => u.nickname.toLowerCase().includes(q));
  }
  if (args.socialType)
    list = list.filter((u) => u.socialType === args.socialType);
  if (args.fromDate) list = list.filter((u) => u.createdAt >= args.fromDate!);
  if (args.toDate) list = list.filter((u) => u.createdAt <= args.toDate!);

  const dir = args.sortDirection === "ASC" ? 1 : -1;
  const by = args.sortBy ?? "CREATED_AT";
  list.sort((a, b) => {
    const cmp =
      by === "NICKNAME"
        ? a.nickname.localeCompare(b.nickname)
        : a.createdAt.localeCompare(b.createdAt);
    return cmp * dir;
  });

  return paginate(list, page, size);
}

export function getUser(id: string) {
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  const participations = participants
    .filter((p) => p.userId === id)
    .map((p) => {
      const game = games.find((g) => g.id === p.gameId)!;
      return {
        gameId: p.gameId,
        inviteCode: game.inviteCode,
        team: p.team,
        status: p.status,
        isHost: p.isHost,
        createdAt: p.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ...user, participations };
}

export function queryGames(args: {
  page?: number | null;
  size?: number | null;
  status?: GameStatus | null;
  sortDirection?: "ASC" | "DESC" | null;
}) {
  const page = args.page ?? 0;
  const size = args.size ?? 20;
  let list = games.slice();
  if (args.status) list = list.filter((g) => g.status === args.status);

  const dir = args.sortDirection === "ASC" ? 1 : -1;
  list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) * dir);

  const summaries = list.map((g) => ({
    id: g.id,
    inviteCode: g.inviteCode,
    status: g.status,
    roundDurationMinutes: g.roundDurationMinutes,
    locationRevealIntervalMinutes: g.locationRevealIntervalMinutes,
    maxParticipants: g.maxParticipants,
    isEventGame: g.isEventGame,
    participantCount: participants.filter((p) => p.gameId === g.id).length,
    createdAt: g.createdAt,
  }));

  return paginate(summaries, page, size);
}

export function getGame(id: string) {
  const game = games.find((g) => g.id === id);
  if (!game) return null;
  const gameParticipants = participants
    .filter((p) => p.gameId === id)
    .map((p) => {
      const user = users.find((u) => u.id === p.userId)!;
      return {
        userId: p.userId,
        nickname: user.nickname,
        team: p.team,
        status: p.status,
        isHost: p.isHost,
      };
    });
  return {
    id: game.id,
    inviteCode: game.inviteCode,
    status: game.status,
    roundDurationMinutes: game.roundDurationMinutes,
    locationRevealIntervalMinutes: game.locationRevealIntervalMinutes,
    policeWaitMinutes: game.policeWaitMinutes,
    maxParticipants: game.maxParticipants,
    isEventGame: game.isEventGame,
    createdAt: game.createdAt,
    startedAt: game.startedAt,
    participants: gameParticipants,
    result: game.result,
    area: game.area,
  };
}
