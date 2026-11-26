"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchQuery, useLazyLoadQuery, useRelayEnvironment } from "react-relay";
import type { AdminGameHistories, GameEndReason } from "@/__generated__/AdminGameHistories.graphql";
import type { AdminGameHistoriesPlaceNames } from "@/__generated__/AdminGameHistoriesPlaceNames.graphql";
import { AdminGameHistoriesQuery } from "@/lib/admin/gql/AdminGameHistories";
import { AdminGameHistoriesPlaceNamesQuery } from "@/lib/admin/gql/AdminGameHistoriesPlaceNames";
import { Card, EmptyBlock, ListPage, PageHeader, Pagination, TableSkeleton } from "@/components/admin/Parts";
import { LAST_ROW_TITLE, Table, Td, Th, Tr } from "@/components/admin/Table";
import { Button } from "@/components/admin/Button";
import { RecentMenu } from "@/components/admin/RecentViewed";
import { ListViewSwitch } from "@/components/admin/ListViewSwitch";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { GAME_FILTERS } from "@/components/admin/games/GameList";
import { Chip, LiveDot, Segmented, Tag } from "@/components/admin/split/SplitParts";
import { END_REASON_LABEL, TEAM_LABEL, gameEndedAt, labelOf } from "@/lib/admin/format";
import { shortPlaceName, waitingStage } from "@/lib/admin/gameExtras";
import { ago, dayName, durationText, kstClock } from "@/lib/admin/people";
import { useClampPage, useListParams, useListScroll } from "@/lib/admin/useListParams";
import type { LiveRoom } from "@/lib/admin/useLiveRooms";

const PAGE_SIZE = 20;

// 두 칸 보기와 같은 주소 이름(tab, f)을 써서 보기를 바꿔도 탭과 거르기가 그대로 남는다
const PARAMS = {
  tab: ["done", "rooms"],
  f: GAME_FILTERS.map((x) => x.value),
} as const;

/**
 * 게임 표 보기 (docs/admin-ui.md "목록 보기 고르기"). 두 칸 보기와 같은 두 탭(끝난 판, 지금 방)을 표로 본다.
 * 줄을 누르면 전체 화면 상세로 가고, 돌아오면 탭, 거르기, 쪽, 스크롤 위치가 그대로다
 */
export function GamesTable({ rooms, roomsReady, refreshKey }: { rooms: readonly LiveRoom[]; roomsReady: boolean; refreshKey: number }) {
  const { current, shown, dim, set } = useListParams(PARAMS);
  const playing = rooms.filter((r) => r.live);

  return (
    <ListPage>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <PageHeader
          title="게임"
          description="줄을 누르면 전체 화면으로 열려요. 돌아오면 보던 자리 그대로예요."
          actions={
            <>
              <RecentMenu group="game" />
              <ListViewSwitch />
            </>
          }
        />

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="w-[280px]">
            <Segmented
              group="game-tab-table"
              label="게임 목록 나누기"
              value={current.tab}
              onChange={(v) => set({ tab: v })}
              options={[
                { value: "done", label: "끝난 판" },
                {
                  value: "rooms",
                  label: (
                    <>
                      지금 방
                      {playing.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold tabular-nums text-sd-positive" aria-label={`게임 중 ${playing.length}`}>
                          <LiveDot live />
                          {playing.length}
                        </span>
                      )}
                    </>
                  ),
                },
              ]}
            />
          </div>
          {current.tab === "done" && (
            <div className="flex flex-wrap gap-1.5">
              {GAME_FILTERS.map((f) => (
                <Chip key={f.value || "all"} group="end-reason-table" on={current.f === f.value} onClick={() => set({ f: f.value })}>
                  {f.label}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {shown.tab === "rooms" ? (
            <RoomsTable rooms={rooms} ready={roomsReady} />
          ) : (
            <QueryBoundary pending={<TableSkeleton />}>
              <HistoriesTable
                endReason={(shown.f || null) as GameEndReason | null}
                page={shown.page}
                refreshKey={refreshKey}
                dim={dim}
                onPage={(page) => set({ page })}
                onReset={() => set({ f: "", page: 0 })}
              />
            </QueryBoundary>
          )}
        </Card>
      </div>
    </ListPage>
  );
}

function HistoriesTable({
  endReason,
  page,
  refreshKey,
  dim,
  onPage,
  onReset,
}: {
  endReason: GameEndReason | null;
  page: number;
  refreshKey: number;
  dim: boolean;
  onPage: (p: number) => void;
  onReset: () => void;
}) {
  const variables = { page, size: PAGE_SIZE, endReason: endReason ?? undefined, sortDirection: "DESC" as const };
  // 판이 끝날 때마다 기록이 는다. 방 상태와 같은 차례(30초)로 뒤에서 새로 받는다
  const data = useLazyLoadQuery<AdminGameHistories>(AdminGameHistoriesQuery, variables, { fetchKey: refreshKey, fetchPolicy: "store-and-network" });
  const pageData = data.adminGameHistories;
  const places = usePlaceNames(page, endReason, refreshKey);
  const scrollRef = useListScroll();
  const over = useClampPage(pageData, onPage);
  if (over) return null;

  if (pageData.content.length === 0)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock
          title={endReason ? "조건에 맞는 판이 없어요" : "아직 끝난 게임이 없어요"}
          description={endReason ? "끝난 이유를 바꿔 보세요." : "게임이 끝나면 여기에 쌓여요."}
          action={
            endReason ? (
              <Button variant="neutral" size="sm" onClick={onReset}>
                거르기 지우기
              </Button>
            ) : undefined
          }
        />
      </div>
    );

  return (
    <div className={`flex min-h-0 flex-1 flex-col transition-opacity ${dim ? "pointer-events-none opacity-50" : ""}`}>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <Table
          sticky
          head={
            <>
              <Th>결과</Th>
              <Th>동네</Th>
              <Th>인원</Th>
              <Th className="text-right">체포</Th>
              <Th className="text-right">진행 시간</Th>
              <Th>방장</Th>
              <Th className="text-right">끝난 시각</Th>
            </>
          }
        >
          {pageData.content.map((h, i) => {
            const href = `/admin/games/history/${h.id}`;
            const cop = h.winnerTeam === "POLICE";
            const host = h.hostUserId ? h.participants.find((p) => p.userId === h.hostUserId)?.nickname : null;
            const place = places.get(h.id);
            const ended = gameEndedAt(h);
            return (
              <Tr key={h.id} index={i} href={href}>
                <Td>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Link href={href} className={`font-bold ${cop ? "text-sd-info" : "text-sd-positive"} ${LAST_ROW_TITLE}`}>
                      {labelOf(TEAM_LABEL, h.winnerTeam)} 승
                    </Link>
                    <span className="text-sd-fg-subtle">· {labelOf(END_REASON_LABEL, h.endReason)}</span>
                    {h.isEventGame && <Tag>이벤트</Tag>}
                  </span>
                </Td>
                <Td className="max-w-[220px] truncate text-sd-fg-muted" title={place ?? undefined}>
                  {place ? shortPlaceName(place) : <span className="text-sd-disabled">-</span>}
                </Td>
                <Td className="whitespace-nowrap tabular-nums text-sd-fg-subtle">
                  경찰 {h.totalPoliceCount} · 도둑 {h.totalRobberCount}
                </Td>
                <Td className="text-right tabular-nums text-sd-fg-muted">
                  {h.arrestedRobberCount}/{h.totalRobberCount}
                </Td>
                <Td className="whitespace-nowrap text-right tabular-nums text-sd-fg-muted">{durationText(h.durationSeconds)}</Td>
                <Td className="max-w-[160px] truncate text-sd-fg-muted">{host ?? <span className="text-sd-disabled">-</span>}</Td>
                <Td className="whitespace-nowrap text-right tabular-nums text-sd-fg-subtle">
                  {dayName(ended)} {kstClock(ended)}
                </Td>
              </Tr>
            );
          })}
        </Table>
      </div>
      <Pagination page={pageData.page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} size={pageData.size} onPage={onPage} />
    </div>
  );
}

// 동네 이름은 운영에 아직 없을 수 있어(BE #241) 같은 조건으로 따로 묻는다. 없으면 칸만 비운다
function usePlaceNames(page: number, endReason: GameEndReason | null, refreshKey: number): ReadonlyMap<string, string | null> {
  const environment = useRelayEnvironment();
  const [names, setNames] = useState<ReadonlyMap<string, string | null>>(new Map());
  useEffect(() => {
    let alive = true;
    fetchQuery<AdminGameHistoriesPlaceNames>(environment, AdminGameHistoriesPlaceNamesQuery, { page, size: PAGE_SIZE, endReason: endReason ?? undefined, sortDirection: "DESC" }, { fetchPolicy: "network-only" })
      .toPromise()
      .then((d) => alive && setNames(new Map((d?.adminGameHistories.content ?? []).map((h) => [h.id, h.area?.placeName ?? null]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [environment, page, endReason, refreshKey]);
  return names;
}

// 지금 방. 게임 중이 위, 대기 중이 아래(두 칸 보기와 같은 순서). 방은 한 번에 많아야 수십 개라 쪽을 나누지 않는다
function RoomsTable({ rooms, ready }: { rooms: readonly LiveRoom[]; ready: boolean }) {
  const scrollRef = useListScroll();
  if (!ready) return <TableSkeleton />;
  if (rooms.length === 0)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock title="지금 열린 방이 없어요" description="방이 열리면 여기에 보여요. 30초마다 새로 받아요." />
      </div>
    );
  const sorted = [...rooms.filter((r) => r.live), ...rooms.filter((r) => !r.live)];
  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <Table
        sticky
        head={
          <>
            <Th>방</Th>
            <Th>상태</Th>
            <Th>동네</Th>
            <Th>인원</Th>
            <Th className="text-right">시작, 만듦</Th>
          </>
        }
      >
        {sorted.map((r, i) => {
          const href = `/admin/games/${r.id}`;
          const pol = r.people?.filter((p) => p.team === "POLICE").length ?? 0;
          const rob = r.people?.filter((p) => p.team === "ROBBER").length ?? 0;
          const teams = r.people && (r.live || pol + rob > 0) ? `경찰 ${pol} · 도둑 ${rob}` : `${r.participantCount}명`;
          return (
            <Tr key={r.id} index={i} href={href}>
              <Td>
                <span className="flex items-center gap-1.5">
                  <Link href={href} className={`font-bold tracking-[0.06em] tabular-nums ${r.live ? "text-sd-fg" : "text-sd-fg-muted"} ${LAST_ROW_TITLE}`}>
                    {r.inviteCode}
                  </Link>
                  {r.isEventGame && <Tag>이벤트</Tag>}
                </span>
              </Td>
              <Td>
                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold ${r.live ? "text-sd-positive" : "text-sd-fg-subtle"}`}>
                  <LiveDot live={r.live} />
                  {r.live ? "게임 중" : "대기 중"}
                  {!r.live && <span className="font-medium">· {waitingStage(r.roundNumber)}</span>}
                </span>
              </Td>
              <Td className="max-w-[220px] truncate text-sd-fg-muted" title={r.placeName ?? undefined}>
                {r.placeName ? shortPlaceName(r.placeName) : <span className="text-sd-disabled">-</span>}
              </Td>
              <Td className="whitespace-nowrap tabular-nums text-sd-fg-subtle">{r.isEventGame ? teams : `${teams} / ${r.maxParticipants}명`}</Td>
              <Td className="whitespace-nowrap text-right tabular-nums text-sd-fg-subtle">
                {r.live && r.startedAt ? `${ago(r.startedAt)} 시작` : `${ago(r.createdAt)} 만듦`}
              </Td>
            </Tr>
          );
        })}
      </Table>
    </div>
  );
}
