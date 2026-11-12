"use client";

import { useState, type ReactNode } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { AdminGames } from "@/__generated__/AdminGames.graphql";
import type { AdminGamesPlaceNames } from "@/__generated__/AdminGamesPlaceNames.graphql";
import { AdminGamesQuery } from "@/lib/admin/gql/AdminGames";
import { AdminGamesPlaceNamesQuery } from "@/lib/admin/gql/AdminGamesPlaceNames";
import {
  PageHeader,
  Card,
  Pagination,
  EmptyBlock,
  TableSkeleton,
  ListPage,
} from "@/components/admin/Parts";
import { Table, Th, Tr, Td } from "@/components/admin/Table";
import { GameStatusBadge, Pill } from "@/components/admin/StatusBadge";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { GameTabs } from "@/components/admin/GameTabs";
import { RecentMenu } from "@/components/admin/RecentViewed";
import { Button } from "@/components/admin/Button";
import { InviteCode } from "@/components/admin/InviteCode";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { formatDate } from "@/lib/admin/format";
import { shortPlaceName } from "@/lib/admin/gameExtras";
import { useOptionalQuery } from "@/lib/admin/useOptionalQuery";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import { useClampPage, useListParams, useListScroll } from "@/lib/admin/useListParams";

// 게임은 끝나도 FINISHED로 남지 않고 다시 WAITING이 되며, 방이 비면 삭제된다.
// 그래서 조회되는 상태는 대기중·진행중 둘뿐이다. 지난 게임은 '지난 게임' 화면에서 본다.
type StatusFilter = "" | "WAITING" | "IN_PROGRESS";
const PAGE_SIZE = 20;

const PARAMS = { status: ["", "WAITING", "IN_PROGRESS"], dir: ["DESC", "ASC"] } as const;

export default function GamesPage() {
  const { current, shown, dim, set } = useListParams(PARAMS);
  const [fetchKey, setFetchKey] = useState(0);

  return (
    <ListPage>
      <PageHeader title="게임" description="지금 열려 있는 게임 방이에요. 화면을 보고 있는 동안 30초마다 목록을 새로 불러와요." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <GameTabs />
        <SegmentedControl<StatusFilter>
          value={current.status}
          onChange={(v) => set({ status: v })}
          options={[
            { label: "전체", value: "" },
            { label: "대기중", value: "WAITING" },
            { label: "진행중", value: "IN_PROGRESS" },
          ]}
        />
        <SegmentedControl<"DESC" | "ASC">
          value={current.dir}
          onChange={(v) => set({ dir: v })}
          options={[
            { label: "최신순", value: "DESC" },
            { label: "오래된순", value: "ASC" },
          ]}
        />
        <RecentMenu group="game" />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <QueryBoundary
          pending={<TableSkeleton />}
          onRetry={() => setFetchKey((k) => k + 1)}
        >
          <GamesResults
            variables={{
              page: shown.page,
              size: PAGE_SIZE,
              status: shown.status || undefined,
              sortDirection: shown.dir,
            }}
            fetchKey={fetchKey}
            dim={dim}
            onPage={(page) => set({ page })}
            emptyAction={
              shown.status !== "" ? (
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={() => set({ status: "", dir: "DESC", page: 0 })}
                >
                  필터 초기화
                </Button>
              ) : undefined
            }
          />
        </QueryBoundary>
      </Card>
    </ListPage>
  );
}

function GamesResults({
  variables,
  fetchKey,
  dim,
  onPage,
  emptyAction,
}: {
  variables: AdminGames["variables"];
  fetchKey: number;
  dim: boolean;
  onPage: (p: number) => void;
  emptyAction?: ReactNode;
}) {
  // 방 상태는 앱에서 바뀐다. 보던 목록은 그대로 두고 뒤에서 새로 받아 바꾼다(lib/admin/useLiveRefresh.ts)
  const live = useLiveRefresh();
  const data = useLazyLoadQuery<AdminGames>(AdminGamesQuery, variables, {
    fetchKey: `${fetchKey}-${live}`,
    fetchPolicy: "store-and-network",
  });
  const pageData = data.adminGames;
  // 동네 이름(BE #241)은 운영에 아직 없을 수 있어 같은 조건으로 따로 읽는다. 배포 전이면 칸을 아예 안 그린다.
  // 처음 보는 곳은 한 번에 5곳까지만 찾아서, 목록을 새로 받는 차례마다 같이 다시 물어 채운다
  const place = useOptionalQuery<AdminGamesPlaceNames>(AdminGamesPlaceNamesQuery, variables, "placeName", live);
  const placeById = new Map((place.data?.adminGames.content ?? []).map((g) => [g.id, g.placeName ?? null]));
  const showPlace = place.status !== "not-deployed" && !(place.status === "error" && !place.data);
  const scrollRef = useListScroll();
  const over = useClampPage(pageData, onPage);

  if (over) return null;

  if (pageData.content.length === 0) {
    const filtered = variables.status != null;
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock
          title={filtered ? "조건에 맞는 방이 없어요" : "열려 있는 방이 없어요"}
          description={
            filtered
              ? "필터를 바꾸거나 초기화해 보세요."
              : "새 게임 방이 만들어지면 여기에 표시돼요."
          }
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col transition-opacity ${dim ? "pointer-events-none opacity-50" : ""}`}
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <Table
        sticky
        head={
          <>
            <Th>초대코드</Th>
            {showPlace && <Th>동네</Th>}
            <Th>상태</Th>
            <Th>인원</Th>
            <Th>라운드</Th>
            <Th>구분</Th>
            <Th className="text-right">생성일</Th>
          </>
        }
      >
        {pageData.content.map((g, i) => (
          <Tr key={g.id} index={i} href={`/admin/games/${g.id}`}>
            <Td>
              <InviteCode code={g.inviteCode} gameId={g.id} />
            </Td>
            {showPlace && <PlaceCell known={placeById.has(g.id)} name={placeById.get(g.id) ?? null} />}
            <Td>
              <GameStatusBadge status={g.status} />
            </Td>
            <Td className="tabular-nums text-sd-fg-subtle">
              {g.participantCount}
              <span className="text-sd-disabled">
                /{g.maxParticipants}
              </span>
            </Td>
            <Td className="text-sd-fg-subtle">
              {g.roundDurationMinutes}분
            </Td>
            <Td>
              {g.isEventGame ? (
                <Pill tone="slate">이벤트</Pill>
              ) : (
                <span className="text-sd-disabled">일반</span>
              )}
            </Td>
            <Td className="text-right text-sd-fg-subtle">
              {formatDate(g.createdAt)}
            </Td>
          </Tr>
        ))}
      </Table>
      </div>

      <Pagination
        page={pageData.page}
        totalPages={pageData.totalPages}
        totalElements={pageData.totalElements}
        size={pageData.size}
        onPage={onPage}
      />
    </div>
  );
}

// 목록의 동네 칸. 시도를 떼고 짧게 보여 주고, 다 보려면 마우스를 올린다.
// 아직 안 받은 줄은 비워 두고, 받았는데 이름이 없으면(구역을 아직 안 정한 방, 못 찾은 곳) "-"
function PlaceCell({ known, name }: { known: boolean; name: string | null }) {
  if (!known) return <Td>{null}</Td>;
  if (!name) {
    return (
      <Td>
        <span className="text-sd-disabled" title="구역을 아직 정하지 않았거나 동네 이름을 찾지 못했어요">
          -
        </span>
      </Td>
    );
  }
  return (
    <Td className="max-w-[14rem] truncate text-sd-fg-muted" title={name}>
      {shortPlaceName(name)}
    </Td>
  );
}
