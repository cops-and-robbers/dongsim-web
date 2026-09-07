"use client";

import { useState } from "react";

/**
 * 코드 블록 (#109 2단계).
 *
 * 회색 상자만 두면 노션·깃허브와 구분되지 않는다. 위에 줄을 하나 얹어 언어를 밝히고
 * 복사 버튼을 둔다. 코드를 읽는 사람이 실제로 하는 일이 "이게 무슨 언어지"와
 * "가져다 쓰기"라서, 그 둘만 손에 닿는 곳에 둔다.
 *
 * 상자 색은 기존 NotionBlocks 코드 블록과 같다 - 렌더러가 바뀌어도 글은 같아 보여야 한다.
 */
export function CodeBlock({
  lang,
  code,
  children,
}: {
  lang?: string;
  code: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 클립보드 권한이 없으면 조용히 넘어간다 - 코드는 드래그로도 복사할 수 있다
    }
  }

  return (
    <div className="my-6 overflow-hidden rounded-2xl bg-app-black text-sm dark:ring-1 dark:ring-white/10">
      <div className="flex items-center justify-between border-b border-white/10 py-2 pr-2 pl-5">
        <span className="font-mono text-xs text-slate-400">{lang ?? "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="px-2 py-1 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          {copied ? "복사했어요" : "복사"}
        </button>
      </div>
      <div className="overflow-x-auto px-5 py-4 font-mono text-slate-100">{children}</div>
    </div>
  );
}
