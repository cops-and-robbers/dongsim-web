"use client";

import { useState } from "react";
import { FIT_LABEL, fits, LANG_LABEL, recommend, REPLY_LANGS, type ReplyLang, type ReplyTemplate } from "@/lib/reviews/templates";

// 답글 칸 위의 문구 고르기. 별점과 언어에 맞는 문구를 먼저 보여 주고, 넣은 뒤에는 그대로 고쳐 쓴다.

const FIRST = 4;

export function ReplyStarters({ templates, rating, lang, detected, onLang, onPick, onManage, canUndo, onUndo, disabled }: { templates: ReplyTemplate[]; rating: number; lang: ReplyLang; detected: ReplyLang | null; onLang: (l: ReplyLang) => void; onPick: (t: ReplyTemplate) => void; onManage: () => void; canUndo: boolean; onUndo: () => void; disabled: boolean }) {
  const [all, setAll] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);
  const list = recommend(templates, rating, lang);
  // 1점 리뷰에 칭찬 답변을 잘못 넣지 않게, 별점이 안 맞는 문구는 전체를 열어야 보인다
  const shown = all ? list : list.filter((t) => fits(t.fit, rating)).slice(0, FIRST);

  if (templates.length === 0) {
    return (
      <p className="mb-2 text-[12.5px] text-sd-fg-subtle">
        자주 쓰는 답변을 만들어 두면 여기서 바로 넣을 수 있어요.{" "}
        <button type="button" onClick={onManage} className="font-semibold text-accent hover:underline">
          답변 문구 만들기
        </button>
      </p>
    );
  }

  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
        <span className="font-semibold text-sd-fg-muted">문구로 시작하기</span>
        <span role="group" aria-label="문구 언어" className="inline-flex gap-0.5">
          {REPLY_LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={l === lang} onClick={() => { onLang(l); setMissing(null); }} className={`rounded-md px-1.5 py-0.5 font-medium transition ${l === lang ? "bg-accent-weak text-accent" : "text-sd-fg-subtle hover:bg-sd-fill"}`}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </span>
        {!detected && <span className="text-sd-fg-subtle">리뷰 언어를 알 수 없어요. 직접 골라 주세요.</span>}
        {canUndo && (
          <button type="button" onClick={onUndo} className="ml-auto font-semibold text-accent hover:underline">
            되돌리기
          </button>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {shown.map((t) => {
          const has = !!t.bodies[lang].trim();
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              title={FIT_LABEL[t.fit]}
              onClick={() => {
                if (has) {
                  setMissing(null);
                  onPick(t);
                } else setMissing(t.title);
              }}
              className={`rounded-lg px-2.5 py-1 text-[13px] font-medium transition active:scale-[0.97] disabled:pointer-events-none ${has ? "bg-sd-fill text-sd-fg hover:bg-accent-weak hover:text-accent" : "bg-sd-fill text-sd-fg-subtle"}`}
            >
              {t.title}
            </button>
          );
        })}
        {(all || list.length > shown.length) && (
          <button type="button" onClick={() => setAll((v) => !v)} className="rounded-lg px-2 py-1 text-[13px] font-medium text-sd-fg-muted hover:bg-sd-fill">
            {all ? "접기" : `전체 ${list.length}개`}
          </button>
        )}
      </div>
      {missing && (
        <p role="status" className="mt-1.5 text-[12.5px] text-sd-warning">
          &ldquo;{missing}&rdquo;의 {LANG_LABEL[lang]} 문구가 아직 없어요.{" "}
          <button type="button" onClick={onManage} className="font-semibold underline">
            문구 쓰러 가기
          </button>
        </p>
      )}
    </div>
  );
}
