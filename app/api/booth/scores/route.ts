import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// 부스 미니게임 공유 랭킹 — Upstash Redis Sorted Set.
// 환경변수가 없으면(연결 전) 빈 값으로 안전하게 동작한다.

export const dynamic = "force-dynamic";

const KEY = "booth:scores";
const CAP = 100; // 명예의 전당 상위 100명만 보관(화면엔 5명, 무한증가 방지)
const MAX_SCORE = 100_000; // 말도 안 되는 점수만 차단(최소 방어)

type Entry = { name: string; score: number; caught: number; at: number };

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
    // 점수 높은 순 상위 limit명(멤버 객체는 자동 직렬화/역직렬화)
    const rows = await redis.zrange<Entry[]>(KEY, 0, limit - 1, { rev: true });
    return NextResponse.json({ scores: Array.isArray(rows) ? rows : [] });
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
  const caught = Math.round(Number(body.caught)) || 0;
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return NextResponse.json({ error: "invalid score" }, { status: 400 });
  }

  const at = Date.now();
  const member = {
    name,
    score,
    caught,
    at,
    id: `${at}-${Math.random().toString(36).slice(2, 8)}`, // 멤버 고유화
  };

  try {
    await redis.zadd(KEY, { score, member });
    await redis.zremrangebyrank(KEY, 0, -(CAP + 1)); // 상위 CAP만 유지(낮은 점수 제거)
    const total = await redis.zcard(KEY);
    const rank0 = await redis.zrevrank(KEY, member);
    // 명예의 전당에 들면 그 등수, 못 들면(잘려나감) 바로 아래로 표기
    const rank = rank0 == null ? total + 1 : rank0 + 1;
    return NextResponse.json({ rank, total });
  } catch {
    return NextResponse.json({ rank: 0, total: 0 });
  }
}
