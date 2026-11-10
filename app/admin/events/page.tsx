"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ErrorBlock, PageHeader, ScrollPage, SectionCard } from "@/components/admin/Parts";
import { Pill } from "@/components/admin/StatusBadge";
import { ChevronRightIcon } from "@/components/admin/icons";
import { SCHEDULE_HREF } from "@/components/admin/nav";
import { fetchEvents } from "@/lib/admin/eventsClient";
import type { EventsList, EventsListItem } from "@/lib/event/adminApi";
import { boothState, dateLabelOf, kstNow, readiness, toMs } from "@/lib/event/settings";

// 어드민 "행사" 목록 (#219, docs/admin-ui.md "행사").
// 행사는 일정(#302)에서 성격을 행사로 둔 날이다. 여기서 새로 만들지 않는다(일정 하나를 두 곳에서 만들면 갈린다).
// 오늘 행사가 있으면 맨 위에 크게 둔다. 행사 날 현장에서 폰으로 들어와 바로 누르게.

export default function EventsPage() {
  const [data, setData] = useState<EventsList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(() => {
    fetchEvents()
      .then((d) => {
        setError(null);
        setData(d);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const today = kstNow(now).slice(0, 10);
  const items = data?.items ?? [];
  const live = items.filter((i) => i.event.day === today || boothState(i.settings, now) === "open");
  const upcoming = items.filter((i) => i.event.day > today && !live.includes(i)).sort((a, b) => a.event.day.localeCompare(b.event.day));
  const past = items.filter((i) => i.event.day < today && !live.includes(i));

  return (
    <ScrollPage>
      <PageHeader
        title="행사"
        description="포토부스, 홈 팝업, 행사 페이지를 행사 하나로 정해요. 행사는 일정에서 성격을 “행사”로 둔 날이에요."
      />
      {error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : !data ? (
        <div aria-busy className="animate-pulse space-y-4">
          <div className="h-40 rounded-2xl bg-sd-gray-200" />
          <div className="h-56 rounded-2xl bg-sd-gray-200" />
        </div>
      ) : (
        <div className="space-y-5">
          {live.map((i) => (
            <LiveCard key={i.event.id} item={i} now={now} />
          ))}
          <SectionCard title="다가오는 행사" flush>
            {upcoming.length ? (
              <Rows items={upcoming} today={today} />
            ) : (
              <p className="px-5 py-6 text-[14px] leading-relaxed text-sd-fg-subtle">
                다가오는 행사가 없어요. 일정 달력에서 날짜를 누르고 성격을 “행사”로 넣으면 여기 생겨요.{" "}
                <Link href={SCHEDULE_HREF} className="font-semibold text-accent hover:underline">
                  일정으로 가기
                </Link>
              </p>
            )}
          </SectionCard>
          {past.length > 0 && (
            <SectionCard title="지난 행사" flush>
              <Rows items={past} today={today} muted />
            </SectionCard>
          )}
        </div>
      )}
    </ScrollPage>
  );
}

/** 오늘 행사. 부스 상태를 크게 */
function LiveCard({ item, now }: { item: EventsListItem; now: number }) {
  const state = boothState(item.settings, now);
  const label = { before: "부스 열리기 전", open: "부스 열려 있어요", after: "부스 운영이 끝났어요", closed: "부스를 닫아 두었어요" }[state];
  const dot = { before: "bg-sd-info", open: "bg-sd-positive", after: "bg-sd-gray-400", closed: "bg-sd-critical" }[state];
  return (
    <Link
      href={`/admin/events/${item.event.id}`}
      className="flex items-center gap-4 rounded-2xl border border-sd-line bg-sd-surface px-5 py-4 transition-colors hover:bg-sd-fill"
    >
      <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-sd-fg-subtle">오늘 행사</p>
        <p className="mt-0.5 truncate text-[18px] font-bold text-sd-fg">{item.settings.name}</p>
        <p className="mt-0.5 text-[13px] text-sd-fg-muted">
          {label}
          {state === "before" && ` · ${item.settings.boothFrom.slice(11)}에 열려요`}
          {state === "open" && ` · ${item.settings.boothUntil.slice(11)}에 닫혀요`}
        </p>
      </div>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-sd-fg-subtle" />
    </Link>
  );
}

function Rows({ items, today, muted = false }: { items: EventsListItem[]; today: string; muted?: boolean }) {
  return (
    <ul>
      {items.map((i) => {
        const days = Math.round((toMs(`${i.event.day}T00:00`) - toMs(`${today}T00:00`)) / 86_400_000);
        const left = i.configured ? readiness(i.event, i.settings).filter((c) => c.level !== "ok").length : null;
        return (
          <li key={i.event.id} className="border-b border-sd-hairline last:border-b-0">
            <Link href={`/admin/events/${i.event.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-sd-fill">
              <span className="w-14 shrink-0">{days > 0 ? <Pill tone="blue">D-{days}</Pill> : <Pill tone="slate">끝</Pill>}</span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[15px] font-semibold ${muted ? "text-sd-fg-muted" : "text-sd-fg"}`}>{i.settings.name}</p>
                <p className="mt-0.5 truncate text-[13px] text-sd-fg-subtle">
                  {dateLabelOf(i.event)}
                  {i.settings.location && ` · ${i.settings.location}`}
                </p>
              </div>
              {!muted && (
                <span className="hidden shrink-0 text-right text-[13px] sm:block">
                  {left === null ? (
                    <span className="text-sd-fg-subtle">아직 저장 안 함</span>
                  ) : left > 0 ? (
                    <span className="font-semibold text-sd-warning">준비 {left}개 남음</span>
                  ) : (
                    <span className="text-sd-positive">준비 끝</span>
                  )}
                </span>
              )}
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-sd-fg-subtle" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
