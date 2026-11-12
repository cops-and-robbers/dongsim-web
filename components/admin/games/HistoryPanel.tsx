"use client";

import Link from "next/link";
import { useLazyLoadQuery } from "react-relay";
import type { AdminGameHistory } from "@/__generated__/AdminGameHistory.graphql";
import type { AdminGameHistoryPlaceName } from "@/__generated__/AdminGameHistoryPlaceName.graphql";
import type { AdminGameHistoryRadio } from "@/__generated__/AdminGameHistoryRadio.graphql";
import { AdminGameHistoryQuery } from "@/lib/admin/gql/AdminGameHistory";
import { AdminGameHistoryPlaceNameQuery } from "@/lib/admin/gql/AdminGameHistoryPlaceName";
import { AdminGameHistoryRadioQuery } from "@/lib/admin/gql/AdminGameHistoryRadio";
import { useRecordRecent } from "@/components/admin/RecentViewed";
import { AreaCard } from "@/components/admin/games/AreaCard";
import { DetailHead, ExpandIcon, IconButton, Panel, Stats, Tag } from "@/components/admin/split/SplitParts";
import { END_REASON_LABEL, TEAM_LABEL, gameEndedAt, labelOf } from "@/lib/admin/format";
import { attachRadio, formatRadio, radioSummary } from "@/lib/admin/gameExtras";
import { clock, dayName, kstClock, kstTimeOfDay } from "@/lib/admin/people";
import { useOptionalQuery } from "@/lib/admin/useOptionalQuery";

type History = AdminGameHistory["response"]["adminGameHistory"];
type Row = History["participants"][number] & { radioSeconds: number | null };

/**
 * 끝난 판 상세 (#315, 시안 "경도 어드민 유저와 게임").
 * 누가 이겼는지와 끝난 이유를 글자와 팀 색으로만 보여 준다(캐릭터 그림은 정보를 더하지 않아 뺐다).
 * 위치, 결과 숫자 세 개, 팀별 기록, 경기 흐름 순서
 */
export function HistoryPanel({ id, page = false, userHref }: { id: string; page?: boolean; userHref: (userId: string) => string }) {
  const data = useLazyLoadQuery<AdminGameHistory>(AdminGameHistoryQuery, { id });
  const h = data.adminGameHistory;
  const endedAt = gameEndedAt(h);
  useRecordRecent("history", id, { title: `${labelOf(TEAM_LABEL, h.winnerTeam)} 승`, detail: `지난 게임 · ${dayName(endedAt)} ${kstClock(endedAt)}` });

  // 무전 시간(BE #239)과 동네 이름(BE #241)은 운영에 아직 없을 수 있어 따로 읽는다. 없으면 그 칸만 빠진다
  const radio = useOptionalQuery<AdminGameHistoryRadio>(AdminGameHistoryRadioQuery, { id }, "radioSeconds");
  const place = useOptionalQuery<AdminGameHistoryPlaceName>(AdminGameHistoryPlaceNameQuery, { id }, "placeName", 0, {
    // 처음 보는 곳은 이름을 찾는 데 몇 초 걸려 첫 응답엔 비어 있을 수 있다
    retryWhile: (d) => d.adminGameHistory?.area != null && d.adminGameHistory.area.placeName == null,
  });
  const rows = attachRadio(h.participants, radio.data?.adminGameHistory?.participants ?? null) as Row[];
  const showRadio = radio.status === "ready" && rows.some((p) => p.team === "POLICE") && h.isEventGame !== true;

  const host = h.hostUserId ? h.participants.find((p) => p.userId === h.hostUserId)?.nickname : null;
  const cop = h.winnerTeam === "POLICE";
  // 인원은 명단(중도 퇴장자 포함) 기준. BE 집계는 종료 시점 잔존 인원만이라 퇴장자가 있으면 명단과 어긋나 보인다.
  // 몰수패처럼 명단이 비어 있는 옛 기록만 BE 집계로 돌아간다
  const count = (team: "POLICE" | "ROBBER") => rows.filter((p) => p.team === team).length || (team === "POLICE" ? h.totalPoliceCount : h.totalRobberCount);

  return (
    <>
      <DetailHead
        title={
          <>
            <span className={cop ? "text-sd-info" : "text-sd-positive"}>{labelOf(TEAM_LABEL, h.winnerTeam)} 승</span>
            <span className="text-[17px] font-semibold tracking-normal text-sd-fg-subtle">{labelOf(END_REASON_LABEL, h.endReason)}</span>
            {h.isEventGame && <Tag>이벤트</Tag>}
          </>
        }
        sub={[`${dayName(endedAt)} ${kstTimeOfDay(endedAt)}에 끝남`, host ? `${host} 님의 방` : null].filter(Boolean).join(" · ")}
        actions={!page && <IconButton label="이 판만 크게 보기" href={`/admin/games/history/${h.id}`}><ExpandIcon /></IconButton>}
      />

      <AreaCard area={h.area} placeName={place.data?.adminGameHistory?.area?.placeName ?? null} shrinkTo={h.shrinkFinalRadiusInMeters} emptyText="좌표를 남기지 않던 때의 기록이라 위치가 없어요." />

      {/* 결과를 숫자 세 개로 줄였다. 체포는 잡힌 도둑 수와 전체 도둑 수 */}
      <Panel>
        <Stats
          items={[
            { label: "체포", value: h.arrestedRobberCount, unit: `/ ${h.totalRobberCount}명` },
            { label: "진행 시간", value: clock(h.durationSeconds) },
            { label: "인원", value: count("POLICE") + count("ROBBER"), unit: `명 (경찰 ${count("POLICE")} · 도둑 ${count("ROBBER")})` },
          ]}
        />
      </Panel>

      <Panel title="기록">
        {rows.length === 0 ? (
          <p className="text-[13.5px] text-sd-fg-subtle">
            {h.endReason === "POLICE_FORFEITED" || h.endReason === "ROBBER_FORFEITED" ? "모두 게임을 떠나서 남은 참가자 기록이 없어요." : "참가자 기록이 없어요."}
          </p>
        ) : (
          <>
            <TeamRecord team="POLICE" rows={rows} showRadio={showRadio} userHref={userHref} />
            <TeamRecord team="ROBBER" rows={rows} showRadio={false} userHref={userHref} />
            {showRadio && <p className="mt-3 text-[12.5px] text-sd-fg-subtle">무전은 2분마다 세서 실제보다 한 번 접속에 최대 2분 적게 나와요.</p>}
          </>
        )}
      </Panel>

      <FlowCard h={h} rows={rows} />
    </>
  );
}

// 막대는 같은 팀 안에서 누가 많이 했는지를 비교한다. MVP는 경찰은 가장 많이 잡은 사람, 도둑은 가장 덜 잡힌 사람.
// 팀 전원이 같은 값이면(전원 0회 등) MVP 를 달지 않고, 같은 값으로 1등이 여럿이면 모두 MVP
function TeamRecord({ team, rows, showRadio, userHref }: { team: "POLICE" | "ROBBER"; rows: readonly Row[]; showRadio: boolean; userHref: (id: string) => string }) {
  const cop = team === "POLICE";
  const members = rows.filter((p) => p.team === team);
  if (members.length === 0) return null;
  const val = (p: Row) => (cop ? p.arrestCount : p.arrestedCount);
  const values = members.map(val);
  const max = Math.max(1, ...values);
  const allSame = values.every((v) => v === values[0]);
  const best = cop ? Math.max(...values) : Math.min(...values);
  // 경찰은 잘한 순서(많이 잡을수록), 도둑도 잘한 순서(덜 잡힐수록)
  const sorted = [...members].sort((a, b) => (cop ? val(b) - val(a) : val(a) - val(b)));
  const radioTotal = radioSummary(members);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div className="[&+&]:mt-4 [&+&]:pt-3.5 [&+&]:shadow-[inset_0_1px_0_var(--sd-hairline)]">
      <div className="mb-1 flex items-baseline gap-2 text-[13.5px] font-bold">
        <span className={cop ? "text-sd-info" : "text-sd-positive"}>{TEAM_LABEL[team]}</span>
        <small className="text-[12.5px] font-medium tabular-nums text-sd-fg-subtle">{members.length}명</small>
        <small className="ml-auto text-[12.5px] font-medium tabular-nums text-sd-fg-subtle">
          {cop ? `체포 ${total}회` : `잡힌 횟수 ${total}회`}
          {showRadio && radioTotal.used > 0 ? ` · 무전 ${formatRadio(radioTotal.totalSeconds)}` : ""}
        </small>
      </div>
      {sorted.map((p, i) => {
        const v = val(p);
        const name = (
          <b className="flex min-w-0 items-center gap-1.5 font-semibold">
            <span className={`truncate ${p.userId ? "text-sd-fg" : "text-sd-fg-muted"}`}>{p.nickname}</span>
            {!allSame && v === best && <Tag tone="warn">MVP</Tag>}
            {p.userId == null && <Tag>탈퇴</Tag>}
            {p.leftAt != null && <Tag tone="warn">중도 퇴장</Tag>}
          </b>
        );
        const cells = (
          <>
            {name}
            {showRadio && (
              <span className="text-right text-[12.5px] tabular-nums text-sd-fg-subtle" title="무전 사용 시간">
                {p.radioSeconds == null ? "-" : p.radioSeconds > 0 ? `무전 ${formatRadio(p.radioSeconds)}` : "무전 안 씀"}
              </span>
            )}
            <span className="h-1.5 overflow-hidden rounded-[3px] bg-sd-gray-200" aria-hidden>
              <i className={`block h-full rounded-[3px] ${cop ? "bg-sd-info" : "bg-sd-positive"}`} style={{ width: `${(v / max) * 100}%` }} />
            </span>
            <span className="text-right font-bold tabular-nums text-sd-fg">{v}회</span>
          </>
        );
        const cls = `-mx-2.5 grid items-center gap-3 rounded-[10px] px-2.5 py-[7px] text-[14px] ${showRadio ? "grid-cols-[minmax(0,1fr)_76px_96px_40px]" : "grid-cols-[minmax(0,1fr)_120px_40px]"}`;
        // 이벤트 게임은 나갔다 다시 들어올 수 있어 같은 사람이 두 줄이 된다. 회원 번호만으로는 열쇠가 겹친다
        return p.userId ? (
          <Link key={`${p.userId}-${i}`} href={userHref(p.userId)} className={`${cls} hover:bg-sd-pressed`}>
            {cells}
          </Link>
        ) : (
          // 탈퇴하면 회원 번호가 지워져(BE #223) 갈 회원 화면이 없다
          <div key={`left-${i}`} className={cls}>
            {cells}
          </div>
        );
      })}
    </div>
  );
}

// 서버에는 시작, 끝, 중간에 나간 시각만 있다. 그래서 나간 사람을 시간 막대 위에 찍는다. 체포 시각은 기록되지 않는다
function FlowCard({ h, rows }: { h: History; rows: readonly Row[] }) {
  const end = Date.parse(gameEndedAt(h));
  const start = h.startedAt ? Date.parse(h.startedAt) : end - h.durationSeconds * 1000;
  const span = Math.max(1, end - start);
  const lefts = rows.filter((p) => p.leftAt != null).map((p) => ({ p, at: Date.parse(p.leftAt as string) }));
  const sub = [h.roundNumber != null ? `${h.roundNumber}라운드` : null, h.locationRevealIntervalMinutes != null ? `위치 공개 ${h.locationRevealIntervalMinutes}분마다` : null].filter(Boolean).join(" · ");
  return (
    <Panel title="경기 흐름" right={sub || undefined}>
      <div className="relative mt-1 h-2 rounded-full bg-sd-gray-200">
        <span className={`absolute inset-y-0 left-0 right-0 rounded-full ${h.winnerTeam === "POLICE" ? "bg-sd-info/30" : "bg-sd-positive/30"}`} />
        {lefts.map(({ p, at }, i) => {
          const x = Math.min(100, Math.max(0, ((at - start) / span) * 100));
          return (
            <span
              key={i}
              title={`${p.nickname} ${kstClock(p.leftAt as string)}에 나감`}
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sd-surface bg-sd-warning"
              style={{ left: `${x}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[12.5px] tabular-nums text-sd-fg-subtle">
        <span>{h.startedAt ? `${kstClock(h.startedAt)} 시작` : "시작"}</span>
        <span>{kstClock(gameEndedAt(h))} 끝</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-sd-fg-muted">
        {lefts.length === 0
          ? "중간에 나간 사람이 없어요."
          : lefts
              .sort((a, b) => a.at - b.at)
              .map(({ p }) => `${p.nickname}(${TEAM_LABEL[p.team] ?? p.team}) ${kstClock(p.leftAt as string)}에 나감`)
              .join(", ")}
      </p>
    </Panel>
  );
}
