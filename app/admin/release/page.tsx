"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBlock, PageHeader, ScrollPage, SectionCard } from "@/components/admin/Parts";
import { DeviceIcon, RefreshIcon } from "@/components/admin/icons";
import { WorldClock } from "@/components/admin/ops/WorldClock";
import { HistoryList, NextCard, ReachCard, TrackRow } from "@/components/admin/release/Board";
import { fetchReleaseBoard } from "@/lib/admin/releaseClient";
import type { ReleaseBoard, Track } from "@/lib/release/board";
import { ago } from "@/lib/release/time";

// 어드민 "출시" (#229, docs/admin-ui.md "출시").
// 두 스토어가 어디까지 왔는지와 지금 가장 먼저 할 일 하나. 읽기만 하고 스토어에 아무것도 바꾸지 않는다.
// 열어 둔 동안 1분마다 다시 읽는다(서버도 1분 캐시라 스토어 API 를 더 부르지 않는다).

const DevScenario = process.env.NODE_ENV === "development" ? dynamic(() => import("@/components/admin/release/DevScenario")) : () => null;

const REFRESH_MS = 60_000;

export default function ReleasePage() {
  const [board, setBoard] = useState<ReleaseBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [scenario, setScenario] = useState("real");
  // 1분마다 읽기와 "다시 읽기"가 겹치면 늦게 온 옛 응답이 새 응답을 덮을 수 있어 마지막 요청만 받는다
  const seq = useRef(0);

  // 불러오는 동안 표시(loading)는 "다시 읽기"를 누를 때만 켠다. 처음에는 뼈대가, 1분마다는 조용히 바뀐다
  const load = useCallback(
    (fresh = false) => {
      const id = ++seq.current;
      fetchReleaseBoard({ fresh, scenario: process.env.NODE_ENV === "development" ? scenario : undefined })
        .then((b) => {
          if (id !== seq.current) return;
          setBoard(b);
          setError(null);
        })
        .catch((e: Error) => id === seq.current && setError(e.message))
        .finally(() => {
          if (id !== seq.current) return;
          setLoading(false);
          setNow(Date.now());
        });
    },
    [scenario],
  );

  useEffect(() => load(), [load]);
  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      if (document.visibilityState === "visible") load();
    };
    const id = window.setInterval(tick, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <ScrollPage>
      <PageHeader
        title="출시"
        description={board ? <LiveLine ios={board.ios} android={board.android} /> : "두 스토어가 어디까지 왔는지와 다음 할 일을 보여 줘요."}
        actions={
          <div className="flex items-center gap-2.5">
            {board && <span className="text-[12.5px] text-sd-fg-subtle">{ago(board.readAt, now) === "방금" ? "방금 읽음" : `${ago(board.readAt, now)}에 읽음`}</span>}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                load(true);
              }}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sd-gray-200 px-3 text-[13px] font-semibold text-sd-fg-muted transition hover:bg-sd-gray-300 disabled:opacity-60"
            >
              <RefreshIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              다시 읽기
            </button>
          </div>
        }
      />
      <DevScenario value={scenario} onChange={setScenario} />

      {error && !board ? (
        <ErrorBlock message={error} onRetry={() => load(true)} />
      ) : !board ? (
        <div aria-busy className="animate-pulse space-y-4">
          <div className="h-36 rounded-2xl bg-sd-gray-200" />
          <div className="h-64 rounded-2xl bg-sd-gray-200" />
          <div className="h-48 rounded-2xl bg-sd-gray-200" />
        </div>
      ) : (
        <div className="space-y-5">
          {error && <p className="rounded-xl bg-sd-critical-weak px-4 py-2.5 text-[13px] text-sd-fg">다시 읽지 못해 {ago(board.readAt, now)}에 읽은 값을 보여 줘요. {error}</p>}
          <NextCard next={board.next} notes={board.notes} />

          <SectionCard title="진행 상황" flush>
            <div className="divide-y divide-sd-hairline">
              <TrackRow track={board.ios} now={now} />
              <TrackRow track={board.android} now={now} />
            </div>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="사용자에게 보이나" flush>
              <ReachCard reach={board.reach} ios={board.ios} />
            </SectionCard>
            <SectionCard title="지금 내면">
              <WorldClock at={now} />
            </SectionCard>
          </div>

          {board.history.length > 0 && (
            <SectionCard title="최근 출시" flush>
              <HistoryList items={board.history} />
            </SectionCard>
          )}

          <p className="pb-2 text-[12px] leading-relaxed text-sd-fg-subtle">
            이 화면은 읽기만 하고 스토어에 아무것도 바꾸지 않아요. 열어 둔 동안 1분마다 다시 읽어요. 최근 출시는 지표 일정의 출시 기록이에요.
          </p>
        </div>
      )}
    </ScrollPage>
  );
}

function LiveLine({ ios, android }: { ios: Track; android: Track }) {
  const v = (t: Track) => (t.ok ? (t.live?.version ?? "-") : "못 읽음");
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      지금 나가 있는 버전
      <span className="inline-flex items-center gap-1 font-semibold text-sd-fg-muted">
        <DeviceIcon type="IOS" className="size-3.5" />
        {v(ios)}
      </span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1 font-semibold text-sd-fg-muted">
        <DeviceIcon type="ANDROID" className="size-3.5" />
        {v(android)}
      </span>
    </span>
  );
}
