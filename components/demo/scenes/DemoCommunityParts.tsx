"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { appColors } from "@/lib/app-tokens";

// 커뮤니티 화면들의 공용 부품 (#86). 목록·상세·채팅이 같은 상단 바와
// 배지를 쓰므로 여기 모은다.

// 앱 그림자 실측 (app_shadows.dart). ver2는 카드, vague는 행동 버튼·떠 있는
// 카드용이다. 색은 appColors.black(#080A0C) 기준이다.
export const demoShadowVer2 = "0 0 10px rgba(8, 10, 12, 0.07)";
export const demoShadowVague = "0 0 4px rgba(8, 10, 12, 0.1)";

// 상단 바 (app_top_bar.dart 실측: 높이 56 흰 배경, 뒤로가기 40 탭 영역).
// 목록은 뒤로가기 없이 가운데 제목, 상세는 가운데 제목 + 우측 메뉴,
// 채팅은 왼쪽 정렬 제목(centerTitle false) + 우측 햄버거다.
export function DemoCommunityTopBar({
  title,
  align = "center",
  onBack,
  right,
}: {
  title: string;
  align?: "center" | "left";
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <div
      className="flex h-[56px] shrink-0 items-center pl-[8px] pr-[16px]"
      style={{ backgroundColor: appColors.white }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex size-[40px] shrink-0 items-center justify-center transition-transform active:scale-90"
        >
          <Image src="/demo/icon_previous.svg" alt="" width={24} height={24} />
        </button>
      ) : (
        <span className="w-[8px] shrink-0" />
      )}
      <p
        className={`min-w-0 flex-1 truncate text-[17px] font-semibold ${
          align === "center" ? "text-center" : "text-left"
        }`}
        style={{ color: appColors.black }}
      >
        {title}
      </p>
      {/* 제목을 가운데 유지하려면 오른쪽에도 같은 폭이 있어야 한다 */}
      {right ?? (onBack && align === "center" ? <span className="w-[40px] shrink-0" /> : null)}
    </div>
  );
}

// 모집 상태 배지 (community_post_card.dart _StatusChip 실측: 좌우 8 / 상하 4
// 패딩, pill, 10px 흰 글자. 모집중은 로고색, 마감은 black300).
export function DemoStatusChip({ label, recruiting }: { label: string; recruiting: boolean }) {
  return (
    <span
      className="shrink-0 rounded-full px-[8px] py-[4px] text-[10px] leading-none text-white"
      style={{ backgroundColor: recruiting ? appColors.logo : appColors.black300 }}
    >
      {label}
    </span>
  );
}

// 아이콘 + 글자 한 조각 (카드 메타 행과 상세 메타 행이 함께 쓴다)
export function DemoIconLabel({
  icon,
  size,
  text,
  textSize,
  color,
}: {
  icon: string;
  size: number;
  text: string;
  textSize: number;
  color: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-[4px]">
      <Image src={icon} alt="" width={size} height={size} />
      <span className="truncate" style={{ fontSize: textSize, color }}>
        {text}
      </span>
    </span>
  );
}

// 앱의 전송 화살표 (icon_arrow 를 -90도 회전 - chat_input_bar.dart와 동일)
export function DemoSendArrow({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className="-rotate-90" aria-hidden="true">
      <path
        d="M4 12h13M12 5l7 7-7 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
