"use client";

import { useEffect, useState, useTransition } from "react";
import { useLazyLoadQuery, useMutation } from "react-relay";
import type { AdminReports } from "@/__generated__/AdminReports.graphql";
import { AdminReportsQuery } from "@/lib/admin/gql/AdminReports";
import { UpdateReportStatusMutation } from "@/lib/admin/gql/UpdateReportStatus";
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
import { Button } from "@/components/admin/Button";
import {
  ReportStatusBadge,
  ReportTypeBadge,
} from "@/components/admin/StatusBadge";
import { InviteCode } from "@/components/admin/InviteCode";
import { useToast } from "@/components/admin/Toast";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { formatDate, formatDateTime } from "@/lib/admin/format";

type StatusFilter = "" | "PENDING" | "RESOLVED" | "DISMISSED";
type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
const PAGE_SIZE = 20;

type Report = AdminReports["response"]["adminReports"]["content"][number];

function initStatusFilter(): StatusFilter {
  if (typeof window === "undefined") return "";
  const s = new URLSearchParams(window.location.search).get("status");
  return (["PENDING", "RESOLVED", "DISMISSED"] as string[]).includes(s ?? "")
    ? (s as StatusFilter)
    : "";
}

export default function ReportsPage() {
  const [status, setStatus] = useState<StatusFilter>(initStatusFilter);
  const [page, setPage] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Report | null>(null);
  const update = (fn: () => void) => startTransition(fn);
  const refetch = () => setFetchKey((k) => k + 1);

  return (
    <ListPage>
      <PageHeader title="신고" description="게임 중 신고를 확인하고 처리해요." />

      <div className="mb-5">
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={(v) => update(() => { setStatus(v); setPage(0); })}
          options={[
            { label: "전체", value: "" },
            { label: "미처리", value: "PENDING" },
            { label: "처리 완료", value: "RESOLVED" },
            { label: "반려", value: "DISMISSED" },
          ]}
        />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <QueryBoundary pending={<TableSkeleton />} onRetry={refetch}>
          <ReportsResults
            variables={{ page, size: PAGE_SIZE, status: status || undefined, sortDirection: "DESC" }}
            fetchKey={fetchKey}
            dim={isPending}
            onPage={(p) => update(() => setPage(p))}
            onSelect={setSelected}
            filtered={status !== ""}
            onReset={() => update(() => { setStatus(""); setPage(0); })}
          />
        </QueryBoundary>
      </Card>

      {selected && (
        <ReportDetailModal
          report={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); refetch(); }}
        />
      )}
    </ListPage>
  );
}

function ReportsResults({
  variables, fetchKey, dim, onPage, onSelect, filtered, onReset,
}: {
  variables: AdminReports["variables"];
  fetchKey: number;
  dim: boolean;
  onPage: (p: number) => void;
  onSelect: (r: Report) => void;
  filtered: boolean;
  onReset: () => void;
}) {
  const data = useLazyLoadQuery<AdminReports>(AdminReportsQuery, variables, {
    fetchKey,
    fetchPolicy: "store-or-network",
  });
  const pageData = data.adminReports;

  if (pageData.content.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock
          title={filtered ? "조건에 맞는 신고가 없어요" : "아직 신고가 없어요"}
          description={filtered ? "필터를 바꾸거나 초기화해 보세요." : "신고가 접수되면 여기에 표시돼요."}
          action={filtered ? <Button variant="neutral" size="sm" onClick={onReset}>필터 초기화</Button> : undefined}
        />
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col transition-opacity ${dim ? "pointer-events-none opacity-50" : ""}`}>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table sticky head={<><Th>유형</Th><Th>신고 대상</Th><Th>신고자</Th><Th>내용</Th><Th>상태</Th><Th className="text-right">접수일</Th></>}>
          {pageData.content.map((r, i) => (
            <Tr key={r.id} index={i}>
              <Td><ReportTypeBadge type={r.reportType} /></Td>
              <Td>
                <button type="button" onClick={() => onSelect(r)} className="font-semibold text-sd-fg transition hover:text-accent">
                  {r.reportedNickname}
                </button>
              </Td>
              <Td className="text-sd-fg-muted">{r.reporterNickname}</Td>
              <Td>
                <span className="line-clamp-1 max-w-xs text-sd-fg-subtle">{r.messageContent}</span>
              </Td>
              <Td><ReportStatusBadge status={r.status} /></Td>
              <Td className="text-right text-sd-fg-subtle">{formatDate(r.createdAt)}</Td>
            </Tr>
          ))}
        </Table>
      </div>
      <Pagination page={pageData.page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} size={pageData.size} onPage={onPage} />
    </div>
  );
}

function ReportDetailModal({ report, onClose, onUpdated }: { report: Report; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = useState<ReportStatus>(report.status as ReportStatus);
  const [memo, setMemo] = useState(report.adminMemo ?? "");
  const [commit, inFlight] = useMutation(UpdateReportStatusMutation);
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    commit({
      variables: { reportId: report.id, status, adminMemo: memo.trim() || null },
      onCompleted: () => { toast("처리 상태를 저장했어요"); onUpdated(); },
      onError: () => toast("저장에 실패했어요"),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 hidden bg-black/50 sm:block" />
      <div role="dialog" aria-modal className="relative flex h-full w-full flex-col bg-sd-surface sm:h-auto sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-sd-line">
        <div className="flex items-center justify-between border-b border-sd-hairline px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-sd-fg">신고 상세</h2>
            <ReportTypeBadge type={report.reportType} />
          </div>
          <button type="button" onClick={onClose} className="text-[13px] font-semibold text-sd-fg-subtle transition hover:text-sd-fg">닫기</button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between rounded-xl bg-sd-fill px-4 py-3">
            <div className="text-center">
              <p className="text-[12px] text-sd-fg-subtle">신고자</p>
              <p className="mt-0.5 text-[14px] font-semibold text-sd-fg">{report.reporterNickname}</p>
            </div>
            <span className="text-sd-fg-subtle">→</span>
            <div className="text-center">
              <p className="text-[12px] text-sd-fg-subtle">신고 대상</p>
              <p className="mt-0.5 text-[14px] font-bold text-sd-critical">{report.reportedNickname}</p>
            </div>
          </div>

          <FieldRow label="게임" value={<InviteCode code={`게임 #${report.gameId}`} gameId={report.gameId} />} />
          <FieldRow label="접수일" value={formatDateTime(report.createdAt)} />

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">신고된 메시지</p>
            <p className="whitespace-pre-wrap rounded-xl bg-sd-fill px-4 py-3 text-[14px] leading-relaxed text-sd-fg">{report.messageContent}</p>
          </div>
          {report.etcReason && (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">기타 사유</p>
              <p className="whitespace-pre-wrap rounded-xl bg-sd-fill px-4 py-3 text-[14px] leading-relaxed text-sd-fg">{report.etcReason}</p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">처리 상태</p>
            <SegmentedControl<ReportStatus>
              value={status}
              onChange={setStatus}
              options={[
                { label: "미처리", value: "PENDING" },
                { label: "처리 완료", value: "RESOLVED" },
                { label: "반려", value: "DISMISSED" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">관리 메모</p>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} placeholder="처리 내용 메모 (선택)" className="w-full resize-none rounded-xl border border-sd-line bg-sd-surface px-3.5 py-2.5 text-[14px] text-sd-fg outline-none transition placeholder:text-sd-placeholder focus:border-accent" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-sd-hairline px-5 py-3.5">
          <Button variant="neutral" onClick={onClose}>취소</Button>
          <Button variant="brand" onClick={save} disabled={inFlight}>{inFlight ? "저장 중..." : "저장"}</Button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-medium text-sd-fg-subtle">{label}</span>
      <span className="text-[14px] font-semibold text-sd-fg">{value}</span>
    </div>
  );
}
