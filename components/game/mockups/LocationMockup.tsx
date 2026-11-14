"use client";

import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen, MOCKUP_VIEW, STATUS_BAR_INSET } from "./AppScreen";
import { FakeMap, MapBottomBar, ZoneCircle } from "./parts";
import { MOCKUP_TEXT } from "./text";

// 인게임 화면 (game_page.dart). 발자국 목업과 구역 축소 목업이 같은 틀을 쓴다.
// 라이트 = 경찰 시점(발자국 빨강) / 다크 = 도둑 시점(발자국 초록, 도둑 테마).

// 인게임 화면 한 벌. 상단 바 64 + 지도(구역은 테두리만 blue800, 감옥 red500)
// + 지도 아래 버튼 줄(내 위치, + 메뉴, 채팅). 발자국 색만 시점에 따라 다르다.
// [shrinkNotice] 를 주면 구역 원이 한 단계 줄어드는 순간과 그 안내를 보여 준다.
function InGameScreen({
  dark,
  timer,
  countdown,
  shrinkNotice,
}: {
  dark: boolean;
  timer: string;
  countdown: string;
  shrinkNotice?: string;
}) {
  const shrink = shrinkNotice !== undefined;
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
        {shrink ? (
          // 줄어드는 구역 - 지난 원(흐린 점선) 안으로 지금 원이 좁아진다
          <>
            <span
              className="absolute left-1/2 top-[44%] size-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed opacity-40"
              style={{ borderColor: appColors.blue800 }}
            />
            <span
              className="mockup-shrink-ring absolute left-1/2 top-[44%] size-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{ borderColor: appColors.blue800 }}
            />
          </>
        ) : (
          <ZoneCircle size={430} top="46%" filled={false} />
        )}
        {/* 감옥 (red500 테두리, game_page.dart) - 줄어든 구역 안에 남는다 */}
        <ZoneCircle
          size={90}
          left={shrink ? "44%" : "38%"}
          top={shrink ? "36%" : "30%"}
          filled={false}
          stroke={appColors.red500}
        />
        {!shrink &&
          [
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
          className={`absolute size-[18px] rounded-full ring-4 ring-white ${shrink ? "left-[58%] top-[52%]" : "left-[68%] top-[74%]"}`}
          style={{ backgroundColor: dark ? appColors.green : appColors.blue }}
        />
        {shrink && (
          <div className="mockup-shrink-notice absolute inset-x-0 top-[16px] flex justify-center">
            <span
              className="rounded-full px-[16px] py-[10px] text-[15px] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              style={
                dark
                  ? { backgroundColor: appColors.black, color: appColors.green }
                  : { backgroundColor: appColors.white, color: appColors.blue }
              }
            >
              {shrinkNotice}
            </span>
          </div>
        )}
        <MapBottomBar dark={dark} />
      </div>
    </>
  );
}

export function LocationMockup() {
  const locale = useLocale();
  const { ref, visible } = useScrollAnimation<HTMLDivElement>(MOCKUP_VIEW);
  const t = MOCKUP_TEXT[locale].location;

  return (
    <AppScreen
      playing={visible}
      scrollRef={ref}
      className="bg-white dark:bg-[#1E232A]"
    >
      <div className="flex min-h-0 flex-1 flex-col dark:hidden">
        <InGameScreen dark={false} timer={t.timer} countdown={t.countdown} />
      </div>
      <div className="hidden min-h-0 flex-1 flex-col dark:flex">
        <InGameScreen dark timer={t.timer} countdown={t.countdown} />
      </div>
    </AppScreen>
  );
}

// 구역 축소 (#668). 방장이 켠 게임에서 원형 구역이 네 번에 걸쳐 좁아진다.
// 앱바 한 줄에 다음 위치 공개와 다음 축소까지 남은 시간이 같이 뜬다.
export function ShrinkMockup() {
  const locale = useLocale();
  const { ref, visible } = useScrollAnimation<HTMLDivElement>(MOCKUP_VIEW);
  const t = MOCKUP_TEXT[locale].shrink;

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
          shrinkNotice={t.notice}
        />
      </div>
      <div className="hidden min-h-0 flex-1 flex-col dark:flex">
        <InGameScreen
          dark
          timer={t.timer}
          countdown={t.countdown}
          shrinkNotice={t.notice}
        />
      </div>
    </AppScreen>
  );
}
