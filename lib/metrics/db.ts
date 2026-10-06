/**
 * 지표 저장소 연결 (#140, #142). 블로그와 같은 Supabase 프로젝트를 service role 로 쓴다.
 * 지표 테이블은 anon 에 아무 권한이 없어 다른 키로는 읽히지 않는다.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 없어요");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what} 실패: ${res.error.message}`);
  return res.data;
}

/** 1,000줄씩 나눠 넣는다. 한 번에 수천 줄을 보내면 요청이 너무 커진다 */
export async function insertChunks(client: SupabaseClient, table: string, rows: object[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 1000) {
    check(await client.from(table).insert(rows.slice(i, i + 1000)), `${table} 저장`);
  }
}

/**
 * 기간을 통째로 바꾼다 - 그 기간의 줄을 지우고 새로 넣는다.
 *
 * upsert 만 하면, 다시 받았을 때 사라진 줄(예: 그날 더는 안 잡히는 국가)이 옛 값으로
 * 남는다. 지우고 넣는 사이 잠깐 비지만, 하루 한 번 도는 수집이라 그 틈은 무시한다.
 */
export async function replaceRange(
  client: SupabaseClient,
  table: string,
  match: Record<string, string>,
  from: string,
  to: string,
  rows: object[],
): Promise<void> {
  let q = client.from(table).delete().gte("day", from).lte("day", to);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  check(await q, `${table} 기간 지우기`);
  await insertChunks(client, table, rows);
}
