"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Count, Due, Frames, Limit, NextEvent, Note, Post, Queue, Ratio, Stage, Trend, Big } from "@/components/admin/overview/CardViz";
import { CARDS, pack, type CardKey, type CardResult, type LiveValues, type OverviewData } from "@/lib/admin/overview/cards";
import { END_REASON_LABEL, labelOf } from "@/lib/admin/format";
import { fetchOverview } from "@/lib/admin/overviewClient";

// 개요의 내 지표 (docs/admin-ui.md "개요 카드"). 서버 카드는 한 번에 부르고, 실시간 카드는 페이지가 읽은 값을 받는다.

export type { LiveValues };

const REASON_COLOR: Record<string, string> = { ALL_ARRESTED: "var(--sd-info)", TIME_OVER: "var(--sd-positive)", ROBBER_FORFEITED: "var(--sd-warning)", POLICE_FORFEITED: "var(--sd-critical)" };
const STATUS_LABEL: Record<string, string> = { WAITING: "대기", IN_PROGRESS: "진행 중", FINISHED: "끝남", CANCELLED: "취소" };

/** 넓은 화면은 한 줄 네 칸, 그보다 좁으면 두 칸 */
function useCols() {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const q = window.matchMedia("(min-width: 1200px)");
    const set = () => setCols(q.matches ? 4 : 2);
    set();
    q.addEventListener("change", set);
    return () => q.removeEventListener("change", set);
  }, []);
  return cols;
}

function Shell({ k, span, link, children }: { k: CardKey; span: number; link: boolean; children: ReactNode }) {
  const def = CARDS[k];
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[12.5px] font-semibold text-sd-fg-muted">{def.title}</p>
        {/* 좁은 카드에서는 제목이 먼저다 */}
        <span className={`shrink-0 text-[11px] text-sd-fg-subtle ${link ? "hidden sm:inline" : ""}`}>{def.fresh}</span>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col">{children}</div>
    </>
  );
  const box = "flex h-full min-w-0 flex-col rounded-2xl border border-sd-line bg-sd-surface px-4 pb-3 pt-3.5";
  return link ? (
    <Link href={def.href} style={{ gridColumn: `span ${span}` }} className={`group ${box} transition hover:-translate-y-0.5 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}>
      {body}
    </Link>
  ) : (
    <div style={{ gridColumn: `span ${span}` }} className={box}>
      {body}
    </div>
  );
}

/** 카드 한 장. 개요에서는 누르면 그 화면으로 가고, 역할 편집 창에서는 모양만 보여 준다 */
export function CardTile({ k, span, live, result, link = true }: { k: CardKey; span: number; live: LiveValues; result: CardResult | undefined; link?: boolean }) {
  return (
    <Shell k={k} span={span} link={link}>
      {CARDS[k].source === "live" ? <LiveViz k={k} live={live} /> : <ServerViz k={k} r={result} />}
    </Shell>
  );
}

function ServerViz({ k, r }: { k: CardKey; r: CardResult | undefined }) {
  if (!r) return <div aria-busy className="mt-1 h-full animate-pulse rounded-xl bg-sd-fill" />;
  switch (r.kind) {
    case "error":
      return <Note>{r.message}</Note>;
    case "trend":
      return <Trend d={r} />;
    case "ratio":
      return <Ratio d={r} />;
    case "limit":
      return <Limit d={r} />;
    case "post":
      return <Post d={r} />;
    case "stage":
      return <Stage d={r} />;
    case "due":
      return <Due d={r} />;
    case "event":
      return k === "frame" ? <Frames d={r} /> : <NextEvent d={r} />;
    case "count":
      return <Count d={r} empty="보내지 않은 초안이 없어요." />;
  }
}

function Win({ police, robber }: { police: number; robber: number }) {
  if (police + robber <= 0) return <Note>집계된 게임 결과가 없어요.</Note>;
  // BE 가 이미 0~100 으로 준다. 다시 곱하지 않는다
  const p = Math.round(police);
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[12px] font-semibold text-sd-info">경찰</p>
          <p className="text-[22px] font-bold tabular-nums text-sd-info">{p}%</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-semibold text-sd-positive">도둑</p>
          <p className="text-[22px] font-bold tabular-nums text-sd-positive">{Math.round(robber)}%</p>
        </div>
      </div>
      <div className="mt-auto flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        <div className="h-full bg-sd-info" style={{ width: `${p}%` }} />
        <div className="h-full flex-1 bg-sd-positive" />
      </div>
    </>
  );
}

function Ends({ ends }: { ends: LiveValues["ends"] }) {
  const total = ends.reduce((n, e) => n + e.count, 0);
  if (!total) return <Note>끝난 게임이 없어요.</Note>;
  return (
    <>
      <Big>
        {total.toLocaleString()}
        <span className="ml-0.5 text-[16px]">판</span>
      </Big>
      <div className="mt-auto flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {ends.map((e) => (
          <div key={e.endReason} style={{ width: `${(e.count / total) * 100}%`, background: REASON_COLOR[e.endReason] ?? "var(--sd-fg-subtle)" }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-sd-fg-muted">
        {ends.map((e) => (
          <li key={e.endReason} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: REASON_COLOR[e.endReason] ?? "var(--sd-fg-subtle)" }} />
            {labelOf(END_REASON_LABEL, e.endReason)} {Math.round((e.count / total) * 100)}%
          </li>
        ))}
      </ul>
    </>
  );
}

function Games({ games }: { games: LiveValues["games"] }) {
  if (!games.length) return <Note>최근 게임이 없어요.</Note>;
  return (
    <ul className="divide-y divide-sd-hairline">
      {games.slice(0, 3).map((g) => (
        <li key={g.id} className="flex items-center gap-3 py-1.5 text-[13px]">
          <span className="font-mono font-semibold tracking-wide text-sd-fg">{g.inviteCode}</span>
          <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${g.status === "IN_PROGRESS" ? "bg-accent-weak text-accent" : "bg-sd-fill text-sd-fg-subtle"}`}>{STATUS_LABEL[g.status] ?? g.status}</span>
          <span className="ml-auto tabular-nums text-sd-fg-subtle">
            {g.participantCount}/{g.maxParticipants}명
          </span>
        </li>
      ))}
    </ul>
  );
}

function LiveViz({ k, live }: { k: CardKey; live: LiveValues }) {
  const p = live.pending;
  switch (k) {
    case "week":
      return (
        <>
          <Big>
            {live.weeklyGames.toLocaleString()}
            <span className="ml-0.5 text-[16px]">판</span>
          </Big>
          <Note>운영진이 한 판도 들어 있어요.</Note>
        </>
      );
    case "win":
      return <Win police={live.win.police} robber={live.win.robber} />;
    case "end":
      return <Ends ends={live.ends} />;
    case "games":
      return <Games games={live.games} />;
    case "bug":
      return p ? <Queue count={p.bugs} unit="건" /> : <div aria-busy className="h-full animate-pulse rounded-xl bg-sd-fill" />;
    case "rep":
      return p ? <Queue count={p.reports} unit="건" /> : <div aria-busy className="h-full animate-pulse rounded-xl bg-sd-fill" />;
    case "rv":
      return p ? <Queue count={p.reviews} unit="개" /> : <div aria-busy className="h-full animate-pulse rounded-xl bg-sd-fill" />;
    default:
      return null;
  }
}

export function OverviewCards({ keys, live }: { keys: CardKey[]; live: LiveValues }) {
  const cols = useCols();
  const serverKeys = keys.filter((k) => CARDS[k].source === "server");
  const want = serverKeys.join(",");
  const [data, setData] = useState<{ want: string; value: OverviewData } | null>(null);
  const [error, setError] = useState<{ want: string; message: string } | null>(null);

  useEffect(() => {
    if (!want) return;
    let active = true;
    fetchOverview(want.split(",") as CardKey[])
      .then((value) => active && setData({ want, value }))
      .catch((e: Error) => active && setError({ want, message: e.message }));
    return () => {
      active = false;
    };
  }, [want]);

  const cards = data?.want === want ? data.value.cards : {};
  const failed = error?.want === want ? error.message : null;

  return (
    <div className="grid auto-rows-[172px] gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {pack(keys, cols).map(({ key, span }) => (
        <CardTile key={key} k={key} span={span} live={live} result={failed ? { kind: "error", message: failed } : cards[key]} />
      ))}
    </div>
  );
}
