"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/Parts";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { dayLabel } from "@/lib/metrics/dashboard/calendar";
import type { EventReport as Report, ReportGame } from "@/lib/metrics/eventReport";
import type { MetricsEvent } from "@/lib/metrics/events";

/**
 * 행사 성적표 (#165). 지표 화면 요약 탭, 일정 달력 위.
 *
 * 지표 화면은 "사용자가 늘고 있나"를 보려고 운영진을 뺀다. 여기는 "행사에서 무엇을 했나"를 보려고
 * 운영진을 빼지 않고 나눠 보여 준다(운영진끼리 한 시연 판도 따로 센다). 계산은 lib/metrics/eventReport.ts.
 * - 행사 일정을 고르면 그 행사의 게임(일정의 시간과 장소로 찾은 판)과 그날 숫자를 평소와 나란히 본다
 * - 아직 열리지 않은 행사는 성적표 대신 준비 상태(시간, 장소)를 보여 준다. 장소가 없으면 그날 게임을 못 찾는다
 * - 차이는 "같은 날 함께 나타난 숫자"라고 적는다. 행사만의 효과라고 단정하지 않는다
 */

async function call(url: string): Promise<Response> {
  const send = () => fetch(url, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

const KIND: Record<ReportGame["kind"], string> = { staff: "운영진끼리", mixed: "방문객과 함께", users: "방문객만", unknown: "명단 없음" };
const num = (v: number | null, unit: string) => (v === null ? "-" : `${v.toLocaleString("ko-KR")}${unit}`);

type Loaded = { status: "ok"; report: Report; gamesError: string | null } | { status: "upcoming"; event: MetricsEvent };

export function EventReport({ today, refresh }: { today: string; refresh: unknown }) {
  const [events, setEvents] = useState<MetricsEvent[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [data, setData] = useState<{ id: number; body: Loaded } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 행사 일정 목록. 달력에서 넣거나 고치면 화면이 다시 불러와 refresh 가 바뀐다
  useEffect(() => {
    let alive = true;
    call("/api/admin/metrics/events")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as MetricsEvent[] | null;
        if (!alive || !res.ok || !Array.isArray(body)) return;
        setEvents(body.filter((e) => e.category === "event").sort((a, b) => b.day.localeCompare(a.day)));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [refresh]);

  // 처음엔 가장 가까운 행사: 앞으로 있을 행사 중 가장 이른 것, 없으면 가장 최근에 끝난 것
  const upcoming = (events ?? []).filter((e) => e.day >= today);
  const id = picked ?? (upcoming.at(-1) ?? events?.[0])?.id ?? null;

  useEffect(() => {
    if (id === null) return;
    let alive = true;
    call(`/api/admin/metrics/event-report?id=${id}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as (Loaded & { error?: string }) | null;
        if (!alive) return;
        if (!res.ok || !body || body.error) {
          setError(body?.error ?? "성적표를 못 불러왔어요.");
          setData(null);
        } else {
          setError(null);
          setData({ id, body });
        }
      })
      .catch(() => alive && setError("성적표를 못 불러왔어요."));
    return () => {
      alive = false;
    };
  }, [id, refresh]);

  if (events && events.length === 0) return null;
  const body = data?.id === id ? data.body : null;

  return (
    <SectionCard
      title="행사 성적표"
      right={
        events && (
          <select
            value={id ?? ""}
            onChange={(e) => setPicked(Number(e.target.value))}
            aria-label="행사 고르기"
            className="h-8 max-w-[220px] rounded-lg border border-sd-line bg-sd-surface px-2 text-[13px] text-sd-fg outline-none focus:border-accent"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {dayLabel(e.day)} {e.label}
              </option>
            ))}
          </select>
        )
      }
    >
      {error ? (
        <p className="text-[13px] text-sd-fg-subtle">{error}</p>
      ) : !body ? (
        <div className="h-40 animate-pulse rounded-xl bg-sd-gray-200" />
      ) : body.status === "upcoming" ? (
        <Upcoming event={body.event} />
      ) : (
        <Done report={body.report} gamesError={body.gamesError} />
      )}
    </SectionCard>
  );
}

function Upcoming({ event }: { event: MetricsEvent }) {
  const ready = [
    { ok: !!(event.startsAt && event.endsAt), text: event.startsAt && event.endsAt ? `시간 ${event.startsAt}~${event.endsAt}` : "시간이 없어요" },
    { ok: !!event.place, text: event.place ? `장소 반경 ${event.place.radiusM}m` : "장소 좌표가 없어요" },
  ];
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <p className="text-sd-fg">
        {dayLabel(event.day, true)}에 열려요. 끝난 다음 날부터 성적표를 볼 수 있어요.
      </p>
      <ul className="flex flex-col gap-1.5">
        {ready.map((r) => (
          <li key={r.text} className="flex items-center gap-2">
            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${r.ok ? "bg-sd-positive-weak text-sd-positive" : "bg-sd-warning-weak text-sd-warning"}`}>
              {r.ok ? "준비됨" : "필요해요"}
            </span>
            <span className="text-sd-fg">{r.text}</span>
          </li>
        ))}
      </ul>
      {!event.place && <p className="text-[12px] text-sd-fg-subtle">아래 달력에서 그날을 누르고 고치기로 장소 좌표를 넣어 주세요. 장소가 없으면 그 시간의 다른 곳 게임까지 행사 게임으로 잡혀요.</p>}
    </div>
  );
}

function Done({ report: r, gamesError }: { report: Report; gamesError: string | null }) {
  const e = r.event;
  const where = [e.startsAt && e.endsAt ? `${e.startsAt}~${e.endsAt}` : null, e.place ? `반경 ${e.place.radiusM}m` : null].filter(Boolean).join(", ");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[14px] font-semibold text-sd-fg">
          {dayLabel(e.day, true)} {e.label}
        </p>
        {where && <p className="mt-0.5 text-[12px] text-sd-fg-subtle">{where} 안에서 시작한 게임을 셌어요</p>}
      </div>

      {gamesError ? (
        <p className="text-[13px] text-sd-fg-subtle">게임 기록을 못 읽었어요 ({gamesError})</p>
      ) : !r.matchable ? (
        <p className="text-[13px] text-sd-fg-subtle">시간이나 장소가 없어 행사 게임을 찾지 못했어요. 아래 달력에서 넣어 주세요.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-sd-line bg-sd-hairline">
            <Stat label="행사 게임" value={`${r.totals.games}판`} line={r.totals.staffOnly ? `운영진끼리 ${r.totals.staffOnly}판 포함` : "모두 방문객과 함께"} />
            <Stat label="방문객 참가" value={`${r.totals.visitors}명`} line="판마다 더한 수" />
            <Stat label="운영진 참가" value={`${r.totals.staff}명`} line="판마다 더한 수" />
          </div>
          {r.games.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] tabular-nums">
                <thead>
                  <tr className="border-b border-sd-hairline text-left text-[12px] text-sd-fg-subtle">
                    <th className="py-1.5 pr-3 font-medium">시작</th>
                    <th className="py-1.5 pr-3 font-medium">방문객</th>
                    <th className="py-1.5 pr-3 font-medium">운영진</th>
                    <th className="py-1.5 pr-3 font-medium">진행</th>
                    <th className="py-1.5 font-medium">누가</th>
                  </tr>
                </thead>
                <tbody>
                  {r.games.map((g, i) => (
                    <tr key={`${g.start}-${i}`} className="border-b border-sd-hairline last:border-0">
                      <td className="py-1.5 pr-3 text-sd-fg">{g.start}</td>
                      <td className="py-1.5 pr-3 text-sd-fg">{g.visitors}명</td>
                      <td className="py-1.5 pr-3 text-sd-fg">{g.kind === "unknown" ? "-" : `${g.staff}명`}</td>
                      <td className="py-1.5 pr-3 text-sd-fg">{g.minutes}분</td>
                      <td className="py-1.5 text-sd-fg-muted">{KIND[g.kind]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {r.noRoster && (
            <p className="text-[12px] leading-relaxed text-sd-fg-subtle">
              참가자 명단 기록이 생기기 전(8월 17일 전) 게임이라 방문객은 끝까지 남은 인원만 셌어요. 중간에 나간 사람은 빠져 실제보다 적어요.
            </p>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-[13px] font-semibold text-sd-fg">그날 숫자와 평소</p>
        <table className="w-full text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-sd-hairline text-left text-[12px] text-sd-fg-subtle">
              <th className="py-1.5 pr-3 font-medium">지표</th>
              <th className="py-1.5 pr-3 text-right font-medium">그날</th>
              <th className="py-1.5 text-right font-medium">평소</th>
            </tr>
          </thead>
          <tbody>
            {r.metrics.map((m) => (
              <tr key={m.key} className="border-b border-sd-hairline last:border-0">
                <td className="py-1.5 pr-3 text-sd-fg">
                  {m.label}
                  {m.pending && <span className="ml-1.5 text-[11px] text-sd-fg-subtle">덜 들어왔어요</span>}
                </td>
                <td className="py-1.5 pr-3 text-right font-semibold text-sd-fg">{num(m.value, m.unit)}</td>
                <td className="py-1.5 text-right text-sd-fg-muted">{num(m.usual, m.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[12px] leading-relaxed text-sd-fg-subtle">
          {r.baseline.length
            ? `평소는 앞선 같은 요일 ${r.baseline.length}번(${r.baseline.map((d) => dayLabel(d)).join(", ")}) 평균이에요. 다른 행사 날은 뺐어요.`
            : "비교할 앞선 같은 요일이 없어요."}{" "}
          같은 날 함께 나타난 숫자라, 행사만의 효과라고 단정할 수는 없어요. 스토어 최초 설치의 Google Play 몫은 3~7일 늦게 들어와요.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, line }: { label: string; value: string; line: string }) {
  return (
    <div className="flex flex-col gap-1 bg-sd-surface px-4 py-3.5">
      <span className="text-[12px] font-medium text-sd-fg-muted">{label}</span>
      <span className="text-[20px] font-bold leading-tight text-sd-fg">{value}</span>
      <span className="text-[11px] text-sd-fg-subtle">{line}</span>
    </div>
  );
}
