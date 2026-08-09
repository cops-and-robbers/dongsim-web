"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { AdminGames } from "@/__generated__/AdminGames.graphql";
import { AdminGamesQuery } from "@/lib/admin/gql/AdminGames";
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
import { Button } from "@/components/admin/Button";
import { InviteCode } from "@/components/admin/InviteCode";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { formatDate } from "@/lib/admin/format";

type StatusFilter = "" | "WAITING" | "IN_PROGRESS" | "FINISHED" | "CANCELED";
const PAGE_SIZE = 20;

function initStatusFilter(): StatusFilter {
  if (typeof window === "undefined") return "";
  const s = new URLSearchParams(window.location.search).get("status");
  return (["WAITING", "IN_PROGRESS", "FINISHED", "CANCELED"] as string[]).includes(s ?? "")
    ? (s as StatusFilter)
    : "";
}

export default function GamesPage() {
  const [status, setStatus] = useState<StatusFilter>(initStatusFilter);
  const [dir, setDir] = useState<"DESC" | "ASC">("DESC");
  const [page, setPage] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const update = (fn: () => void) => startTransition(fn);

  return (
    <ListPage>
      <PageHeader title="게임" description="생성된 게임 세션과 결과를 조회해요." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={(v) =>
            update(() => {
              setStatus(v);
              setPage(0);
            })
          }
          options={[
            { label: "전체", value: "" },
            { label: "대기중", value: "WAITING" },
            { label: "진행중", value: "IN_PROGRESS" },
            { label: "종료", value: "FINISHED" },
            { label: "취소", value: "CANCELED" },
          ]}
        />
        <SegmentedControl<"DESC" | "ASC">
          value={dir}
          onChange={(v) =>
            update(() => {
              setDir(v);
              setPage(0);
            })
          }
          options={[
            { label: "최신순", value: "DESC" },
            { label: "오래된순", value: "ASC" },
          ]}
        />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <QueryBoundary
          pending={<TableSkeleton />}
          onRetry={() => setFetchKey((k) => k + 1)}
        >
          <GamesResults
            variables={{
              page,
              size: PAGE_SIZE,
              status: status || undefined,
              sortDirection: dir,
            }}
            fetchKey={fetchKey}
            dim={isPending}
            onPage={(p) => update(() => setPage(p))}
            emptyAction={
              status !== "" ? (
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={() =>
                    update(() => {
                      setStatus("");
                      setDir("DESC");
                      setPage(0);
                    })
                  }
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
  const data = useLazyLoadQuery<AdminGames>(AdminGamesQuery, variables, {
    fetchKey,
    fetchPolicy: "store-or-network",
  });
  const pageData = data.adminGames;

  if (pageData.content.length === 0) {
    const filtered = variables.status != null;
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock
          title={filtered ? "조건에 맞는 게임이 없어요" : "아직 게임이 없어요"}
          description={
            filtered
              ? "필터를 바꾸거나 초기화해 보세요."
              : "게임이 생성되면 여기에 표시돼요."
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
      <div className="min-h-0 flex-1 overflow-auto">
      <Table
        sticky
        head={
          <>
            <Th>초대코드</Th>
            <Th>상태</Th>
            <Th>인원</Th>
            <Th>라운드</Th>
            <Th>구분</Th>
            <Th className="text-right">생성일</Th>
          </>
        }
      >
        {pageData.content.map((g, i) => (
          <Tr key={g.id} index={i}>
            <Td>
              <InviteCode code={g.inviteCode} gameId={g.id} />
            </Td>
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
