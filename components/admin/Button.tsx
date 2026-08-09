import type { ButtonHTMLAttributes, ReactNode } from "react";

// 기본 버튼 - 변형(brand/neutral/danger) + 크기 + 눌림 상태. 색은 우리 톤.
type Variant = "brand" | "neutral" | "danger";
type Size = "sm" | "md";

const V: Record<Variant, string> = {
  brand:
    "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-pressed",
  neutral:
    "bg-sd-gray-200 text-sd-fg-muted hover:bg-sd-gray-300 active:bg-sd-gray-400",
  danger: "bg-sd-critical text-white hover:bg-sd-critical active:bg-sd-critical",
};

const S: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
};

export function Button({
  variant = "brand",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${V[variant]} ${S[size]} ${className}`}
    >
      {children}
    </button>
  );
}
