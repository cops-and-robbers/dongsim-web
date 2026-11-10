"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useToast } from "@/components/admin/Toast";
import NoticeEditor from "@/components/admin/NoticeEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  listNotices,
  deleteNotice,
  NOTICE_CATEGORY,
  type Notice,
  NOTICE_LANGUAGE,
  NOTICE_LANGUAGES,
  type NoticeLanguage,
  type NoticeCategory,
  type NoticeList,
} from "@/lib/admin/notices/api";
import { formatDate } from "@/lib/admin/format";

const PAGE_SIZE = 10;
type Filter = "" | NoticeCategory;

export default function NoticesPage() {
  const [category, setCategory] = useState<Filter>("");
  const [language, setLanguage] = useState<NoticeLanguage>("ko");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<NoticeList | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Notice | "new" | null>(null);
  const [confirmDel, setConfirmDel] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNotices({
        language,
        page,
        size: PAGE_SIZE,
        category: category || undefined,
      });
      setData(res);
    } catch (e) {
      toast(e instanceof Error ? e.message : "불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [page, category, language, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const doDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await deleteNotice(confirmDel.id);
      toast("공지를 삭제했어요");
      setConfirmDel(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "삭제에 실패했어요");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ListPage>
      <PageHeader
        title="공지사항"
        description="공지를 작성하고 관리해요."
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            새 공지
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Filter>
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(0);
          }}
          options={[
            { label: "전체", value: "" },
            { label: "공지", value: "NOTICE" },
            { label: "점검", value: "MAINTENANCE" },
            { label: "이벤트", value: "EVENT" },
            { label: "업데이트", value: "UPDATE" },
          ]}
        />
        <SegmentedControl<NoticeLanguage>
          value={language}
          onChange={(v) => {
            setLanguage(v);
            setPage(0);
          }}
          options={NOTICE_LANGUAGES.map((lang) => ({
            label: NOTICE_LANGUAGE[lang].label,
            value: lang,
          }))}
        />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : !data || data.content.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <EmptyBlock
              title={category ? "조건에 맞는 공지가 없어요" : "아직 공지가 없어요"}
              description={
                category
                  ? "필터를 바꾸거나 초기화해 보세요."
                  : "첫 공지를 작성해 보세요."
              }
              action={
                category ? (
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => {
                      setCategory("");
                      setPage(0);
                    }}
                  >
                    필터 초기화
                  </Button>
                ) : (
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => setEditing("new")}
                  >
                    새 공지 작성
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table
                sticky
                head={
                  <>
                    <Th>제목</Th>
                    <Th>카테고리</Th>
                    <Th>작성일</Th>
                    <Th className="text-right">관리</Th>
                  </>
                }
              >
                {data.content.map((n, i) => (
                  <Tr key={n.id} index={i}>
                    <Td>
                      <button
                        type="button"
                        onClick={() => setEditing(n)}
                        className="flex items-center gap-2 text-left"
                      >
                        {n.pinned && (
                          <span
                            className="shrink-0 rounded-md bg-accent-weak px-1.5 py-0.5 text-[11px] font-bold text-accent"
                            title="상단 고정"
                          >
                            고정
                          </span>
                        )}
                        <span className="font-semibold text-sd-fg transition hover:text-accent">
                          {n.title}
                        </span>
                        {n.language !== n.requestedLanguage && (
                          <span
                            className="shrink-0 rounded-md bg-sd-gray-200 px-1.5 py-0.5 text-[11px] font-semibold text-sd-fg-muted"
                            title={`${NOTICE_LANGUAGE[n.requestedLanguage].label} 번역이 아직 없어 ${NOTICE_LANGUAGE[n.language].label} 원문이 표시돼요`}
                          >
                            {NOTICE_LANGUAGE[n.language].label} 대체
                          </span>
                        )}
                      </button>
                    </Td>
                    <Td>
                      <CategoryBadge category={n.category} />
                    </Td>
                    <Td className="text-sd-fg-subtle">{formatDate(n.createdAt)}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <RowBtn onClick={() => setEditing(n)}>수정</RowBtn>
                        <RowBtn danger onClick={() => setConfirmDel(n)}>
                          삭제
                        </RowBtn>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Table>
            </div>

            <Pagination
              page={data.page.number}
              totalPages={data.page.totalPages}
              totalElements={data.page.totalElements}
              size={data.page.size}
              onPage={setPage}
            />
          </div>
        )}
      </Card>

      {editing && (
        <NoticeEditor
          notice={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDel}
        title="공지를 삭제할까요?"
        message={
          confirmDel
            ? `"${confirmDel.title}" 공지가 삭제돼요. 되돌릴 수 없어요.`
            : undefined
        }
        danger
        confirmText="삭제"
        pending={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDel(null)}
      />
    </ListPage>
  );
}

function CategoryBadge({ category }: { category: NoticeCategory }) {
  const c = NOTICE_CATEGORY[category];
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-semibold ${c.badge}`}
    >
      {c.label}
    </span>
  );
}

function RowBtn({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-[13px] font-semibold transition hover:bg-sd-pressed ${
        danger ? "text-sd-fg-subtle hover:text-sd-critical" : "text-sd-fg-subtle hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}
