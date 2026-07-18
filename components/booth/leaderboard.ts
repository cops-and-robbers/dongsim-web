"use client";

/**
 * 부스 미니게임 공유 랭킹 - /api/booth/scores(Upstash Redis)를 호출한다.
 * 닉네임당 최고점 1줄. 닉네임만 편의상 localStorage에 기억.
 * 네트워크 실패 시 빈 값/무동작으로 안전.
 */

export type Score = { name: string; score: number };

const NAME_KEY = "cnr-booth-name";

/** 점수 높은 순 상위 목록(닉네임당 1줄, 공유). */
export async function getTopScores(limit = 10): Promise<Score[]> {
  try {
    const res = await fetch(`/api/booth/scores?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { scores?: Score[] };
    return Array.isArray(data.scores) ? data.scores : [];
  } catch {
    return [];
  }
}

/** 점수를 저장(닉네임 최고점만 갱신)하고, 등수와 전체 인원을 돌려준다. */
export async function submitScore(entry: {
  name: string;
  score: number;
  caught?: number;
}): Promise<{ rank: number; total: number }> {
  try {
    const res = await fetch("/api/booth/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) return { rank: 0, total: 0 };
    return (await res.json()) as { rank: number; total: number };
  } catch {
    return { rank: 0, total: 0 };
  }
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
