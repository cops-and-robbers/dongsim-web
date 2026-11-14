"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen, MOCKUP_VIEW, STATUS_BAR_INSET } from "./AppScreen";
import { Bubble } from "./parts";
import { MOCKUP_TEXT, type MockupText } from "./text";

// 인게임 채팅 (4.x game_page.dart 채팅 패널 / chat_bubble.dart).
// 오른쪽 아래 채팅 버튼을 누르면 지도 자리를 채팅이 덮는다. 위는 팀 채팅 / 전체 채팅
// 토글(segmented_toggle.dart), 아래는 입력 칸(community_message_input.dart).
// 라이트 = 경찰 팀(파랑 액센트) / 다크 = 도둑 팀(초록, 도둑 테마).

// 채팅 말풍선 도착 시각. 숫자라 언어와 무관하다.
const CHAT_TIMES = ["14:02", "14:02", "14:03", "14:05", "14:05"];

function ChatScreen({
  dark,
  t,
  timer,
  countdown,
}: {
  dark: boolean;
  t: MockupText["chat"];
  timer: string;
  countdown: string;
}) {
  const bar = dark ? appColors.black900 : appColors.white;
  return (
    <>
      <div className="shrink-0" style={{ height: STATUS_BAR_INSET, backgroundColor: bar }} />
      {/* 인게임 앱바 - 채팅 중에도 남은 시간과 다음 공개가 보인다 */}
      <div
        className="flex h-[64px] shrink-0 flex-col items-center justify-center"
        style={{ backgroundColor: bar }}
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

      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ backgroundColor: dark ? appColors.black900 : appColors.black100 }}
      >
        {/* 팀 채팅 / 전체 채팅 (높이 40, 안쪽 5, 알약) - 팀 채팅이 선택된 상태 */}
        <div className="shrink-0 p-[16px]" style={{ backgroundColor: bar }}>
          <div
            className="flex h-[40px] rounded-full p-[5px]"
            style={{ backgroundColor: dark ? appColors.black800 : appColors.black100 }}
          >
            {[t.scopeTeam, t.scopeAll].map((label, i) => (
              <span
                key={label}
                className="flex flex-1 items-center justify-center rounded-full text-[14px]"
                style={{
                  backgroundColor:
                    i === 0 ? (dark ? appColors.black200 : appColors.white) : "transparent",
                  color:
                    i === 0
                      ? appColors.black800
                      : dark
                        ? appColors.black300
                        : appColors.black400,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mockup-chat-bubbles flex min-h-0 flex-1 flex-col justify-end gap-[10px] overflow-hidden px-[16px] py-[12px]">
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

        {/* 입력 칸: 14, 칸 라운드 12, 전송 아이콘 24 */}
        <div
          className="flex shrink-0 items-center gap-[4px] pb-[34px] pl-[16px] pr-[8px] pt-[8px]"
          style={{ backgroundColor: bar }}
        >
          <span
            className="min-w-0 flex-1 rounded-[12px] px-[16px] py-[12px] text-[14px]"
            style={{
              backgroundColor: dark ? appColors.black800 : appColors.black100,
              color: appColors.black400,
            }}
          >
            {t.input}
          </span>
          <span className="flex size-[40px] shrink-0 items-center justify-center">
            <span
              className="block size-[24px]"
              style={{
                backgroundColor: appColors.black400,
                WebkitMask: "url(/demo/icon_sending.svg) center / contain no-repeat",
                mask: "url(/demo/icon_sending.svg) center / contain no-repeat",
              }}
            />
          </span>
        </div>
      </div>
    </>
  );
}

export function ChatMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>(MOCKUP_VIEW);
  const text = MOCKUP_TEXT[useLocale()];

  return (
    <AppScreen
      playing={visible}
      scrollRef={ref}
      className="bg-white dark:bg-[#1E232A]"
    >
      <div className="flex min-h-0 flex-1 flex-col dark:hidden">
        <ChatScreen
          dark={false}
          t={text.chat}
          timer={text.location.timer}
          countdown={text.location.countdown}
        />
      </div>
      <div className="hidden min-h-0 flex-1 flex-col dark:flex">
        <ChatScreen
          dark
          t={text.chat}
          timer={text.location.timer}
          countdown={text.location.countdown}
        />
      </div>
    </AppScreen>
  );
}
