"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen, MOCKUP_VIEW } from "./AppScreen";
import { FakeMap, FakeQr } from "./parts";
import { MOCKUP_TEXT } from "./text";

// QR 체포 - 사이트 테마와 게임 진영을 잇는다.
// 라이트 = 경찰 시점(스캐너) / 다크 = 도둑 시점(수배 QR 다이얼로그).
export function QrMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>(MOCKUP_VIEW);
  const t = MOCKUP_TEXT[useLocale()].qr;

  return (
    <AppScreen playing={visible} scrollRef={ref} className="bg-[#080A0C]">
      {/* 라이트: 경찰의 QR 스캐너 (qr_scanner_page.dart - 검정 배경,
          제목 20px 흰색, 스캔 창 250 라운드 16 + 파랑 테두리 2) */}
      <div
        className="relative min-h-0 flex-1 dark:hidden"
        style={{ backgroundColor: appColors.black }}
      >
        <p className="absolute left-0 right-0 top-[92px] text-center text-[20px] font-semibold text-white">
          {t.scanTitle}
        </p>
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          className="absolute right-[16px] top-[70px]"
          aria-hidden="true"
        >
          <path
            d="M6 6 L18 18 M18 6 L6 18"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border-2"
          style={{
            width: 250,
            height: 250,
            borderColor: appColors.blue,
            backgroundColor: appColors.black900,
          }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] bg-white p-[8px]">
            <FakeQr size={140} />
          </div>
          <span className="mockup-qr-scan absolute inset-x-0 top-0 h-[3px] bg-brand-blue/80" />
        </div>
      </div>

      {/* 다크: 도둑의 수배 QR 다이얼로그 (qr_display_dialog.dart - black 라운드 24,
          제목 Moneygraphy 20 초록, QR 흰 상자 200 + 패딩 12, 닫기 초록/검정) */}
      <div className="relative hidden min-h-0 flex-1 overflow-hidden dark:block">
        <FakeMap night dim />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex w-[345px] flex-col items-center rounded-[24px] px-[24px] py-[28px]"
            style={{ backgroundColor: appColors.black }}
          >
            <p
              className="font-moneygraphy text-[20px]"
              style={{ color: appColors.green }}
            >
              {t.title}
            </p>
            <div className="h-[20px]" />
            <div className="relative overflow-hidden rounded-[16px] bg-white p-[12px]">
              <FakeQr size={200} />
              <span className="mockup-qr-scan absolute inset-x-0 top-0 h-[3px] bg-brand-green/80" />
            </div>
            <div className="h-[20px]" />
            <p className="text-[14px]" style={{ color: appColors.black300 }}>
              {t.message}
            </p>
            <div className="h-[20px]" />
            <span
              className="font-moneygraphy flex h-[48px] w-full items-center justify-center rounded-[8px] text-[16px]"
              style={{
                backgroundColor: appColors.green,
                color: appColors.black,
              }}
            >
              {t.close}
            </span>
          </div>
        </div>
      </div>
    </AppScreen>
  );
}
