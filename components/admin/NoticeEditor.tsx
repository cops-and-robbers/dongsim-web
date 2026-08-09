"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/admin/Button";
import { useToast } from "@/components/admin/Toast";
import {
  createNotice,
  updateNotice,
  NOTICE_CATEGORY,
  NOTICE_CATEGORIES,
  type Notice,
  type NoticeCategory,
} from "@/lib/admin/notices/api";

export default function NoticeEditor({
  notice,
  onClose,
  onSaved,
}: {
  notice: Notice | null; // null = 새 공지
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(notice?.title ?? "");
  const [content, setContent] = useState(notice?.content ?? "");
  const [pinned, setPinned] = useState(notice?.pinned ?? false);
  const [category, setCategory] = useState<NoticeCategory>(
    notice?.category ?? "NOTICE"
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      toast("제목과 내용을 입력해 주세요");
      return;
    }
    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        content: content.trim(),
        pinned,
        category,
      };
      if (notice) {
        await updateNotice(notice.id, input);
        toast("공지를 수정했어요");
      } else {
        await createNotice(input);
        toast("공지를 등록했어요");
      }
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : "저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-sd-line bg-sd-surface px-3.5 py-2.5 text-[14px] text-sd-fg outline-none transition placeholder:text-sd-placeholder focus:border-accent";

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
        aria-modal="true"
        className="relative flex h-full w-full flex-col bg-sd-surface sm:h-auto sm:max-h-[88vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-sd-line"
      >
        <div className="flex items-center justify-between border-b border-sd-hairline px-5 py-4">
          <h2 className="text-[15px] font-bold text-sd-fg">
            {notice ? "공지 수정" : "새 공지"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold text-sd-fg-subtle transition hover:text-sd-fg"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="카테고리">
            <div className="flex flex-wrap gap-1.5">
              {NOTICE_CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                      active
                        ? NOTICE_CATEGORY[c].badge
                        : "bg-sd-fill text-sd-fg-subtle hover:text-sd-fg-muted"
                    }`}
                  >
                    {NOTICE_CATEGORY[c].label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="공지 제목"
              className={inputCls}
            />
          </Field>

          <Field label="내용">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="공지 내용"
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-[14px] font-medium text-sd-fg">상단 고정</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-sd-hairline px-5 py-3.5">
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button variant="brand" onClick={save} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">{label}</p>
      {children}
    </div>
  );
}
