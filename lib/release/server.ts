/**
 * 출시 보드를 만들어 1분 동안 같은 값을 쓴다. 서버 전용이다.
 * 어드민 여러 명이 열어도 스토어 API 를 매번 부르지 않게 하고, "다시 읽기"는 캐시를 비우고 바로 읽는다.
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/metrics/db";
import { buildBoard, type ReleaseBoard } from "./board";
import { auditReady, recentActions } from "./audit";
import { androidOptions, iosOptions } from "./options";
import { NotCached, retryOnce, unwrapNotCached } from "./reliable";
import { historyFrom, readAndroid, readIos, readLookup, StoreError } from "./stores";

export const RELEASE_TAG = "release-board";

const failed = (where: string) => (e: unknown) => {
  console.error(`[release] ${where}`, e instanceof StoreError ? (e.detail ?? e.message) : e instanceof Error ? e.message : e);
  return { error: e instanceof StoreError ? e.message : "지금은 상태를 가져오지 못했어요. 잠시 뒤 다시 확인해 주세요." };
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
  const [ios, android, lookup, history, actions, ready] = await Promise.all([
    // Android 는 출시 목록 한도가 있어 다시 부르지 않는다(stores.ts listPlan)
    retryOnce(() => readIos(now)).catch(failed("App Store")),
    readAndroid().catch(failed("Google Play")),
    readLookup(),
    readHistory(),
    recentActions(),
    auditReady(),
  ]);
  const board = buildBoard({ now: now.toISOString(), ios, android, lookup, history });
  // 할 수 있는 조작은 스토어에서 읽은 값 그대로로 고른다(서버가 누를 때 다시 읽어 같은지 본다)
  if (board.ios.ok && !("error" in ios)) board.ios.options = iosOptions(ios);
  if (board.android.ok && !("error" in android)) board.android.options = androidOptions(android);
  const production = process.env.VERCEL_ENV === "production";
  board.actions = actions;
  board.writable = production && ready;
  if (!production) board.readOnlyReason = "스토어는 운영 어드민에서만 바꿀 수 있어요";
  else if (!ready) board.readOnlyReason = "버튼을 쓸 준비가 아직 안 됐어요. 개발 담당자에게 알려 주세요";
  return board;
}

// 한쪽이라도 못 읽은 결과는 저장하지 않는다. 저장하면 스토어가 돌아와도 1분 동안 같은 실패를 보여 준다.
// 던지면 unstable_cache 는 저장하지 않고, 저장된 값이 오래됐을 때는 그 값을 계속 내준다
const cachedBoard = unstable_cache(
  async () => {
    const board = await read();
    if (!board.ios.ok || !board.android.ok) throw new NotCached(board);
    return board;
  },
  ["release-board-v1"],
  { tags: [RELEASE_TAG], revalidate: 60 },
);

export const releaseBoard = () => unwrapNotCached<ReleaseBoard>(cachedBoard);

/** 다시 읽기. 같은 서버에서 10초 안에 또 누르면 캐시를 그대로 쓴다(스토어 API 아끼기). 조작 뒤에는 force 로 늘 비운다 */
let lastRefresh = 0;
export function refreshReleaseBoard(force = false): void {
  if (!force && Date.now() - lastRefresh < 10_000) return;
  lastRefresh = Date.now();
  revalidateTag(RELEASE_TAG, { expire: 0 });
}
