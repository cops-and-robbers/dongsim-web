"use client";

import { useEffect, useReducer } from "react";
import Link from "next/link";
import { fetchQuery, useRelayEnvironment } from "react-relay";
import type {
  AdminUserGameHistories,
  AdminUserGameHistories$data,
} from "@/__generated__/AdminUserGameHistories.graphql";
import { AdminUserGameHistoriesQuery } from "@/lib/admin/gql/AdminUserGameHistories";
import { Button } from "@/components/admin/Button";
import { CardNote, ErrorBlock, SectionCard, TableSkeleton } from "@/components/admin/Parts";
import { Pill, TeamBadge } from "@/components/admin/StatusBadge";
import { SEEN_ROW_TITLE, Table, Td, Th, Tr } from "@/components/admin/Table";
import { END_REASON_LABEL, formatDateTime, formatDuration, labelOf } from "@/lib/admin/format";
import { isFieldNotDeployed } from "@/lib/admin/notDeployed";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import {
  finishedGamesReducer,
  gameOutcome,
  initialFinishedGames,
  limitFor,
  recordCounted,
  shownGames,
} from "@/lib/admin/userGames";

type Game = NonNullable<AdminUserGameHistories$data["adminUser"]>["gameHistories"][number];

// 끝난 게임 카드. 운영 서버에 아직 필드가 없어도 유저 상세의 다른 카드는 그대로 보이게 따로 읽는다.
// 빈 뼈대로 깜빡이지 않게 Suspense 대신 뒤에서 읽어, 펼치거나 새로 받는 동안 있던 줄을 그대로 둔다.
export function FinishedGamesCard({ userId }: { userId: string }) {
  const environment = useRelayEnvironment();
  const [state, dispatch] = useReducer(finishedGamesReducer<Game>, initialFinishedGames);
  const { expanded, attempt, loaded, failure } = state;
  // 판이 끝날 때만 늘어나서 지난 게임 목록과 같은 간격이면 충분하다. 배포 전에도 이 간격으로 물어, 릴리즈되면 새로고침 없이 표가 나온다
  const live = useLiveRefresh(60_000);

  useEffect(() => {
    let active = true;
    fetchQuery<AdminUserGameHistories>(
      environment,
      AdminUserGameHistoriesQuery,
      { id: userId, limit: limitFor(expanded) },
      { fetchPolicy: "network-only" }
    )
      .toPromise()
      .then((data) => {
        if (active) dispatch({ type: "loaded", games: data?.adminUser?.gameHistories ?? [], expanded });
      })
      .catch((error: Error) => {
        if (active) dispatch({ type: "failed", notDeployed: isFieldNotDeployed(error.message, "gameHistories"), expanded });
      });
    return () => {
      active = false;
    };
  }, [environment, userId, expanded, attempt, live]);

  const view = loaded ? shownGames(loaded.games, loaded.expanded) : null;

  return (
    <SectionCard
      title="끝난 게임"
      flush
      right={
        view && failure !== "not-deployed" ? (
          <span className="text-xs font-semibold text-sd-fg-subtle">{view.countLabel}</span>
        ) : undefined
      }
    >
      {failure === "not-deployed" ? (
        <p className="py-8 text-center text-sm text-sd-fg-subtle">
          서버 업데이트가 끝나면 끝난 게임 기록을 볼 수 있어요. 따로 할 일은 없어요.
        </p>
      ) : !view ? (
        failure === "other" ? (
          <ErrorBlock onRetry={() => dispatch({ type: "retry" })} />
        ) : (
          <TableSkeleton rows={4} />
        )
      ) : (
        <>
          {view.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-sd-fg-subtle">끝난 게임 기록이 없어요.</p>
          ) : (
            <Table
              head={
                <>
                  <Th>종료 시각</Th>
                  <Th>결과</Th>
                  <Th>팀</Th>
                  <Th>기록</Th>
                  <Th>종료 사유</Th>
                  <Th>진행 시간</Th>
                  <Th>구분</Th>
                </>
              }
            >
              {view.rows.map((game, i) => (
                <GameRow key={game.gameResultId} game={game} index={i} />
              ))}
            </Table>
          )}
          {view.hasMore && (
            <div className="flex flex-col items-center gap-2 border-t border-sd-hairline px-5 py-3">
              {failure === "more" && (
                <p role="alert" className="text-[13px] text-sd-critical">
                  더 불러오지 못했어요. 버튼을 다시 눌러 주세요.
                </p>
              )}
              <Button
                variant="neutral"
                size="sm"
                disabled={expanded}
                aria-busy={expanded}
                onClick={() => dispatch({ type: "expand" })}
              >
                {expanded ? "불러오는 중이에요" : "100판까지 더 보기"}
              </Button>
            </div>
          )}
          {view.capped && <CardNote>최근 100판까지만 볼 수 있어요.</CardNote>}
          <CardNote>기록은 2026년 8월 14일 밤부터 쌓였어요. 그 전 게임은 나오지 않아요.</CardNote>
        </>
      )}
    </SectionCard>
  );
}

function GameRow({ game, index }: { game: Game; index: number }) {
  // 방은 비면 지워지고 한 방에서 여러 판을 해서 gameId 로는 이 판을 찾을 수 없다. 판 기록 번호로 지난 게임 상세를 연다
  const href = `/admin/games/history/${game.gameResultId}`;
  return (
    <Tr index={index} href={href}>
      <Td className="whitespace-nowrap">
        <Link href={href} className={`font-semibold text-sd-fg transition hover:text-accent ${SEEN_ROW_TITLE}`}>
          {game.endedAt ? formatDateTime(game.endedAt) : "기록 보기"}
        </Link>
      </Td>
      <Td className="whitespace-nowrap">
        <Outcome game={game} />
      </Td>
      <Td>
        <TeamBadge team={game.team} />
      </Td>
      <Td className="whitespace-nowrap tabular-nums">
        <span className="inline-flex items-center gap-2">
          {recordCounted(game.endedAt)
            ? game.team === "POLICE"
              ? `체포 ${game.arrestCount}회`
              : `잡힘 ${game.arrestedCount}회`
            : "-"}
          {game.isMvp && <Pill tone={game.team === "POLICE" ? "blue" : "green"}>MVP</Pill>}
        </span>
      </Td>
      <Td className="whitespace-nowrap">{labelOf(END_REASON_LABEL, game.endReason)}</Td>
      <Td className="whitespace-nowrap tabular-nums">{formatDuration(game.durationSeconds)}</Td>
      <Td>
        {game.isHost || game.isEventGame ? (
          <span className="inline-flex items-center gap-2">
            {game.isHost && <span className="whitespace-nowrap font-semibold text-accent">방장</span>}
            {game.isEventGame && <Pill tone="slate">이벤트</Pill>}
          </span>
        ) : (
          <span className="text-sd-fg-subtle">-</span>
        )}
      </Td>
    </Tr>
  );
}

// 승패를 색으로만 말하지 않는다. 초록, 파랑은 이미 도둑, 경찰 뱃지가 쓰고 있어 글자 굵기로 나눈다
function Outcome({ game }: { game: Game }) {
  const outcome = gameOutcome(game);
  if (outcome === "left") return <Pill tone="amber">중도 퇴장</Pill>;
  if (outcome === "win") return <span className="font-semibold text-sd-fg">승리</span>;
  if (outcome === "lose") return <span className="text-sd-fg-subtle">패배</span>;
  return <span className="text-sd-fg-subtle">-</span>;
}
