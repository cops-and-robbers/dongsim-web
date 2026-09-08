/**
 * R2 고아 이미지 정리 (#109 3단계).
 *
 * 이미지 키는 내용 해시라 글을 고치면 옛 파일이 버킷에 남는다. 어떤 글도
 * 참조하지 않는 파일을 골라 지운다.
 *
 * 안전장치 둘.
 *   - 올라온 지 7일이 지난 것만 지운다. 지금 도는 동기화가 방금 올린 파일은
 *     아직 DB에 참조가 없어서, 나이 제한이 없으면 새 그림을 고아로 오인한다.
 *   - 기본은 세기만 하고, 지우기는 호출자가 명시했을 때만 한다. 지우기는
 *     되돌릴 수 없으므로 실수 쪽이 아니라 보고 쪽으로 기울어야 한다.
 *
 * 참조 수집은 초안을 포함한 **모든** 행에서 한다 - 초안이 쓰는 그림을 지우면
 * 나중에 발행할 때 깨진 채로 나간다.
 */

import { createClient } from "@supabase/supabase-js";
import { listObjects, remove } from "./r2";

/** images/<내용해시>(-가로x세로).<확장자> - 업로더(keyOf)가 만드는 모양 그대로 */
const KEY_PATTERN = /images\/[0-9a-f]{32}(?:-\d+x\d+)?\.[a-z0-9]+/g;

const MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type GcReport = {
  /** 버킷에서 본 오브젝트 수 */
  scanned: number;
  /** 글이 참조하는 키 수 */
  referenced: number;
  /** 참조 없는 오브젝트의 키 (7일 미만 제외) */
  orphans: string[];
  /** 참조는 없지만 아직 어려서 남겨둔 수 */
  tooFresh: number;
  /** 실제로 지운 수 (deleteOrphans 가 아니면 0) */
  deleted: number;
};

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수가 없습니다");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function collectGarbage(deleteOrphans: boolean): Promise<GcReport> {
  const { data, error } = await db()
    .from("posts")
    .select("content, cover_image");
  if (error) throw new Error(`참조 수집 실패: ${error.message}`);

  const referenced = new Set<string>();
  for (const row of data ?? []) {
    const text = `${row.content ?? ""}\n${row.cover_image ?? ""}`;
    for (const m of text.matchAll(KEY_PATTERN)) referenced.add(m[0]);
  }

  const objects = await listObjects("images/");
  const now = Date.now();
  const orphans: string[] = [];
  let tooFresh = 0;
  for (const obj of objects) {
    if (referenced.has(obj.key)) continue;
    if (now - obj.lastModified.getTime() < MIN_AGE_MS) {
      tooFresh += 1;
      continue;
    }
    orphans.push(obj.key);
  }

  let deleted = 0;
  if (deleteOrphans) {
    for (const key of orphans) {
      await remove(key);
      deleted += 1;
    }
  }

  return {
    scanned: objects.length,
    referenced: referenced.size,
    orphans,
    tooFresh,
    deleted,
  };
}
