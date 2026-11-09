"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ChevronLeftIcon } from "@/components/admin/icons";
import { TokenText } from "@/components/admin/reviews/TokenText";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { useToast } from "@/components/admin/Toast";
import { createTemplate, deleteTemplate, updateTemplate } from "@/lib/admin/reviewsClient";
import { REPLY_MAX } from "@/lib/reviews/model";
import { CUSTOM_TOKEN, FIT_LABEL, FIT_ORDER, LANG_LABEL, LANG_SHORT, lengthOf, NAME_TOKEN, overPlay, REPLY_LANGS, templateProblem, TITLE_MAX, type Fit, type ReplyLang, type ReplyTemplate, type TemplateInput, type TemplateList } from "@/lib/reviews/templates";

// 리뷰의 답변 문구 탭 (docs/admin-ui.md "리뷰"). 번역을 맞춰 보며 쓰도록 세 언어를 숨기지 않고 한 화면에 둔다.

const EMPTY: TemplateInput = { title: "", fit: "any", bodies: { ko: "", en: "", ja: "" } };
const SAMPLE = "치즈";
const HOLDER: Record<ReplyLang, string> = {
  ko: `${NAME_TOKEN}님, 불편을 드려 죄송해요. ${CUSTOM_TOKEN}`,
  en: `Hi ${NAME_TOKEN}, sorry for the trouble. ${CUSTOM_TOKEN}`,
  ja: `${NAME_TOKEN}さん、ご不便をおかけしました。${CUSTOM_TOKEN}`,
};

type Target = number | "new";
const inputOf = (t: ReplyTemplate): TemplateInput => ({ title: t.title, fit: t.fit, bodies: t.bodies });
const same = (a: TemplateInput, b: TemplateInput) => a.title === b.title && a.fit === b.fit && REPLY_LANGS.every((l) => a.bodies[l] === b.bodies[l]);

function LangBox({ lang, value, readOnly, area, onChange, onFocus }: { lang: ReplyLang; value: string; readOnly: boolean; area: (el: HTMLTextAreaElement | null) => void; onChange: (next: string) => void; onFocus: () => void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const over = overPlay(value);

  const insert = (token: string) => {
    const el = ref.current;
    const at = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? at;
    onChange(value.slice(0, at) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };

  return (
    <div className={`overflow-hidden rounded-xl border bg-sd-surface transition-colors ${over ? "border-sd-critical" : "border-sd-line focus-within:border-accent"}`}>
      <span className="block px-3.5 pt-2.5 text-[12.5px] font-bold text-sd-fg-muted">{LANG_LABEL[lang]}</span>
      <textarea
        ref={(el) => {
          ref.current = el;
          area(el);
        }}
        value={value}
        rows={2}
        readOnly={readOnly}
        aria-label={`${LANG_LABEL[lang]} 문구`}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={HOLDER[lang]}
        className="block max-h-72 w-full resize-none bg-transparent px-3.5 pt-1 pb-2 text-[14px] leading-relaxed text-sd-fg outline-none field-sizing-content placeholder:text-sd-placeholder"
      />
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 border-t border-sd-line px-1.5 py-0.5 text-[12.5px]">
        {readOnly ? (
          <span />
        ) : (
          <span className="flex font-semibold text-sd-fg-muted">
            {[
              { token: NAME_TOKEN, label: "이름 넣기" },
              { token: CUSTOM_TOKEN, label: "맞춤 문장 자리" },
            ].map((b) => (
              // 누르는 순간 글자 칸의 커서를 잃지 않게 한다
              <button key={b.token} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(b.token)} className="h-7 rounded-lg px-2 transition-colors hover:bg-sd-fill hover:text-sd-fg">
                {b.label}
              </button>
            ))}
          </span>
        )}
        <span className={`px-2 tabular-nums ${over ? "font-semibold text-sd-critical" : "text-sd-fg-subtle"}`}>
          {over ? "Google Play 답글 한도를 넘어요 · " : ""}
          {lengthOf(value)} / {REPLY_MAX.android}
        </span>
      </div>
    </div>
  );
}

export function ReplyTemplates({ data, focus, onChange }: { data: TemplateList; focus: { id: number; lang: ReplyLang } | null; onChange: (next: ReplyTemplate[]) => void }) {
  const toast = useToast();
  const list = data.templates;
  const [selected, setSelected] = useState<Target | null>(null);
  const [edits, setEdits] = useState<TemplateInput | null>(null);
  const [detail, setDetail] = useState(false);
  const [leaving, setLeaving] = useState<Target | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<ReplyTemplate | null>(null);
  const [previewLang, setPreviewLang] = useState<ReplyLang>("ko");
  const areas = useRef<Partial<Record<ReplyLang, HTMLTextAreaElement | null>>>({});

  // 고르지 않았으면 첫 문구를 띄워서 탭을 열자마자 내용이 보이게 한다
  const current: Target | null = selected === "new" || list.some((t) => t.id === selected) ? selected : (list[0]?.id ?? null);
  const template = list.find((t) => t.id === current) ?? null;
  const base = template ? inputOf(template) : EMPTY;
  const draft = edits ?? base;
  const dirty = !!edits && !same(edits, base);
  const problem = templateProblem(draft);

  const go = (next: Target) => {
    setSelected(next);
    setEdits(null);
    setDetail(true);
  };
  const request = (next: Target) => {
    if (next === current) setDetail(true);
    else if (dirty) setLeaving(next);
    else go(next);
  };

  // 답글 칸에서 "쓰러 가기"로 왔을 때 그 문구와 언어를 바로 연다
  const [seen, setSeen] = useState(focus);
  if (focus !== seen) {
    setSeen(focus);
    if (focus) {
      request(focus.id);
      setPreviewLang(focus.lang);
    }
  }
  useEffect(() => {
    if (focus) areas.current[focus.lang]?.focus();
  }, [focus]);

  const set = (patch: Partial<TemplateInput>) => setEdits({ ...draft, ...patch });

  const save = () => {
    setSaving(true);
    (template ? updateTemplate(template.id, template.updatedAt, draft) : createTemplate(draft))
      .then((t) => {
        onChange(template ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t]);
        setSelected(t.id);
        setEdits(null);
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
        setSelected(null);
        setEdits(null);
        setDetail(false);
        toast("답변 문구를 지웠어요.");
      })
      .catch((e: Error) => toast(e.message))
      .finally(() => setSaving(false));
  };

  const shownLang = draft.bodies[previewLang].trim() ? previewLang : (REPLY_LANGS.find((l) => draft.bodies[l].trim()) ?? previewLang);
  const previewBody = draft.bodies[shownLang].trim();

  if (list.length === 0 && current !== "new") {
    return (
      <div className="space-y-3">
        {data.readOnlyReason && <Callout variant="neutral">{data.readOnlyReason}</Callout>}
        <div className="rounded-2xl border border-dashed border-sd-line px-6 py-12 text-center">
          <p className="text-[15px] font-bold text-sd-fg">아직 만든 답변 문구가 없어요</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-sd-fg-muted">위치가 끊긴다는 리뷰, 게임이 재미있다는 리뷰처럼 자주 오는 상황부터 써 보세요.</p>
          {data.writable && (
            <Button size="sm" className="mt-4" onClick={() => go("new")}>
              첫 문구 만들기
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ConfirmDialog open={!!removing} danger pending={saving} title="이 문구를 지울까요?" message={`"${removing?.title ?? ""}" 문구를 지워요. 이미 올린 답글은 그대로예요.`} confirmText="지우기" onConfirm={remove} onClose={() => setRemoving(null)} />
      <ConfirmDialog
        open={leaving !== null}
        title="고친 내용을 버릴까요?"
        message="저장하지 않고 다른 문구로 가면 고친 내용이 사라져요."
        confirmText="버리기"
        cancelText="계속 고치기"
        onConfirm={() => {
          if (leaving !== null) go(leaving);
          setLeaving(null);
        }}
        onClose={() => setLeaving(null)}
      />
      {data.readOnlyReason && <Callout variant="neutral">{data.readOnlyReason}</Callout>}
      <div className="grid items-start gap-4 lg:grid-cols-[264px_minmax(0,1fr)]">
        <nav aria-label="답변 문구 목록" className={`${detail ? "hidden lg:block" : ""} lg:sticky lg:top-0`}>
          {data.writable && (
            <Button variant="neutral" size="sm" className="mb-3 w-full" onClick={() => request("new")}>
              새 문구
            </Button>
          )}
          <div className="space-y-3.5">
            {current === "new" && (
              <p aria-current="true" className="truncate rounded-xl bg-accent-weak px-3 py-2 text-[13.5px] font-semibold text-accent">
                {draft.title.trim() || "새 문구"}
              </p>
            )}
            {FIT_ORDER.map((fit) => {
              const group = list.filter((t) => t.fit === fit);
              if (!group.length) return null;
              return (
                <section key={fit}>
                  <h3 className="mb-1 px-3 text-[12.5px] font-semibold text-sd-fg-subtle">{FIT_LABEL[fit]}</h3>
                  <ul className="space-y-0.5">
                    {group.map((t) => {
                      const on = t.id === current;
                      const missing = REPLY_LANGS.filter((l) => !t.bodies[l].trim());
                      return (
                        <li key={t.id}>
                          <button type="button" aria-current={on ? "true" : undefined} onClick={() => request(t.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${on ? "bg-accent-weak" : "hover:bg-sd-fill"}`}>
                            <span className={`min-w-0 flex-1 truncate text-[13.5px] font-semibold ${on ? "text-accent" : "text-sd-fg"}`}>{t.title}</span>
                            <span role="img" aria-label={missing.length ? `${missing.map((l) => LANG_LABEL[l]).join(", ")} 없음` : "세 언어 모두 있음"} className="flex shrink-0 gap-0.5">
                              {REPLY_LANGS.map((l) => (
                                <span key={l} className={`grid size-[18px] place-items-center rounded text-[11px] font-semibold ${t.bodies[l].trim() ? (on ? "bg-sd-surface text-accent" : "bg-accent-weak text-accent") : "text-sd-fg-subtle"}`}>
                                  {LANG_SHORT[l]}
                                </span>
                              ))}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </nav>

        <section aria-label="문구 편집" className={`${detail ? "" : "hidden lg:block"} rounded-2xl border border-sd-line bg-sd-surface`}>
          <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 rounded-t-2xl border-b border-sd-line bg-sd-surface px-4 py-2.5 sm:px-5">
            <button type="button" onClick={() => setDetail(false)} className="-ml-1.5 inline-flex items-center gap-0.5 text-[13px] font-semibold text-sd-fg-muted lg:hidden">
              <ChevronLeftIcon className="size-4" />
              목록
            </button>
            <p className="min-w-0 flex-1 truncate text-[12.5px] text-sd-fg-subtle">{dirty ? <span className="font-semibold text-sd-warning">저장하지 않았어요</span> : template ? `${template.updatedBy}님이 고쳤어요` : "새 문구"}</p>
            {data.writable && (
              <span className="flex gap-2">
                {template && (
                  <Button type="button" variant="neutral" size="sm" onClick={() => setRemoving(template)}>
                    지우기
                  </Button>
                )}
                {current === "new" && list.length > 0 && (
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={() => {
                      setSelected(null);
                      setEdits(null);
                      setDetail(false);
                    }}
                  >
                    취소
                  </Button>
                )}
                <Button type="button" size="sm" disabled={saving || !!problem || (!dirty && current !== "new")} onClick={save}>
                  저장
                </Button>
              </span>
            )}
          </header>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-52 flex-1">
                <span className="mb-1 block text-[13px] font-bold text-sd-fg">상황 이름</span>
                <input value={draft.title} maxLength={TITLE_MAX} readOnly={!data.writable} onChange={(e) => set({ title: e.target.value })} placeholder="위치가 끊긴다는 리뷰" className="h-10 w-full rounded-xl border border-sd-line bg-sd-surface px-3.5 text-[14px] text-sd-fg outline-none transition-colors placeholder:text-sd-placeholder focus:border-accent" />
              </label>
              <div>
                <span className="mb-1 block text-[13px] font-bold text-sd-fg">어울리는 별점</span>
                <SegmentedControl<Fit> value={draft.fit} onChange={(fit) => data.writable && set({ fit })} options={(["any", "low", "high"] as Fit[]).map((value) => ({ value, label: FIT_LABEL[value] }))} />
              </div>
            </div>

            <div className="space-y-2.5">
              {REPLY_LANGS.map((l) => (
                <LangBox key={l} lang={l} value={draft.bodies[l]} readOnly={!data.writable} area={(el) => (areas.current[l] = el)} onFocus={() => setPreviewLang(l)} onChange={(next) => set({ bodies: { ...draft.bodies, [l]: next } })} />
              ))}
              <p className="text-[12.5px] leading-relaxed text-sd-fg-subtle">맞춤 문장 자리를 넣으면 답글을 쓸 때 그 리뷰에 맞는 말을 채워야 올릴 수 있어요.</p>
            </div>

            {previewBody && (
              <div className="rounded-xl bg-sd-fill px-3.5 py-2.5">
                <p className="text-[12.5px] font-semibold text-sd-fg-muted">
                  답글 미리보기<span className="font-normal text-sd-fg-subtle"> · {LANG_LABEL[shownLang]}</span>
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-relaxed text-sd-fg">
                  <TokenText body={previewBody} name={SAMPLE} />
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
