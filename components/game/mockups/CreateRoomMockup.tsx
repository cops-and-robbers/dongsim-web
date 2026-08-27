"use client";

import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen } from "./AppScreen";
import { MOCKUP_TEXT } from "./text";

// v3 방 생성 - 기본 정보 화면 (basic_settings_form.dart / number_pad.dart).
// 한 항목씩 묻는 카드와 화면에 고정된 숫자 키패드. 앱처럼 라이트 전용이다.
//
// 실측값: 진행 표시 3칸 중 2칸(파랑), 제목 20 + 간격 10 + 보조 14 black600,
// 항목 카드(흰 바탕, 라운드 20, 테두리 black100, 패딩 24/16, 본문 행 24),
// 힌트(icon_info 16 + 12px black400), CTA 전폭 56 파랑,
// 키패드 361(배경 틴트, 칩 114x34 라운드 9 blueVer2_70 + black700,
// 숫자 28 black700, 마지막 줄 빈칸/0/지우기).
export function CreateRoomMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();
  const t = MOCKUP_TEXT[useLocale()].v3.create;

  return (
    <AppScreen
      playing={visible}
      scrollRef={ref}
      statusBar="#FFFFFF"
      className="bg-white"
    >
      {/* 상단 바: 뒤로 + 진행 표시 2/3 */}
      <div className="flex h-[56px] shrink-0 items-center gap-[12px] bg-white pl-[16px] pr-[20px]">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            d="M15 5 L8 12 L15 19"
            stroke={appColors.black}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <div className="flex flex-1 gap-[8px]">
          <span
            className="h-[4px] flex-1 rounded-[2px]"
            style={{ backgroundColor: appColors.blue }}
          />
          <span
            className="h-[4px] flex-1 rounded-[2px]"
            style={{ backgroundColor: appColors.blue }}
          />
          <span
            className="h-[4px] flex-1 rounded-[2px]"
            style={{ backgroundColor: appColors.black100 }}
          />
        </div>
      </div>

      {/* 화면 제목 (상단 28 / 제목 20 / 간격 10 / 보조 14) */}
      <div className="shrink-0 bg-white px-[24px]">
        <div className="h-[28px]" />
        <p
          className="text-[20px] font-semibold"
          style={{ color: appColors.black }}
        >
          {t.title}
        </p>
        <div className="h-[10px]" />
        <p className="text-[14px]" style={{ color: appColors.black600 }}>
          {t.sub}
        </p>
        <div className="h-[20px]" />
      </div>

      {/* 항목 카드 (setting_field_card.dart) */}
      <div className="shrink-0 bg-white px-[20px]">
        <div
          className="rounded-[20px] border bg-white px-[24px] py-[16px]"
          style={{ borderColor: appColors.black100 }}
        >
          <div className="flex h-[24px] items-center">
            <p
              className="flex-1 text-[16px] font-semibold"
              style={{ color: appColors.black }}
            >
              {t.label}
            </p>
            <p
              className="text-[16px] font-bold"
              style={{ color: appColors.black }}
            >
              {t.value}
            </p>
          </div>
          <div className="h-[6px]" />
          <div className="flex items-center gap-[8px]">
            <Image
              src="/app-icons/icon_info.svg"
              alt=""
              width={16}
              height={16}
              className="brightness-0 opacity-40"
            />
            <p className="text-[12px]" style={{ color: appColors.black400 }}>
              {t.hint}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-white" />

      {/* CTA - 키패드에 붙는 전폭 버튼 (keypad_cta_button.dart) */}
      <div
        className="flex h-[56px] shrink-0 items-center justify-center text-[16px] font-semibold text-white"
        style={{ backgroundColor: appColors.blue }}
      >
        {t.next}
      </div>

      {/* 숫자 키패드 (number_pad.dart) */}
      <div
        className="flex h-[361px] shrink-0 flex-col pt-[20px]"
        style={{ backgroundColor: appColors.background }}
      >
        <div className="flex shrink-0 gap-[5px] px-[20px]">
          {t.chips.map((chip) => (
            <span
              key={chip}
              className="flex h-[34px] flex-1 items-center justify-center rounded-[9px] text-[14px] font-semibold"
              style={{
                backgroundColor: appColors.blueVer2_70,
                color: appColors.black700,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="h-[12px] shrink-0" />
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
        ].map((row) => (
          <div key={row[0]} className="flex min-h-0 flex-1">
            {row.map((digit) => (
              <span
                key={digit}
                className="flex flex-1 items-center justify-center text-[28px] font-semibold"
                style={{ color: appColors.black700 }}
              >
                {digit}
              </span>
            ))}
          </div>
        ))}
        <div className="flex min-h-0 flex-1">
          <span className="flex-1" />
          <span
            className="flex flex-1 items-center justify-center text-[28px] font-semibold"
            style={{ color: appColors.black700 }}
          >
            0
          </span>
          <span className="flex flex-1 items-center justify-center">
            {/* 앱과 동일한 Material backspace_outlined 글리프 */}
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path
                d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z"
                fill={appColors.black700}
              />
            </svg>
          </span>
        </div>
      </div>
    </AppScreen>
  );
}
