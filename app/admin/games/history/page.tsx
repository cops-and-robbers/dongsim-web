"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Pill, TeamBadge, ParticipantStatusBadge } from "@/components/admin/StatusBadge";
import QueryBoundary from "@/components/admin/QueryBoundary";
import {
  END_REASON_LABEL,
  formatDate,
  formatDateTime,
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

type History =
  AdminGameHistories["response"]["adminGameHistories"]["content"][number];

export default function GameHistoryPage() {
  const [reason, setReason] = useState<ReasonFilter>("");
  const [dir, setDir] = useState<"DESC" | "ASC">("DESC");
  const [page, setPage] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<History | null>(null);
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
            onSelect={setSelected}
            filtered={reason !== ""}
            onReset={() => update(() => { setReason(""); setPage(0); })}
          />
        </QueryBoundary>
      </Card>

      {selected && (
        <HistoryDetailModal history={selected} onClose={() => setSelected(null)} />
      )}
    </ListPage>
  );
}

function HistoryResults({
  variables, fetchKey, dim, onPage, onSelect, filtered, onReset,
}: {
  variables: AdminGameHistories["variables"];
  fetchKey: number;
  dim: boolean;
  onPage: (p: number) => void;
  onSelect: (h: History) => void;
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
                <button
                  type="button"
                  onClick={() => onSelect(h)}
                  className="font-semibold text-sd-fg transition hover:text-accent"
                >
                  {labelOf(END_REASON_LABEL, h.endReason)}
                </button>
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

function HistoryDetailModal({
  history,
  onClose,
}: {
  history: History;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const forfeited =
    history.endReason === "POLICE_FORFEITED" ||
    history.endReason === "ROBBER_FORFEITED";

  return (
    <div className="fixed inset-0 z-[60] flex justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 hidden bg-black/50 sm:block"
      />
      <div
        role="dialog"
        aria-modal
        className="relative flex h-full w-full flex-col bg-sd-surface sm:h-auto sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-sd-line"
      >
        <div className="flex items-center justify-between border-b border-sd-hairline px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-sd-fg">게임 기록</h2>
            <Pill tone="slate">{labelOf(END_REASON_LABEL, history.endReason)}</Pill>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold text-sd-fg-subtle transition hover:text-sd-fg"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between rounded-xl bg-sd-fill px-4 py-3">
            <div className="text-center">
              <p className="text-[12px] text-sd-fg-subtle">승리</p>
              <div className="mt-1 flex justify-center">
                <TeamBadge team={history.winnerTeam} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[12px] text-sd-fg-subtle">진행 시간</p>
              <p className="mt-0.5 text-[14px] font-semibold text-sd-fg">
                {formatDuration(history.durationSeconds)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[12px] text-sd-fg-subtle">체포</p>
              <p className="mt-0.5 text-[14px] font-semibold text-sd-fg">
                {history.arrestedRobberCount}/{history.totalRobberCount}
              </p>
            </div>
          </div>

          <FieldRow label="종료일" value={formatDateTime(history.createdAt)} />
          <FieldRow
            label="참여 인원"
            value={`경찰 ${history.totalPoliceCount}명 · 도둑 ${history.totalRobberCount}명`}
          />
          <FieldRow label="총 체포 횟수" value={`${history.totalArrestCount}회`} />
          <FieldRow
            label="구역"
            value={history.areaType === "CIRCLE" ? "원형" : "다각형"}
          />

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">참여자</p>
            {history.participants.length === 0 ? (
              <p className="rounded-xl bg-sd-fill px-4 py-3 text-[13px] leading-relaxed text-sd-fg-subtle">
                {forfeited
                  ? "모두 게임을 떠나서 남은 참여자 기록이 없어요."
                  : "참여자 기록이 없어요."}
              </p>
            ) : (
              <ul className="divide-y divide-sd-hairline overflow-hidden rounded-xl bg-sd-fill">
                {history.participants.map((p) => (
                  <li
                    key={p.userId}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-[14px] font-medium text-sd-fg">
                      {p.nickname}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <TeamBadge team={p.team} />
                      <ParticipantStatusBadge status={p.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-sd-hairline px-5 py-3.5">
          <Button variant="neutral" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-medium text-sd-fg-subtle">{label}</span>
      <span className="text-[14px] font-semibold text-sd-fg">{value}</span>
    </div>
  );
}
