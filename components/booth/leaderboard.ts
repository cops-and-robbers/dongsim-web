/**
 * 부스 미니게임 랭킹 저장소.
 *
 * 지금은 localStorage 기반이지만, 함수 시그니처를 async로 둬서
 * 추후 백엔드 API(fetch)로 구현만 갈아끼우면 호출부 수정 없이 동기화할 수 있다.
 */

export type Score = {
  name: string;
  score: number;
  caught: number;
  at: number;
};

const KEY = "cnr-booth-scores";
const NAME_KEY = "cnr-booth-name";
const MAX = 50;

function read(): Score[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Score[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(scores: Score[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(scores.slice(0, MAX)));
  } catch {
    // 저장 실패는 무시(시크릿 모드 등)
  }
}

/** 점수 내림차순 상위 목록. */
export async function getTopScores(limit = 10): Promise<Score[]> {
  return read()
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, limit);
}

/** 점수를 저장하고, 방금 점수의 등수(1-base)와 전체 인원을 돌려준다. */
export async function submitScore(
  entry: Omit<Score, "at">,
): Promise<{ rank: number; total: number }> {
  const all = [...read(), { ...entry, at: Date.now() }];
  write(all.sort((a, b) => b.score - a.score || a.at - b.at));
  const rank = all.filter((s) => s.score > entry.score).length + 1;
  return { rank, total: all.length };
}

/** 마지막으로 사용한 닉네임(편의용). */
export function getLastName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setLastName(name: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // 무시
  }
}
