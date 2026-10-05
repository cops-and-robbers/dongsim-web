/**
 * 인스타 수집 한 번 (#140). 라우트(/api/metrics/instagram)와 수동 실행
 * 스크립트(scripts/instagram-report.mjs)가 이 함수 하나를 같이 쓴다.
 *
 * 순서
 *   1. 토큰 준비 (처음이면 환경변수에서, 일주일이 지났으면 연장)
 *   2. 게시물 목록과 게시물마다 누적값을 받아 오늘 날짜로 저장
 *   3. 계정 하루 지표 저장 (처음이면 28일치, 이후엔 최근 며칠을 다시)
 *   4. 게시물 리포트, 급상승 알림을 골라 보낸다 (dry 면 보내지 않고 내용만 돌려준다)
 *
 * 저장은 dry 여도 한다. 같은 날 다시 돌면 덮어쓰는 값이라 미리보기가 기록을
 * 어지럽히지 않고, 오히려 하루를 빠뜨리지 않게 해 준다.
 */

import { createHash } from "node:crypto";
import { sendDiscord } from "../discord.ts";
import {
  fetchAccountDays,
  fetchAllMedia,
  fetchMediaMetrics,
  refreshToken,
} from "./api.ts";
import { buildPostReport, buildSpikeAlert } from "./messages.ts";
import { detectSpike, isContinuation, pickPostReports, pickTopGain, standingOf } from "./rules.ts";
import {
  accountDaysSince,
  claimNotification,
  db,
  latestAccountDay,
  readToken,
  recentSnapshots,
  releaseNotification,
  sentKeys,
  upsertAccountDays,
  upsertMedia,
  upsertSnapshots,
  writeToken,
  type Snapshot,
} from "./store.ts";
import type { AccountDay, MediaWithLatest } from "./types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

const DAY = 86_400_000;

/** 토큰은 60일짜리다. 일주일마다 연장하면 수집이 몇 주 멈춰도 만료 전에 되살릴 수 있다. */
const REFRESH_EVERY_MS = 7 * DAY;

/** 연장이 계속 실패하는데 만료가 이만큼 남았으면 실행 자체를 실패로 알린다. */
const EXPIRY_ALARM_MS = 10 * DAY;

/** 인스타 장기 토큰의 수명. 처음 받은 토큰은 언제 만들었는지 몰라 이 값으로 어림한다. */
const TOKEN_LIFETIME_MS = 60 * DAY;

export type NotificationResult = {
  kind: "post_report" | "reach_spike";
  key: string;
  /** continued: 전날부터 이어지는 급상승이라 보내지 않고 기록만 했다 */
  status: "sent" | "preview" | "already_sent" | "continued" | "failed";
  content: string;
  error?: string;
};

export type RunResult = {
  ok: boolean;
  dry: boolean;
  capturedOn: string;
  media: number;
  snapshots: number;
  snapshotFailures: { mediaId: string; error: string }[];
  accountDays: number;
  /** 계정 하루 지표를 못 받았을 때. 게시물 리포트는 그래도 나간다 */
  accountError: string | null;
  /** error 는 만료가 가까운데 연장이 안 될 때만. 사람이 새 토큰을 넣어야 한다 */
  token: { refreshed: boolean; expiresAt: string | null; error: string | null };
  notifications: NotificationResult[];
  warnings: string[];
};

/** 한국 날짜 YYYY-MM-DD. 하루 한 번 찍는 누적값의 날짜다. */
export function seoulYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY).toISOString().slice(0, 10);
}

async function ensureToken(
  client: SupabaseClient,
  now: Date,
  warnings: string[],
): Promise<{ token: string; refreshed: boolean; expiresAt: string | null; fatal: string | null }> {
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const envHash = envToken ? createHash("sha256").update(envToken).digest("hex") : null;

  let stored = await readToken(client, "instagram");

  /*
    처음이거나, 사람이 토큰을 새로 발급해 환경변수를 바꿨으면 그 토큰을 받아들인다.

    받은 토큰이 언제 만들어졌는지 모르므로 만료는 지금부터 60일로 어림하고, 연장
    시각을 아주 옛날로 둬서 바로 연장을 시도하게 한다. 연장에 성공하면 인스타가
    알려 주는 진짜 만료로 바뀐다. 만든 지 24시간이 안 된 토큰은 연장이 거절되는데,
    그건 경고로만 남고 다음 날 다시 시도한다. 만료를 비워 두면 연장이 계속 실패해도
    경보가 울리지 않아 60일째 조용히 끊긴다.
  */
  if (envToken && envHash && (!stored || stored.seedHash !== envHash)) {
    stored = {
      accessToken: envToken,
      expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS).toISOString(),
      refreshedAt: new Date(0).toISOString(),
      seedHash: envHash,
    };
    await writeToken(client, "instagram", stored);
  }
  if (!stored) throw new Error("인스타 토큰이 없어요. INSTAGRAM_ACCESS_TOKEN 환경변수를 넣어 주세요");

  if (now.getTime() - new Date(stored.refreshedAt).getTime() < REFRESH_EVERY_MS) {
    return { token: stored.accessToken, refreshed: false, expiresAt: stored.expiresAt, fatal: null };
  }
  try {
    const next = await refreshToken(stored.accessToken);
    await writeToken(client, "instagram", {
      accessToken: next.token,
      expiresAt: next.expiresAt,
      refreshedAt: now.toISOString(),
      seedHash: stored.seedHash,
    });
    return { token: next.token, refreshed: true, expiresAt: next.expiresAt, fatal: null };
  } catch (e) {
    const msg = `토큰 연장 실패: ${e instanceof Error ? e.message : String(e)}`;
    warnings.push(msg);
    // 만료를 모르는 옛 기록이면 마지막 연장에서 60일로 어림한다
    const expiresAt =
      stored.expiresAt ?? new Date(new Date(stored.refreshedAt).getTime() + TOKEN_LIFETIME_MS).toISOString();
    const left = new Date(expiresAt).getTime() - now.getTime();
    // 만료가 가까운데 연장이 안 되면 사람이 새 토큰을 넣어야 한다. 조용히 넘기면 그대로 끊긴다
    const fatal = left < EXPIRY_ALARM_MS ? `${msg} (만료까지 ${Math.max(0, Math.floor(left / DAY))}일 남음)` : null;
    return { token: stored.accessToken, refreshed: false, expiresAt, fatal };
  }
}

/** 동시에 몇 개씩만 부른다. 게시물이 늘어도 인스타 호출 한도에 한 번에 부딪히지 않게. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** 게시물마다 누적값 기록, 새것부터. snapshots 는 날짜 내림차순이어야 한다. */
function historyByMedia(snapshots: Snapshot[]): Map<string, Snapshot[]> {
  const map = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    const list = map.get(s.mediaId);
    if (list) list.push(s);
    else map.set(s.mediaId, [s]);
  }
  return map;
}

export async function runInstagramReport(opts: { dry: boolean; now?: Date; webhookUrl?: string }): Promise<RunResult> {
  const now = opts.now ?? new Date();
  const client = db();
  const warnings: string[] = [];
  const capturedOn = seoulYmd(now);
  const webhookUrl = opts.webhookUrl ?? process.env.DISCORD_INSTAGRAM_WEBHOOK_URL;
  if (!opts.dry && !webhookUrl) throw new Error("DISCORD_INSTAGRAM_WEBHOOK_URL 환경변수가 없어요");

  // 1. 토큰
  const token = await ensureToken(client, now, warnings);

  // 2. 게시물과 누적값
  const media = await fetchAllMedia(token.token);
  await upsertMedia(client, media);
  const settled = await mapLimit(media, 4, (m) => fetchMediaMetrics(m, token.token));
  const snapshots: Snapshot[] = [];
  const snapshotFailures: RunResult["snapshotFailures"] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      snapshots.push({ mediaId: media[i].id, capturedOn, capturedAt: now.toISOString(), metrics: r.value });
    } else {
      snapshotFailures.push({
        mediaId: media[i].id,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  });
  await upsertSnapshots(client, snapshots);

  // 3. 계정 하루 지표. 최근 사흘은 인스타가 값을 늦게 고치므로 매번 다시 받는다
  const lastDay = await latestAccountDay(client);
  // 인스타는 30일 범위까지만 준다. api.ts 가 경계용으로 하루를 더 앞에서 받으므로 28일로 둔다
  const floor = now.getTime() - 28 * DAY;
  const since = new Date(Math.max(floor, lastDay ? new Date(`${lastDay}T00:00:00Z`).getTime() - 3 * DAY : floor));
  // 실패해도 게시물 리포트는 보낸다. 리포트는 3~7일 창 안에서만 나가서 며칠 막히면 영영 놓친다
  let accountDays: AccountDay[] = [];
  let accountError: string | null = null;
  try {
    accountDays = await fetchAccountDays(token.token, since, now);
    await upsertAccountDays(client, accountDays);
  } catch (e) {
    accountError = e instanceof Error ? e.message : String(e);
  }

  // 4. 무엇을 보낼지
  // 나흘이면 급상승 하루(알림 이틀 전에 시작)를 덮는 기록까지 들어온다.
  // Supabase 는 한 번에 1,000줄까지 주므로 범위를 넓히면 게시물 수와 함께 따져 봐야 한다
  const history = historyByMedia(await recentSnapshots(client, addDays(capturedOn, -4)));
  const withLatest: MediaWithLatest[] = media.map((m) => ({ ...m, latest: history.get(m.id)?.[0]?.metrics ?? null }));

  const notifications: NotificationResult[] = [];
  async function deliver(kind: NotificationResult["kind"], key: string, content: string) {
    if (opts.dry) {
      notifications.push({ kind, key, status: "preview", content });
      return;
    }
    if (!(await claimNotification(client, kind, key))) {
      notifications.push({ kind, key, status: "already_sent", content });
      return;
    }
    try {
      await sendDiscord(webhookUrl as string, content);
      notifications.push({ kind, key, status: "sent", content });
    } catch (e) {
      await releaseNotification(client, kind, key).catch(() => {});
      notifications.push({ kind, key, status: "failed", content, error: e instanceof Error ? e.message : String(e) });
    }
  }

  // 오늘 숫자를 못 받은 게시물은 다음 날로 미룬다. 며칠 전 숫자로 "N일 동안"이라고 쓰면 틀린 말이 된다
  const capturedToday = withLatest.filter((m) => history.get(m.id)?.[0]?.capturedOn === capturedOn);
  const sentPosts = await sentKeys(client, "post_report");
  for (const post of pickPostReports(capturedToday, now, sentPosts)) {
    const content = buildPostReport(
      post,
      now,
      standingOf(post, withLatest, (m) => m.latest?.reach ?? null),
      standingOf(post, withLatest, (m) => m.latest?.shares ?? null),
    );
    await deliver("post_report", post.id, content);
  }

  const spike = accountError ? null : detectSpike(await accountDaysSince(client, addDays(capturedOn, -40)), now);
  const recordedSpikes = spike ? await sentKeys(client, "reach_spike") : new Set<string>();
  if (spike && !recordedSpikes.has(spike.day.day)) {
    if (isContinuation(spike.day.day, recordedSpikes)) {
      // 전날부터 이어지는 흐름이다. 보내지는 않되 기록을 남겨 다음 날도 이어진 것으로 본다
      if (!opts.dry) await claimNotification(client, "reach_spike", spike.day.day);
      notifications.push({ kind: "reach_spike", key: spike.day.day, status: "continued", content: "" });
    } else {
      const views = new Map(
        [...history].map(([id, list]) => [
          id,
          list.map((x) => ({ capturedOn: x.capturedOn, capturedAt: x.capturedAt, views: x.metrics.views })),
        ]),
      );
      const top = pickTopGain(media, views, spike.day.dayStart, capturedOn);
      await deliver("reach_spike", spike.day.day, buildSpikeAlert(spike, top));
    }
  }

  // 게시물 한두 개가 실패하는 건 그날만의 일일 수 있어 경고로 두지만, 전부 실패면 수집이 멈춘 것이다
  const allSnapshotsFailed = media.length > 0 && snapshots.length === 0;
  const ok =
    !token.fatal && !accountError && !allSnapshotsFailed && notifications.every((n) => n.status !== "failed");
  return {
    ok,
    dry: opts.dry,
    capturedOn,
    media: media.length,
    snapshots: snapshots.length,
    snapshotFailures,
    accountDays: accountDays.length,
    accountError,
    token: { refreshed: token.refreshed, expiresAt: token.expiresAt, error: token.fatal },
    notifications,
    warnings,
  };
}
