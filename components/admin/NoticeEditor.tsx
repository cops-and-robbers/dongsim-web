"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/admin/Button";
import { useToast } from "@/components/admin/Toast";
import {
  createNotice,
  updateNotice,
  fetchNoticeTranslations,
  NOTICE_CATEGORY,
  NOTICE_CATEGORIES,
  NOTICE_LANGUAGE,
  NOTICE_LANGUAGES,
  type Notice,
  type NoticeCategory,
  type NoticeLanguage,
  type NoticeTranslationInput,
} from "@/lib/admin/notices/api";

type Draft = Record<NoticeLanguage, { title: string; content: string }>;

const EMPTY_DRAFT: Draft = {
  ko: { title: "", content: "" },
  ja: { title: "", content: "" },
  en: { title: "", content: "" },
};

export default function NoticeEditor({
  notice,
  onClose,
  onSaved,
}: {
  notice: Notice | null; // null = 새 공지
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [activeLang, setActiveLang] = useState<NoticeLanguage>("ko");
  const [originalLanguage, setOriginalLanguage] = useState<NoticeLanguage>("ko");
  const [pinned, setPinned] = useState(notice?.pinned ?? false);
  const [category, setCategory] = useState<NoticeCategory>(
    notice?.category ?? "NOTICE"
  );
  // 수정 진입 시 언어별 번역을 불러오는 동안 폼을 잠근다
  const [loading, setLoading] = useState(notice !== null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 목록 응답에는 한 언어만 있어서, 수정할 땐 번역 전체를 따로 불러와 채운다
  useEffect(() => {
    if (!notice) return;
    let cancelled = false;
    fetchNoticeTranslations(notice.id)
      .then((data) => {
        if (cancelled) return;
        setOriginalLanguage(data.originalLanguage);
        setDraft({ ...EMPTY_DRAFT, ...data.translations });
      })
      .catch(() => {
        if (!cancelled) toast("번역을 불러오지 못했어요");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notice, toast]);

  const setField = (field: "title" | "content", value: string) =>
    setDraft((prev) => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], [field]: value },
    }));

  const filled = (lang: NoticeLanguage) =>
    draft[lang].title.trim() !== "" && draft[lang].content.trim() !== "";
  const partiallyFilled = (lang: NoticeLanguage) =>
    !filled(lang) &&
    (draft[lang].title.trim() !== "" || draft[lang].content.trim() !== "");

  const save = async () => {
    if (!filled(originalLanguage)) {
      toast(`원문 언어(${NOTICE_LANGUAGE[originalLanguage].label})의 제목과 내용을 입력해 주세요`);
      setActiveLang(originalLanguage);
      return;
    }
    const partial = NOTICE_LANGUAGES.find(partiallyFilled);
    if (partial) {
      toast(`${NOTICE_LANGUAGE[partial].label}의 제목과 내용을 모두 채우거나 비워 주세요`);
      setActiveLang(partial);
      return;
    }
    const translations: NoticeTranslationInput[] = NOTICE_LANGUAGES.filter(filled).map(
      (language) => ({
        language,
        title: draft[language].title.trim(),
        content: draft[language].content.trim(),
      })
    );
    setSaving(true);
    try {
      const input = { pinned, category, originalLanguage, translations };
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

          <Field label="원문 언어">
            <div className="flex flex-wrap gap-1.5">
              {NOTICE_LANGUAGES.map((lang) => {
                const active = originalLanguage === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setOriginalLanguage(lang)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                      active
                        ? "bg-accent-weak text-accent"
                        : "bg-sd-fill text-sd-fg-subtle hover:text-sd-fg-muted"
                    }`}
                  >
                    {NOTICE_LANGUAGE[lang].label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 언어 탭 - 채워진 언어에 점을 찍어 어떤 번역이 있는지 한눈에 보이게 */}
          <div className="flex gap-1 border-b border-sd-hairline">
            {NOTICE_LANGUAGES.map((lang) => {
              const active = activeLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={`flex items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-[13px] font-semibold transition ${
                    active
                      ? "border-b-2 border-accent text-accent"
                      : "text-sd-fg-subtle hover:text-sd-fg-muted"
                  }`}
                >
                  {NOTICE_LANGUAGE[lang].label}
                  {filled(lang) && (
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {loading ? (
            <p className="py-8 text-center text-[13px] text-sd-fg-subtle">
              번역을 불러오는 중...
            </p>
          ) : (
            <>
              <Field label={`제목 (${NOTICE_LANGUAGE[activeLang].label})`}>
                <input
                  value={draft[activeLang].title}
                  onChange={(e) => setField("title", e.target.value)}
                  maxLength={100}
                  placeholder="공지 제목"
                  className={inputCls}
                />
              </Field>

              <Field label={`내용 (${NOTICE_LANGUAGE[activeLang].label})`}>
                <textarea
                  value={draft[activeLang].content}
                  onChange={(e) => setField("content", e.target.value)}
                  rows={8}
                  placeholder="공지 내용"
                  className={`${inputCls} resize-none leading-relaxed`}
                />
              </Field>
            </>
          )}

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
          <Button variant="brand" onClick={save} disabled={saving || loading}>
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
