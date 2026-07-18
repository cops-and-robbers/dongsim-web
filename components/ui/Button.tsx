import Link from "next/link";
import type { ReactNode } from "react";

// 사이트 공통 버튼 - 알약형. href를 주면 Link, 없으면 button으로 렌더된다.
// primary: 브랜드 배경 (라이트=파랑, 다크=초록·검정 글자)
// inverse: 브랜드색 배경 "위"에 올리는 흰 버튼 (CTA 섹션용)
// outline: 보조 동작 (다시 찍기, 다른 글 보기 등)

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "inverse" | "outline";
  size?: "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

const VARIANT = {
  primary:
    "bg-brand-blue text-white shadow-lg dark:bg-brand-green dark:text-app-black",
  inverse: "bg-white text-brand-blue shadow-lg dark:text-app-black",
  outline:
    "border border-slate-300 text-slate-600 dark:border-white/15 dark:text-slate-300",
} as const;

const SIZE = {
  md: "px-7 py-3 text-base",
  lg: "px-9 py-3.5 text-lg",
} as const;

export default function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  className = "",
}: Props) {
  const classes = `inline-block rounded-full font-bold transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
