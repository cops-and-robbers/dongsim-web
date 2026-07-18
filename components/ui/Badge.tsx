import type { ReactNode } from "react";

// 알약형 배지 - 상태·태그 표시.
// outline: 테두리형 (행사 "미해결 사건" 배지 스타일)
// soft: 옅은 배경형 (블로그 태그 스타일)

type Props = {
  children: ReactNode;
  variant?: "outline" | "soft";
  className?: string;
};

const VARIANT = {
  outline:
    "border border-brand-blue/30 bg-white text-brand-blue dark:border-brand-green/40 dark:bg-app-black dark:text-brand-green",
  soft: "bg-brand-blue-bg text-brand-blue dark:bg-app-black-900 dark:text-brand-green",
} as const;

export default function Badge({
  children,
  variant = "soft",
  className = "",
}: Props) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wider ${VARIANT[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
