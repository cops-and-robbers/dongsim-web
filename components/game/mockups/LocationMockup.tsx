"use client";

import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen, STATUS_BAR_INSET } from "./AppScreen";
import { CollapsedChatSheet, FakeMap, ZoneCircle } from "./parts";
import { MOCKUP_TEXT } from "./text";

// 발자국 - 인게임 화면 (game_page.dart).
// 라이트 = 경찰 시점(발자국 빨강) / 다크 = 도둑 시점(발자국 초록, 도둑 테마).

// 인게임 화면 한 벌. 상단 바 64 + 지도(구역은 테두리만 blue800, 감옥 red500)
// + 접힌 채팅 시트. 발자국 색만 시점에 따라 다르다 (google_map_view.dart).
function InGameScreen({
  dark,
  timer,
  countdown,
  chatHint,
}: {
  dark: boolean;
  timer: string;
  countdown: string;
  chatHint: string;
}) {
  return (
    <>
      <div
        className="shrink-0"
        style={{
          height: STATUS_BAR_INSET,
          backgroundColor: dark ? appColors.black900 : appColors.white,
        }}
      />
      <div
        className="flex h-[64px] shrink-0 flex-col items-center justify-center"
        style={{ backgroundColor: dark ? appColors.black900 : appColors.white }}
      >
        <p
          className={`text-[20px] leading-none ${dark ? "font-moneygraphy" : "font-semibold"}`}
          style={{ color: dark ? appColors.white : appColors.black }}
        >
          {timer}
        </p>
        <p
          className="mt-[6px] text-[12px] leading-none"
          style={{ color: dark ? appColors.black400 : appColors.red }}
        >
          {countdown}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <FakeMap night={dark} />
        <ZoneCircle size={430} top="46%" filled={false} />
        {/* 감옥 (red500 테두리, game_page.dart) */}
        <ZoneCircle
          size={90}
          left="38%"
          top="30%"
          filled={false}
          stroke={appColors.red500}
        />
        {[
          { left: "30%", top: "34%", rotate: -18 },
          { left: "58%", top: "48%", rotate: 12 },
          { left: "38%", top: "64%", rotate: -6 },
        ].map((print, i) => (
          <span
            key={i}
            className="mockup-footprint absolute"
            style={{
              left: print.left,
              top: print.top,
              transform: `rotate(${print.rotate}deg)`,
            }}
          >
            <Image
              src={
                dark
                  ? "/app-icons/shoeprint_green.svg"
                  : "/app-icons/shoeprint.svg"
              }
              alt=""
              width={54}
              height={38}
            />
          </span>
        ))}
        {/* 내 위치 (경찰 파랑 / 도둑 초록) */}
        <span
          className="absolute left-[68%] top-[74%] size-[18px] rounded-full ring-4 ring-white"
          style={{ backgroundColor: dark ? appColors.green : appColors.blue }}
        />
      </div>

      <div className="relative z-10 -mt-[20px]">
        <CollapsedChatSheet hint={chatHint} dark={dark} />
      </div>
    </>
  );
}

export function LocationMockup() {
  const locale = useLocale();
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();
  const t = MOCKUP_TEXT[locale].location;
  const chatHint = MOCKUP_TEXT[locale].chat.input;

  return (
    <AppScreen
      playing={visible}
      scrollRef={ref}
      className="bg-white dark:bg-[#1E232A]"
    >
      <div className="flex min-h-0 flex-1 flex-col dark:hidden">
        <InGameScreen
          dark={false}
          timer={t.timer}
          countdown={t.countdown}
          chatHint={chatHint}
        />
      </div>
      <div className="hidden min-h-0 flex-1 flex-col dark:flex">
        <InGameScreen
          dark
          timer={t.timer}
          countdown={t.countdown}
          chatHint={chatHint}
        />
      </div>
    </AppScreen>
  );
}
