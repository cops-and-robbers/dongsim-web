/**
 * 출시 보드를 만들어 1분 동안 같은 값을 쓴다. 서버 전용이다.
 * 어드민 여러 명이 열어도 스토어 API 를 매번 부르지 않게 하고, "다시 읽기"는 캐시를 비우고 바로 읽는다.
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/metrics/db";
import { buildBoard, type ReleaseBoard } from "./board";
import { historyFrom, readAndroid, readIos, readLookup, StoreError } from "./stores";

export const RELEASE_TAG = "release-board";

const failed = (where: string) => (e: unknown) => {
  console.error(`[release] ${where}`, e instanceof Error ? e.message : e);
  return { error: e instanceof StoreError ? e.message : `${where}를 읽다가 문제가 생겼어요. 잠시 뒤 다시 읽어 주세요` };
};

async function readHistory() {
  try {
    const { data, error } = await db().from("metrics_events").select("day,label").like("label", "% 출시").order("day", { ascending: false }).limit(60);
    if (error) throw new Error(error.message);
    return historyFrom((data ?? []) as { day: string; label: string }[]);
  } catch (e) {
    console.error("[release] history", e instanceof Error ? e.message : e);
    return [];
  }
}

async function read(): Promise<ReleaseBoard> {
  const now = new Date();
  const [ios, android, lookup, history] = await Promise.all([readIos(now).catch(failed("App Store")), readAndroid().catch(failed("Google Play")), readLookup(), readHistory()]);
  return buildBoard({ now: now.toISOString(), ios, android, lookup, history });
}

export const releaseBoard = unstable_cache(read, ["release-board-v1"], { tags: [RELEASE_TAG], revalidate: 60 });

/** 다시 읽기. 같은 서버에서 10초 안에 또 누르면 캐시를 그대로 쓴다(스토어 API 아끼기) */
let lastRefresh = 0;
export function refreshReleaseBoard(): void {
  if (Date.now() - lastRefresh < 10_000) return;
  lastRefresh = Date.now();
  revalidateTag(RELEASE_TAG, { expire: 0 });
}
