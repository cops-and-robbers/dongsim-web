"use client";

import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen, MOCKUP_VIEW } from "./AppScreen";
import {
  Bubble,
  ChatInputField,
  FakeMap,
  SheetHandle,
  ZoneCircle,
} from "./parts";
import { MOCKUP_TEXT, type MockupText } from "./text";

// 팀 채팅 - 지도 위 시트 (chat_overlay.dart / chat_bubble.dart).
// 라이트 = 경찰 팀(밝은 시트, 파랑 액센트) / 다크 = 도둑 팀(어두운 시트, 초록).

// 채팅 말풍선 도착 시각. 숫자라 언어와 무관하다.
const CHAT_TIMES = ["14:02", "14:02", "14:03", "14:05", "14:05"];

// 채팅 화면 한 벌 (라이트/다크 공용).
// 실측값: 지도 233 + 시트(라이트 black100 / 다크 black900, 라운드 20),
// 타이틀 18(다크는 Moneygraphy) + 벨 24(파랑/초록), 페이지 점 2개(활성 파랑/초록).
function ChatScreen({ dark, t }: { dark: boolean; t: MockupText["chat"] }) {
  return (
    <>
      <div className="relative h-[233px] w-full shrink-0 overflow-hidden">
        <FakeMap night={dark} />
        <ZoneCircle size={224} left="66%" top="68%" filled={false} />
      </div>

      <div
        className="relative z-10 -mt-[20px] flex min-h-0 flex-1 flex-col rounded-t-[20px] shadow-[0_-8px_24px_rgba(15,23,42,0.35)]"
        style={{
          backgroundColor: dark ? appColors.black900 : appColors.black100,
        }}
      >
        <SheetHandle dark={dark} />

        <div className="flex items-center pb-[8px] pl-[24px] pr-[12px] pt-[16px]">
          <p
            className={`text-[18px] ${dark ? "font-moneygraphy" : "font-semibold"}`}
            style={{ color: dark ? appColors.white : appColors.black }}
          >
            {t.title}
          </p>
          <span className="ml-auto flex size-[48px] items-center justify-center">
            <Image
              src={
                dark
                  ? "/app-icons/icon_chat_bell_green.svg"
                  : "/app-icons/icon_chat_bell_blue.svg"
              }
              alt=""
              width={24}
              height={24}
            />
          </span>
        </div>

        <div className="mockup-chat-bubbles flex min-h-0 flex-1 flex-col gap-[10px] overflow-hidden px-[16px] py-[8px]">
          {t.bubbles.map((bubble, i) => (
            <Bubble
              key={i}
              side={bubble.side}
              name={bubble.name}
              time={CHAT_TIMES[i]}
              dark={dark}
            >
              {bubble.text}
            </Bubble>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-center gap-[6px] py-[6px]">
          <span
            className="size-[6px] rounded-full"
            style={{
              backgroundColor: dark ? appColors.black600 : appColors.black200,
            }}
          />
          <span
            className="size-[6px] rounded-full"
            style={{
              backgroundColor: dark ? appColors.green : appColors.blue,
            }}
          />
        </div>

        <div className="shrink-0 px-[20px] py-[8px]">
          <ChatInputField hint={t.input} dark={dark} />
        </div>
        <div className="h-[34px] shrink-0" />
      </div>
    </>
  );
}

export function ChatMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>(MOCKUP_VIEW);
  const t = MOCKUP_TEXT[useLocale()].chat;

  return (
    <AppScreen
      playing={visible}
      scrollRef={ref}
      className="bg-[#EDF0F2] dark:bg-[#1E232A]"
    >
      <div className="flex min-h-0 flex-1 flex-col dark:hidden">
        <ChatScreen dark={false} t={t} />
      </div>
      <div className="hidden min-h-0 flex-1 flex-col dark:flex">
        <ChatScreen dark t={t} />
      </div>
    </AppScreen>
  );
}
