"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLazyLoadQuery } from "react-relay";
import type { AdminGameHistories } from "@/__generated__/AdminGameHistories.graphql";
import { AdminGameHistoriesQuery } from "@/lib/admin/gql/AdminGameHistories";
import {
  ListPage,
  PageHeader,
  Card,
  Pagination,
  EmptyBlock,
  TableSkeleton,
} from "@/components/admin/Parts";
import { Table, Th, Tr, Td } from "@/components/admin/Table";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { GameTabs } from "@/components/admin/GameTabs";
import { Button } from "@/components/admin/Button";
import { TeamBadge } from "@/components/admin/StatusBadge";
import QueryBoundary from "@/components/admin/QueryBoundary";
import {
  END_REASON_LABEL,
  formatDate,
  formatDuration,
  labelOf,
} from "@/lib/admin/format";

type ReasonFilter =
  | ""
  | "ALL_ARRESTED"
  | "TIME_OVER"
  | "POLICE_FORFEITED"
  | "ROBBER_FORFEITED";
const PAGE_SIZE = 20;

export default function GameHistoryPage() {
  const [reason, setReason] = useState<ReasonFilter>("");
  const [dir, setDir] = useState<"DESC" | "ASC">("DESC");
  const [page, setPage] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const update = (fn: () => void) => startTransition(fn);

  return (
    <ListPage>
      <PageHeader title="게임" description="종료된 게임의 기록을 조회해요." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <GameTabs />
        <SegmentedControl<ReasonFilter>
          value={reason}
          onChange={(v) => update(() => { setReason(v); setPage(0); })}
          options={[
            { label: "전체", value: "" },
            { label: "전원 체포", value: "ALL_ARRESTED" },
            { label: "시간 종료", value: "TIME_OVER" },
            { label: "경찰 기권", value: "POLICE_FORFEITED" },
            { label: "도둑 기권", value: "ROBBER_FORFEITED" },
          ]}
        />
        <SegmentedControl<"DESC" | "ASC">
          value={dir}
          onChange={(v) => update(() => { setDir(v); setPage(0); })}
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
          <HistoryResults
            variables={{
              page,
              size: PAGE_SIZE,
              endReason: reason || undefined,
              sortDirection: dir,
            }}
            fetchKey={fetchKey}
            dim={isPending}
            onPage={(p) => update(() => setPage(p))}
            filtered={reason !== ""}
            onReset={() => update(() => { setReason(""); setPage(0); })}
          />
        </QueryBoundary>
      </Card>
    </ListPage>
  );
}

function HistoryResults({
  variables, fetchKey, dim, onPage, filtered, onReset,
}: {
  variables: AdminGameHistories["variables"];
  fetchKey: number;
  dim: boolean;
  onPage: (p: number) => void;
  filtered: boolean;
  onReset: () => void;
}) {
  const data = useLazyLoadQuery<AdminGameHistories>(
    AdminGameHistoriesQuery,
    variables,
    { fetchKey, fetchPolicy: "store-or-network" }
  );
  const pageData = data.adminGameHistories;

  if (pageData.content.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock
          title={filtered ? "조건에 맞는 기록이 없어요" : "아직 끝난 게임이 없어요"}
          description={
            filtered
              ? "필터를 바꾸거나 초기화해 보세요."
              : "게임이 끝나면 여기에 기록이 쌓여요."
          }
          action={
            filtered ? (
              <Button variant="neutral" size="sm" onClick={onReset}>
                필터 초기화
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col transition-opacity ${dim ? "pointer-events-none opacity-50" : ""}`}>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table
          sticky
          head={
            <>
              <Th>종료 사유</Th>
              <Th>승리</Th>
              <Th>인원</Th>
              <Th>체포</Th>
              <Th>진행 시간</Th>
              <Th className="text-right">종료일</Th>
            </>
          }
        >
          {pageData.content.map((h, i) => (
            <Tr key={h.id} index={i}>
              <Td>
                <Link
                  href={`/admin/games/history/${h.id}`}
                  className="font-semibold text-sd-fg transition hover:text-accent"
                >
                  {labelOf(END_REASON_LABEL, h.endReason)}
                </Link>
              </Td>
              <Td><TeamBadge team={h.winnerTeam} /></Td>
              <Td className="tabular-nums text-sd-fg-subtle">
                경찰 {h.totalPoliceCount} · 도둑 {h.totalRobberCount}
              </Td>
              <Td className="tabular-nums text-sd-fg-subtle">
                {h.arrestedRobberCount}/{h.totalRobberCount}
              </Td>
              <Td className="tabular-nums text-sd-fg-subtle">
                {formatDuration(h.durationSeconds)}
              </Td>
              <Td className="text-right text-sd-fg-subtle">{formatDate(h.createdAt)}</Td>
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
