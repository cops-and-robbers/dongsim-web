"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useLazyLoadQuery } from "react-relay";
import type { AdminGameHistory } from "@/__generated__/AdminGameHistory.graphql";
import { AdminGameHistoryQuery } from "@/lib/admin/gql/AdminGameHistory";
import {
  PageHeader,
  SectionCard,
  DescriptionList,
  ScrollPage,
} from "@/components/admin/Parts";
import { Table, Th, Tr, Td } from "@/components/admin/Table";
import {
  TeamBadge,
  ParticipantStatusBadge,
  Pill,
} from "@/components/admin/StatusBadge";
import { Avatar } from "@/components/admin/Avatar";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { GameAreaMap } from "@/components/admin/maps";
import {
  END_REASON_LABEL,
  TEAM_LABEL,
  formatDateTime,
  formatDuration,
  labelOf,
} from "@/lib/admin/format";

export default function GameHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ScrollPage>
      <QueryBoundary pending={<DetailSkeleton />}>
        <HistoryDetail id={id} />
      </QueryBoundary>
    </ScrollPage>
  );
}

function HistoryDetail({ id }: { id: string }) {
  const data = useLazyLoadQuery<AdminGameHistory>(AdminGameHistoryQuery, { id });
  const history = data.adminGameHistory;

  const area = history.area;
  const forfeited =
    history.endReason === "POLICE_FORFEITED" ||
    history.endReason === "ROBBER_FORFEITED";

  // 진행 중인 게임 상세와 같은 순서로 보여준다. 경찰 먼저, 그다음 도둑.
  // 팀 안에서는 잘한 순서 - 경찰은 많이 잡을수록, 도둑은 덜 잡힐수록 위로.
  const teamOrder: Record<string, number> = { POLICE: 0, ROBBER: 1 };
  const recordOf = (p: (typeof history.participants)[number]) =>
    p.team === "POLICE" ? p.arrestCount : p.arrestedCount;
  const participants = [...history.participants].sort(
    (a, b) =>
      (teamOrder[a.team ?? ""] ?? 9) - (teamOrder[b.team ?? ""] ?? 9) ||
      (a.team === "POLICE"
        ? recordOf(b) - recordOf(a)
        : recordOf(a) - recordOf(b))
  );

  // 팀별 MVP - 경찰은 체포 최다, 도둑은 잡힘 최소(끝까지 잘 도망친 사람).
  // 명단 전체가 대상이므로 중도 퇴장자도 그대로 후보에 들어간다.
  // 팀 전원이 동률이면(전원 0회 등) 배지가 의미 없으니 달지 않는다. 동률 우승은 모두 MVP.
  const mvpRecord = (team: "POLICE" | "ROBBER"): number | null => {
    const records = history.participants
      .filter((p) => p.team === team)
      .map(recordOf);
    if (records.length === 0 || records.every((r) => r === records[0])) return null;
    return team === "POLICE" ? Math.max(...records) : Math.min(...records);
  };
  const bestRecord = {
    POLICE: mvpRecord("POLICE"),
    ROBBER: mvpRecord("ROBBER"),
  };

  // 인원은 명단(중도 퇴장자 포함) 기준으로 센다. BE의 totalPoliceCount 등은
  // 종료 시점 잔존 인원만이라 퇴장자가 있으면 명단과 어긋나 보여서다.
  // 몰수패처럼 명단이 비어 있는 옛 기록만 BE 집계로 돌아간다.
  const headcount = (team: "POLICE" | "ROBBER") => {
    const members = history.participants.filter((p) => p.team === team);
    const total =
      members.length ||
      (team === "POLICE" ? history.totalPoliceCount : history.totalRobberCount);
    const left = members.filter((p) => p.leftAt != null).length;
    return `${total}명${left > 0 ? ` (중도 퇴장 ${left})` : ""}`;
  };

  return (
    <>
      <PageHeader
        back={{ href: "/admin/games/history", label: "지난 게임" }}
        title={`${labelOf(TEAM_LABEL, history.winnerTeam)} 승`}
        description={formatDateTime(history.createdAt)}
        actions={
          <>
            <TeamBadge team={history.winnerTeam} />
            <Pill tone="slate">
              {labelOf(END_REASON_LABEL, history.endReason)}
            </Pill>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="게임 결과">
          <DescriptionList
            items={[
              { term: "경찰 인원", desc: headcount("POLICE") },
              { term: "도둑 인원", desc: headcount("ROBBER") },
              {
                term: "체포된 도둑",
                desc: `${history.arrestedRobberCount}/${history.totalRobberCount}명`,
              },
              { term: "총 체포 횟수", desc: `${history.totalArrestCount}회` },
              {
                term: "진행 시간",
                desc: formatDuration(history.durationSeconds),
              },
              { term: "종료 시각", desc: formatDateTime(history.createdAt) },
            ]}
          />
        </SectionCard>

        <SectionCard title="플레이 구역">
          {area ? (
            <>
              <GameAreaMap area={area} />
              {!hasJail(area) && (
                // 감옥 좌표는 2026-08-15 배포부터 쌓인다. 그 전 기록은 놀이터만 그려진다.
                <p className="mt-3 text-[13px] text-sd-fg-subtle">
                  이 기록에는 감옥 위치가 남아 있지 않아 놀이터 구역만 보여요.
                </p>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-sd-fg-subtle">
              좌표가 남아 있지 않은 기록이에요.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard
          title="참여자"
          flush
          right={
            <span className="text-xs font-semibold text-sd-fg-subtle">
              {history.participants.length}명
            </span>
          }
        >
          {history.participants.length === 0 ? (
            <p className="py-10 text-center text-sm text-sd-fg-subtle">
              {forfeited
                ? "모두 게임을 떠나서 남은 참여자 기록이 없어요."
                : "참여자 기록이 없어요."}
            </p>
          ) : (
            <Table
              head={
                <>
                  <Th>닉네임</Th>
                  <Th>팀</Th>
                  <Th>상태</Th>
                  <Th>기록</Th>
                </>
              }
            >
              {participants.map((p, i) => (
                <Tr key={p.userId} index={i}>
                  <Td>
                    <Link
                      href={`/admin/users/${p.userId}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar name={p.nickname} team={p.team} />
                      <span className="font-semibold text-sd-fg transition hover:text-accent">
                        {p.nickname}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <TeamBadge team={p.team} />
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <ParticipantStatusBadge status={p.status} />
                      {p.leftAt != null && <Pill tone="amber">중도 퇴장</Pill>}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span>
                        {p.team === "POLICE"
                          ? `체포 ${p.arrestCount}회`
                          : `잡힘 ${p.arrestedCount}회`}
                      </span>
                      {(p.team === "POLICE" || p.team === "ROBBER") &&
                        bestRecord[p.team] != null &&
                        recordOf(p) === bestRecord[p.team] && (
                          <Pill tone={p.team === "POLICE" ? "blue" : "green"}>
                            MVP
                          </Pill>
                        )}
                    </span>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </SectionCard>
      </div>
    </>
  );
}

// 원형이면 감옥 중심, 다각형이면 감옥 폴리곤이 있어야 지도에 감옥이 그려진다.
function hasJail(area: NonNullable<
  AdminGameHistory["response"]["adminGameHistory"]["area"]
>): boolean {
  return area.areaType === "POLYGON"
    ? (area.jailPolygon?.length ?? 0) > 0
    : area.jailCenterLat != null && area.jailRadiusInMeters != null;
}

function DetailSkeleton() {
  return (
    <>
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-sd-gray-200" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-sd-gray-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-sd-gray-200" />
      </div>
    </>
  );
}
