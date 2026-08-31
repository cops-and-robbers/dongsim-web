"use client";

import Image from "next/image";
import { appColors } from "@/lib/app-tokens";
import { useDemoCopy } from "../demo-copy";

// 홈 화면 (home_page.dart 실측). 헤더 125(상태바 포함) + 프로필 56 +
// 일러스트 330 + 버튼 176x56 두 개. 배경·캐릭터·아이콘은 앱 에셋 그대로고
// 문구·로고는 앱의 로케일 번역을 따른다.
export function DemoHome({ onJoin }: { onJoin: () => void }) {
  const { app } = useDemoCopy();
  const [welcomeLine1, welcomeLine2] = app.welcome.split("\n");
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ backgroundColor: appColors.background }}
    >
      {/* 헤더 (home_header.dart): 흰 배경, 로고 18, 공지 아이콘 24 */}
      <div
        className="flex h-[66px] shrink-0 items-center justify-between pl-[16px] pr-[18px]"
        style={{ backgroundColor: appColors.white }}
      >
        <Image src={app.logo} alt="" width={95} height={18} style={{ height: 18, width: "auto" }} />
        <Image src="/demo/icon_noti.svg" alt="" width={24} height={24} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-[16px]">
        <div className="h-[18px] shrink-0" />

        {/* 프로필 카드 (home_profile_card.dart): 높이 56, 좌우 24, 아이콘 34 */}
        <div
          className="flex h-[56px] shrink-0 items-center gap-[10px] rounded-[12px] px-[24px]"
          style={{ backgroundColor: appColors.white }}
        >
          <Image src="/app-icons/profile_1.svg" alt="" width={34} height={34} />
          {/* 앱이 실제로 만들어 주는 형식의 닉네임을 그대로 쓴다 */}
          <span
            className="text-[16px] font-semibold"
            style={{ color: appColors.black800 }}
          >
            민첩한괴도5308
          </span>
        </div>

        <div className="h-[10px] shrink-0" />

        {/* 일러스트 카드: 배경 PNG가 크기를 정하고 말풍선(top 50)과
            캐릭터 쌍(249x154, bottom 28)을 얹는다 */}
        <div className="relative h-[330px] shrink-0 overflow-hidden rounded-[24px]">
          <Image
            src="/demo/default.png"
            alt=""
            fill
            className="object-cover"
            sizes="360px"
          />
          <div className="absolute left-0 right-0 top-[50px] flex justify-center">
            <div className="relative">
              <div
                className="rounded-[12px] px-[14px] py-[10px] text-center text-[14px] font-medium leading-[1.4] shadow-sm"
                style={{ backgroundColor: appColors.white, color: appColors.black }}
              >
                {welcomeLine1}
                <br />
                {welcomeLine2}
              </div>
              <span
                className="absolute left-1/2 top-full -translate-x-1/2 border-x-[8px] border-t-[10px] border-x-transparent"
                style={{ borderTopColor: appColors.white }}
              />
            </div>
          </div>
          <div className="absolute bottom-[28px] left-[10px] right-0 flex justify-center">
            <Image src="/demo/default.svg" alt="" width={249} height={154} />
          </div>
        </div>

        <div className="h-[14px] shrink-0" />

        {/* 버튼 두 개 (app_button.dart 기본 56, radius 12, 아이콘 20) */}
        <div className="flex shrink-0 justify-center gap-[8px]">
          <span className="flex h-[56px] w-[176px] items-center justify-center gap-[8px] rounded-[12px] text-[16px] font-semibold text-white shadow-md" style={{ backgroundColor: appColors.blue }}>
            <Image src="/demo/icon_default_light.svg" alt="" width={20} height={20} style={{ height: 20, width: "auto" }} />
            {app.createRoom}
          </span>
          <button
            type="button"
            onClick={onJoin}
            className="flex h-[56px] w-[176px] items-center justify-center gap-[8px] rounded-[12px] text-[16px] font-semibold shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: appColors.white, color: appColors.black600 }}
          >
            <Image src="/demo/icon_joining_game.svg" alt="" width={20} height={20} style={{ height: 20, width: "auto" }} />
            {app.joinRoom}
          </button>
        </div>
        <div className="min-h-0 flex-1" />
      </div>
    </div>
  );
}
