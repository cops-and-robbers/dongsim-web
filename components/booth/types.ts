export const GAME_MS = 30_000;
export const HOLE_COUNT = 9;
export const ROBBER_SRC = "/characters/robber.svg";
export const CIVILIAN_SRC = "/characters/police.svg";

// 한 판에 나오는 도둑·시민 수는 고정(공정성) - 어디/언제/순서만 랜덤(재미).
// 도둑 전원 검거 시 만점은 항상 동일: ROBBER_COUNT*(ROBBER_COUNT+9).
export const ROBBER_COUNT = 32;
export const CIV_COUNT = 12;

// 치즈 보드 3레이어 에셋
export const CHEESE_BACK_SRC = "/booth/cheese-back.png"; // 뒤: 구멍 속(주황)
export const CHEESE_TOP_SRC = "/booth/cheese-top.png"; // 앞: 치즈(구멍 투명)

// 구멍 9개 중심 좌표(보드 대비 %)
export const HOLE_POS = [
  { x: 20.4, y: 19.1 },
  { x: 50, y: 19.1 },
  { x: 79.5, y: 19.1 },
  { x: 20.4, y: 50 },
  { x: 50, y: 50 },
  { x: 79.5, y: 50 },
  { x: 20.4, y: 80.8 },
  { x: 50, y: 80.8 },
  { x: 79.5, y: 80.8 },
];

export const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.min(1, Math.max(0, t));

export type Occ = {
  id: number;
  type: "robber" | "civ";
  born: number;
  ttl: number;
  caught: boolean;
  caughtAt: number;
};

export type Pop = {
  id: number;
  hole: number;
  text: string;
  good: boolean;
  at: number;
};

// 미리 정해둔 스폰 한 칸(시작 후 경과 ms 기준 등장).
export type Spawn = { type: "robber" | "civ"; at: number };

export type Game = {
  holes: (Occ | null)[];
  pops: Pop[];
  score: number;
  combo: number;
  maxCombo: number;
  caught: number;
  misses: number;
  timeLeft: number;
  startAt: number;
  queue: Spawn[];
  nextId: number;
};

// 고정 수의 도둑·시민을 순서는 섞고 시간은 게임 전체에 흩뿌려 스케줄을 만든다.
// 후반으로 갈수록 살짝 촘촘(^0.75)하게 배치해 난이도가 자연스레 오른다.
function buildSchedule(): Spawn[] {
  const total = ROBBER_COUNT + CIV_COUNT;
  const START = 350;
  const END = GAME_MS - 2000; // 마지막 등장도 잡을 시간 확보
  const span = END - START;
  const slot = span / total;

  const types: Spawn["type"][] = [
    ...Array<Spawn["type"]>(ROBBER_COUNT).fill("robber"),
    ...Array<Spawn["type"]>(CIV_COUNT).fill("civ"),
  ];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  return types
    .map((type, i) => {
      const base = START + span * Math.pow(i / (total - 1), 0.75);
      const jitter = (Math.random() - 0.5) * slot * 0.7;
      return { type, at: Math.round(base + jitter) };
    })
    .sort((a, b) => a.at - b.at);
}

export function freshGame(): Game {
  return {
    holes: Array(HOLE_COUNT).fill(null),
    pops: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    caught: 0,
    misses: 0,
    timeLeft: GAME_MS,
    startAt: 0,
    queue: buildSchedule(),
    nextId: 1,
  };
}
