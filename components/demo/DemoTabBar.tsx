"use client";

import Image from "next/image";
import { appColors } from "@/lib/app-tokens";
import type { DemoTab } from "@/lib/demo/scenes";
import { useDemoCopy } from "./demo-copy";

const TAB_ICONS: { id: DemoTab; icon: string }[] = [
  { id: "home", icon: "/app-icons/icon_home_inactive.svg" },
  { id: "community", icon: "/app-icons/icon_commu_active.svg" },
  { id: "my", icon: "/app-icons/icon_mypage_inactive.svg" },
];

// 하단 탭 (app_bottom_nav.dart). 선택 탭만 파랑, 나머지는 회색이다.
export function DemoTabBar({
  active,
  onSelect,
}: {
  active: DemoTab;
  onSelect: (tab: DemoTab) => void;
}) {
  const { app } = useDemoCopy();
  const labels: Record<DemoTab, string> = {
    home: app.navHome,
    community: app.navCommunity,
    my: app.navMy,
  };

  return (
    <div
      className="flex h-[84px] shrink-0 items-start justify-around border-t pt-[10px]"
      style={{ backgroundColor: appColors.white, borderColor: appColors.black100 }}
    >
      {TAB_ICONS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className="flex w-[92px] flex-col items-center gap-[4px]"
          >
            <span
              className="flex size-[26px] items-center justify-center"
              style={{
                filter: selected ? "none" : "grayscale(1) opacity(0.45)",
              }}
            >
              <Image src={tab.icon} alt="" width={24} height={24} />
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: selected ? appColors.blue : appColors.black400 }}
            >
              {labels[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
