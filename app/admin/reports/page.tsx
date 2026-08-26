"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useLazyLoadQuery, useMutation } from "react-relay";
import type { GraphQLTaggedNode } from "react-relay";
import type { AdminReports } from "@/__generated__/AdminReports.graphql";
import type { AdminAllReports } from "@/__generated__/AdminAllReports.graphql";
import type { AdminCommunityPostReports } from "@/__generated__/AdminCommunityPostReports.graphql";
import type { AdminCommunityChatReports } from "@/__generated__/AdminCommunityChatReports.graphql";
import { AdminReportsQuery } from "@/lib/admin/gql/AdminReports";
import { AdminAllReportsQuery } from "@/lib/admin/gql/AdminAllReports";
import { AdminCommunityPostReportsQuery } from "@/lib/admin/gql/AdminCommunityPostReports";
import { AdminCommunityChatReportsQuery } from "@/lib/admin/gql/AdminCommunityChatReports";
import { UpdateReportStatusMutation } from "@/lib/admin/gql/UpdateReportStatus";
import { UpdateCommunityPostReportStatusMutation } from "@/lib/admin/gql/UpdateCommunityPostReportStatus";
import { UpdateCommunityChatReportStatusMutation } from "@/lib/admin/gql/UpdateCommunityChatReportStatus";
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
  ReportSourceBadge,
} from "@/components/admin/StatusBadge";
import { InviteCode } from "@/components/admin/InviteCode";
import { useToast } from "@/components/admin/Toast";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { formatDate, formatDateTime } from "@/lib/admin/format";

type StatusFilter = "" | "PENDING" | "RESOLVED" | "DISMISSED";
type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
type Source = "ALL" | "GAME_CHAT" | "COMMUNITY_POST" | "COMMUNITY_CHAT";
const PAGE_SIZE = 20;
const SOURCES: Source[] = ["ALL", "GAME_CHAT", "COMMUNITY_POST", "COMMUNITY_CHAT"];
const STATUSES: StatusFilter[] = ["PENDING", "RESOLVED", "DISMISSED"];

/** 네 탭이 공유하는 목록 한 행. */
type Row = {
  key: string;
  lead: ReactNode;
  reportedNickname: string;
  reporterNickname: string;
  content: string;
  status: string;
  createdAt: string;
};

/**
 * 상세 모달이 받는 정규화된 신고.
 *
 * 타입마다 다른 것은 fields 와 bodies 둘뿐이다. 모집글은 제목과 본문이,
 * 채팅은 메시지가 들어간다.
 */
type Detail = {
  id: string;
  reportType: string;
  reporterNickname: string;
  reportedNickname: string;
  etcReason: string | null;
  status: string;
  adminMemo: string | null;
  createdAt: string;
  fields: { label: string; value: ReactNode }[];
  bodies: { label: string; text: string }[];
  mutation: GraphQLTaggedNode;
};

function initFromQuery<T extends string>(key: string, allowed: T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const v = new URLSearchParams(window.location.search).get(key);
  return (allowed as string[]).includes(v ?? "") ? (v as T) : fallback;
}

export default function ReportsPage() {
  const [source, setSource] = useState<Source>(() =>
    initFromQuery("source", SOURCES, "ALL")
  );
  const [status, setStatus] = useState<StatusFilter>(() =>
    initFromQuery("status", STATUSES, "")
  );
  const [page, setPage] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Detail | null>(null);
  const update = (fn: () => void) => startTransition(fn);
  const refetch = () => setFetchKey((k) => k + 1);

  const shared = {
    variables: {
      page,
      size: PAGE_SIZE,
      status: status || undefined,
      sortDirection: "DESC" as const,
    },
    fetchKey,
    dim: isPending,
    onPage: (p: number) => update(() => setPage(p)),
    filtered: status !== "",
    onReset: () => update(() => { setStatus(""); setPage(0); }),
  };

  return (
    <ListPage>
      <PageHeader
        title="신고"
        description="게임과 커뮤니티에서 들어온 신고를 확인하고 처리해요."
      />

      <div className="mb-3">
        <SegmentedControl<Source>
          value={source}
          onChange={(v) =>
            update(() => {
              setSource(v);
              setPage(0);
              setSelected(null);
            })
          }
          options={[
            { label: "전체", value: "ALL" },
            { label: "게임 채팅", value: "GAME_CHAT" },
            { label: "모집글", value: "COMMUNITY_POST" },
            { label: "커뮤니티 채팅", value: "COMMUNITY_CHAT" },
          ]}
        />
      </div>

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
        <QueryBoundary key={source} pending={<TableSkeleton />} onRetry={refetch}>
          {source === "ALL" && (
            <AllResults
              {...shared}
              onJump={(s) => update(() => { setSource(s); setPage(0); })}
            />
          )}
          {source === "GAME_CHAT" && (
            <GameChatResults {...shared} onSelect={setSelected} />
          )}
          {source === "COMMUNITY_POST" && (
            <PostResults {...shared} onSelect={setSelected} />
          )}
          {source === "COMMUNITY_CHAT" && (
            <ChatResults {...shared} onSelect={setSelected} />
          )}
        </QueryBoundary>
      </Card>

      {selected && (
        <ReportDetailModal
          detail={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); refetch(); }}
        />
      )}
    </ListPage>
  );
}

// ── 탭별 조회 ────────────────────────────────────────────────

type ResultsProps = {
  variables: AdminReports["variables"];
  fetchKey: number;
  dim: boolean;
  onPage: (p: number) => void;
  filtered: boolean;
  onReset: () => void;
};

function AllResults({
  variables,
  fetchKey,
  onJump,
  ...rest
}: ResultsProps & { onJump: (s: Source) => void }) {
  const data = useLazyLoadQuery<AdminAllReports>(AdminAllReportsQuery, variables, {
    fetchKey,
    fetchPolicy: "store-or-network",
  });
  const p = data.adminAllReports;

  return (
    <ReportTable
      {...rest}
      lead="출처"
      contentLabel="내용"
      page={p}
      hint="행을 누르면 해당 탭으로 넘어가요. 처리는 그 탭에서 할 수 있어요."
      rows={p.content.map((r) => ({
        // id 는 타입마다 따로 증가해서 세 종류를 합치면 겹친다.
        key: `${r.source}-${r.id}`,
        lead: <ReportSourceBadge source={r.source} />,
        reportedNickname: r.reportedNickname,
        reporterNickname: r.reporterNickname,
        content: r.content,
        status: r.status,
        createdAt: r.createdAt,
      }))}
      onActivate={(i) => onJump(p.content[i].source as Source)}
    />
  );
}

function GameChatResults({
  variables,
  fetchKey,
  onSelect,
  ...rest
}: ResultsProps & { onSelect: (d: Detail) => void }) {
  const data = useLazyLoadQuery<AdminReports>(AdminReportsQuery, variables, {
    fetchKey,
    fetchPolicy: "store-or-network",
  });
  const p = data.adminReports;

  return (
    <ReportTable
      {...rest}
      lead="유형"
      contentLabel="내용"
      page={p}
      rows={p.content.map((r) => ({
        key: r.id,
        lead: <ReportTypeBadge type={r.reportType} />,
        reportedNickname: r.reportedNickname,
        reporterNickname: r.reporterNickname,
        content: r.messageContent,
        status: r.status,
        createdAt: r.createdAt,
      }))}
      onActivate={(i) => {
        const r = p.content[i];
        onSelect({
          ...common(r),
          fields: [
            {
              label: "게임",
              value: <InviteCode code={`게임 #${r.gameId}`} gameId={r.gameId} />,
            },
          ],
          bodies: [{ label: "신고된 메시지", text: r.messageContent }],
          mutation: UpdateReportStatusMutation,
        });
      }}
    />
  );
}

function PostResults({
  variables,
  fetchKey,
  onSelect,
  ...rest
}: ResultsProps & { onSelect: (d: Detail) => void }) {
  const data = useLazyLoadQuery<AdminCommunityPostReports>(
    AdminCommunityPostReportsQuery,
    variables,
    { fetchKey, fetchPolicy: "store-or-network" }
  );
  const p = data.adminCommunityPostReports;

  return (
    <ReportTable
      {...rest}
      lead="유형"
      contentLabel="모집글"
      page={p}
      rows={p.content.map((r) => ({
        key: r.id,
        lead: <ReportTypeBadge type={r.reportType} />,
        reportedNickname: r.reportedNickname,
        reporterNickname: r.reporterNickname,
        content: r.postTitle,
        status: r.status,
        createdAt: r.createdAt,
      }))}
      onActivate={(i) => {
        const r = p.content[i];
        onSelect({
          ...common(r),
          fields: [{ label: "모집글", value: `#${r.postId}` }],
          bodies: [
            { label: "모집글 제목", text: r.postTitle },
            { label: "모집글 본문", text: r.postContent },
          ],
          mutation: UpdateCommunityPostReportStatusMutation,
        });
      }}
    />
  );
}

function ChatResults({
  variables,
  fetchKey,
  onSelect,
  ...rest
}: ResultsProps & { onSelect: (d: Detail) => void }) {
  const data = useLazyLoadQuery<AdminCommunityChatReports>(
    AdminCommunityChatReportsQuery,
    variables,
    { fetchKey, fetchPolicy: "store-or-network" }
  );
  const p = data.adminCommunityChatReports;

  return (
    <ReportTable
      {...rest}
      lead="유형"
      contentLabel="메시지"
      page={p}
      rows={p.content.map((r) => ({
        key: r.id,
        lead: <ReportTypeBadge type={r.reportType} />,
        reportedNickname: r.reportedNickname,
        reporterNickname: r.reporterNickname,
        content: r.messageContent,
        status: r.status,
        createdAt: r.createdAt,
      }))}
      onActivate={(i) => {
        const r = p.content[i];
        onSelect({
          ...common(r),
          fields: [{ label: "메시지", value: `#${r.chatMessageId}` }],
          bodies: [{ label: "신고된 메시지", text: r.messageContent }],
          mutation: UpdateCommunityChatReportStatusMutation,
        });
      }}
    />
  );
}

/** 세 신고 타입이 똑같이 갖는 필드. */
function common(r: {
  id: string;
  reportType: string;
  reporterNickname: string;
  reportedNickname: string;
  etcReason?: string | null;
  status: string;
  adminMemo?: string | null;
  createdAt: string;
}) {
  return {
    id: r.id,
    reportType: r.reportType,
    reporterNickname: r.reporterNickname,
    reportedNickname: r.reportedNickname,
    etcReason: r.etcReason ?? null,
    status: r.status,
    adminMemo: r.adminMemo ?? null,
    createdAt: r.createdAt,
  };
}

// ── 목록 ─────────────────────────────────────────────────────

function ReportTable({
  rows,
  page,
  lead,
  contentLabel,
  dim,
  onPage,
  onActivate,
  filtered,
  onReset,
  hint,
}: {
  rows: Row[];
  page: { totalElements: number; totalPages: number; page: number; size: number };
  lead: string;
  contentLabel: string;
  dim: boolean;
  onPage: (p: number) => void;
  onActivate: (index: number) => void;
  filtered: boolean;
  onReset: () => void;
  hint?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyBlock
          title={filtered ? "조건에 맞는 신고가 없어요" : "아직 신고가 없어요"}
          description={
            filtered
              ? "필터를 바꾸거나 초기화해 보세요."
              : "신고가 접수되면 여기에 표시돼요."
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
    <div
      className={`flex min-h-0 flex-1 flex-col transition-opacity ${dim ? "pointer-events-none opacity-50" : ""}`}
    >
      {hint && (
        <p className="border-b border-sd-hairline px-4 py-2 text-[12px] text-sd-fg-subtle">
          {hint}
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <Table
          sticky
          head={
            <>
              <Th>{lead}</Th>
              <Th>신고 대상</Th>
              <Th>신고자</Th>
              <Th>{contentLabel}</Th>
              <Th>상태</Th>
              <Th className="text-right">접수일</Th>
            </>
          }
        >
          {rows.map((r, i) => (
            <Tr key={r.key} index={i} onActivate={() => onActivate(i)}>
              <Td>{r.lead}</Td>
              <Td>
                <button
                  type="button"
                  onClick={() => onActivate(i)}
                  className="font-semibold text-sd-fg transition hover:text-accent"
                >
                  {r.reportedNickname}
                </button>
              </Td>
              <Td className="text-sd-fg-muted">{r.reporterNickname}</Td>
              <Td>
                <span className="line-clamp-1 max-w-xs text-sd-fg-subtle">
                  {r.content}
                </span>
              </Td>
              <Td>
                <ReportStatusBadge status={r.status} />
              </Td>
              <Td className="text-right text-sd-fg-subtle">{formatDate(r.createdAt)}</Td>
            </Tr>
          ))}
        </Table>
      </div>
      <Pagination
        page={page.page}
        totalPages={page.totalPages}
        totalElements={page.totalElements}
        size={page.size}
        onPage={onPage}
      />
    </div>
  );
}

// ── 상세 ─────────────────────────────────────────────────────

function ReportDetailModal({
  detail,
  onClose,
  onUpdated,
}: {
  detail: Detail;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState<ReportStatus>(detail.status as ReportStatus);
  const [memo, setMemo] = useState(detail.adminMemo ?? "");
  const [commit, inFlight] = useMutation(detail.mutation);
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    commit({
      variables: { reportId: detail.id, status, adminMemo: memo.trim() || null },
      onCompleted: () => {
        toast("처리 상태를 저장했어요");
        onUpdated();
      },
      onError: () => toast("저장에 실패했어요"),
    });
  };

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
            <h2 className="text-[15px] font-bold text-sd-fg">신고 상세</h2>
            <ReportTypeBadge type={detail.reportType} />
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
              <p className="text-[12px] text-sd-fg-subtle">신고자</p>
              <p className="mt-0.5 text-[14px] font-semibold text-sd-fg">
                {detail.reporterNickname}
              </p>
            </div>
            <span className="text-sd-fg-subtle">→</span>
            <div className="text-center">
              <p className="text-[12px] text-sd-fg-subtle">신고 대상</p>
              <p className="mt-0.5 text-[14px] font-bold text-sd-critical">
                {detail.reportedNickname}
              </p>
            </div>
          </div>

          {detail.fields.map((f) => (
            <FieldRow key={f.label} label={f.label} value={f.value} />
          ))}
          <FieldRow label="접수일" value={formatDateTime(detail.createdAt)} />

          {detail.bodies.map((b) => (
            <div key={b.label}>
              <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">
                {b.label}
              </p>
              <p className="whitespace-pre-wrap rounded-xl bg-sd-fill px-4 py-3 text-[14px] leading-relaxed text-sd-fg">
                {b.text}
              </p>
            </div>
          ))}
          {detail.etcReason && (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">
                기타 사유
              </p>
              <p className="whitespace-pre-wrap rounded-xl bg-sd-fill px-4 py-3 text-[14px] leading-relaxed text-sd-fg">
                {detail.etcReason}
              </p>
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
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="처리 내용 메모 (선택)"
              className="w-full resize-none rounded-xl border border-sd-line bg-sd-surface px-3.5 py-2.5 text-[14px] text-sd-fg outline-none transition placeholder:text-sd-placeholder focus:border-accent"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-sd-hairline px-5 py-3.5">
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button variant="brand" onClick={save} disabled={inFlight}>
            {inFlight ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-medium text-sd-fg-subtle">{label}</span>
      <span className="text-[14px] font-semibold text-sd-fg">{value}</span>
    </div>
  );
}
