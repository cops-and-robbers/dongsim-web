"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, ScrollPage } from "@/components/admin/Parts";
import { FadeIn } from "@/components/admin/motion";
import { EventReport } from "@/components/admin/metrics/EventReport";
import { EventsCalendar } from "@/components/admin/metrics/EventsCalendar";
import { addDays, todayIn } from "@/lib/metrics/dates";

// 일정 (#302, docs/metrics-events.md). 팀이 한 일과 할 일(행사, 홍보, 출시, 테스트)을 적는 곳.
// 지표 차트의 마름모, 행사, 동심지키미 소개, 출시가 이 일정을 읽는다. 예전엔 지표 요약 탭 맨 아래에 있어서
// 행사 하나를 넣으려 해도 지표 화면을 끝까지 내려야 했다.
// - ?day=YYYY-MM-DD 로 들어오면 그날을 열어 두고, 그날 행사가 있으면 성적표도 그 행사로 연다
//   (지표의 "이 기간 일정"에서 고치러 올 때, 행사 화면의 "성적표 보기")
// - 지난 일정의 "이날부터 7일 비교"는 지표 화면으로 넘긴다

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default function SchedulePage() {
  const router = useRouter();
  const param = useSearchParams().get("day");
  const day = param && YMD.test(param) ? param : null;
  const today = todayIn("Asia/Seoul");
  // 달력에서 넣거나 고치거나 게임을 고르면 성적표를 다시 읽는다
  const [version, setVersion] = useState(0);

  const compare = (d: string) => {
    // 숫자는 어제까지 있다. 지표 화면이 하던 것과 같이 그날부터 7일을 그 전 같은 길이와 비교한다
    const yesterday = addDays(today, -1);
    const to = addDays(d, 6) > yesterday ? yesterday : addDays(d, 6);
    router.push(`/admin/metrics?from=${d}&to=${to}`);
  };

  return (
    <ScrollPage>
      <PageHeader title="일정" description="행사, 홍보, 테스트처럼 팀이 한 일과 할 일을 적어요. 지표 차트와 행사, 동심지키미 소개가 이 일정을 같이 써요." />
      <div className="flex flex-col gap-6 pb-10">
        <FadeIn>
          <EventReport today={today} refresh={version} initialDay={day ?? undefined} />
        </FadeIn>
        <FadeIn delay={0.04}>
          {/* 주소의 날짜가 바뀌면(다른 일정에서 고치러 오면) 그날로 다시 연다 */}
          <EventsCalendar key={day ?? "now"} initialMonth={day ?? today} initialDay={day ?? undefined} today={today} onChanged={() => setVersion((n) => n + 1)} onCompare={compare} />
        </FadeIn>
      </div>
    </ScrollPage>
  );
}
