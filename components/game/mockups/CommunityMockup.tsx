"use client";

import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { appColors } from "@/lib/app-tokens";
import { AppScreen } from "./AppScreen";
import { ChatInputField } from "./parts";
import { MOCKUP_TEXT, type MockupText } from "./text";

// v3 커뮤니티. 두 화면을 미리 그려 둔다:
// - CommunityListMockup: 모집글 목록 탭 (community_page.dart / community_post_card.dart)
// - CommunityChatMockup: 모집글 채팅방 (community_chat_room_page.dart)
// 커뮤니티는 앱에서 라이트 화면이라 테마와 무관하게 같은 모습이다.

// 하단 탭 바 (app_bottom_nav.dart 실측: 흰 배경, 높이 84, 아이콘 30,
// 라벨 12 - 활성 blueVer2Basic / 비활성 black300)
function BottomNav({ nav }: { nav: MockupText["v3"]["nav"] }) {
  const items = [
    { icon: "/app-icons/icon_home_inactive.svg", label: nav.home, active: false },
    { icon: "/app-icons/icon_commu_active.svg", label: nav.community, active: true },
    { icon: "/app-icons/icon_mypage_inactive.svg", label: nav.my, active: false },
  ];
  return (
    <div className="flex h-[84px] shrink-0 items-start justify-around bg-white pt-[10px]">
      {items.map((item) => (
        <span key={item.label} className="flex flex-col items-center gap-[4px]">
          <Image src={item.icon} alt="" width={30} height={30} />
          <span
            className="text-[12px]"
            style={{
              color: item.active ? appColors.blueVer2Basic : appColors.black300,
            }}
          >
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export function CommunityListMockup() {
  const locale = useLocale();
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();
  const t = MOCKUP_TEXT[locale].v3.communityList;
  const nav = MOCKUP_TEXT[locale].v3.nav;

  // 실측값: 상단 바 56 흰 배경 가운데 제목, 본문 배경 틴트,
  // 카드(흰 바탕, 라운드 12, 패딩 22/16): 상태 칩(logo 색, 라운드 16,
  // 패딩 8/4, 10px 흰 글자) + 제목 16, 위치·일시·인원 행(아이콘 14 + 12px
  // black700), 글쓰기 FAB(파랑 + icon_write).
  return (
    <AppScreen
      playing={visible}
      scrollRef={ref}
      statusBar="#FFFFFF"
      className="bg-[#F4FAFF]"
    >
      <div className="flex h-[56px] shrink-0 items-center justify-center bg-white">
        <p
          className="text-[18px] font-semibold"
          style={{ color: appColors.black }}
        >
          {t.pageTitle}
        </p>
      </div>

      <div
        className="relative min-h-0 flex-1"
        style={{ backgroundColor: appColors.background }}
      >
        <div className="flex flex-col gap-[12px] p-[20px]">
          {t.posts.map((post) => (
            <div
              key={post.title}
              className="mockup-chat-bubble rounded-[12px] bg-white px-[22px] py-[16px]"
            >
              <div className="flex items-center gap-[8px]">
                <span
                  className="rounded-[16px] px-[8px] py-[4px] text-[10px] text-white"
                  style={{ backgroundColor: appColors.logo }}
                >
                  {post.status}
                </span>
                <p
                  className="min-w-0 flex-1 truncate text-[16px] font-semibold"
                  style={{ color: appColors.black }}
                >
                  {post.title}
                </p>
              </div>
              <div className="h-[12px]" />
              <div className="flex items-center gap-[4px]">
                <Image
                  src="/app-icons/icon_location.svg"
                  alt=""
                  width={14}
                  height={14}
                />
                <p className="text-[12px]" style={{ color: appColors.black700 }}>
                  {post.location}
                </p>
              </div>
              <div className="h-[8px]" />
              <div className="flex items-center gap-[12px]">
                <span className="flex items-center gap-[4px]">
                  <Image
                    src="/app-icons/icon_date.svg"
                    alt=""
                    width={14}
                    height={14}
                  />
                  <span
                    className="text-[12px]"
                    style={{ color: appColors.black700 }}
                  >
                    {post.date}
                  </span>
                </span>
                <span className="flex items-center gap-[4px]">
                  <Image
                    src="/app-icons/icon_headcount.svg"
                    alt=""
                    width={14}
                    height={14}
                  />
                  <span
                    className="text-[12px]"
                    style={{ color: appColors.black700 }}
                  >
                    {post.count}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 글쓰기 FAB (community_page.dart - 파랑 + icon_write 흰색) */}
        <span
          className="absolute bottom-[16px] right-[20px] flex size-[56px] items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: appColors.blue }}
        >
          <Image
            src="/app-icons/icon_write.svg"
            alt=""
            width={24}
            height={24}
            className="brightness-0 invert"
          />
        </span>
      </div>

      <BottomNav nav={nav} />
      <div className="h-[34px] shrink-0 bg-white" />
    </AppScreen>
  );
}

// 채팅 말풍선 도착 시각. 숫자라 언어와 무관하다.
const ROOM_TIMES = ["20:12", "20:12", "20:14", "20:15"];

export function CommunityChatMockup() {
  const locale = useLocale();
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();
  const t = MOCKUP_TEXT[locale].v3.communityChat;
  const hint = MOCKUP_TEXT[locale].chat.input;

  // 실측값: 배경 blueVer2_50, 상단 바 56 흰 배경(뒤로 + 방 제목),
  // 상대 말풍선은 프로필 아바타 36 + 흰 바탕, 내 말풍선은 blueVer2Basic +
  // 흰 글자 (community_chat_message_list.dart). 말풍선 지오메트리는 게임
  // 채팅과 같다 (chat_bubble.dart).
  return (
    <AppScreen
      playing={visible}
      scrollRef={ref}
      statusBar="#FFFFFF"
      className="bg-[#E7F4FF]"
    >
      <div className="flex h-[56px] shrink-0 items-center bg-white px-[16px]">
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
        <p
          className="min-w-0 flex-1 truncate pl-[8px] pr-[32px] text-center text-[18px] font-semibold"
          style={{ color: appColors.black }}
        >
          {t.roomTitle}
        </p>
      </div>

      <div
        className="mockup-chat-bubbles flex min-h-0 flex-1 flex-col gap-[12px] overflow-hidden px-[16px] py-[12px]"
        style={{ backgroundColor: appColors.blueVer2_50 }}
      >
        {t.bubbles.map((bubble, i) => {
          const isMe = bubble.side === "right";
          const body = (
            <div
              className="max-w-[275px] px-[12px] py-[8px] text-[14px] leading-[1.4]"
              style={{
                backgroundColor: isMe
                  ? appColors.blueVer2Basic
                  : appColors.white,
                color: isMe ? appColors.white : appColors.black,
                borderRadius: isMe
                  ? "12px 12px 4px 12px"
                  : "12px 12px 12px 4px",
              }}
            >
              {bubble.text}
            </div>
          );
          const time = (
            <span
              className="shrink-0 pb-[2px] text-[10px]"
              style={{ color: appColors.black400 }}
            >
              {ROOM_TIMES[i]}
            </span>
          );
          if (isMe) {
            return (
              <div
                key={i}
                className="mockup-chat-bubble flex items-end justify-end gap-[4px]"
              >
                {time}
                {body}
              </div>
            );
          }
          return (
            <div key={i} className="mockup-chat-bubble flex gap-[8px]">
              <Image
                src={`/app-icons/profile_${(i % 2) + 1}.svg`}
                alt=""
                width={36}
                height={36}
                className="shrink-0 rounded-full"
              />
              <div className="flex flex-col items-start">
                <p
                  className="mb-[4px] text-[12px] font-semibold"
                  style={{ color: appColors.black600 }}
                >
                  {bubble.name}
                </p>
                <div className="flex items-end gap-[4px]">
                  {body}
                  {time}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="shrink-0 px-[20px] py-[8px]"
        style={{ backgroundColor: appColors.blueVer2_50 }}
      >
        <ChatInputField hint={hint} dark={false} />
      </div>
      <div
        className="h-[34px] shrink-0"
        style={{ backgroundColor: appColors.blueVer2_50 }}
      />
    </AppScreen>
  );
}
