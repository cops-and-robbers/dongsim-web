"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "@/components/admin/icons";

// 어드민 체크박스 (#250). 브라우저 기본 모양은 OS 마다 달라서 네모만 그리고, 진짜 입력은 숨겨 둔다(Tab, 스페이스, 화면 읽기 프로그램이 그대로 동작한다).
// 줄 전체가 눌리는 자리다. 고른 줄은 네모의 색만이 아니라 바탕과 글자 굵기로도 드러난다(WCAG 1.4.1).
export function Checkbox({
  checked,
  disabled,
  onChange,
  children,
  right,
  highlight = true,
  className = "",
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  right?: ReactNode;
  /** 고른 줄에 바탕을 깔지. 이미 색이 있는 칸 안에서는 끈다 */
  highlight?: boolean;
  className?: string;
}) {
  const surface = highlight ? (checked ? "bg-accent-weak" : disabled ? "" : "hover:bg-sd-pressed") : "";
  const box = checked ? "border-accent bg-accent text-accent-fg" : `border-sd-gray-400 bg-sd-surface ${disabled ? "" : "group-hover:border-accent"}`;
  return (
    <label className={`group flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${surface} ${className}`}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${box}`}
      >
        <CheckIcon className={`h-3 w-3 stroke-[3.5] transition-transform duration-150 ${checked ? "scale-100" : "scale-0"}`} />
      </span>
      <span className={`min-w-0 flex-1 truncate text-[14px] text-sd-fg ${checked ? "font-semibold" : "font-medium"}`}>{children}</span>
      {right}
    </label>
  );
}
