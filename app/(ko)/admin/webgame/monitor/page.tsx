"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, SectionCard, ScrollPage, ErrorBlock, EmptyBlock } from "@/components/admin/Parts";
import { Callout } from "@/components/admin/Callout";
import { RefreshIcon } from "@/components/admin/icons";
import { WebgameTabs } from "@/components/admin/webgame/WebgameTabs";
import { HealthSummary } from "@/components/admin/webgame/HealthSummary";
import { StatStrip, type Stat } from "@/components/admin/webgame/StatStrip";
import { HourBars } from "@/components/admin/webgame/HourBars";
import { UsageMeter } from "@/components/admin/webgame/UsageMeter";
import { ResultsTable, type ResultsFilter } from "@/components/admin/webgame/ResultsTable";
import { fetchWebgameMonitor } from "@/lib/admin/webgameClient";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import {
  RTT_BAD_MS,
  RTT_SLOW_MS,
  USAGE_LIMIT,
  USAGE_STOP_AT,
  gamesByHour,
  gamesToday,
  recentMedianRtt,
  summarize,
  untilReset,
  type WebgameMonitor,
} from "@/lib/admin/webgameMonitor";

// 온라인 게임 > 모니터링. 위에서 아래로 "괜찮나?(한 줄 답) → 숫자 셋 → 오늘 사용량 → 시간대별 판 수 → 판 목록" 순서로,
// 먼저 답을 보고 필요하면 내려가 근거를 보게 짰다. 재료는 게임 서버의 판 결과와 도는 판 수, Cloudflare 사용량 통계예요.
// 셋 다 조회만 해서 비용이 들지 않아요. 화면을 보는 동안 30초마다 다시 읽어요. 설계와 근거는 docs/admin-ui.md "온라인 게임 모니터링"

const KST = 9 * 3_600_000;
const clockKst = (iso: string | null) => (iso ? new Date(Date.parse(iso) + KST).toISOString().slice(11, 16) : "");
const secondsKst = (t: number) => new Date(t + KST).toISOString().slice(11, 19);

export default function WebgameMonitorPage() {
  const [data, setData] = useState<WebgameMonitor | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<ResultsFilter>("all");
  const listRef = useRef<HTMLDivElement>(null);
  const tick = useLiveRefresh(30_000);
  // 버튼으로 다시 부를 때 올린다. 30초마다 다시 읽기(tick)와 같은 길로 불러온다
  const [manual, setManual] = useState(0);

  const load = useCallback(() => {
    fetchWebgameMonitor()
      .then((next) => {
        setData(next);
        setNow(Date.now());
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, tick, manual]);

  const reload = () => {
    setLoading(true);
    setManual((n) => n + 1);
  };

  const results = useMemo(() => data?.results ?? [], [data]);
  const bins = useMemo(() => gamesByHour(results, now), [results, now]);
  const summary = useMemo(() => summarize(results, now, data?.usage ?? null), [results, now, data]);
  const median = recentMedianRtt(results);
  const reset = untilReset(now);
  const resetIn = reset.hours ? `${reset.hours}시간 ${reset.minutes}분` : `${reset.minutes}분`;

  const showFlagged = () => {
    setFilter("flagged");
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const stats: Stat[] = data
    ? [
        {
          label: "지금 도는 판",
          value: data.errors.live ? "-" : (data.live?.playing ?? 0),
          unit: "판",
          note: data.errors.live ? "읽지 못했어요" : data.live?.playing ? `늦어도 ${clockKst(data.live.until)}에 끝나요` : "도는 판이 없어요",
          noteTone: data.errors.live ? "warn" : "muted",
        },
        { label: "오늘 끝난 판", value: gamesToday(results, now), unit: "판", note: "한국 시간 0시부터" },
        {
          label: "왕복 시간",
          value: median ?? "-",
          unit: "ms",
          note:
            median === null
              ? "아직 잰 판이 없어요"
              : median >= RTT_BAD_MS
                ? "최근 10판 기준, 아주 느려요"
                : median >= RTT_SLOW_MS
                  ? "최근 10판 기준, 느려요"
                  : "최근 10판 기준, 괜찮아요",
          noteTone: median === null ? "muted" : median >= RTT_BAD_MS ? "bad" : median >= RTT_SLOW_MS ? "warn" : "good",
        },
      ]
    : [];

  return (
    <ScrollPage>
      <PageHeader
        title="온라인 게임"
        description="게임 서버가 남긴 판 결과와 사용량이에요. 보고 있는 동안 30초마다 새로 불러와요."
        actions={
          data && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] tabular-nums text-sd-fg-subtle" aria-live="polite">
                {secondsKst(now)} 기준
              </span>
              <button
                type="button"
                onClick={reload}
                disabled={loading}
                aria-label="지금 다시 불러오기"
                className="rounded-lg p-2 text-sd-fg-muted outline-none ring-1 ring-sd-line transition hover:bg-sd-pressed focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
              >
                <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          )
        }
      />
      <WebgameTabs />

      {!data && !loadError && <p className="py-14 text-center text-[14px] text-sd-fg-subtle">불러오는 중이에요</p>}
      {!data && loadError && <ErrorBlock message={loadError} onRetry={reload} />}

      {data && (
        <div className="space-y-5">
          {process.env.NODE_ENV !== "production" && <Callout>로컬 개발 환경의 예시 값이에요. 실제 게임 서버의 숫자가 아니에요.</Callout>}
          {loadError && <Callout>새로 불러오지 못해서 {secondsKst(now)}에 불러온 값을 보여 주고 있어요.</Callout>}

          {!data.errors.results && <HealthSummary summary={summary} onShowFlagged={showFlagged} />}

          <StatStrip stats={stats} />

          <SectionCard title="오늘 사용량" right={<span className="text-[12px] text-sd-fg-subtle">계정 전체, 오전 9시에 초기화</span>}>
            {!data.usageConnected ? (
              <p className="text-[13px] text-sd-fg-subtle">Cloudflare 통계 토큰을 연결하면 보여요.</p>
            ) : data.errors.usage || !data.usage ? (
              <p className="text-[13px] text-sd-fg-subtle">{data.errors.usage ?? "불러오지 못했어요."}</p>
            ) : (
              <div className="grid gap-8 md:grid-cols-2">
                <UsageMeter label="요청" value={data.usage.requests} limit={USAGE_LIMIT.requests} stopAt={USAGE_STOP_AT} unit="건" resetIn={resetIn} />
                <UsageMeter label="방 서버 실행량" value={data.usage.gbs} limit={USAGE_LIMIT.gbs} stopAt={USAGE_STOP_AT} unit="GB-s" digits={1} resetIn={resetIn} />
              </div>
            )}
          </SectionCard>

          <SectionCard title="최근 24시간 판 수" right={<span className="text-[12px] text-sd-fg-subtle">한 시간 단위</span>}>
            {data.errors.results ? <p className="text-[13px] text-sd-fg-subtle">{data.errors.results}</p> : <HourBars bins={bins} />}
          </SectionCard>

          <div ref={listRef} className="scroll-mt-4">
            <SectionCard title="최근 판" flush right={<span className="text-[12px] text-sd-fg-subtle">최근 200판까지</span>}>
              {data.errors.results ? (
                <div className="p-5">
                  <ErrorBlock message={data.errors.results} onRetry={reload} />
                </div>
              ) : results.length ? (
                <ResultsTable results={results} now={now} filter={filter} onFilterChange={setFilter} />
              ) : (
                <EmptyBlock title="아직 끝난 판이 없어요" description="판이 끝날 때마다 한 줄씩 쌓여요." />
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </ScrollPage>
  );
}
