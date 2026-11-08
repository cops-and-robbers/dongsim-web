/**
 * 출시 조작 기록 (supabase/migrations/0016_release_actions.sql). 서버 전용이다.
 * 기록할 곳이 없으면 조작하지 않는다(기록 없이 스토어를 바꾸지 않는다).
 */
import { db } from "@/lib/metrics/db";

export type ActionLog = { id: number; platform: string; action: string; version: string; status: string; message: string | null; actor: string; createdAt: string };

const TABLE = "release_actions";
/** 같은 조작을 다시 받지 않는 시간 */
const REPEAT_MS = 3 * 60_000;

/** 표가 있고 읽히는지. 화면이 버튼을 켤지 정한다 */
export async function auditReady(): Promise<boolean> {
  try {
    const { error } = await db().from(TABLE).select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function recentActions(limit = 8): Promise<ActionLog[]> {
  try {
    const { data, error } = await db().from(TABLE).select("id,platform,action,version,status,message,actor,created_at").order("created_at", { ascending: false }).limit(limit);
    if (error) return [];
    return (data ?? []).map((r) => ({ id: r.id, platform: r.platform, action: r.action, version: r.version, status: r.status, message: r.message, actor: r.actor, createdAt: r.created_at }));
  } catch {
    return [];
  }
}

/** 몇 분 안에 같은 상태에서 같은 조작을 이미 했거나 하는 중이면 true */
export async function isRepeat(action: string, expect: string): Promise<boolean> {
  const since = new Date(Date.now() - REPEAT_MS).toISOString();
  const { data, error } = await db().from(TABLE).select("id").eq("action", action).eq("expect", expect).in("status", ["started", "done"]).gte("created_at", since).limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export async function startLog(row: { platform: string; action: string; version: string; expect: string; params: unknown; actor: string }): Promise<number> {
  const { data, error } = await db().from(TABLE).insert(row).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "기록을 남기지 못했어요");
  return data.id as number;
}

export async function finishLog(id: number, status: "done" | "failed", message: string): Promise<void> {
  await db().from(TABLE).update({ status, message, finished_at: new Date().toISOString() }).eq("id", id);
}
