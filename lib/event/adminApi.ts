/**
 * 어드민 "행사" 경로가 같이 쓰는 것 (#219). 서버 전용이다.
 * 화면과 주고받는 모양(EventsList, EventDetail)도 여기 둔다.
 */
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import type { EventDay, EventSettings, HomeMinigame } from "@/lib/event/settings";
import type { Asset } from "@/lib/event/assets";

/** 그림 보관함 목록(#224). usage 는 그림 키마다 쓰는 행사 이름 */
export type AssetsList = { assets: Asset[]; usage: Record<string, string[]>; writable: boolean };

export type EventsListItem = { event: EventDay; settings: EventSettings; configured: boolean };
export type EventsList = { items: EventsListItem[]; minigame: HomeMinigame; writable: boolean };

export type EventDetail = {
  event: EventDay;
  settings: EventSettings;
  version: number;
  updatedBy: string | null;
  updatedAt: string | null;
  history: { version: number; settings: EventSettings; updatedBy: string; updatedAt: string }[];
  minigame: HomeMinigame;
  writable: boolean;
};

export const noStore = { headers: { "Cache-Control": "no-store" } };

/**
 * 저장소는 운영과 미리보기, 로컬이 같이 쓴다. 로컬에서 고쳐도 실제 부스와 홈이 바뀐다.
 * 그래서 앱 설정, 온라인 게임과 같이 운영 배포에서만 바꾼다
 */
export const isEventsWritable = () => process.env.VERCEL_ENV === "production";

export async function guard(req: Request): Promise<{ token: string } | NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });
  return { token };
}

/** 표가 아직 없을 때(SQL 을 실행하기 전) 화면에 알려 줄 말 */
export function storeError(e: unknown): NextResponse {
  const message = e instanceof Error ? e.message : String(e);
  console.error("[events]", message);
  if (/event_settings|site_settings/.test(message) && /does not exist|schema cache/.test(message)) {
    return NextResponse.json({ error: "행사 설정 표가 아직 없어요. supabase/migrations/0013_event_settings.sql 을 Supabase 에서 실행해 주세요." }, { status: 503 });
  }
  if (/photobooth_assets/.test(message) && /does not exist|schema cache/.test(message)) {
    return NextResponse.json({ error: "그림 보관함 표가 아직 없어요. supabase/migrations/0014_photobooth_assets.sql 을 Supabase 에서 실행해 주세요." }, { status: 503 });
  }
  return NextResponse.json({ error: "행사 설정을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
}
