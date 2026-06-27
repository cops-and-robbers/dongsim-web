import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// 부스 미니게임 공유 랭킹 — Upstash Redis Sorted Set.
// 멤버 = 닉네임, 점수 = 최고점(ZADD GT로 더 높을 때만 갱신) → 닉네임당 1줄.
// 환경변수가 없으면(연결 전) 빈 값으로 안전하게 동작한다.

export const dynamic = "force-dynamic";

const KEY = "booth:scores";
const CAP = 100; // 명예의 전당 상위 100명만 보관
const MAX_SCORE = 100_000; // 말도 안 되는 점수만 차단(최소 방어)

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function GET(request: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ scores: [] });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit")) || 10)
  );

  try {
    // [멤버, 점수, 멤버, 점수, ...] 평탄 배열로 반환됨
    const rows = await redis.zrange<(string | number)[]>(KEY, 0, limit - 1, {
      rev: true,
      withScores: true,
    });
    const scores: { name: string; score: number }[] = [];
    for (let i = 0; i + 1 < rows.length; i += 2) {
      scores.push({ name: String(rows[i]), score: Number(rows[i + 1]) });
    }
    return NextResponse.json({ scores });
  } catch {
    return NextResponse.json({ scores: [] });
  }
}

export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ rank: 0, total: 0 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 12) || "익명";
  const score = Math.round(Number(body.score));
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return NextResponse.json({ error: "invalid score" }, { status: 400 });
  }

  try {
    // 닉네임당 최고점만 유지(GT: 기존보다 높을 때만 갱신, 새 닉네임은 추가)
    await redis.zadd(KEY, { gt: true }, { score, member: name });
    await redis.zremrangebyrank(KEY, 0, -(CAP + 1)); // 상위 CAP만 유지
    const total = await redis.zcard(KEY);
    const rank0 = await redis.zrevrank(KEY, name);
    const rank = rank0 == null ? total + 1 : rank0 + 1;
    return NextResponse.json({ rank, total });
  } catch {
    return NextResponse.json({ rank: 0, total: 0 });
  }
}
