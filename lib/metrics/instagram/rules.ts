/**
 * 무엇을 언제 보낼지 정하는 규칙 (#140). 입력만 보고 답하는 순수 함수라
 * 테스트(rules.test.mjs)가 숫자를 직접 넣어 확인한다.
 */

import type { AccountDay, Media, MediaWithLatest, ViewGain, ViewRecord } from "./types.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * 게시물 리포트는 올리고 3일이 지난 뒤 보낸다. 도달은 올린 날 튀고 사흘 안에
 * 거의 멈춰서(9월 게시물들 실측), 그때 숫자가 그 게시물의 결산에 가깝다.
 */
export const REPORT_AFTER_MS = 3 * DAY;

/**
 * 7일이 넘은 게시물은 보내지 않는다. 기능을 처음 켜는 날 옛 게시물 리포트가
 * 한꺼번에 쏟아지지 않게 막는 장치이고, 수집이 며칠 멈췄다 돌아와도 밀린
 * 리포트는 일주일치까지만 나간다.
 */
export const REPORT_WINDOW_MS = 7 * DAY;

/** 하루 도달이 직전 14일 중앙값의 몇 배를 넘으면 알릴지. */
export const SPIKE_MULTIPLE = 3;

/**
 * 배수만 보면 평소 5명인 날 20명만 와도 "4배"가 된다. 그런 날까지 알리면
 * 알림이 소음이 되므로 절대값 하한을 같이 둔다.
 */
export const SPIKE_MIN_REACH = 300;

/** 중앙값을 낼 직전 기간과, 그중 최소한 있어야 하는 날 수. */
export const SPIKE_BASELINE_DAYS = 14;
const SPIKE_MIN_BASELINE_DAYS = 7;

/**
 * 가장 최근 하루가 이보다 오래전에 끝났으면 판단하지 않는다. 처음 켤 때 30일치를
 * 채워 넣는데, 그 안의 지난 급상승까지 지금 알리면 안 되기 때문이다.
 */
const SPIKE_FRESH_MS = 2 * DAY;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** 리포트를 보낼 게시물. 오래된 것부터 보내야 채널에서 순서대로 읽힌다. */
export function pickPostReports(
  media: MediaWithLatest[],
  now: Date,
  alreadySent: ReadonlySet<string>,
): MediaWithLatest[] {
  return media
    .filter((m) => {
      if (alreadySent.has(m.id) || m.latest === null) return false;
      const age = now.getTime() - new Date(m.postedAt).getTime();
      return age >= REPORT_AFTER_MS && age < REPORT_WINDOW_MS;
    })
    .sort((a, b) => a.postedAt.localeCompare(b.postedAt));
}

export type Standing = {
  /** 비교한 게시물 수 (자기 포함) */
  total: number;
  /** 1부터. 같은 값이면 같은 등수 */
  rank: number;
  /** 자기를 뺀 나머지의 중앙값. 비교 대상이 셋 미만이면 null */
  othersMedian: number | null;
  /** 중앙값을 낸 게시물 수 (자기 제외) */
  othersCount: number;
};

/**
 * 한 게시물이 그보다 먼저 올린 게시물들 사이에서 몇 등인지.
 *
 * 나중에 올린 게시물은 뺀다. 올린 지 하루라 숫자가 아직 작은 게시물이 섞이면
 * 순위와 "보통 게시물"이 실제보다 좋게 나온다. 먼저 올린 게시물은 각자의 최신
 * 누적값과 비교한다 - 3일보다 오래 쌓였지만 사흘 뒤로는 거의 늘지 않아 차이가 작다.
 */
export function standingOf(
  target: MediaWithLatest,
  media: MediaWithLatest[],
  pick: (m: MediaWithLatest) => number | null,
): Standing | null {
  const mine = pick(target);
  if (mine === null) return null;
  const others = media
    .filter((m) => m.id !== target.id && m.postedAt < target.postedAt)
    .map(pick)
    .filter((v): v is number => v !== null);
  return {
    total: others.length + 1,
    rank: 1 + others.filter((v) => v > mine).length,
    othersMedian: others.length >= 3 ? median(others) : null,
    othersCount: others.length,
  };
}

export type Spike = {
  day: AccountDay;
  /** 직전 14일 중앙값. 0일 수 있다 (배수는 1명으로 보고 계산한다) */
  baseline: number;
  multiple: number;
};

/**
 * 가장 최근에 끝난 하루가 기준을 넘었는지. days 는 날짜 오름차순이어야 한다.
 *
 * 며칠 이어지는 흐름(9월 13~14일, 16~17일)을 한 번만 알리는 일은 여기서 하지
 * 않고 보낸 기록으로 한다(isContinuation). 전날이 기준을 넘었는지로 거르면,
 * 인스타가 전날 값을 나중에 고쳐 기준을 넘게 됐을 때 아무 알림도 나가지 않는다.
 */
export function detectSpike(days: AccountDay[], now: Date): Spike | null {
  const ended = days.filter((d) => new Date(d.dayEnd).getTime() <= now.getTime());
  if (ended.length === 0) return null;
  const index = ended.length - 1;
  const day = ended[index];
  if (now.getTime() - new Date(day.dayEnd).getTime() > SPIKE_FRESH_MS) return null;
  if (day.reach === null || day.reach < SPIKE_MIN_REACH) return null;
  const before = ended
    .slice(Math.max(0, index - SPIKE_BASELINE_DAYS), index)
    .map((d) => d.reach)
    .filter((v): v is number => v !== null);
  if (before.length < SPIKE_MIN_BASELINE_DAYS) return null;
  const mid = median(before) as number;
  // 평소가 0명이면 배수가 무한대가 된다. 1명으로 보고 하한(300명)이 거른다.
  const multiple = day.reach / Math.max(mid, 1);
  if (multiple < SPIKE_MULTIPLE) return null;
  return { day, baseline: mid, multiple };
}

/**
 * 급상승한 하루 동안 조회가 가장 많이 늘어난 게시물.
 *
 * 그 하루는 한국 시간으로 알림 이틀 전 오후에 시작하므로, 바로 전날 기록과
 * 비교하면 하루의 절반도 못 덮는다. 하루가 시작되기 전 마지막 수집과 오늘 수집을
 * 비교한다. 그 수집 뒤에 올린 게시물은 그때 0회였던 것으로 본다 - 급상승을 만든
 * 게 바로 그 새 게시물인 경우가 많은데, 빼면 엉뚱한 옛 게시물을 짚게 된다.
 * 하루가 시작되기 전 수집이 하나도 없으면(처음 켠 직후) 짚지 않는다.
 *
 * @param history 게시물마다 누적값 기록, 새것부터
 */
export function pickTopGain(
  media: Media[],
  history: ReadonlyMap<string, ViewRecord[]>,
  dayStart: string,
  today: string,
): ViewGain | null {
  const startMs = new Date(dayStart).getTime();
  let prevRunMs = -Infinity;
  for (const list of history.values()) {
    for (const r of list) {
      const t = new Date(r.capturedAt).getTime();
      if (t <= startMs && t > prevRunMs) prevRunMs = t;
    }
  }
  if (prevRunMs === -Infinity) return null;

  let top: ViewGain | null = null;
  for (const m of media) {
    const list = history.get(m.id) ?? [];
    const latest = list[0];
    if (!latest || latest.capturedOn !== today || typeof latest.views !== "number") continue;
    const base = list.find((r) => new Date(r.capturedAt).getTime() <= startMs);
    let gained: number;
    let since: string;
    if (base && typeof base.views === "number") {
      gained = latest.views - base.views;
      since = base.capturedAt;
    } else if (!base && new Date(m.postedAt).getTime() > prevRunMs) {
      gained = latest.views;
      since = m.postedAt;
    } else {
      continue;
    }
    if (gained > 0 && (!top || gained > top.gained)) top = { media: m, gained, since };
  }
  return top;
}

/** "2026-09-14" 의 전날 "2026-09-13" */
export function previousDay(ymd: string): string {
  return new Date(new Date(`${ymd}T12:00:00Z`).getTime() - DAY).toISOString().slice(0, 10);
}

/**
 * 이어지는 흐름인지. 전날 날짜로 기록(보냈거나, 이어져서 넘긴 것)이 있으면 그렇다.
 * 이어지는 날도 기록을 남기므로, 사흘 나흘 이어져도 알림은 첫날 한 번이다.
 */
export function isContinuation(day: string, recordedDays: ReadonlySet<string>): boolean {
  return recordedDays.has(previousDay(day));
}
