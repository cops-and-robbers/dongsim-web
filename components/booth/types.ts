export const GAME_MS = 30_000;
export const HOLE_COUNT = 9;
export const ROBBER_SRC = "/characters/robber.svg";
export const CIVILIAN_SRC = "/characters/police.svg";

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
  nextSpawn: number;
  nextId: number;
};

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
    nextSpawn: 0,
    nextId: 1,
  };
}
