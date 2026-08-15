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
  const teamOrder: Record<string, number> = { POLICE: 0, ROBBER: 1 };
  const participants = [...history.participants].sort(
    (a, b) => (teamOrder[a.team ?? ""] ?? 9) - (teamOrder[b.team ?? ""] ?? 9)
  );

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
              { term: "경찰 인원", desc: `${history.totalPoliceCount}명` },
              { term: "도둑 인원", desc: `${history.totalRobberCount}명` },
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
                    <ParticipantStatusBadge status={p.status} />
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
