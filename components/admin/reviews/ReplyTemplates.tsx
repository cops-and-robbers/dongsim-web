"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyBlock } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { useToast } from "@/components/admin/Toast";
import { createTemplate, deleteTemplate, updateTemplate } from "@/lib/admin/reviewsClient";
import { REPLY_MAX } from "@/lib/reviews/model";
import { CUSTOM_TOKEN, FIT_LABEL, fillTemplate, LANG_LABEL, lengthOf, NAME_TOKEN, overPlay, REPLY_LANGS, templateProblem, TITLE_MAX, type Fit, type ReplyLang, type ReplyTemplate, type TemplateInput, type TemplateList } from "@/lib/reviews/templates";

// 리뷰의 답변 문구 탭 (docs/admin-ui.md "리뷰"). 마케터가 상황별로 세 언어 문구를 써 둔다.

const EMPTY: TemplateInput = { title: "", fit: "any", bodies: { ko: "", en: "", ja: "" } };
const FIELD = "w-full rounded-xl border border-sd-line bg-sd-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-sd-fg outline-none transition placeholder:text-sd-placeholder focus:border-accent";
const SAMPLE = "치즈";

function Editor({ initial, saving, deletable, onSave, onDelete, onClose }: { initial: TemplateInput; saving: boolean; deletable: boolean; onSave: (t: TemplateInput) => void; onDelete: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState<TemplateInput>(initial);
  const [lang, setLang] = useState<ReplyLang>("ko");
  const area = useRef<HTMLTextAreaElement>(null);
  const body = draft.bodies[lang];
  const problem = templateProblem(draft);
  const setBody = (next: string) => setDraft((d) => ({ ...d, bodies: { ...d.bodies, [lang]: next } }));

  const insert = (token: string) => {
    const el = area.current;
    const at = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? at;
    setBody(body.slice(0, at) + token + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };

  return (
    <div className="space-y-3.5">
      <label className="block">
        <span className="mb-1 block text-[13px] font-bold text-sd-fg">상황 이름</span>
        <input value={draft.title} maxLength={TITLE_MAX} autoFocus onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="위치가 끊긴다는 리뷰" className={FIELD} />
      </label>
      <div>
        <span className="mb-1 block text-[13px] font-bold text-sd-fg">어울리는 별점</span>
        <SegmentedControl<Fit> value={draft.fit} onChange={(fit) => setDraft((d) => ({ ...d, fit }))} options={(["any", "low", "high"] as Fit[]).map((value) => ({ value, label: FIT_LABEL[value] }))} />
      </div>
      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl<ReplyLang> value={lang} onChange={setLang} options={REPLY_LANGS.map((value) => ({ value, label: `${LANG_LABEL[value]}${draft.bodies[value].trim() ? " ✓" : ""}` }))} />
          <span className="flex gap-1.5">
            <Button type="button" variant="neutral" size="sm" onClick={() => insert(NAME_TOKEN)}>
              이름 넣기
            </Button>
            <Button type="button" variant="neutral" size="sm" onClick={() => insert(CUSTOM_TOKEN)}>
              맞춤 문장 자리
            </Button>
          </span>
        </div>
        <textarea ref={area} value={body} rows={5} aria-label={`${LANG_LABEL[lang]} 문구`} onChange={(e) => setBody(e.target.value)} placeholder={`${NAME_TOKEN}님, 불편을 드려 죄송해요. ${CUSTOM_TOKEN}`} className={`${FIELD} resize-y`} />
        <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[12.5px] text-sd-fg-subtle">
          <span>맞춤 문장 자리가 있으면 답글을 쓸 때 그 리뷰에 맞는 말을 꼭 채워야 올릴 수 있어요.</span>
          <span className={`tabular-nums ${overPlay(body) ? "font-semibold text-sd-critical" : ""}`}>
            {lengthOf(body)} / {REPLY_MAX.android}
          </span>
        </div>
        {overPlay(body) && <p className="mt-1 text-[12.5px] text-sd-critical">Google Play 답글 한도를 넘어요. App Store 답글에만 쓸 수 있어요.</p>}
      </div>
      {body.trim() && (
        <div className="rounded-xl bg-sd-fill px-3.5 py-2.5">
          <p className="text-[12.5px] font-semibold text-sd-fg-muted">답글에는 이렇게 들어가요</p>
          <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-relaxed text-sd-fg">{fillTemplate(body, SAMPLE, lang)}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {deletable && (
          <Button type="button" variant="neutral" size="sm" onClick={onDelete}>
            지우기
          </Button>
        )}
        {problem && (draft.title.trim() || body.trim()) && <span className="text-[12.5px] text-sd-fg-subtle">{problem}</span>}
        <span className="ml-auto flex gap-2">
          <Button type="button" variant="neutral" size="sm" onClick={onClose}>
            닫기
          </Button>
          <Button type="button" size="sm" disabled={saving || !!problem} onClick={() => onSave(draft)}>
            저장
          </Button>
        </span>
      </div>
    </div>
  );
}

export function ReplyTemplates({ data, onChange }: { data: TemplateList; onChange: (next: ReplyTemplate[]) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<ReplyTemplate | null>(null);
  const list = data.templates;

  const save = (target: ReplyTemplate | null, input: TemplateInput) => {
    setSaving(true);
    (target ? updateTemplate(target.id, target.updatedAt, input) : createTemplate(input))
      .then((t) => {
        onChange(target ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t]);
        setOpen(null);
        toast("답변 문구를 저장했어요.");
      })
      .catch((e: Error) => toast(e.message))
      .finally(() => setSaving(false));
  };

  const remove = () => {
    if (!removing) return;
    setSaving(true);
    deleteTemplate(removing.id)
      .then(() => {
        onChange(list.filter((x) => x.id !== removing.id));
        setRemoving(null);
        setOpen(null);
        toast("답변 문구를 지웠어요.");
      })
      .catch((e: Error) => toast(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-3">
      <ConfirmDialog open={!!removing} danger pending={saving} title="이 문구를 지울까요?" message={`"${removing?.title ?? ""}" 문구를 지워요. 이미 올린 답글은 그대로예요.`} confirmText="지우기" onConfirm={remove} onClose={() => setRemoving(null)} />
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-[13px] leading-relaxed text-sd-fg-muted">상황별로 써 두면 팀 누구나 답글을 쓸 때 골라서 시작할 수 있어요.</p>
        {data.writable && open !== "new" && <Button size="sm" onClick={() => setOpen("new")}>새 문구</Button>}
      </div>
      {data.readOnlyReason && <Callout variant="neutral">{data.readOnlyReason}</Callout>}

      {open === "new" && (
        <div className="rounded-2xl border border-accent bg-sd-surface px-5 py-4">
          <Editor initial={EMPTY} saving={saving} deletable={false} onSave={(t) => save(null, t)} onDelete={() => undefined} onClose={() => setOpen(null)} />
        </div>
      )}

      {list.length === 0 && open !== "new" ? (
        <EmptyBlock title="아직 만든 답변 문구가 없어요." />
      ) : (
        list.map((t) =>
          open === t.id ? (
            <div key={t.id} className="rounded-2xl border border-accent bg-sd-surface px-5 py-4">
              <Editor initial={t} saving={saving} deletable onSave={(v) => save(t, v)} onDelete={() => setRemoving(t)} onClose={() => setOpen(null)} />
            </div>
          ) : (
            <article key={t.id} className="rounded-2xl border border-sd-line bg-sd-surface px-5 py-4">
              <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="text-[15px] font-bold text-sd-fg">{t.title}</h3>
                <span className="text-[12.5px] text-sd-fg-subtle">{FIT_LABEL[t.fit]}</span>
                <span className="ml-auto flex items-center gap-1">
                  {REPLY_LANGS.map((l) => (
                    <span key={l} className={`rounded-md px-1.5 py-0.5 text-[12px] font-medium ${t.bodies[l].trim() ? "bg-accent-weak text-accent" : "bg-sd-fill text-sd-fg-subtle"}`}>
                      {LANG_LABEL[l]}
                    </span>
                  ))}
                </span>
              </header>
              <p className="mt-2 line-clamp-2 whitespace-pre-line break-words text-[14px] leading-relaxed text-sd-fg-muted">{t.bodies.ko || t.bodies.en || t.bodies.ja}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12.5px] text-sd-fg-subtle">{t.updatedBy}님이 고쳤어요</span>
                {data.writable && (
                  <Button variant="neutral" size="sm" onClick={() => setOpen(t.id)}>
                    고치기
                  </Button>
                )}
              </div>
            </article>
          ),
        )
      )}
    </div>
  );
}
