"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ErrorBlock, PageHeader, ScrollPage, SectionCard, EmptyBlock, SURFACE } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { Table, Td, Th, Tr } from "@/components/admin/Table";
import { FadeIn } from "@/components/admin/motion";
import { TrendChart, type Marker } from "@/components/admin/metrics/TrendChart";
import { DateRangePicker, type DayRange } from "@/components/admin/metrics/DateRangePicker";
import { EventsCalendar } from "@/components/admin/metrics/EventsCalendar";
import { PostDrawer } from "@/components/admin/metrics/PostDrawer";
import { FunnelCard } from "@/components/admin/metrics/FunnelCard";
import { countryName } from "@/components/admin/metrics/countryName";
import { TEST_DEVICE_RULE } from "@/lib/metrics/testDevices";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { Dashboard, DailyPoint, PostRow } from "@/lib/metrics/dashboard/data";
import { SOURCE_OF } from "@/lib/metrics/dashboard/sources";
import { MIN_REACH, engagementOf, smallReach } from "@/lib/metrics/dashboard/engagement";
import { ChevronRightIcon } from "@/components/admin/icons";
import { Tooltip } from "@/components/admin/Tooltip";
import { SmallReachNote } from "@/components/admin/metrics/PostDrawer";
import { compareParam, parseCompare, rangeLabel } from "@/lib/metrics/dashboard/calendar";
import { CompareMenu } from "@/components/admin/metrics/CompareMenu";
import { CompareContext, useCompare } from "@/components/admin/metrics/compareContext";
import { addDays, todayIn, ymdRange } from "@/lib/metrics/dates";
import type { Ratio, WeeklyNumbers } from "@/lib/metrics/weekly/numbers";

/**
 * 지표 (#145). 매일 아침 모으는 인스타, 사이트, 스토어, 앱, 광고 숫자를 본다.
 *
 * 탭 다섯으로 나눈다. 매일 여는 사람은 요약만 보고, 맡은 일이 있는 사람은 그 탭으로 간다.
 * - 요약: 앱 첫 실행 큰 숫자, 모든 경로를 합친 흐름, 핵심 비율, 인스타그램에서 온 것, 일정
 * - 인스타그램: 계정 지표와 비율, 팔로워, 게시물별 숫자(정렬)
 * - 유입 경로: 채널별 방문과 전환율, 소스별 표
 * - 스토어: 전체 / App Store / Google Play 를 골라 본다(#147). 스토어 화면에서 설치까지, 나라별,
 *   Google Play 는 남아 있는 설치와 안정성까지. 스토어 화면을 고치는 사람이 자기 스토어만 콘솔 순서대로 본다
 * - 앱과 광고: 첫 실행, 사용(활성 사용자, 실제 판 수), 남는 사람(활성화, 리텐션, 삭제), 광고
 * 기간과 이전 기간 겹치기는 탭 위에 한 번만 두고 모든 탭이 같이 따른다.
 *
 * 개수보다 비율을 함께 본다. 비율은 분자와 분모를 같이 적고, 분모가 MIN_SAMPLE 보다 작으면
 * "숫자가 적어 참고만 해요"를 붙인다. 작은 숫자의 비율은 크게 흔들린다.
 *
 * 인과는 말하지 않는다. "~에서 온" 것만 세고, "덕분에"라고 쓰지 않는다.
 * 용어는 각 콘솔의 한국어 표기를 따른다(조회수, 최초 다운로드, 게재율, 신규 사용자, 이전 기간).
 * 근거는 docs/admin-ui.md "지표 화면", 숫자 규칙은 docs/metrics-collection.md.
 */

// 4주, 13주는 기간마다 요일 수가 같아 주말에 몰리는 숫자도 이전 기간과 공평하게 비교한다
type Days = "7" | "28" | "91";
const PERIODS: { label: string; value: Days }[] = [
  { label: "7일", value: "7" },
  { label: "4주", value: "28" },
  { label: "13주", value: "91" },
];

const TABS = [
  { value: "summary", label: "요약" },
  { value: "instagram", label: "인스타그램" },
  { value: "traffic", label: "유입 경로" },
  { value: "store", label: "스토어" },
  { value: "app", label: "앱과 광고" },
] as const;
type Tab = (typeof TABS)[number]["value"];

// 스토어 탭 안에서 고르는 스토어. 두 스토어는 세는 대상이 달라(App Store 노출은 이미 깐 사람도, Play 방문자는 앱이 없는 사람만)
// 합칠 수 있는 최초 설치만 더하고 나머지는 나란히 둔다
const STORES = [
  // 퍼널 카드의 "전체 / iOS / Android" 와 같은 말로 맞춘다
  { value: "all", label: "전체" },
  { value: "appstore", label: "App Store" },
  { value: "play", label: "Google Play" },
] as const;
type Store = (typeof STORES)[number]["value"];

/** 비율의 분모가 이보다 작으면 참고용이라고 적는다 */
const MIN_SAMPLE = 30;

// 보고 있는 탭과 기간을 주소(?tab=, ?days= 또는 ?from=&to=)에 남겨, 링크를 보내면 같은 화면이 열린다.
// 주소는 바깥 값이라 useSyncExternalStore 로 읽고, 바꿀 때 직접 알린다
const URL_EVENT = "admin-metrics-url";
const readSearch = () => window.location.search;
const subscribeSearch = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener(URL_EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(URL_EVENT, cb);
  };
};
function useSearch(): [URLSearchParams, (patch: Record<string, string | null>) => void] {
  const search = useSyncExternalStore(subscribeSearch, readSearch, () => "");
  const update = (patch: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(URL_EVENT));
  };
  return [new URLSearchParams(search), update];
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
// 고를 수 있는 가장 이른 날. 수집을 시작한 날(App Store 판매, GA4 웹 2026-04-01)
const MIN_DAY = "2026-04-01";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const md = (ymd: string | null) => {
  if (!ymd) return "-";
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
};
const seoulDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
const firstLine = (caption: string | null) => caption?.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "(캡션 없음)";
const usd = (micros: number) => `$${(micros / 1e6).toFixed(2)}`;
const rate = (r: Ratio) => (r.den > 0 ? r.num / r.den : null);
const pct = (v: number | null, digits = 1) => (v === null ? "-" : `${(v * 100).toFixed(digits)}%`);

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () =>
    fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

async function fetchDashboard(query: string): Promise<Dashboard> {
  const res = await authedFetch(`/api/admin/metrics?${query}`);
  const body = (await res.json().catch(() => ({}))) as Dashboard & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

/** 날짜별 숫자를 엑셀에서 바로 열리는 CSV 로 (한글이 깨지지 않게 BOM 을 붙인다) */
function downloadCsv(d: Dashboard) {
  const cols: [keyof DailyPoint, string][] = [
    ["day", "날짜"],
    ["igViews", "인스타 조회수"],
    ["igProfileViews", "인스타 프로필 방문"],
    ["igLinkClicks", "인스타 프로필 링크 클릭"],
    ["webSessions", "사이트 방문(팀 방문 제외)"],
    ["webFromInstagram", "인스타에서 온 사이트 방문"],
    ["downloadClicks", "스토어로 이동(팀 방문 제외)"],
    ["downloadClicksFromInstagram", "인스타에서 온 스토어로 이동"],
    ["appStoreNew", "App Store 최초 다운로드"],
    ["firstOpenAndroid", "앱 첫 실행 Android"],
    ["firstOpenIos", "앱 첫 실행 iOS"],
    ["dau", "하루 활성 사용자"],
    ["playerStarts", "게임 참가(사람 기준)"],
    ["adImpressions", "광고 노출"],
    ["adEarningsMicros", "예상 광고 수익(USD)"],
    ["playInstalls", "Google Play 최초 설치"],
    ["playUninstalls", "Google Play 삭제"],
    ["playActiveDevices", "설치된 Android 기기"],
    ["playStoreVisitors", "Google Play 스토어 방문자"],
    ["appStoreImpressions", "App Store 노출"],
    ["appStorePageViews", "App Store 제품 페이지 조회"],
  ];
  const games = d.games?.error ? null : d.games?.daily;
  // 그 소스를 모으기 전이거나 아직 안 들어온 날은 0 이 아니라 빈칸(차트에서 선을 끊는 것과 같은 규칙)
  const has = (day: string, k: Exclude<keyof DailyPoint, "day">) => {
    const s = SOURCE_OF[k];
    return !!d.since[s] && !!d.freshness[s] && day >= (d.since[s] as string) && day <= (d.freshness[s] as string);
  };
  const cell = (p: DailyPoint, k: keyof DailyPoint) =>
    k === "day" ? p.day : !has(p.day, k) ? "" : k === "adEarningsMicros" ? (p.adEarningsMicros / 1e6).toFixed(4) : String(p[k]);
  const rows = d.daily.map((p, i) => [...cols.map(([k]) => cell(p, k)), games ? String(games[i] ?? 0) : ""].join(","));
  const csv = `﻿${[...cols.map(([, h]) => h), "진행된 게임(판)"].join(",")}\n${rows.join("\n")}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `지표_${d.range.start}_${d.range.end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MetricsPage() {
  const [params, setParams] = useSearch();
  // 비교 방식(#152)도 주소에 남긴다. 직접 고른 비교와 요일 맞춤은 서버가 다른 기간을 읽어야 해서 query 에 넣고,
  // 끄기는 화면만 숨기면 돼서 다시 불러오지 않는다
  const cmpMode = parseCompare(params.get("cmp"));
  const compare = cmpMode.kind !== "off";
  const cmpQuery = cmpMode.kind === "dow" || cmpMode.kind === "custom" ? compareParam(cmpMode) : null;
  const tabParam = params.get("tab");
  const tab: Tab = TABS.some((x) => x.value === tabParam) ? (tabParam as Tab) : "summary";
  const storeParam = params.get("store");
  const store: Store = STORES.some((x) => x.value === storeParam) ? (storeParam as Store) : "all";
  const from = params.get("from");
  const to = params.get("to");
  const custom: DayRange | null = from && to && YMD.test(from) && YMD.test(to) ? { from, to } : null;
  const daysParam = params.get("days");
  const days: Days = PERIODS.some((x) => x.value === daysParam) ? (daysParam as Days) : "28";
  // 서버에 물을 기간. 결과에 이 값을 같이 둬서 어느 기간 결과인지 가른다
  const query = (custom ? `from=${custom.from}&to=${custom.to}` : `days=${days}`) + (cmpQuery ? `&cmp=${cmpQuery}` : "");
  // 기간을 바꾸면 새 결과가 올 때까지 이전 화면을 흐리게 둔다(뼈대로 바꾸면 깜빡이고 스크롤이 튄다)
  const [result, setResult] = useState<{ query: string; attempt: number; data?: Dashboard; error?: string } | null>(null);
  const [shown, setShown] = useState<Dashboard | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchDashboard(query)
      .then((data) => {
        if (!alive) return;
        setResult({ query, attempt, data });
        setShown(data);
      })
      .catch((e: unknown) => alive && setResult({ query, attempt, error: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [query, attempt]);

  const current = result?.query === query && result.attempt === attempt ? result : null;
  // 달력에서 고를 수 있는 마지막 날. 오늘은 숫자가 아직 다 안 들어왔다
  const yesterday = addDays(todayIn("Asia/Seoul"), -1);
  const showing: DayRange = shown ? { from: shown.range.start, to: shown.range.end } : { from: addDays(yesterday, -27), to: yesterday };
  const loading = !current;
  // 직접 고른 비교는 "비교 기간", 나머지는 "이전 기간"
  const cmpWord = cmpMode.kind === "custom" ? "비교 기간" : "이전 기간";
  const reload = () => setAttempt((n) => n + 1);

  return (
    <ScrollPage>
      <PageHeader
        title="지표"
        description="매일 아침 모은 어제까지의 숫자예요."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {/* 직접 고른 기간이 적용 중이면 기간 버튼은 아무것도 고르지 않은 모양이 된다 */}
              <SegmentedControl
                options={PERIODS}
                value={(custom ? "" : days) as Days}
                onChange={(d) => setParams({ days: d === "28" ? null : d, from: null, to: null, ...(cmpMode.kind === "custom" && { cmp: null }) })}
              />
              <DateRangePicker
                value={custom}
                current={showing}
                min={MIN_DAY}
                max={yesterday}
                onApply={(r) => setParams({ from: r.from, to: r.to, days: null, ...(cmpMode.kind === "custom" && { cmp: null }) })}
              />
            </div>
            <CompareMenu range={showing} mode={cmpMode} min={MIN_DAY} onChange={(m) => setParams({ cmp: compareParam(m) })} />
            <Button variant="neutral" size="sm" disabled={!current?.data} onClick={() => current?.data && downloadCsv(current.data)}>
              CSV
            </Button>
          </div>
        }
      />
      {/* 회색 밑줄은 border 대신 안쪽 그림자로 그린다. 탭 밑줄을 border 에 겹치려고 -mb-px 로 1px 내리면
          그만큼 넘쳐서, 좁은 화면용 가로 스크롤(overflow-x-auto)이 세로 스크롤바까지 띄운다 */}
      <div
        role="tablist"
        aria-label="지표 묶음"
        className="mb-5 flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--sd-line)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const active = t.value === tab;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ tab: t.value === "summary" ? null : t.value, ...(t.value !== "store" && { store: null }) })}
              className={`shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-[14px] font-semibold transition-colors ${
                active ? "border-accent text-sd-fg" : "border-transparent text-sd-fg-subtle hover:text-sd-fg-muted"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {current?.error && !shown ? (
        <ErrorBlock message={current.error} onRetry={reload} />
      ) : !shown ? (
        <MetricsSkeleton />
      ) : (
        <>
          {current?.error && (
            <div className="mb-4">
              <Callout variant="danger" title="새 숫자를 못 불러왔어요">
                {current.error} 아래는 바로 전에 불러온 숫자예요.
              </Callout>
            </div>
          )}
          <p className="-mt-2 mb-4 text-[12px] text-sd-fg-subtle tabular-nums">
            지금 {rangeLabel({ from: shown.range.start, to: shown.range.end }, shown.range.end)}
            {compare && `, ${cmpWord} ${rangeLabel({ from: shown.previous.start, to: shown.previous.end }, shown.range.end)}`}
          </p>
          <CompareContext.Provider value={{ on: compare, word: cmpWord, days: ymdRange(shown.previous.start, shown.previous.end) }}>
            <div role="tabpanel" className={`transition-opacity duration-200 ${loading ? "pointer-events-none opacity-50" : ""}`} aria-busy={loading}>
              <MetricsBody
                d={shown}
                compare={compare}
                tab={tab}
                store={store}
                onStore={(v) => setParams({ store: v === "all" ? null : v })}
                yesterday={yesterday}
                onChanged={reload}
                onCompareEvent={(day) => {
                  // 행사 효과: 그날부터 7일(어제까지)을 바로 앞 같은 길이와 비교한다
                  const to = addDays(day, 6) > yesterday ? yesterday : addDays(day, 6);
                  setParams({ from: day, to, days: null, cmp: null, tab: null });
                }}
              />
            </div>
          </CompareContext.Provider>
        </>
      )}
    </ScrollPage>
  );
}

/**
 * 이전 기간과의 차이. 화살표와 색을 같이 쓴다(색만으로 뜻을 전하지 않는다).
 * 좋아진 쪽은 초록, 나빠진 쪽은 빨강 대신 회색(Polaris). good 이 "down" 이면(삭제 비율처럼) 줄어든 게 좋은 것이다.
 * 개수는 이전 기간이 20 이상일 때만 비율을 붙인다. 작은 숫자에서 3 → 6 이 "+100%"로 부풀려 보이기 때문이다.
 */
function Delta({
  now,
  before,
  size = "sm",
  good = "up",
  points = false,
}: {
  now: number;
  before: number;
  size?: "sm" | "md";
  good?: "up" | "down";
  /** 비율끼리의 차이(%p)로 적는다. now, before 는 0~1 */
  points?: boolean;
}) {
  const cmp = useCompare();
  const diff = points ? (now - before) * 100 : Math.round(now - before);
  const text = size === "md" ? "text-[14px]" : "text-[12px]";
  if (points ? Math.abs(diff) < 0.05 : diff === 0) return <span className={`${text} font-semibold text-sd-fg-subtle`}>{cmp.word}과 같아요</span>;
  const up = diff > 0;
  const better = good === "up" ? up : !up;
  const amount = points ? `${Math.abs(diff).toFixed(1)}%p` : fmt(Math.abs(diff));
  const pctPart = !points && before >= 20 ? ` (${up ? "+" : "-"}${Math.round((Math.abs(diff) / before) * 100)}%)` : "";
  return (
    <span className={`inline-flex items-center gap-0.5 ${text} font-bold tabular-nums ${better ? "text-chart-up" : "text-sd-fg-muted"}`}>
      <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${up ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19V6M6 12l6-6 6 6" />
      </svg>
      <span className="sr-only">{up ? "늘어남" : "줄어듦"}</span>
      {amount}
      {pctPart}
    </span>
  );
}

/**
 * 개수 칸. 이전 기간 중에 그 소스를 아직 모으기 전인 날이 있으면(noPrev) 이전 기간 합이 작게 나와
 * 크게 늘어난 것처럼 보인다. 그때는 증감을 숨기고 "이전 기간 숫자 없음"이라고 적는다
 */
function Step({
  label,
  now,
  before,
  sub,
  unit = "",
  noPrev = false,
  none = false,
  good = "up",
}: {
  label: string;
  now: number;
  before: number;
  sub?: string;
  /** 숫자 뒤에 붙는 단위(판 등). 없으면 숫자만 */
  unit?: string;
  noPrev?: boolean;
  /** 이 기간 전체가 그 소스를 모으기 전이면 0 이 아니라 "-" 로 보인다 */
  none?: boolean;
  /** 삭제처럼 줄어야 좋은 숫자면 "down" */
  good?: "up" | "down";
}) {
  const cmp = useCompare();
  if (none) return <Cell label={label} value="-" lines={["이 기간엔 숫자가 없어요"]} />;
  return (
    <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
      <span className="text-[13px] font-medium text-sd-fg-muted">{label}</span>
      {/* 큰 숫자는 비례 숫자로 둔다. 고정폭(tabular)은 121 처럼 듬성해 보인다 */}
      <span className="text-[24px] font-bold leading-tight text-sd-fg">
        {fmt(now)}
        {unit && <span className="ml-0.5 text-[15px] font-semibold text-sd-fg-muted">{unit}</span>}
      </span>
      {/* 비교를 껐으면 증감과 비교 줄을 숨기고 덧붙이는 설명(sub)만 남긴다 */}
      {!cmp.on ? (
        sub && <span className="text-[12px] text-sd-fg-subtle">{sub}</span>
      ) : noPrev ? (
        <span className="text-[12px] text-sd-fg-subtle">
          {cmp.word} 숫자 없음{sub ? `, ${sub}` : ""}
        </span>
      ) : (
        <>
          <Delta now={now} before={before} good={good} />
          <span className="text-[12px] text-sd-fg-subtle tabular-nums">
            {cmp.word} {fmt(before)}
            {unit}
            {sub ? `, ${sub}` : ""}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * 비율 칸. 분자와 분모를 같이 적어 무엇을 나눴는지 보인다. 분모가 적으면 참고용이라고 적고 증감을 숨긴다
 */
function RatioCell({
  label,
  now,
  before,
  of,
  good = "up",
  noPrev = false,
}: {
  label: string;
  now: Ratio;
  before?: Ratio;
  /** "99 / 459" 옆에 붙는 설명. 예: "방문 중 버튼 클릭" */
  of: string;
  good?: "up" | "down";
  noPrev?: boolean;
}) {
  const v = rate(now);
  const small = now.den < MIN_SAMPLE;
  const b = before ? rate(before) : null;
  const cmp = useCompare();
  const comparable = cmp.on && !noPrev && !small && !!before && before.den >= MIN_SAMPLE && b !== null && v !== null;
  return (
    <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
      <span className="text-[13px] font-medium text-sd-fg-muted">{label}</span>
      <span className={`text-[24px] font-bold leading-tight ${small ? "text-sd-fg-muted" : "text-sd-fg"}`}>{pct(v)}</span>
      {comparable && <Delta now={v as number} before={b as number} points good={good} />}
      <span className="text-[12px] text-sd-fg-subtle tabular-nums">
        {fmt(now.num)} / {fmt(now.den)}, {of}
      </span>
      {small && now.den > 0 && <span className="text-[12px] text-sd-fg-subtle">숫자가 적어 참고만 해요</span>}
      {comparable && (
        <span className="text-[12px] text-sd-fg-subtle tabular-nums">
          {cmp.word} {pct(b)}
        </span>
      )}
    </div>
  );
}

function Cell({ label, value, lines }: { label: string; value: string; lines: string[] }) {
  return (
    <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
      <span className="text-[13px] font-medium text-sd-fg-muted">{label}</span>
      <span className="text-[24px] font-bold leading-tight text-sd-fg">{value}</span>
      {lines.map((l) => (
        <span key={l} className="text-[12px] text-sd-fg-subtle tabular-nums">
          {l}
        </span>
      ))}
    </div>
  );
}

/** 칸 묶음. 칸 수에 맞춰 줄을 나눈다(5칸이면 넓은 화면에서 한 줄) */
function Cells({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const wide = cols === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-4";
  return <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sd-line bg-sd-hairline ${wide}`}>{children}</div>;
}

/** 탭 안의 묶음 제목. 무엇을 묻는 묶음인지 한 줄로 */
function Group({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-[16px] font-bold text-sd-fg">{title}</h2>
        {note && <p className="mt-1 text-[12px] leading-relaxed text-sd-fg-subtle">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const Note = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`text-[12px] leading-relaxed text-sd-fg-subtle ${className}`}>{children}</p>
);

/** 어제까지 숫자가 안 들어온 소스. 그 뒤 날짜는 차트에서 비어 보이니 맨 위에 알린다 */
function lagging(d: Dashboard): string[] {
  const names: [keyof Dashboard["freshness"], string][] = [
    ["instagram", "인스타그램"],
    ["ga4web", "GA4 사이트"],
    ["ga4app", "GA4 앱"],
    ["appstore", "App Store"],
    ["admob", "AdMob"],
  ];
  return names.filter(([k]) => (d.freshness[k] ?? "") < d.range.end).map(([k, name]) => `${name}(${md(d.freshness[k])}까지)`);
}

type Col = Exclude<keyof DailyPoint, "day">;

function MetricsBody({
  d,
  compare,
  tab,
  store,
  onStore,
  yesterday,
  onChanged,
  onCompareEvent,
}: {
  d: Dashboard;
  compare: boolean;
  tab: Tab;
  store: Store;
  onStore: (s: Store) => void;
  yesterday: string;
  onChanged: () => void;
  onCompareEvent: (day: string) => void;
}) {
  const cw = useCompare().word;
  const c = d.totals.current;
  const p = d.totals.previous;
  const days = d.daily.map((x) => x.day);
  // 소스에 숫자가 없는 날(수집 전, 아직 안 들어옴)은 0 이 아니라 null 로 둬 선을 끊는다
  const has = (day: string, k: Col) => {
    const s = SOURCE_OF[k];
    const from = d.since[s];
    const to = d.freshness[s];
    return !!from && !!to && day >= from && day <= to;
  };
  const col = (k: Col) => d.daily.map((x) => (has(x.day, k) ? Number(x[k]) : null));
  const prev = (k: Col) => (compare ? d.previousDaily.map((x) => (has(x.day, k) ? Number(x[k]) : null)) : undefined);
  const sumOf = (a: (number | null)[], b: (number | null)[]) => a.map((v, i) => (v === null && b[i] === null ? null : (v ?? 0) + (b[i] ?? 0)));
  const markers: Marker[] = [
    ...d.posts.map((post) => ({ day: seoulDay(post.postedAt), label: firstLine(post.caption), kind: "post" as const })),
    ...(d.events ?? []).map((e) => ({ day: e.day, label: e.label, kind: "event" as const })),
  ];
  const firstOpen = (n: WeeklyNumbers) => n.installs.firstOpenAndroid + n.installs.firstOpenIos;
  const late = lagging(d);
  // 이전 기간 첫날부터 숫자가 있어야 이전 기간 합을 믿을 수 있다
  const noPrev = (s: keyof Dashboard["since"]) => !d.since[s] || d.since[s] > d.previous.start;
  // 이 기간 전체가 소스를 모으기 전이거나 마지막으로 받은 날보다 뒤면 0 이 아니라 "-"
  const none = (s: keyof Dashboard["since"]) => !d.since[s] || d.since[s] > d.range.end || (d.freshness[s] ?? "") < d.range.start;
  // 이 기간 중간부터 모은 소스(인스타그램은 9월 8일부터)는 합이 기간 전체가 아니라고 밝힌다
  const partial = (s: keyof Dashboard["since"]) => !!d.since[s] && d.since[s] > d.range.start;
  const chart = (title: string, k: Col, unit: string, label: string) => (
    <SectionCard title={title}>
      <TrendChart days={days} series={[{ label, values: col(k) }]} previous={prev(k)} markers={markers} unit={unit} />
    </SectionCard>
  );
  // 사이트 전환율: 사이트에 들어와 다운로드 버튼으로 스토어에 간 방문의 비율.
  // - 한 방문에서 여러 번 눌러도 한 번으로 센다(storeSessions). 클릭 수로 나누면 100% 를 넘을 수 있다
  // - /download(QR, 링크트리 다운로드 링크)로 들어온 방문은 들어오는 순간 넘어가 "전환"이 정해져 있다.
  //   분자와 분모에서 모두 뺀다(linkSessions). 안 빼면 4주 기준 5% 남짓이 20% 가까이로 부풀었다
  const siteConv = (n: WeeklyNumbers): Ratio => ({
    num: Math.max(0, n.web.storeSessions - n.web.linkSessions),
    den: Math.max(0, n.web.sessions - n.web.linkSessions),
  });
  const igConv = (n: WeeklyNumbers): Ratio => ({
    num: Math.max(0, n.web.storeSessionsFromInstagram - n.web.linkSessionsFromInstagram),
    den: Math.max(0, n.web.fromInstagram - n.web.linkSessionsFromInstagram),
  });
  const linkSplit = (n: WeeklyNumbers) => `다운로드 링크 ${fmt(n.web.downloadLinkClicks)}, 사이트 버튼 ${fmt(Math.max(0, n.web.downloadClicks - n.web.downloadLinkClicks))}`;
  const removeRate = (n: WeeklyNumbers): Ratio => ({ num: n.app.androidRemoves, den: n.installs.firstOpenAndroid });
  // Google Play 는 3~7일 늦게 들어와 들어온 날까지 잘라 비교 기간도 같은 날 수로 셌다(data.ts play)
  const pl = d.play;
  const playCut = !!pl.window?.cut;
  const playDays = pl.window ? ymdRange(pl.window.current.start, pl.window.current.end).length : 0;
  const playNoPrev = !pl.window || !d.since.play || d.since.play > pl.window.previous.start;
  const playNote = playCut && pl.until ? `${md(pl.until)}까지${compare ? `, ${cw}도 같은 ${playDays}일` : ""}` : undefined;
  // 스토어 등록정보는 설치보다 늦게 채워져 들어온 날도 따로 적는다
  const storeDays = pl.storeWindow ? ymdRange(pl.storeWindow.current.start, pl.storeWindow.current.end).length : 0;
  const storeNote = pl.storeWindow?.cut && pl.storeUntil ? `${md(pl.storeUntil)}까지${compare ? `, ${cw}도 같은 ${storeDays}일` : ""}` : undefined;
  const storeNoPrev = !pl.storeWindow || !d.since.playStore || d.since.playStore > pl.storeWindow.previous.start;
  // 두 스토어 최초 설치. App Store 는 기간 전체, Play 는 들어온 날까지(비교도 같은 규칙)
  const storeNew = { now: c.installs.appStoreNew + pl.current.installs, before: p.installs.appStoreNew + pl.previous.installs };
  const storeSplit = `App Store ${fmt(c.installs.appStoreNew)}, Google Play ${pl.window ? `${fmt(pl.current.installs)}${playCut && pl.until ? `(${md(pl.until)}까지)` : ""}` : "아직 없음"}`;
  // App Store 노출 대비 최초 다운로드: 분석 리포트가 있는 날의 다운로드만(territoryTable 과 같은 날)
  const pageDownloads = d.appStoreTerritories.reduce((a, t) => a + t.downloads, 0);
  const games = d.games;
  const gamesOk = !!games && !games.error;
  const rangeText = rangeLabel({ from: d.range.start, to: d.range.end }, d.range.end);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {late.length > 0 && (
        <Callout variant="warning" title="아직 덜 들어온 숫자가 있어요">
          {late.join(", ")}. 그 뒤 날짜는 차트에서 비어 보여요. 매일 아침 수집이 다시 돌면 채워져요.
        </Callout>
      )}

      {tab === "summary" && (
        <>
          {/* 맨 위 숫자 하나. 이 화면이 먼저 답하는 질문이다 */}
          <FadeIn>
            <div className={`${SURFACE} grid grid-cols-1 gap-5 p-5 md:grid-cols-[minmax(0,260px)_1fr] md:items-center`}>
              <div>
                <p className="text-[13px] font-medium text-sd-fg-muted">앱 첫 실행, {rangeText}</p>
                <p className="mt-2 text-[48px] font-bold leading-none tracking-tight text-sd-fg">
                  {fmt(firstOpen(c))}
                  <span className="ml-1 text-[20px] font-semibold text-sd-fg-muted">회</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {!compare ? null : noPrev("ga4app") ? (
                    <span className="text-[13px] text-sd-fg-subtle">{cw} 숫자 없음</span>
                  ) : (
                    <>
                      <Delta now={firstOpen(c)} before={firstOpen(p)} size="md" />
                      <span className="text-[13px] text-sd-fg-subtle tabular-nums">
                        {cw} {fmt(firstOpen(p))}회
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-3 text-[13px] text-sd-fg-muted tabular-nums">
                  Android {fmt(c.installs.firstOpenAndroid)}, iOS {fmt(c.installs.firstOpenIos)}
                </p>
                <TestDeviceNote n={c.installs.firstOpenTest} />
              </div>
              <TrendChart
                days={days}
                series={[
                  { label: "Android", values: col("firstOpenAndroid") },
                  { label: "iOS", values: col("firstOpenIos") },
                ]}
                markers={markers}
                unit="회"
              />
            </div>
          </FadeIn>

          <FadeIn delay={0.04}>
            <Group
              title="모든 경로를 합친 흐름"
              note={`인스타그램, 검색, 행사 QR, 직접 입력까지 더한 숫자예요. 우리 팀이 개발하며 들어온 방문은 뺐어요. 스토어로 이동은 사이트 다운로드 버튼과 QR, 링크트리의 다운로드 링크를 더한 횟수예요. 스토어 최초 설치는 두 스토어에서 처음 받은 사람을 더한 수예요. Google Play 는 3~7일 늦게 들어와서 들어온 날까지만 더했어요. 단계마다 세는 대상이 달라 비율로 잇지 않았어요.`}
            >
              <Cells cols={5}>
                <Step label="사이트 방문" now={c.web.sessions} before={p.web.sessions} noPrev={noPrev("ga4web")} none={none("ga4web")} />
                <Step label="스토어로 이동" now={c.web.downloadClicks} before={p.web.downloadClicks} noPrev={noPrev("ga4web")} none={none("ga4web")} />
                <Step label="스토어 최초 설치" now={storeNew.now} before={storeNew.before} sub={storeSplit} noPrev={noPrev("appstore") || playNoPrev} none={none("appstore")} />
                <Step label="앱 첫 실행" now={firstOpen(c)} before={firstOpen(p)} noPrev={noPrev("ga4app")} none={none("ga4app")} />
                {gamesOk ? (
                  <Step label="진행된 게임" now={games.current.games} before={games.previous.games} unit="판" />
                ) : (
                  <Step label="게임 참가(사람 기준)" now={c.game.playerStarts} before={p.game.playerStarts} noPrev={noPrev("ga4app")} none={none("ga4app")} />
                )}
              </Cells>
            </Group>
          </FadeIn>

          <FadeIn delay={0.08}>
            <FunnelCard current={d.funnel.current} previous={d.funnel.previous} rangeEnd={d.range.end} />
          </FadeIn>

          <FadeIn delay={0.1}>
            <Group title="핵심 비율" note="개수보다 효율을 봐요. 비율 아래 숫자는 나눈 두 값이에요.">
              <Cells>
                <RatioCell label="사이트 전환율" now={siteConv(c)} before={siteConv(p)} of="사이트 방문 중 버튼으로 스토어에 간 방문" noPrev={noPrev("ga4web")} />
                <RatioCell label="활성화율" now={c.cohort.activation} before={p.cohort.activation} of="첫 실행 후 7일 안에 게임 플레이" />
                <RatioCell label="다음 날 다시 온 비율" now={c.cohort.d1} before={p.cohort.d1} of="처음 온 다음 날 다시 실행" />
                <RatioCell label="Android 삭제 비율" now={removeRate(c)} before={removeRate(p)} of="Android 첫 실행 대비 삭제" good="down" noPrev={noPrev("ga4app")} />
              </Cells>
              <Note>
                사이트 전환율은 QR 이나 링크트리 다운로드 링크로 들어와 바로 스토어로 넘어간 방문을 빼고 셌어요. 활성화율과 다시 온 비율은 이 기간에
                처음 들어온 사람만 따로 묶어 셌고, 7일이나 하루가 아직 안 지난 날과 구글 플레이 자동 테스트 기기는 빼요. 활성화율은 위 퍼널의 첫 실행 대비 게임 플레이예요.
              </Note>
            </Group>
          </FadeIn>

          <FadeIn delay={0.12}>
            <Group
              title="인스타그램에서 온 것"
              note={`${partial("instagram") ? `인스타그램 계정 숫자는 ${md(d.since.instagram)}부터 있어요. ` : ""}사이트 방문은 프로필 링크, 링크트리, 인스타 앱 안 브라우저로 들어온 것만 셌어요. 그 뒤 설치는 아직 경로별로 못 나눠요. Android 는 다운로드 링크 꼬리표가 배포되면(#144), iOS 는 App Store 캠페인 리포트가 들어오면 보여요.`}
            >
              <Cells cols={5}>
                <Step label="조회수" now={c.instagram.views} before={p.instagram.views} noPrev={noPrev("instagram")} none={none("instagram")} />
                <Step label="프로필 방문" now={c.instagram.profileViews} before={p.instagram.profileViews} noPrev={noPrev("instagram")} none={none("instagram")} />
                <Step label="프로필 링크 클릭" now={c.instagram.linkClicks} before={p.instagram.linkClicks} noPrev={noPrev("instagram")} none={none("instagram")} />
                <Step label="인스타에서 온 사이트 방문" now={c.web.fromInstagram} before={p.web.fromInstagram} noPrev={noPrev("ga4web")} none={none("ga4web")} />
                <Step label="그중 스토어로 이동" now={c.web.downloadClicksFromInstagram} before={p.web.downloadClicksFromInstagram} noPrev={noPrev("ga4web")} none={none("ga4web")} />
              </Cells>
            </Group>
          </FadeIn>

          <FadeIn delay={0.16}>
            <EventsCalendar initialMonth={d.range.end} today={addDays(yesterday, 1)} onChanged={onChanged} onCompare={onCompareEvent} />
          </FadeIn>
        </>
      )}

      {tab === "instagram" && (
        <>
          <Group title="계정" note={partial("instagram") ? `인스타그램 계정 숫자는 ${md(d.since.instagram)}부터 있어요. 그 앞은 차트에서 비어 있어요.` : undefined}>
            <Cells>
              <Step label="조회수" now={c.instagram.views} before={p.instagram.views} noPrev={noPrev("instagram")} none={none("instagram")} />
              <Step label="프로필 방문" now={c.instagram.profileViews} before={p.instagram.profileViews} noPrev={noPrev("instagram")} none={none("instagram")} />
              <Step label="프로필 링크 클릭" now={c.instagram.linkClicks} before={p.instagram.linkClicks} noPrev={noPrev("instagram")} none={none("instagram")} />
              <FollowerCell d={d} />
            </Cells>
            <Cells cols={3}>
              <RatioCell
                label="프로필 방문률"
                now={{ num: c.instagram.profileViews, den: c.instagram.views }}
                before={{ num: p.instagram.profileViews, den: p.instagram.views }}
                of="조회수 중 프로필 방문"
                noPrev={noPrev("instagram")}
              />
              <RatioCell
                label="링크 클릭률"
                now={{ num: c.instagram.linkClicks, den: c.instagram.profileViews }}
                before={{ num: p.instagram.linkClicks, den: p.instagram.profileViews }}
                of="프로필 방문 중 링크 클릭"
                noPrev={noPrev("instagram")}
              />
              <Step label="새 게시물" now={c.instagram.posts} before={p.instagram.posts} />
            </Cells>
          </Group>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FadeIn delay={0.04}>{chart("조회수", "igViews", "회", "조회수")}</FadeIn>
            <FadeIn delay={0.08}>{chart("프로필 방문", "igProfileViews", "회", "프로필 방문")}</FadeIn>
            <FadeIn delay={0.12}>{chart("프로필 링크 클릭", "igLinkClicks", "회", "링크 클릭")}</FadeIn>
            <FadeIn delay={0.16}>{chart("인스타에서 온 사이트 방문", "webFromInstagram", "회", "사이트 방문")}</FadeIn>
          </div>
          <FadeIn>
            <PostsTable posts={d.posts} />
          </FadeIn>
        </>
      )}

      {tab === "traffic" && (
        <>
          <Group title="사이트" note={`사이트 방문은 GA4 의 세션이에요. 한 사람이 두 번 들어오면 두 번 세요. QR 이나 링크트리 다운로드 링크로 들어와 바로 스토어로 넘어간 방문도 들어가요. 우리 팀이 개발하며 들어온 방문 ${fmt(c.web.internalSessions)}회는 뺐어요.`}>
            <Cells>
              <Step label="사이트 방문" now={c.web.sessions} before={p.web.sessions} noPrev={noPrev("ga4web")} none={none("ga4web")} />
              <Step label="스토어로 이동" now={c.web.downloadClicks} before={p.web.downloadClicks} sub={linkSplit(c)} noPrev={noPrev("ga4web")} none={none("ga4web")} />
              <RatioCell label="사이트 전환율" now={siteConv(c)} before={siteConv(p)} of="사이트 방문 중 버튼으로 스토어에 간 방문" noPrev={noPrev("ga4web")} />
              <RatioCell
                label="인스타 방문의 전환율"
                now={igConv(c)}
                before={igConv(p)}
                of="인스타에서 온 사이트 방문 중 버튼으로 간 방문"
                noPrev={noPrev("ga4web")}
              />
            </Cells>
          </Group>
          <FadeIn>
            <ChannelTable d={d} />
          </FadeIn>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FadeIn delay={0.04}>{chart("사이트 방문", "webSessions", "회", "사이트 방문")}</FadeIn>
            <FadeIn delay={0.08}>{chart("스토어로 이동", "downloadClicks", "회", "스토어로 이동")}</FadeIn>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FadeIn>
              <SectionCard title="소스별 사이트 방문" flush>
                <CampaignTable
                  rows={d.webCampaigns.slice(0, 10).map((r) => ({ a: r.source, b: r.medium, c: [r.campaign, r.content].filter((x) => x && x !== "(not set)").join(" / "), n: r.sessions }))}
                  heads={["소스", "매체", "캠페인 / 버튼", "방문"]}
                />
              </SectionCard>
            </FadeIn>
            <FadeIn delay={0.04}>
              <SectionCard title="앱 신규 사용자 경로" flush>
                <CampaignTable
                  rows={d.appCampaigns.slice(0, 10).map((r) => ({ a: r.source, b: r.medium, c: [r.campaign, r.platform].filter((x) => x && x !== "(not set)").join(" / "), n: r.sessions }))}
                  heads={["소스", "매체", "캠페인 / 플랫폼", "신규 사용자"]}
                />
              </SectionCard>
            </FadeIn>
          </div>
          <Note className="-mt-3">
            소스 ig 는 인스타그램이 프로필 링크에 스스로 붙이는 꼬리표예요. (direct)는 주소를 직접 치거나 행사 QR 을 찍어 들어온 방문이에요.
            링크에 UTM 꼬리표를 붙이면 캠페인별로 갈려요. 행사 QR 은 행사 이름을 영어로 붙여요. 앱 경로는 Play 로 설치한 Android 만 갈려요.
          </Note>
        </>
      )}

      {tab === "store" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl options={[...STORES]} value={store} onChange={(v) => onStore(v as Store)} />
            {pl.until && (
              <span className="text-[12px] text-sd-fg-subtle tabular-nums">
                Google Play 는 설치 {md(pl.until)}, 스토어 방문 {md(pl.storeUntil)}까지 들어왔어요
              </span>
            )}
          </div>

          {store === "all" && (
            <>
              <Group title="최초 설치" note="두 스토어에서 처음 받은 사람이에요. 다시 설치와 업데이트는 빠져요.">
                <Cells>
                  <Step label="스토어 최초 설치" now={storeNew.now} before={storeNew.before} sub={storeSplit} noPrev={noPrev("appstore") || playNoPrev} none={none("appstore")} />
                  <Step label="App Store 최초 다운로드" now={c.installs.appStoreNew} before={p.installs.appStoreNew} noPrev={noPrev("appstore")} none={none("appstore")} />
                  {pl.window ? (
                    <Step label="Google Play 최초 설치" now={pl.current.installs} before={pl.previous.installs} sub={playNote} noPrev={playNoPrev} />
                  ) : (
                    <Cell label="Google Play 최초 설치" value="-" lines={["3~7일 늦게 들어와 아직 없어요"]} />
                  )}
                  <CountryCell d={d} />
                </Cells>
              </Group>
              <FadeIn>
                <SectionCard title="스토어 최초 설치">
                  <TrendChart
                    days={days}
                    series={[
                      { label: "App Store", values: col("appStoreNew") },
                      { label: "Google Play", values: col("playInstalls") },
                    ]}
                    markers={markers}
                    unit="건"
                  />
                </SectionCard>
              </FadeIn>
              <Group
                title="스토어 화면에서 설치까지"
                note="두 스토어는 세는 대상이 달라서 숫자를 더하지 않고 나란히 둬요. App Store 노출은 이미 깐 사람도 세고, Google Play 방문자는 앱이 없는 사람만 세요."
              >
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <StoreSteps
                    title="App Store"
                    since={partial("appstorePage") ? `노출과 조회는 ${md(d.since.appstorePage)}부터 있어요` : undefined}
                    steps={[
                      { label: "노출된 기기", value: c.appStorePage.impressionsUnique },
                      { label: "제품 페이지를 연 기기", value: c.appStorePage.pageViewsUnique, of: "노출된 기기 중" },
                      { label: "최초 다운로드", value: pageDownloads, of: "노출된 기기 대비", base: 0 },
                    ]}
                    none={none("appstorePage")}
                  />
                  <StoreSteps
                    title="Google Play"
                    since={pl.storeWindow?.cut && pl.storeUntil ? `${md(pl.storeUntil)}까지 들어왔어요` : undefined}
                    steps={[
                      { label: "스토어 방문자", value: pl.current.storeVisitors },
                      { label: "그중 설치(획득)", value: pl.current.storeAcquisitions, of: "방문자 중" },
                    ]}
                    none={!pl.storeWindow}
                  />
                </div>
              </Group>
            </>
          )}

          {store === "appstore" && (
            <>
              <Group
                title="App Store 화면에서 설치까지"
                note={`App Store Connect 의 앱 분석과 같은 순서예요.${partial("appstorePage") ? ` 노출과 조회는 ${md(d.since.appstorePage)}부터 있어요.` : ""}`}
              >
                <Cells cols={5}>
                  <Step label="노출" now={c.appStorePage.impressions} before={p.appStorePage.impressions} noPrev={noPrev("appstorePage")} none={none("appstorePage")} />
                  <Step label="제품 페이지 조회" now={c.appStorePage.pageViews} before={p.appStorePage.pageViews} noPrev={noPrev("appstorePage")} none={none("appstorePage")} />
                  <RatioCell
                    label="제품 페이지 조회율"
                    now={{ num: c.appStorePage.pageViewsUnique, den: c.appStorePage.impressionsUnique }}
                    before={{ num: p.appStorePage.pageViewsUnique, den: p.appStorePage.impressionsUnique }}
                    of="노출된 기기 중 연 기기"
                    noPrev={noPrev("appstorePage")}
                  />
                  <Step label="최초 다운로드" now={c.installs.appStoreNew} before={p.installs.appStoreNew} noPrev={noPrev("appstore")} none={none("appstore")} />
                  <RatioCell label="전환율" now={{ num: pageDownloads, den: c.appStorePage.impressionsUnique }} of="노출된 기기 대비 최초 다운로드" noPrev />
                </Cells>
                <Note>
                  노출은 검색 결과나 추천 화면에 앱이 1초 넘게 보인 횟수, 제품 페이지 조회는 앱 상세 화면을 연 횟수예요. 비율은 날마다 센 기기 수로 나눠서 App Store Connect
                  숫자와 조금 달라요. 전환율은 노출 기록이 있는 날의 다운로드만 셌어요. 애플은 5명이 안 되는 칸을 빼요.
                </Note>
              </Group>
              <FadeIn>
                <TerritoryTable d={d} />
              </FadeIn>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <FadeIn delay={0.04}>{chart("노출", "appStoreImpressions", "회", "노출")}</FadeIn>
                <FadeIn delay={0.08}>{chart("최초 다운로드", "appStoreNew", "건", "최초 다운로드")}</FadeIn>
              </div>
            </>
          )}

          {store === "play" &&
            (!pl.window ? (
              <EmptyBlock title="이 기간 Google Play 숫자는 아직 없어요" />
            ) : (
              <>
                <Group title="Google Play 화면에서 설치까지" note="Play Console 의 스토어 등록정보 실적과 같은 순서예요. 구글이 며칠 늦게 채워서 파일마다 들어온 날까지만 세고, 비교 기간도 같은 날 수로 잘랐어요.">
                  <Cells cols={5}>
                    <Step label="스토어 방문자" now={pl.current.storeVisitors} before={pl.previous.storeVisitors} sub={storeNote} noPrev={storeNoPrev} />
                    <Step label="스토어 획득" now={pl.current.storeAcquisitions} before={pl.previous.storeAcquisitions} sub={storeNote} noPrev={storeNoPrev} />
                    <RatioCell
                      label="전환율"
                      now={{ num: pl.current.storeAcquisitions, den: pl.current.storeVisitors }}
                      before={{ num: pl.previous.storeAcquisitions, den: pl.previous.storeVisitors }}
                      of="방문자 중 설치"
                      noPrev={storeNoPrev}
                    />
                    <Step label="최초 설치" now={pl.current.installs} before={pl.previous.installs} sub={playNote} noPrev={playNoPrev} />
                    <CountryCell d={d} source="play" />
                  </Cells>
                  <Note>
                    방문자는 앱이 없는 사람 중 스토어 화면을 본 사람, 획득은 그중 설치한 사람이에요. 최초 설치는 검색 결과에서 바로 받은 사람처럼 스토어 화면을 거치지 않은 설치까지
                    더해서 획득보다 많아요. 방문자가 적은 나라는 구글이 기타로 묶어서, 나라별은 설치 기준이에요.
                  </Note>
                </Group>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <FadeIn delay={0.04}>{chart("스토어 방문자", "playStoreVisitors", "명", "방문자")}</FadeIn>
                  <FadeIn delay={0.08}>{chart("최초 설치", "playInstalls", "건", "최초 설치")}</FadeIn>
                </div>

                <Group title="남아 있는 설치" note="행사 때 깐 사람이 아직 폰에 두고 있는지 봐요. 다음 판 알림이 닿을 수 있는 폰이에요.">
                  <Cells cols={2}>
                    <ActiveDevicesCell start={pl.current.activeDevicesStart} end={pl.current.activeDevicesEnd} startDay={addDays(d.range.start, -1)} endDay={pl.window.current.end} />
                    <Step label="삭제" now={pl.current.uninstalls} before={pl.previous.uninstalls} sub={playNote} noPrev={playNoPrev} good="down" />
                  </Cells>
                  <Note>설치된 기기는 앱이 깔려 있고 최근 30일 안에 켜진 Android 기기예요. 삭제에는 이 기간 전에 깐 사람이 지운 것도 들어가요.</Note>
                </Group>
                <FadeIn>
                  <SectionCard title="설치된 Android 기기">
                    <TrendChart days={days} series={[{ label: "설치된 기기", values: col("playActiveDevices") }]} previous={prev("playActiveDevices")} markers={markers} unit="대" />
                  </SectionCard>
                </FadeIn>

                <Group title="안정성과 평점" note="새 버전을 낸 날이나 행사 날에 늘었는지 봐요.">
                  <Cells cols={3}>
                    <Step label="비정상 종료" now={pl.current.crashes} before={pl.previous.crashes} unit="회" good="down" />
                    <Step label="응답 없음(ANR)" now={pl.current.anrs} before={pl.previous.anrs} unit="회" good="down" />
                    <Cell label="평점" value={pl.current.ratingTotal === null ? "-" : pl.current.ratingTotal.toFixed(1)} lines={["지금까지 받은 별점 평균"]} />
                  </Cells>
                  <Note>
                    {pl.crashVersions.length > 0 ? `${pl.crashVersions.slice(0, 3).map((v) => `빌드 ${v.code}에서 ${fmt(v.crashes)}회`).join(", ")} 났어요. ` : ""}
                    진단 정보 보내기를 켠 기기만 세서 실제보다 적어요.
                  </Note>
                </Group>
              </>
            ))}
        </>
      )}

      {tab === "app" && (
        <>
          <Group title="첫 실행">
            <Cells cols={2}>
              <Step
                label="앱 첫 실행"
                now={firstOpen(c)}
                before={firstOpen(p)}
                sub={`Android ${fmt(c.installs.firstOpenAndroid)}, iOS ${fmt(c.installs.firstOpenIos)}`}
                noPrev={noPrev("ga4app")}
              />
              <Step label="스토어 최초 설치" now={storeNew.now} before={storeNew.before} sub={storeSplit} noPrev={noPrev("appstore") || playNoPrev} none={none("appstore")} />
            </Cells>
            <Note>
              앱 첫 실행은 다시 깔아도 또 세서 횟수로 적었어요. 구글 플레이 자동 테스트 기기로 보이는 {fmt(c.installs.firstOpenTest)}회는 뺐어요.
              스토어별 숫자와 스토어 화면에서 설치까지는 스토어 탭에 있어요.
            </Note>
          </Group>

          <Group
            title="사용"
            note="진행된 게임은 백엔드 게임 기록으로 센 실제 판 수예요. 게임 참가는 앱이 참가자 폰마다 남기는 기록이라 5명이 한 판 하면 5회예요."
          >
            <Cells>
              <Cell
                label="하루 활성 사용자"
                value={c.app.dauAvg === null ? "-" : `${c.app.dauAvg.toFixed(1)}명`}
                lines={[!compare || noPrev("ga4app") || p.app.dauAvg === null ? "기간 평균" : `기간 평균, ${cw} ${p.app.dauAvg.toFixed(1)}명`]}
              />
              {gamesOk ? (
                <Step label="진행된 게임" now={games.current.games} before={games.previous.games} unit="판" />
              ) : (
                <Cell label="진행된 게임" value="-" lines={[games?.error ?? "백엔드 주소가 없어 못 읽었어요"]} />
              )}
              <Cell
                label="판당 평균 인원"
                value={gamesOk && games.current.games > 0 ? `${(games.current.players / games.current.games).toFixed(1)}명` : "-"}
                lines={[compare && gamesOk && games.previous.games > 0 ? `${cw} ${(games.previous.players / games.previous.games).toFixed(1)}명` : "백엔드 게임 기록 기준"]}
              />
              <Step label="게임 참가(사람 기준)" now={c.game.playerStarts} before={p.game.playerStarts} noPrev={noPrev("ga4app")} none={none("ga4app")} />
            </Cells>
          </Group>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FadeIn delay={0.04}>{chart("하루 활성 사용자", "dau", "명", "활성 사용자")}</FadeIn>
            <FadeIn delay={0.08}>
              <SectionCard title="진행된 게임">
                {gamesOk ? (
                  <TrendChart days={days} series={[{ label: "게임", values: games.daily }]} previous={compare ? games.previousDaily : undefined} markers={markers} unit="판" />
                ) : (
                  <EmptyBlock title="게임 기록을 못 읽었어요" />
                )}
              </SectionCard>
            </FadeIn>
            <FadeIn delay={0.12}>
              <SectionCard title="앱 첫 실행 (두 플랫폼 합)">
                <TrendChart
                  days={days}
                  series={[{ label: "첫 실행", values: sumOf(col("firstOpenAndroid"), col("firstOpenIos")) }]}
                  previous={compare ? sumOf(prev("firstOpenAndroid") ?? [], prev("firstOpenIos") ?? []) : undefined}
                  markers={markers}
                  unit="회"
                />
              </SectionCard>
            </FadeIn>
            <FadeIn delay={0.16}>{chart("게임 참가 (사람 기준)", "playerStarts", "회", "게임 참가")}</FadeIn>
          </div>

          <Group
            title="남는 사람"
            note="활성화율과 다시 온 비율은 이 기간에 처음 들어온 사람만 묶어 셌어요(GA4 코호트). 7일이나 하루가 아직 안 지난 날과 구글 플레이 자동 테스트 기기는 빼요. 삭제와 알림 닫기는 Android 만 기록돼서 Android 로만 셌어요. 푸시 열람률은 알림을 건드리지 않고 둔 경우는 몰라서, 열거나 닫은 것 중 연 비율이에요."
          >
            <Cells cols={5}>
              <RatioCell label="활성화율" now={c.cohort.activation} before={p.cohort.activation} of="첫 실행 후 7일 안에 게임 플레이" />
              <RatioCell label="다음 날 다시 온 비율" now={c.cohort.d1} before={p.cohort.d1} of="처음 온 다음 날 다시 실행" />
              <RatioCell label="7일 뒤 다시 온 비율" now={c.cohort.d7} before={p.cohort.d7} of="처음 온 7일 뒤 다시 실행" />
              <RatioCell label="Android 삭제 비율" now={removeRate(c)} before={removeRate(p)} of="Android 첫 실행 대비 삭제" good="down" noPrev={noPrev("ga4app")} />
              <RatioCell
                label="푸시 열람률"
                now={{ num: c.app.androidPushOpens, den: c.app.androidPushOpens + c.app.androidPushDismisses }}
                before={{ num: p.app.androidPushOpens, den: p.app.androidPushOpens + p.app.androidPushDismisses }}
                of="열거나 닫은 알림 중 연 것"
                noPrev={noPrev("ga4app")}
              />
            </Cells>
            <Note>삭제 비율은 같은 기간의 삭제를 첫 실행으로 나눈 값이라, 이전에 깐 사람이 지운 것도 들어가요.</Note>
          </Group>

          <Group title="광고" note="게재율은 AdMob 표기예요. AdMob 수익은 추정치라 나중에 조금 바뀔 수 있어요.">
            <Cells cols={3}>
              <Step label="광고 노출" now={c.ads.impressions} before={p.ads.impressions} noPrev={noPrev("admob")} none={none("admob")} />
              <RatioCell
                label="게재율"
                now={{ num: c.ads.impressions, den: c.ads.matchedRequests }}
                before={{ num: p.ads.impressions, den: p.ads.matchedRequests }}
                of="받은 광고 중 화면에 뜬 것"
                noPrev={noPrev("admob")}
              />
              <Cell
                label="게임 1회당 광고 노출"
                value={c.game.playerFinishes > 0 ? `${(c.ads.impressions / c.game.playerFinishes).toFixed(1)}회` : "-"}
                lines={[`게임을 끝낸 ${fmt(c.game.playerFinishes)}회 기준(사람 기준)`]}
              />
              <Cell label="예상 광고 수익" value={usd(c.ads.earningsMicros)} lines={!compare ? [] : [noPrev("admob") ? `${cw} 숫자 없음` : `${cw} ${usd(p.ads.earningsMicros)}`]} />
              <Cell
                label="eCPM"
                value={c.ads.impressions > 0 ? `$${((c.ads.earningsMicros / 1e6 / c.ads.impressions) * 1000).toFixed(2)}` : "-"}
                lines={["광고 1,000회 노출당 수익"]}
              />
              <Cell
                label="ARPDAU"
                value={c.app.dauSum > 0 ? `$${(c.ads.earningsMicros / 1e6 / c.app.dauSum).toFixed(4)}` : "-"}
                lines={["활성 사용자 한 명이 하루에 번 광고 수익"]}
              />
            </Cells>
          </Group>
          <FadeIn>{chart("광고 노출", "adImpressions", "회", "광고 노출")}</FadeIn>
        </>
      )}

      <Callout variant="neutral" title="숫자의 기준">
        마지막으로 들어온 날은 인스타그램 {md(d.freshness.instagram)}, GA4 사이트 {md(d.freshness.ga4web)}, GA4 앱 {md(d.freshness.ga4app)}, App Store {md(d.freshness.appstore)}, AdMob{" "}
        {md(d.freshness.admob)}, Google Play {md(d.freshness.play)}이에요. Google Play 는 구글이 3~7일 늦게 채워서 늘 며칠 앞까지만 있어요. 인스타그램과 Google Play 는
        미국 서부 날짜를 하루 뒤로 옮겨 한국 날짜에 맞췄어요. 차트 위쪽 동그라미는 인스타 게시물, 마름모는 일정이고{compare ? `, 회색 선은 ${cw}이에요` : "요"}. 차트를
        누르거나 마우스를 올리면 그날 숫자가 보여요.
      </Callout>
    </div>
  );
}

/** 앱 첫 실행에서 뺀 테스트 기기 횟수. 어떻게 가렸는지는 툴팁으로 (#157) */
function TestDeviceNote({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <Tooltip
      content={TEST_DEVICE_RULE}
      className="mt-1 text-left text-[12px] text-sd-fg-subtle underline decoration-sd-line decoration-dotted underline-offset-4 tabular-nums"
    >
      테스트 기기로 보이는 {fmt(n)}회는 뺐어요
    </Tooltip>
  );
}

function FollowerCell({ d }: { d: Dashboard }) {
  const f = d.followers;
  if (!f) return <Cell label="팔로워" value="-" lines={["아직 기록이 없어요. 매일 아침 수집 때부터 쌓여요"]} />;
  return (
    <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
      <span className="text-[13px] font-medium text-sd-fg-muted">팔로워</span>
      <span className="text-[24px] font-bold leading-tight text-sd-fg">{fmt(f.now)}</span>
      {f.change !== null && f.changeFrom ? (
        <>
          {f.change === 0 ? <span className="text-[12px] font-semibold text-sd-fg-subtle">변화 없음</span> : <Delta now={f.change} before={0} />}
          <span className="text-[12px] text-sd-fg-subtle">{md(f.changeFrom)} 아침 기록보다</span>
        </>
      ) : (
        <span className="text-[12px] text-sd-fg-subtle">{md(f.nowDay)}부터 기록하고 있어요</span>
      )}
    </div>
  );
}

/** 나라별 최초 설치. 두 스토어 합이면 어느 스토어 몫인지는 툴팁으로 */
function CountryCell({ d, source = "all" }: { d: Dashboard; source?: "all" | "play" }) {
  const n = (x: Dashboard["countries"][number]) => (source === "play" ? x.play : x.appStore + x.play);
  const list = d.countries.filter((x) => n(x) > 0).sort((a, b) => n(b) - n(a));
  const total = list.reduce((a, x) => a + n(x), 0);
  return (
    <div className="flex flex-col gap-1.5 bg-sd-surface px-4 py-4">
      <span className="text-[13px] font-medium text-sd-fg-muted">나라별 최초 설치</span>
      {list.length === 0 ? (
        <span className="text-[13px] text-sd-fg-subtle">이 기간 설치가 없어요</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.slice(0, 5).map((x) => {
            const share = (
              <>
                {fmt(n(x))} <span className="text-sd-fg-subtle">({Math.round((n(x) / total) * 100)}%)</span>
              </>
            );
            return (
              <li key={x.country} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate text-sd-fg">{x.country ? countryName(x.country) : "나라 미상"}</span>
                {source === "play" ? (
                  <span className="shrink-0 tabular-nums text-sd-fg-muted">{share}</span>
                ) : (
                  <Tooltip content={`App Store ${fmt(x.appStore)}, Google Play ${fmt(x.play)}`} className="shrink-0 tabular-nums text-sd-fg-muted">
                    {share}
                  </Tooltip>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * 한 스토어의 단계(스토어 화면 → 설치)를 위에서 아래로. 전체 보기에서 두 스토어를 나란히 둔다.
 * of 가 있으면 앞 단계(base 를 주면 그 단계) 대비 비율을 붙인다. 분모가 적으면 비율 대신 "숫자 적음"
 */
function StoreSteps({
  title,
  steps,
  since,
  none,
}: {
  title: string;
  steps: { label: string; value: number; of?: string; base?: number }[];
  since?: string;
  none?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-sd-line bg-sd-surface">
      <div className="flex items-baseline justify-between gap-2 border-b border-sd-hairline px-4 py-3">
        <span className="text-[14px] font-bold text-sd-fg">{title}</span>
        {since && <span className="text-[12px] text-sd-fg-subtle">{since}</span>}
      </div>
      {none ? (
        <p className="px-4 py-6 text-[13px] text-sd-fg-subtle">이 기간엔 숫자가 없어요</p>
      ) : (
        <ol className="flex flex-col">
          {steps.map((st, i) => {
            const base = st.of ? steps[st.base ?? i - 1]?.value ?? 0 : 0;
            return (
              <li key={st.label} className="flex items-baseline justify-between gap-3 border-b border-sd-hairline px-4 py-3 last:border-b-0">
                <span className="text-[13px] text-sd-fg-muted">{st.label}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  {st.of &&
                    (base >= MIN_SAMPLE ? (
                      <span className="text-[12px] text-sd-fg-subtle">
                        {st.of} {pct(st.value / base)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-sd-fg-subtle">숫자 적음</span>
                    ))}
                  <span className="text-[18px] font-bold text-sd-fg">{fmt(st.value)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** 설치된 Android 기기(누적값). 기간 첫날 전날과 마지막 날을 견준다 */
function ActiveDevicesCell({ start, end, startDay, endDay }: { start: number | null; end: number | null; startDay: string; endDay: string }) {
  if (end === null) return <Cell label="설치된 Android 기기" value="-" lines={["아직 기록이 없어요"]} />;
  const change = start === null ? null : end - start;
  return (
    <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
      <span className="text-[13px] font-medium text-sd-fg-muted">설치된 Android 기기</span>
      <span className="text-[24px] font-bold leading-tight text-sd-fg">
        {fmt(end)}
        <span className="ml-0.5 text-[15px] font-semibold text-sd-fg-muted">대</span>
      </span>
      {change === null ? (
        <span className="text-[12px] text-sd-fg-subtle">{md(endDay)} 기준</span>
      ) : (
        <>
          {change === 0 ? <span className="text-[12px] font-semibold text-sd-fg-subtle">변화 없음</span> : <Delta now={change} before={0} />}
          <span className="text-[12px] text-sd-fg-subtle tabular-nums">
            {md(startDay)}엔 {fmt(start as number)}대였어요
          </span>
        </>
      )}
    </div>
  );
}

/** App Store 나라별 노출, 조회, 최초 다운로드. 일본처럼 노출은 많은데 설치가 적은 나라를 찾는 표 */
function TerritoryTable({ d }: { d: Dashboard }) {
  const rows = d.appStoreTerritories.filter((t) => t.impressions > 0 || t.downloads > 0).slice(0, 10);
  return (
    <SectionCard title="App Store 나라별" flush>
      {rows.length === 0 ? (
        <EmptyBlock title="이 기간 App Store 노출 기록이 없어요" />
      ) : (
        <Table
          head={
            <>
              <Th className="whitespace-nowrap">나라</Th>
              <Th className="whitespace-nowrap text-right">노출</Th>
              <Th className="whitespace-nowrap text-right">제품 페이지 조회</Th>
              <Th className="whitespace-nowrap text-right">최초 다운로드</Th>
              <Th className="whitespace-nowrap text-right">노출 1,000회당 다운로드</Th>
            </>
          }
        >
          {rows.map((t, i) => (
            <Tr key={t.country || "unknown"} index={i}>
              <Td className="whitespace-nowrap font-medium text-sd-fg">{t.country ? countryName(t.country) : "나라 미상"}</Td>
              <Td className="text-right tabular-nums">{fmt(t.impressions)}</Td>
              <Td className="text-right tabular-nums">{fmt(t.pageViews)}</Td>
              <Td className="text-right tabular-nums">{fmt(t.downloads)}</Td>
              <Td className="text-right tabular-nums">
                {t.impressions >= 300 ? ((t.downloads / t.impressions) * 1000).toFixed(1) : <span className="text-sd-fg-subtle">숫자 적음</span>}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
      <Note className="px-5 py-3">
        노출과 조회는 분석 리포트, 다운로드는 판매 리포트에서 왔어요. 분석 리포트가 있는 날만 셌어요. 노출이 300회보다 적은 나라는 숫자가 흔들려서 비율을 적지 않았어요.
      </Note>
    </SectionCard>
  );
}

/** 채널별 방문과 전환율. 마케터가 먼저 보는 표라 소스별 표보다 위에 둔다 */
function ChannelTable({ d }: { d: Dashboard }) {
  const cmp = useCompare();
  const prev = new Map(d.channels.previous.map((r) => [r.channel, r]));
  const total = d.channels.current.reduce((a, r) => a + r.sessions, 0);
  return (
    <SectionCard title="채널별" flush>
      {d.channels.current.length === 0 ? (
        <EmptyBlock title="이 기간에 들어온 기록이 없어요" />
      ) : (
        <Table
          head={
            <>
              <Th className="whitespace-nowrap">채널</Th>
              <Th className="whitespace-nowrap text-right">방문</Th>
              <Th className="whitespace-nowrap text-right">비중</Th>
              <Th className="whitespace-nowrap text-right">다운로드 링크로 이동</Th>
              <Th className="whitespace-nowrap text-right">사이트 버튼으로 이동</Th>
              <Th className="whitespace-nowrap text-right">사이트 전환율</Th>
              {cmp.on && <Th className="whitespace-nowrap text-right">{cmp.word} 방문</Th>}
            </>
          }
        >
          {d.channels.current.map((r, i) => {
            const siteVisits = r.sessions - r.linkSessions;
            const button = Math.max(0, r.storeSessions - r.linkSessions);
            const conv = siteVisits >= MIN_SAMPLE ? pct(button / siteVisits) : null;
            return (
              <Tr key={r.channel} index={i}>
                <Td className="whitespace-nowrap font-medium text-sd-fg">{r.channel}</Td>
                <Td className="text-right tabular-nums">{fmt(r.sessions)}</Td>
                <Td className="text-right tabular-nums">{total > 0 ? `${Math.round((r.sessions / total) * 100)}%` : "-"}</Td>
                <Td className="text-right tabular-nums">{fmt(r.linkSessions)}</Td>
                <Td className="text-right tabular-nums">{fmt(button)}</Td>
                <Td className="text-right tabular-nums">{conv ?? <span className="text-sd-fg-subtle">숫자 적음</span>}</Td>
                {cmp.on && <Td className="text-right tabular-nums text-sd-fg-subtle">{fmt(prev.get(r.channel)?.sessions ?? 0)}</Td>}
              </Tr>
            );
          })}
        </Table>
      )}
      <Note className="px-5 py-3">
        다운로드 링크로 이동은 QR 이나 링크트리 다운로드 링크로 들어와 바로 스토어로 간 방문이에요. 사이트 전환율은 그 방문을 빼고, 사이트에 들어온
        방문 중 버튼으로 스토어에 간 방문의 비율이에요(한 방문에서 여러 번 눌러도 한 번). 사이트 방문이 {MIN_SAMPLE}회보다 적은 채널은 숫자가 흔들려서 비율을 적지 않았어요.
      </Note>
    </SectionCard>
  );
}

type SortKey = "postedAt" | "views" | "reach" | "engagement" | "shares";

/**
 * 게시물 표. 머리 칸을 누르면 그 숫자로 정렬해 "어느 콘텐츠가 반응을 얻었나"를 바로 본다.
 * 줄(또는 캡션)을 누르면 그 게시물의 날짜별 추세가 옆에서 열린다(PostDrawer)
 */
function PostsTable({ posts }: { posts: PostRow[] }) {
  const [sort, setSort] = useState<SortKey>("postedAt");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = posts.find((p) => p.id === openId) ?? null;
  const close = () => {
    const id = openId;
    setOpenId(null);
    // 닫으면 눌렀던 게시물로 초점을 돌려 키보드로 이어서 볼 수 있게
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-post="${id}"]`)?.focus());
  };
  const value = (p: PostRow): number =>
    sort === "postedAt" ? new Date(p.postedAt).getTime() : sort === "engagement" ? (engagementOf(p) ?? -1) : (p[sort] ?? -1);
  const rows = [...posts].sort((a, b) => value(b) - value(a));
  const head = (key: SortKey, label: string, right = true) => (
    <Th className={`whitespace-nowrap ${right ? "text-right" : ""}`} aria-sort={sort === key ? "descending" : "none"}>
      <button
        type="button"
        onClick={() => setSort(key)}
        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-sd-fg ${sort === key ? "font-bold text-sd-fg" : ""}`}
      >
        {label}
        <span aria-hidden className={sort === key ? "" : "opacity-0"}>
          ↓
        </span>
      </button>
    </Th>
  );
  return (
    <SectionCard title="이 기간에 올린 게시물" flush>
      {posts.length === 0 ? (
        <EmptyBlock title="이 기간에 올린 게시물이 없어요" />
      ) : (
        <Table
          head={
            <>
              {head("postedAt", "올린 날", false)}
              <Th className="whitespace-nowrap">게시물</Th>
              {head("views", "조회수")}
              {head("reach", "본 사람")}
              {head("engagement", "반응률")}
              {head("shares", "공유")}
              <Th className="whitespace-nowrap text-right">저장</Th>
              <Th className="whitespace-nowrap text-right">프로필 방문</Th>
              <Th className="whitespace-nowrap text-right">링크 클릭</Th>
              <Th className="w-8">
                <span className="sr-only">상세</span>
              </Th>
            </>
          }
        >
          {rows.map((post, i) => {
            const er = engagementOf(post);
            return (
              <Tr key={post.id} index={i} onActivate={() => setOpenId(post.id)}>
                <Td className="whitespace-nowrap tabular-nums">{md(seoulDay(post.postedAt))}</Td>
                <Td className="max-w-[260px]">
                  <button
                    type="button"
                    data-post={post.id}
                    onClick={() => setOpenId(post.id)}
                    className="block w-full truncate rounded text-left text-sd-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={`${firstLine(post.caption)} 상세 보기`}
                  >
                    <span className="mr-1.5 text-sd-fg-subtle">{post.productType === "REELS" ? "릴스" : "피드"}</span>
                    {firstLine(post.caption)}
                  </button>
                </Td>
                {[post.views, post.reach].map((v, k) => (
                  <Td key={k} className="text-right tabular-nums">
                    {v === null ? "-" : fmt(v)}
                  </Td>
                ))}
                <Td className="text-right tabular-nums">
                  {er === null ? (
                    "-"
                  ) : smallReach(post) ? (
                    // 글자를 덧붙이지 않고 흐린 색으로만 구분한다. 이유는 마우스를 올리면 보이고, 화면 읽기 프로그램에는 글로 읽어 준다
                    <Tooltip content={<SmallReachNote reach={post.reach ?? 0} />} className="text-sd-fg-subtle tabular-nums">
                      {pct(er)}
                    </Tooltip>
                  ) : (
                    pct(er)
                  )}
                </Td>
                {[post.shares, post.saved, post.profileVisits, post.bioLinkClicks].map((v, k) => (
                  <Td key={`b${k}`} className="text-right tabular-nums">
                    {v === null ? "-" : fmt(v)}
                  </Td>
                ))}
                {/* 줄을 누르면 상세가 열린다는 표시 */}
                <Td className="w-8 pl-0 text-sd-fg-subtle">
                  <ChevronRightIcon className="h-4 w-4" />
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}
      <Note className="px-5 py-3">
        게시물을 누르면 날짜별 추세가 열려요. 숫자는 올린 날부터 지금까지 더한 값이에요. 본 사람은 게시물을 한 번이라도 본 계정 수예요(인스타그램의
        도달). 반응률은 본 사람 중 좋아요, 댓글, 저장, 공유를 한 비율이라 적게 퍼진 게시물일수록 높게 나와요. 본 사람이 {MIN_REACH}명보다 적은 게시물은 몇 명만
        반응해도 크게 뛰어서 흐리게 보여요. 흐린 숫자에 마우스를 올리거나 누르면 이유가 나와요. 릴스는 인스타그램이 프로필 방문과 링크 클릭을 주지 않아 비어 있어요.
      </Note>
      {open && <PostDrawer post={open} onClose={close} />}
    </SectionCard>
  );
}

function CampaignTable({ rows, heads }: { rows: { a: string; b: string; c: string; n: number }[]; heads: [string, string, string, string] }) {
  if (rows.length === 0) return <EmptyBlock title="이 기간에 들어온 기록이 없어요" />;
  return (
    <Table
      head={
        <>
          <Th className="whitespace-nowrap">{heads[0]}</Th>
          <Th className="whitespace-nowrap">{heads[1]}</Th>
          <Th className="whitespace-nowrap">{heads[2]}</Th>
          <Th className="whitespace-nowrap text-right">{heads[3]}</Th>
        </>
      }
    >
      {rows.map((r, i) => (
        <Tr key={`${i}-${r.a}|${r.b}|${r.c}`} index={i}>
          <Td className="max-w-[140px] truncate">{r.a}</Td>
          <Td className="whitespace-nowrap text-sd-fg-muted">{r.b}</Td>
          <Td className="max-w-[160px] truncate text-sd-fg-muted">{r.c || "-"}</Td>
          <Td className="text-right tabular-nums">{fmt(r.n)}</Td>
        </Tr>
      ))}
    </Table>
  );
}

/** 처음 불러올 때만. 실제 화면과 같은 높이로 둬 다 불러와도 자리가 튀지 않게 한다 */
function MetricsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-[268px] animate-pulse rounded-2xl bg-sd-gray-200" />
      <div className="h-[200px] animate-pulse rounded-2xl bg-sd-gray-200" />
      <div className="h-[200px] animate-pulse rounded-2xl bg-sd-gray-200" />
    </div>
  );
}
