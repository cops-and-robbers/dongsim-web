import { NextResponse } from "next/server";
import { guard, isEventsWritable, noStore, storeError, type EventsList } from "@/lib/event/adminApi";
import { readEventDays, readMinigameStored, readSettingsIndex } from "@/lib/event/server";
import { defaultSettings, normalize } from "@/lib/event/settings";

/**
 * 어드민 "행사" 목록 (#219). 지표 일정 중 성격이 행사인 날과, 저장한 설정.
 *
 * GET  EventsList
 */
export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  try {
    const [days, index, minigame] = await Promise.all([readEventDays(), readSettingsIndex(), readMinigameStored()]);
    const body: EventsList = {
      items: days.map((event) => ({
        event,
        settings: index.has(event.id) ? normalize(index.get(event.id), defaultSettings(event)) : defaultSettings(event),
        configured: index.has(event.id),
      })),
      minigame,
      writable: isEventsWritable(),
    };
    return NextResponse.json(body, noStore);
  } catch (e) {
    return storeError(e);
  }
}
