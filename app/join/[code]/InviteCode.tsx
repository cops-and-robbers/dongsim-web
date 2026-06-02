"use client";

import { useState } from "react";
import Copy from "@/components/icons/Copy";

export default function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // 클립보드 접근이 막힌 환경에선 조용히 무시
    }
  }

  return (
    <div className="mt-6 w-full">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        초대 코드
      </p>

      {/* 앱 InfoCard 스타일 — 연한 회색 카드, 탭하면 복사 */}
      <button
        type="button"
        onClick={copy}
        aria-label="초대 코드 복사"
        className="flex h-21 w-full items-center justify-center gap-2 rounded-[20px] border border-[#cfd6dd] bg-[#edf0f2] text-app-black transition-transform active:scale-[0.98] dark:border-app-black-800 dark:bg-app-black-900 dark:text-white"
      >
        <span className="text-[28px] font-semibold leading-none">{code}</span>
        <Copy className="h-6 w-6 text-slate-400 dark:text-slate-300" />
      </button>

      {/* 복사 완료 피드백 — 앱 스낵바 문구와 동일 */}
      <p
        role="status"
        aria-live="polite"
        className={`mt-2 text-center text-xs font-semibold text-brand-blue transition-opacity duration-200 dark:text-brand-green ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        코드가 복사되었습니다
      </p>
    </div>
  );
}
