/**
 * 운영진 계정과 일정 읽기 (#165). 지표 라우트와 챗봇 라우트가 같이 쓴다.
 *
 * 운영진은 백엔드 ADMIN 권한 계정(gameServer.ts 가 계정 목록에서 바로 안다)과 여기 표에 넣은 계정이다.
 * 표에는 권한 없는 팀원 계정과 테스트 계정만 넣는다. 0007 마이그레이션 전이면 표가 없어 ADMIN 만 운영진이다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { BASE_COLUMNS, EVENT_COLUMNS, toEvent, type MetricsEvent } from "./events.ts";

export type StaffAccount = { userId: string; note: string };

/** 표에 넣은 운영진 계정. 표가 없거나 못 읽으면 빈 목록(ADMIN 권한 계정만 운영진이 된다) */
export async function loadStaffAccounts(client: SupabaseClient): Promise<StaffAccount[]> {
  const { data, error } = await client.from("metrics_staff_accounts").select("user_id, note").order("created_at");
  if (error || !data) return [];
  return (data as { user_id: string; note: string }[]).map((r) => ({ userId: String(r.user_id), note: r.note ?? "" }));
}

/**
 * 일정을 읽는다. 0007 마이그레이션 전이면 새 칸(성격, 시간, 장소)이 없어 기본 칸만 읽고 성격은 이름으로 짐작한다.
 * 테이블도 없으면(0004 전) null
 */
export async function loadEvents(client: SupabaseClient, range?: { from: string; to: string }): Promise<MetricsEvent[] | null> {
  const read = async (columns: string) => {
    let q = client.from("metrics_events").select(columns);
    if (range) q = q.gte("day", range.from).lte("day", range.to);
    return q.order("day").order("id").limit(2000);
  };
  let res = await read(EVENT_COLUMNS);
  if (res.error) res = await read(BASE_COLUMNS);
  if (res.error || !res.data) return null;
  return (res.data as unknown as Record<string, unknown>[]).map(toEvent);
}
