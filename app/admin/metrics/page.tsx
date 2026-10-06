"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ErrorBlock, PageHeader, ScrollPage, SectionCard, EmptyBlock } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { Table, Td, Th, Tr } from "@/components/admin/Table";
import { FadeIn } from "@/components/admin/motion";
import { TrendChart } from "@/components/admin/metrics/TrendChart";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { Dashboard, DailyPoint } from "@/lib/metrics/dashboard/data";

/**
 * 지표 (#145). 매일 아침 모으는 인스타, 웹, 스토어, 앱, 광고 숫자를 한 화면에서 본다.
 *
 * 콘솔을 옮겨 놓지 않고 질문에 답하는 순서로 놓았다.
 * 1. 이 기간 어디서 와서 어디까지 갔나 (단계를 나란히, 비율로 잇지 않음)
 * 2. 날마다 어땠나 (게시물 올린 날 표시)
 * 3. 어느 게시물, 어느 링크가 남겼나
 * 4. 광고
 *
 * 인과는 말하지 않는다. 같은 기간에 각 단계에서 센 숫자를 보여 줄 뿐, "덕분에"라고 쓰지 않는다.
 * 숫자를 합치는 규칙과 출처는 docs/metrics-collection.md.
 */

type Days = "7" | "28" | "90";
const PERIODS: { label: string; value: Days }[] = [
  { label: "7일", value: "7" },
  { label: "28일", value: "28" },
  { label: "90일", value: "90" },
];

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const md = (ymd: string | null) => {
  if (!ymd) return "-";
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
};
const seoulDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
const firstLine = (caption: string | null) => caption?.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "(캡션 없음)";

async function fetchDashboard(days: Days): Promise<Dashboard> {
  const send = () =>
    fetch(`/api/admin/metrics?days=${days}`, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
      cache: "no-store",
    });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  const body = (await res.json().catch(() => ({}))) as Dashboard & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

/** 날짜별 숫자를 엑셀에서 바로 열리는 CSV 로 (한글이 깨지지 않게 BOM 을 붙인다) */
function downloadCsv(d: Dashboard) {
  const cols: [keyof DailyPoint, string][] = [
    ["day", "날짜"],
    ["igViews", "인스타 조회"],
    ["igProfileViews", "인스타 프로필 방문"],
    ["igLinkClicks", "인스타 프로필 링크 클릭"],
    ["webSessions", "웹 방문"],
    ["webFromInstagram", "인스타에서 온 웹 방문"],
    ["downloadClicks", "다운로드 버튼 클릭"],
    ["appStoreNew", "App Store 신규 다운로드"],
    ["firstOpenAndroid", "앱 첫 실행 Android"],
    ["firstOpenIos", "앱 첫 실행 iOS"],
    ["gameStarts", "게임 시작"],
    ["adImpressions", "광고 노출"],
    ["adEarningsMicros", "예상 광고 수익(USD)"],
  ];
  const rows = d.daily.map((p) =>
    cols.map(([k]) => (k === "adEarningsMicros" ? (p.adEarningsMicros / 1e6).toFixed(4) : String(p[k]))).join(","),
  );
  const csv = `﻿${cols.map(([, h]) => h).join(",")}\n${rows.join("\n")}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `지표_${d.range.start}_${d.range.end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MetricsPage() {
  const [days, setDays] = useState<Days>("28");
  // 결과에 어느 기간 것인지 같이 둔다. 기간을 바꾸면 그 기간 결과가 올 때까지 불러오는 중으로 본다
  const [result, setResult] = useState<{ days: Days; data?: Dashboard; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchDashboard(days)
      .then((data) => alive && setResult({ days, data }))
      .catch((e: unknown) => alive && setResult({ days, error: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [days, attempt]);

  const current = result?.days === days ? result : null;
  const data = current?.data ?? null;
  const retry = () => {
    setResult(null);
    setAttempt((n) => n + 1);
  };

  return (
    <ScrollPage>
      <PageHeader
        title="지표"
        description="인스타, 웹, 스토어, 앱, 광고 숫자를 매일 아침 모아 한 화면에 보여 줘요. 어제까지의 숫자예요."
        actions={
          <div className="flex items-center gap-2">
            <SegmentedControl options={PERIODS} value={days} onChange={setDays} />
            <Button variant="neutral" size="sm" disabled={!data} onClick={() => data && downloadCsv(data)}>
              CSV
            </Button>
          </div>
        }
      />
      {current?.error ? (
        <ErrorBlock message={current.error} onRetry={retry} />
      ) : !data ? (
        <MetricsSkeleton />
      ) : (
        <MetricsBody d={data} />
      )}
    </ScrollPage>
  );
}

function Change({ now, before }: { now: number; before: number }) {
  const diff = Math.round(now - before);
  return (
    <span className="text-[12px] text-sd-fg-subtle tabular-nums">
      전 기간 {fmt(before)}
      {diff !== 0 && <span className="ml-1 text-sd-fg-muted">({diff > 0 ? "+" : "-"}{fmt(Math.abs(diff))})</span>}
    </span>
  );
}

function Step({ label, now, before, sub }: { label: string; now: number; before: number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
      <span className="text-[12px] font-medium text-sd-fg-muted">{label}</span>
      <span className="text-[22px] font-bold text-sd-fg tabular-nums">{fmt(now)}</span>
      <Change now={now} before={before} />
      {sub && <span className="text-[12px] text-sd-fg-muted">{sub}</span>}
    </div>
  );
}

function MetricsBody({ d }: { d: Dashboard }) {
  const c = d.totals.current;
  const p = d.totals.previous;
  const days = d.daily.map((x) => x.day);
  const col = (k: keyof DailyPoint) => d.daily.map((x) => Number(x[k]));
  const markers = d.posts.map((post) => ({ day: seoulDay(post.postedAt), label: firstLine(post.caption) }));
  const firstOpen = (n: typeof c) => n.installs.firstOpenAndroid + n.installs.firstOpenIos;
  const showRate = c.ads.matchedRequests > 0 ? Math.round((c.ads.impressions / c.ads.matchedRequests) * 100) : null;
  const perGame = c.game.overs > 0 ? (c.ads.impressions / c.game.overs).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-5 pb-10">
      <FadeIn>
        <SectionCard title={`${md(d.range.start)}~${md(d.range.end)}, 어디서 와서 어디까지 갔나`}>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sd-line bg-sd-hairline sm:grid-cols-4">
            <Step label="인스타 조회" now={c.instagram.views} before={p.instagram.views} />
            <Step label="인스타 프로필 방문" now={c.instagram.profileViews} before={p.instagram.profileViews} />
            <Step label="프로필 링크 클릭" now={c.instagram.linkClicks} before={p.instagram.linkClicks} />
            <Step label="웹 방문" now={c.web.sessions} before={p.web.sessions} sub={`그중 인스타에서 ${fmt(c.web.fromInstagram)}`} />
            <Step label="다운로드 버튼 클릭" now={c.web.downloadClicks} before={p.web.downloadClicks} />
            <Step label="App Store 신규 다운로드" now={c.installs.appStoreNew} before={p.installs.appStoreNew} />
            <Step
              label="앱 첫 실행"
              now={firstOpen(c)}
              before={firstOpen(p)}
              sub={`Android ${fmt(c.installs.firstOpenAndroid)}, iOS ${fmt(c.installs.firstOpenIos)}`}
            />
            <Step label="게임 시작" now={c.game.starts} before={p.game.starts} />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-sd-fg-subtle">
            단계마다 세는 대상과 하루의 기준이 달라 비율로 잇지 않아요. 같은 기간에 각 단계에서 센 숫자를 나란히 둔 거예요.
            전 기간은 바로 앞 같은 길이({md(d.previous.start)}~{md(d.previous.end)})예요.
          </p>
        </SectionCard>
      </FadeIn>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn delay={0.04}>
          <SectionCard title="앱 첫 실행">
            <TrendChart
              days={days}
              series={[
                { label: "Android", values: col("firstOpenAndroid") },
                { label: "iOS", values: col("firstOpenIos") },
              ]}
              markers={markers}
              unit="회"
            />
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.08}>
          <SectionCard title="웹 방문">
            <TrendChart
              days={days}
              series={[
                { label: "전체", values: col("webSessions") },
                { label: "인스타에서", values: col("webFromInstagram") },
              ]}
              markers={markers}
              unit="회"
            />
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.12}>
          <SectionCard title="인스타 조회">
            <TrendChart days={days} series={[{ label: "조회", values: col("igViews") }]} markers={markers} unit="회" />
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.16}>
          <SectionCard title="게임 시작">
            <TrendChart days={days} series={[{ label: "게임 시작", values: col("gameStarts") }]} markers={markers} unit="판" />
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.2}>
          <SectionCard title="App Store 신규 다운로드">
            <TrendChart days={days} series={[{ label: "신규 다운로드", values: col("appStoreNew") }]} markers={markers} unit="건" />
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.24}>
          <SectionCard title="다운로드 버튼 클릭">
            <TrendChart days={days} series={[{ label: "버튼 클릭", values: col("downloadClicks") }]} markers={markers} unit="회" />
          </SectionCard>
        </FadeIn>
      </div>
      <p className="-mt-2 text-[12px] text-sd-fg-subtle">
        회색 점선은 인스타 게시물을 올린 날이에요. 선 위에 마우스를 올리면 그날 숫자와 게시물이 보여요.
      </p>

      <FadeIn>
        <SectionCard title="이 기간에 올린 게시물" flush>
          {d.posts.length === 0 ? (
            <EmptyBlock title="이 기간에 올린 게시물이 없어요" />
          ) : (
            <Table
              head={
                <tr>
                  <Th>올린 날</Th>
                  <Th>게시물</Th>
                  <Th className="text-right">조회</Th>
                  <Th className="text-right">도달</Th>
                  <Th className="text-right">공유</Th>
                  <Th className="text-right">프로필 방문</Th>
                  <Th className="text-right">링크 클릭</Th>
                </tr>
              }
            >
              {d.posts.map((post, i) => (
                <Tr key={post.id} index={i}>
                  <Td className="whitespace-nowrap tabular-nums">{md(seoulDay(post.postedAt))}</Td>
                  <Td className="max-w-[280px]">
                    <a href={post.permalink} target="_blank" rel="noreferrer" className="block truncate text-sd-fg hover:underline">
                      <span className="mr-1.5 text-sd-fg-subtle">{post.productType === "REELS" ? "릴스" : "게시물"}</span>
                      {firstLine(post.caption)}
                    </a>
                  </Td>
                  {[post.views, post.reach, post.shares, post.profileVisits, post.bioLinkClicks].map((v, k) => (
                    <Td key={k} className="text-right tabular-nums">
                      {v === null ? "-" : fmt(v)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Table>
          )}
        </SectionCard>
      </FadeIn>
      <p className="-mt-2 text-[12px] text-sd-fg-subtle">
        게시물 숫자는 지금까지 쌓인 누적이에요. 릴스는 인스타가 프로필 방문과 링크 클릭을 주지 않아 비어 있어요.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn>
          <SectionCard title="웹으로 들어온 경로" flush>
            <CampaignTable
              rows={d.webCampaigns.slice(0, 10).map((r) => ({ a: r.source, b: r.medium, c: [r.campaign, r.content].filter((x) => x && x !== "(not set)").join(" / "), n: r.sessions }))}
              heads={["출처", "매체", "캠페인 / 버튼", "방문"]}
            />
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.04}>
          <SectionCard title="앱을 처음 연 경로" flush>
            <CampaignTable
              rows={d.appCampaigns.slice(0, 10).map((r) => ({ a: r.source, b: r.medium, c: [r.campaign, r.platform].filter((x) => x && x !== "(not set)").join(" / "), n: r.sessions }))}
              heads={["출처", "매체", "캠페인 / 플랫폼", "명"]}
            />
          </SectionCard>
        </FadeIn>
      </div>
      <p className="-mt-2 text-[12px] text-sd-fg-subtle">
        링크에 UTM 꼬리표를 붙이면 캠페인별로 갈려요. 인스타 링크트리는 instagram / bio, 행사 QR 은 행사 이름으로 붙여요.
      </p>

      <FadeIn>
        <SectionCard title="광고">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sd-line bg-sd-hairline sm:grid-cols-4">
            <Step label="광고 노출" now={c.ads.impressions} before={p.ads.impressions} />
            <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
              <span className="text-[12px] font-medium text-sd-fg-muted">노출률</span>
              <span className="text-[22px] font-bold text-sd-fg tabular-nums">{showRate === null ? "-" : `${showRate}%`}</span>
              <span className="text-[12px] text-sd-fg-subtle">받은 광고 중 실제로 보인 비율</span>
            </div>
            <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
              <span className="text-[12px] font-medium text-sd-fg-muted">끝난 게임 한 판당 노출</span>
              <span className="text-[22px] font-bold text-sd-fg tabular-nums">{perGame === null ? "-" : `${perGame}회`}</span>
              <span className="text-[12px] text-sd-fg-subtle">끝난 게임 {fmt(c.game.overs)}판 기준</span>
            </div>
            <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
              <span className="text-[12px] font-medium text-sd-fg-muted">예상 수익</span>
              <span className="text-[22px] font-bold text-sd-fg tabular-nums">${(c.ads.earningsMicros / 1e6).toFixed(2)}</span>
              <span className="text-[12px] text-sd-fg-subtle">전 기간 ${(p.ads.earningsMicros / 1e6).toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-5">
            <TrendChart days={days} series={[{ label: "광고 노출", values: col("adImpressions") }]} markers={markers} unit="회" />
          </div>
        </SectionCard>
      </FadeIn>

      <Callout variant="neutral" title="숫자의 기준">
        마지막으로 들어온 날은 인스타 {md(d.freshness.instagram)}, GA4 {md(d.freshness.ga4)}, App Store {md(d.freshness.appstore)}, AdMob{" "}
        {md(d.freshness.admob)}이에요. 인스타와 App Store 다운로드는 미국 서부 날짜, 나머지는 한국 날짜로 하루를 나눠요. App Store 와 AdMob 은 개인 보호 때문에 작은 숫자를 빼거나 어림해서, 각 콘솔 화면과 조금 다를 수 있어요.
      </Callout>
    </div>
  );
}

function CampaignTable({ rows, heads }: { rows: { a: string; b: string; c: string; n: number }[]; heads: [string, string, string, string] }) {
  if (rows.length === 0) return <EmptyBlock title="이 기간에 들어온 기록이 없어요" />;
  return (
    <Table
      head={
        <tr>
          <Th>{heads[0]}</Th>
          <Th>{heads[1]}</Th>
          <Th>{heads[2]}</Th>
          <Th className="text-right">{heads[3]}</Th>
        </tr>
      }
    >
      {rows.map((r, i) => (
        <Tr key={`${r.a}|${r.b}|${r.c}`} index={i}>
          <Td className="max-w-[140px] truncate">{r.a}</Td>
          <Td className="whitespace-nowrap text-sd-fg-muted">{r.b}</Td>
          <Td className="max-w-[160px] truncate text-sd-fg-muted">{r.c || "-"}</Td>
          <Td className="text-right tabular-nums">{fmt(r.n)}</Td>
        </Tr>
      ))}
    </Table>
  );
}

function MetricsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-56 animate-pulse rounded-2xl bg-sd-gray-200" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-60 animate-pulse rounded-2xl bg-sd-gray-200" />
        ))}
      </div>
    </div>
  );
}
