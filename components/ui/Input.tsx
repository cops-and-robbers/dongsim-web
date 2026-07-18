"use client";

import type { InputHTMLAttributes } from "react";

// 텍스트 입력 - 포커스 시 브랜드색 테두리(라이트=파랑, 다크=초록).

type Props = InputHTMLAttributes<HTMLInputElement> & { className?: string };

export default function Input({ className = "", ...rest }: Props) {
  return (
    <input
      {...rest}
      className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-brand-blue dark:border-white/10 dark:bg-app-black-900 dark:text-white dark:focus:border-brand-green ${className}`}
    />
  );
}
