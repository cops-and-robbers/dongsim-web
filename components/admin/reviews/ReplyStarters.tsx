"use client";

import { useState } from "react";
import { TokenText } from "@/components/admin/reviews/TokenText";
import { FIT_LABEL, fits, LANG_LABEL, nameFor, recommend, REPLY_LANGS, type ReplyLang, type ReplyTemplate } from "@/lib/reviews/templates";

// 답글 칸 안의 문구 고르기. 제목만으로는 내용을 모르니 첫 줄까지 보여 주고, 별점과 언어가 맞는 문구를 먼저 둔다.

const FIRST = 4;

export function ReplyStarters({ templates, rating, author, lang, detected, onLang, onPick, onManage, disabled }: { templates: ReplyTemplate[]; rating: number; author: string; lang: ReplyLang; detected: ReplyLang | null; onLang: (l: ReplyLang) => void; onPick: (t: ReplyTemplate) => void; onManage: (id?: number, lang?: ReplyLang) => void; disabled: boolean }) {
  const [all, setAll] = useState(false);
  const list = recommend(templates, rating, lang);
  const fitting = list.filter((t) => fits(t.fit, rating));
  // 1점 리뷰에 칭찬 답변을 잘못 넣지 않게, 별점이 안 맞는 문구는 전체를 열어야 보인다
  const shown = all ? list : fitting.slice(0, FIRST);

  return (
    <div className="border-t border-sd-line bg-sd-fill px-1.5 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 py-1 text-[12.5px]">
        <span className="font-semibold text-sd-fg-muted">{detected ? "이 리뷰에 어울리는 문구" : "리뷰 언어를 몰라서 직접 골라 주세요"}</span>
        <span role="group" aria-label="문구 언어" className="inline-flex gap-0.5">
          {REPLY_LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={l === lang} onClick={() => onLang(l)} className={`rounded-md px-1.5 py-0.5 font-medium transition-colors ${l === lang ? "bg-accent-weak text-accent" : "text-sd-fg-subtle hover:text-sd-fg-muted"}`}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="px-2 py-2 text-[13px] text-sd-fg-subtle">이 별점에 맞는 문구가 아직 없어요.</p>
      ) : (
        <ul className={all ? "max-h-64 overflow-y-auto" : ""}>
          {shown.map((t) => {
            const body = t.bodies[lang];
            const has = !!body.trim();
            return (
              <li key={t.id}>
                <button type="button" disabled={disabled && has} onClick={() => (has ? onPick(t) : onManage(t.id, lang))} className="group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sd-surface disabled:pointer-events-none disabled:opacity-50">
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[13.5px] font-semibold ${has ? "text-sd-fg" : "text-sd-fg-subtle"}`}>{t.title}</span>
                    <span className="mt-px block truncate text-[12.5px] leading-snug text-sd-fg-subtle">{has ? <TokenText body={body} name={nameFor(author, lang)} /> : `${LANG_LABEL[lang]} 문구가 아직 없어요`}</span>
                  </span>
                  {!fits(t.fit, rating) && <span className="shrink-0 text-[12px] text-sd-fg-subtle">{FIT_LABEL[t.fit]}</span>}
                  {has ? <span className="hidden shrink-0 text-[12.5px] font-semibold text-accent group-hover:inline group-focus-visible:inline">넣기</span> : <span className="shrink-0 text-[12.5px] font-semibold text-accent">쓰러 가기</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 px-2 pt-1 pb-0.5 text-[12.5px] font-medium text-sd-fg-muted">
        {all || list.length > shown.length ? (
          <button type="button" onClick={() => setAll((v) => !v)} className="hover:text-sd-fg">
            {all ? "접기" : `전체 ${list.length}개 보기`}
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => onManage()} className="hover:text-sd-fg">
          문구 관리
        </button>
      </div>
    </div>
  );
}
