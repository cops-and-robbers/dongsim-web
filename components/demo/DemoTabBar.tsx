"use client";

import Image from "next/image";
import { appColors } from "@/lib/app-tokens";
import type { DemoTab } from "@/lib/demo/scenes";
import { useDemoCopy } from "./demo-copy";

const TAB_ICONS: { id: DemoTab; active: string; inactive: string }[] = [
  { id: "home", active: "/app-icons/icon_home_active.svg", inactive: "/app-icons/icon_home_inactive.svg" },
  { id: "community", active: "/app-icons/icon_commu_active.svg", inactive: "/app-icons/icon_commu_inactive.svg" },
  { id: "my", active: "/app-icons/icon_mypage_active.svg", inactive: "/app-icons/icon_mypage_inactive.svg" },
];

// 하단 탭 (app_bottom_nav.dart: 아이콘 높이 30, 글자 12, 선택 blueVer2Basic, 비선택 black300).
// 선택 여부에 따라 아이콘 파일 자체가 바뀐다
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
            <Image
              src={selected ? tab.active : tab.inactive}
              alt=""
              width={30}
              height={30}
              style={{ height: 30, width: "auto" }}
            />
            <span
              className="text-[12px]"
              style={{ color: selected ? appColors.blueVer2Basic : appColors.black300 }}
            >
              {labels[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
