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
 * 3. 게시물별, 들어온 경로(UTM)별 숫자
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
        description="매일 아침 모은 어제까지의 숫자예요."
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
      앞 기간 {fmt(before)}
      {diff !== 0 && <span className="ml-1 text-sd-fg-muted">({diff > 0 ? "+" : "-"}{fmt(Math.abs(diff))})</span>}
    </span>
  );
}

function Cell({ label, value, lines }: { label: string; value: string; lines: string[] }) {
  return (
    <div className="flex flex-col gap-1 bg-sd-surface px-4 py-4">
      <span className="text-[12px] font-medium text-sd-fg-muted">{label}</span>
      <span className="text-[22px] font-bold text-sd-fg tabular-nums">{value}</span>
      {lines.map((l) => (
        <span key={l} className="text-[12px] text-sd-fg-subtle tabular-nums">
          {l}
        </span>
      ))}
    </div>
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

/** 어제까지 숫자가 안 들어온 소스. 그 뒤 날짜는 차트와 합계에서 0 으로 보이니 맨 위에 알린다 */
function lagging(d: Dashboard): string[] {
  const names: [keyof Dashboard["freshness"], string][] = [
    ["instagram", "인스타"],
    ["ga4", "GA4"],
    ["appstore", "App Store"],
    ["admob", "AdMob"],
  ];
  return names.filter(([k]) => (d.freshness[k] ?? "") < d.range.end).map(([k, name]) => `${name}(${md(d.freshness[k])}까지)`);
}

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

function MetricsBody({ d }: { d: Dashboard }) {
  const c = d.totals.current;
  const p = d.totals.previous;
  const days = d.daily.map((x) => x.day);
  const col = (k: keyof DailyPoint) => d.daily.map((x) => Number(x[k]));
  const markers = d.posts.map((post) => ({ day: seoulDay(post.postedAt), label: firstLine(post.caption) }));
  const firstOpen = (n: typeof c) => n.installs.firstOpenAndroid + n.installs.firstOpenIos;
  const showRate = (n: typeof c) => ratio(n.ads.impressions, n.ads.matchedRequests);
  const perGame = (n: typeof c) => ratio(n.ads.impressions, n.game.overs);
  const pctText = (r: number | null) => (r === null ? "-" : `${Math.round(r * 100)}%`);
  const perText = (r: number | null) => (r === null ? "-" : `${r.toFixed(1)}회`);
  const usd = (micros: number) => `$${(micros / 1e6).toFixed(2)}`;
  const firstDiff = firstOpen(c) - firstOpen(p);
  const late = lagging(d);

  return (
    <div className="flex flex-col gap-5 pb-10">
      {late.length > 0 && (
        <Callout variant="warning" title="아직 덜 들어온 숫자가 있어요">
          {late.join(", ")}. 그 뒤 날짜는 0으로 보여요. 매일 아침 수집이 다시 돌면 채워져요.
        </Callout>
      )}

      <FadeIn>
        <SectionCard title={`인스타에서 게임까지 (${md(d.range.start)}~${md(d.range.end)})`}>
          <p className="mb-4 text-[15px] text-sd-fg">
            이 기간 앱 첫 실행은 <b className="tabular-nums">{fmt(firstOpen(c))}회</b>예요.{" "}
            <span className="text-sd-fg-muted">
              {firstDiff === 0
                ? "앞 기간과 같아요."
                : `앞 기간보다 ${fmt(Math.abs(firstDiff))}회 ${firstDiff > 0 ? "늘었어요" : "줄었어요"}.`}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sd-line bg-sd-hairline sm:grid-cols-4">
            <Step label="인스타 조회" now={c.instagram.views} before={p.instagram.views} />
            <Step label="프로필 방문" now={c.instagram.profileViews} before={p.instagram.profileViews} />
            <Step label="프로필 링크 클릭" now={c.instagram.linkClicks} before={p.instagram.linkClicks} />
            <Step label="웹 방문" now={c.web.sessions} before={p.web.sessions} sub={`그중 인스타에서 ${fmt(c.web.fromInstagram)}`} />
            <Step label="다운로드 버튼" now={c.web.downloadClicks} before={p.web.downloadClicks} />
            <Step label="App Store 신규" now={c.installs.appStoreNew} before={p.installs.appStoreNew} />
            <Step
              label="앱 첫 실행"
              now={firstOpen(c)}
              before={firstOpen(p)}
              sub={`Android ${fmt(c.installs.firstOpenAndroid)}, iOS ${fmt(c.installs.firstOpenIos)}`}
            />
            <Step label="게임 시작" now={c.game.starts} before={p.game.starts} />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-sd-fg-subtle">
            단계마다 세는 대상이 달라 비율로 잇지 않았어요. 앞 기간은 {md(d.previous.start)}~{md(d.previous.end)}이에요.
          </p>
        </SectionCard>
      </FadeIn>

      <div>
        <h2 className="text-[15px] font-bold text-sd-fg">날마다</h2>
        <p className="mt-1 text-[12px] text-sd-fg-subtle">
          회색 점선은 인스타 게시물을 올린 날이에요. 차트를 누르거나 마우스를 올리면 그날 숫자와 게시물이 보여요.
        </p>
      </div>
      <div className="-mt-2 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn delay={0.04}>
          <SectionCard title="인스타 조회">
            <TrendChart days={days} series={[{ label: "조회", values: col("igViews") }]} markers={markers} unit="회" />
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
          <SectionCard title="다운로드 버튼 클릭">
            <TrendChart days={days} series={[{ label: "버튼 클릭", values: col("downloadClicks") }]} markers={markers} unit="회" />
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.16}>
          <SectionCard title="App Store 신규 다운로드">
            <TrendChart days={days} series={[{ label: "신규 다운로드", values: col("appStoreNew") }]} markers={markers} unit="건" />
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.2}>
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
        <FadeIn delay={0.24}>
          <SectionCard title="게임 시작">
            <TrendChart days={days} series={[{ label: "게임 시작", values: col("gameStarts") }]} markers={markers} unit="판" />
          </SectionCard>
        </FadeIn>
      </div>

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
                      <span className="mr-1.5 text-sd-fg-subtle">{post.productType === "REELS" ? "릴스" : "피드"}</span>
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
        숫자는 올린 날부터 지금까지 더한 값이에요. 릴스는 인스타가 프로필 방문과 링크 클릭을 주지 않아 비어 있어요.
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
              heads={["출처", "매체", "캠페인 / 플랫폼", "새 사용자"]}
            />
          </SectionCard>
        </FadeIn>
      </div>
      <p className="-mt-2 text-[12px] leading-relaxed text-sd-fg-subtle">
        링크에 UTM 꼬리표를 붙이면 캠페인별로 갈려요. 인스타 링크트리는 instagram / bio, 행사 QR 은 행사 이름을 영어로 붙여요.
        앱 경로는 Play로 설치한 Android만 갈려요.
      </p>

      <FadeIn>
        <SectionCard title="광고">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sd-line bg-sd-hairline sm:grid-cols-4">
            <Step label="광고 노출" now={c.ads.impressions} before={p.ads.impressions} />
            <Cell label="노출률" value={pctText(showRate(c))} lines={[`앞 기간 ${pctText(showRate(p))}`, "받은 광고 중 화면에 뜬 비율"]} />
            <Cell label="판당 노출" value={perText(perGame(c))} lines={[`앞 기간 ${perText(perGame(p))}`, `끝난 게임 ${fmt(c.game.overs)}판 기준`]} />
            <Cell label="예상 수익" value={usd(c.ads.earningsMicros)} lines={[`앞 기간 ${usd(p.ads.earningsMicros)}`]} />
          </div>
          <div className="mt-5">
            <TrendChart days={days} series={[{ label: "광고 노출", values: col("adImpressions") }]} markers={markers} unit="회" />
          </div>
        </SectionCard>
      </FadeIn>

      <Callout variant="neutral" title="숫자의 기준">
        마지막으로 들어온 날은 인스타 {md(d.freshness.instagram)}, GA4 {md(d.freshness.ga4)}, App Store {md(d.freshness.appstore)}, AdMob{" "}
        {md(d.freshness.admob)}이에요. 인스타와 App Store 다운로드는 미국 서부 날짜를 하루 뒤로 옮겨 한국 날짜에 맞췄어요. AdMob 수익은
        추정치라 나중에 조금 바뀔 수 있어요.
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
