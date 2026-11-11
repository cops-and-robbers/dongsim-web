"use client";

import Link from "next/link";
import { SectionCard } from "@/components/admin/Parts";
import { ChevronRightIcon } from "@/components/admin/icons";
import { SCHEDULE_HREF } from "@/components/admin/nav";
import { dayLabel } from "@/lib/metrics/dashboard/calendar";
import { CATEGORY_LABEL, type MetricsEvent } from "@/lib/metrics/events";
import { CATEGORY_DOT } from "./eventStyle";

/**
 * 이 기간 일정 (#302). 지표 화면 요약 탭 맨 아래.
 *
 * 일정을 넣고 고치는 곳은 어드민 "일정" 화면 하나다(EventsCalendar). 지표는 "그날 왜 숫자가 바뀌었나"만 물어서,
 * 지금 보는 기간의 일정을 읽기만 한다.
 * - 날짜마다 한 줄. 누르면 일정 화면에서 그날이 열린다
 * - 지난 날은 "7일 비교"로 그날부터 7일을 그 전 7일과 비교한다(#152). 달력에 있던 것을 그대로 옮겼다
 * - 앱 업데이트(자동)는 접어 둔다. 달력과 같이 목록에서 행사를 묻지 않게
 */

const isRelease = (e: MetricsEvent) => e.category === "release";
const shortRelease = (label: string) => label.replace(/ 출시$/, "");

export function ScheduleList({
  events,
  range,
  yesterday,
  onCompare,
}: {
  events: MetricsEvent[];
  range: { start: string; end: string };
  yesterday: string;
  onCompare: (day: string) => void;
}) {
  const inRange = events.filter((e) => e.day >= range.start && e.day <= range.end).sort((a, b) => a.day.localeCompare(b.day));
  const manual = inRange.filter((e) => !isRelease(e));
  const releases = inRange.filter(isRelease);
  const days = [...new Set(manual.map((e) => e.day))];

  return (
    <SectionCard
      title="이 기간 일정"
      right={
        <Link href={SCHEDULE_HREF} className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-sd-fg-subtle transition-colors hover:bg-sd-gray-200 hover:text-sd-fg">
          일정 넣기
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] leading-relaxed text-sd-fg-muted">차트의 마름모가 이 일정이에요. 넣고 고치는 건 일정 화면에서 해요.</p>
        {days.length === 0 && releases.length === 0 ? (
          <p className="text-[13px] text-sd-fg-subtle">이 기간에 적어 둔 일정이 없어요.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-sd-hairline">
            {days.map((day) => (
              <li key={day} className="flex items-center gap-2 py-1.5">
                <Link
                  href={`${SCHEDULE_HREF}?day=${day}`}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-1 py-1 text-[13px] transition-colors hover:bg-sd-gray-200"
                >
                  <span className="w-[6.5rem] shrink-0 tabular-nums text-sd-fg-muted">{dayLabel(day, true)}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    {manual
                      .filter((e) => e.day === day)
                      .map((e) => (
                        <span key={e.id} className="flex min-w-0 items-start gap-2">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[e.category]}`} aria-hidden />
                          <span className="min-w-0 break-words text-sd-fg">
                            {e.label}
                            <span className="ml-1.5 text-[12px] text-sd-fg-subtle">{CATEGORY_LABEL[e.category]}</span>
                          </span>
                        </span>
                      ))}
                  </span>
                </Link>
                {day <= yesterday && (
                  <button
                    type="button"
                    onClick={() => onCompare(day)}
                    title="이날부터 7일을 그 전 7일과 비교해요"
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-accent transition-colors hover:bg-accent-weak"
                  >
                    7일 비교
                  </button>
                )}
              </li>
            ))}
            {releases.length > 0 && (
              <li className="py-1.5">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-1 text-[13px] text-sd-fg-subtle hover:bg-sd-gray-200">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-sd-fg-subtle" aria-hidden />
                    앱 업데이트 {releases.length}개
                    <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                  </summary>
                  <ul className="mt-1 flex flex-col gap-1 pl-4 text-[13px]">
                    {releases.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 text-sd-fg-subtle">
                        <span className="w-[6.5rem] shrink-0 tabular-nums">{dayLabel(e.day, true)}</span>
                        {shortRelease(e.label)}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            )}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
