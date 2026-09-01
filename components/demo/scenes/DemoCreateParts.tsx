"use client";

import Image from "next/image";
import { appColors } from "@/lib/app-tokens";

// 방 만들기 흐름 상단 바 (app_top_bar.dart + step_indicator.dart 실측).
// 뒤로가기(icon_previous) + 진행 막대 3개(높이 4, 완료까지 파랑).
export function DemoStepBar({
  current,
  onBack,
}: {
  current: 0 | 1 | 2;
  onBack: () => void;
}) {
  return (
    <div
      className="flex h-[56px] shrink-0 items-center gap-[8px] pl-[8px] pr-[20px]"
      style={{ backgroundColor: appColors.white }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex size-[40px] shrink-0 items-center justify-center transition-transform active:scale-90"
      >
        <Image src="/demo/icon_previous.svg" alt="" width={24} height={24} />
      </button>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[4px] flex-1 rounded-full transition-colors duration-300"
          style={{
            backgroundColor: i <= current ? appColors.blue : appColors.black200,
          }}
        />
      ))}
    </div>
  );
}

// 단계 머리글 (session_creation_flow_page.dart _buildHeader:
// 위 28 + 제목 20 bold + 10 + 설명 14 black600 + 아래 20, 좌우 24)
export function DemoCreateHeader({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="shrink-0 px-[24px] pb-[20px] pt-[28px]">
      <p className="text-[20px] font-bold" style={{ color: appColors.black }}>
        {title}
      </p>
      <p className="mt-[10px] text-[14px]" style={{ color: appColors.black600 }}>
        {hint}
      </p>
    </div>
  );
}

// 키패드의 지우기 키 아이콘 (Icons.backspace_outlined 상당)
export function BackspaceIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M8.2 5h11.3A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H8.2a1.5 1.5 0 0 1-1.14-.53L3 12l4.06-6.47A1.5 1.5 0 0 1 8.2 5Z"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m11.5 9.5 5 5m0-5-5 5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
