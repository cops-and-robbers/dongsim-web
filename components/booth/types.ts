export const GAME_MS = 30_000;
export const HOLE_COUNT = 9;
export const ROBBER_SRC = "/characters/robber.svg";
export const CIVILIAN_SRC = "/characters/police.svg";

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
