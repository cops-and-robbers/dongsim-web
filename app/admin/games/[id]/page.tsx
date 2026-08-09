"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useLazyLoadQuery } from "react-relay";
import type { AdminGame } from "@/__generated__/AdminGame.graphql";
import { AdminGameQuery } from "@/lib/admin/gql/AdminGame";
import {
  PageHeader,
  SectionCard,
  DescriptionList,
  EmptyBlock,
  ScrollPage,
} from "@/components/admin/Parts";
import { Table, Th, Tr, Td } from "@/components/admin/Table";
import {
  GameStatusBadge,
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

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ScrollPage>
      <QueryBoundary pending={<DetailSkeleton />}>
        <GameDetail id={id} />
      </QueryBoundary>
    </ScrollPage>
  );
}

function GameDetail({ id }: { id: string }) {
  const data = useLazyLoadQuery<AdminGame>(AdminGameQuery, { id });
  const game = data.adminGame;

  if (!game) {
    return (
      <>
        <PageHeader back={{ href: "/admin/games", label: "게임 목록" }} title="게임" />
        <EmptyBlock
          title="게임을 찾을 수 없어요"
          description="삭제되었거나 잘못된 주소일 수 있어요."
        />
      </>
    );
  }

  const result = game.result;
  const area = game.area;

  // 참가자는 경찰 먼저, 그다음 도둑 순으로 보여준다. 같은 팀 안에서는 방장을 위로.
  const teamOrder: Record<string, number> = { POLICE: 0, ROBBER: 1 };
  const participants = [...game.participants].sort(
    (a, b) =>
      (teamOrder[a.team ?? ""] ?? 9) - (teamOrder[b.team ?? ""] ?? 9) ||
      Number(b.isHost) - Number(a.isHost)
  );

  return (
    <>
      <PageHeader
        back={{ href: "/admin/games", label: "게임 목록" }}
        title={<span className="font-mono">{game.inviteCode}</span>}
        description={`게임 ID ${game.id}`}
        actions={
          <>
            {game.isEventGame && <Pill tone="slate">이벤트</Pill>}
            <GameStatusBadge status={game.status} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="게임 설정">
          <DescriptionList
            items={[
              { term: "라운드 시간", desc: `${game.roundDurationMinutes}분` },
              {
                term: "위치 공개 주기",
                desc: `${game.locationRevealIntervalMinutes}분`,
              },
              { term: "경찰 대기", desc: `${game.policeWaitMinutes}분` },
              { term: "최대 인원", desc: `${game.maxParticipants}명` },
              { term: "생성 시각", desc: formatDateTime(game.createdAt) },
              { term: "시작 시각", desc: formatDateTime(game.startedAt) },
            ]}
          />
        </SectionCard>

        <SectionCard title="게임 위치">
          {area ? (
            <GameAreaMap area={area} />
          ) : (
            <p className="py-10 text-center text-sm text-sd-fg-subtle">
              구역이 아직 설정되지 않았어요.
            </p>
          )}
        </SectionCard>
      </div>

      {result && (
        <div className="mt-5">
          <SectionCard title="게임 결과">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-sd-fg-subtle">
                승리
              </span>
              <TeamBadge team={result.winnerTeam} />
              <span className="text-sm font-bold text-sd-fg">
                {labelOf(TEAM_LABEL, result.winnerTeam)} 승
              </span>
              <span className="ml-1 rounded-md bg-sd-gray-200 px-2 py-0.5 text-[12px] font-semibold text-sd-fg-subtle">
                {labelOf(END_REASON_LABEL, result.endReason)}
              </span>
            </div>
            <DescriptionList
              items={[
                { term: "경찰 인원", desc: `${result.totalPoliceCount}명` },
                { term: "도둑 인원", desc: `${result.totalRobberCount}명` },
                {
                  term: "체포된 도둑",
                  desc: `${result.arrestedRobberCount}명`,
                },
                {
                  term: "소요 시간",
                  desc: formatDuration(result.durationSeconds),
                },
              ]}
            />
          </SectionCard>
        </div>
      )}

      <div className="mt-5">
        <SectionCard
          title="참가자"
          flush
          right={
            <span className="text-xs font-semibold text-sd-fg-subtle">
              {game.participants.length}명
            </span>
          }
        >
          {game.participants.length === 0 ? (
            <p className="py-10 text-center text-sm text-sd-fg-subtle">
              참가자가 없어요.
            </p>
          ) : (
            <Table
              head={
                <>
                  <Th>닉네임</Th>
                  <Th>팀</Th>
                  <Th>상태</Th>
                  <Th>방장</Th>
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
                  <Td>
                    {p.isHost ? (
                      <span className="font-semibold text-accent">
                        방장
                      </span>
                    ) : (
                      <span className="text-sd-fg-subtle">-</span>
                    )}
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
