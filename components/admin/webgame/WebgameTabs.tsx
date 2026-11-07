"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 온라인 게임 화면 전환 탭. 운영 상태를 바꾸는 일과 판을 지켜보는 일은 하는 순간이 달라 화면을 나눈다(게임 메뉴의 GameTabs 와 같은 모양)
const TABS = [
  { href: "/admin/webgame", label: "운영 상태" },
  { href: "/admin/webgame/monitor", label: "모니터링" },
];

export function WebgameTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 inline-flex rounded-xl bg-sd-gray-200 p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
              active ? "bg-sd-surface text-sd-fg shadow-sm" : "text-sd-fg-subtle hover:text-sd-fg-muted"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
