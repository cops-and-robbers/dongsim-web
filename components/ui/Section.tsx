import type { ReactNode } from "react";

// 페이지 섹션 래퍼 - 공통 세로 여백 + 배경 변형.
// plain: 배경 없음 / muted: 옅은 회색(다크는 표면색) / brand: 브랜드 배경(CTA용)

type Props = {
  children: ReactNode;
  variant?: "plain" | "muted" | "brand";
  className?: string;
};

const VARIANT = {
  plain: "",
  muted: "bg-slate-50 dark:bg-app-black-900",
  brand: "bg-brand-blue text-white dark:bg-app-black-900 dark:ring-1 dark:ring-white/10",
} as const;

export default function Section({
  children,
  variant = "plain",
  className = "",
}: Props) {
  return (
    <section className={`py-16 md:py-24 ${VARIANT[variant]} ${className}`}>
      {children}
    </section>
  );
}
