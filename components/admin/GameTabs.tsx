"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 게임 화면 전환 탭. 지금 열린 방과 지난 기록은 데이터 출처가 달라 화면을 나눠 둔다.
const TABS = [
  { href: "/admin/games", label: "열린 방" },
  { href: "/admin/games/history", label: "지난 게임" },
];

export function GameTabs() {
  const pathname = usePathname();
  return (
    <div className="inline-flex rounded-xl bg-sd-gray-200 p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active
                ? "bg-sd-surface text-sd-fg shadow-sm"
                : "text-sd-fg-subtle hover:text-sd-fg-muted"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
