"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { appColors } from "@/lib/app-tokens";
import {
  COMMUNITY_INVITE_DELAY_MS,
  COMMUNITY_REPLY_DELAY_MS,
  DEMO_NICKNAME,
  DEMO_ROOM_CODE,
} from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";
import { DemoCommunityTopBar, DemoSendArrow, demoShadowVague } from "./DemoCommunityParts";

// 말풍선 도착 시각. 숫자라 언어와 무관하다.
const CHAT_TIMES = { opener: "15:02", mine: "15:04", reply: "15:05" };

// 각본 진행 단계. 인사를 보내면 방장이 답하고, 곧 게임 초대 카드가 온다.
type ChatPhase = "idle" | "sent" | "replied" | "invited";

// 모임 채팅방 (community_chat_room_page.dart 실측). 배경 blueVer2_50,
// 왼쪽 정렬 제목, 목록 위에 떠 있는 모임 카드, 하단 입력창.
// 입력창에는 인사가 미리 들어 있다 - 전송 한 번으로 각본이 굴러간다.
export function DemoCommunityChat({
  onBack,
  onJoinRoom,
  onTask,
}: {
  onBack: () => void;
  onJoinRoom: () => void;
  onTask: (taskId: string) => void;
}) {
  const { app, community } = useDemoCopy();
  const post = community.posts[0];
  const [, max] = post.headcount;
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 인사를 보내면 잠시 뒤 방장 답장, 답장에서 또 잠시 뒤 초대 카드가 온다.
  // 단계마다 타이머를 따로 건다 - 한 effect에 둘 다 걸면 답장 시점의 정리
  // 함수가 초대 타이머까지 지워 카드가 영영 안 온다.
  useEffect(() => {
    if (phase === "sent") {
      const t = window.setTimeout(() => setPhase("replied"), COMMUNITY_REPLY_DELAY_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === "replied") {
      const t = window.setTimeout(() => setPhase("invited"), COMMUNITY_INVITE_DELAY_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  // 새 말풍선이 생길 때마다 목록 끝으로 - 실제 채팅과 같은 움직임이다
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [phase]);

  const send = () => {
    if (phase !== "idle") return;
    onTask("chat-send");
    setPhase("sent");
  };

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ backgroundColor: appColors.blueVer2_50 }}
    >
      <DemoCommunityTopBar
        title={post.title}
        align="left"
        onBack={onBack}
        right={
          <span className="flex w-[36px] shrink-0 justify-end">
            <Image src="/demo/icon_hamburger.svg" alt="" width={22} height={22} />
          </span>
        }
      />

      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          className="flex h-full flex-col gap-[12px] overflow-y-auto px-[16px] pb-[12px] pt-[88px]"
        >
          {/* 참여 알림 pill (community_chat_system_pill.dart) */}
          <span
            className="mx-auto shrink-0 rounded-full px-[12px] py-[6px] text-[13px]"
            style={{ backgroundColor: appColors.blueVer2_70, color: appColors.black700 }}
          >
            {app.systemJoined(DEMO_NICKNAME)}
          </span>

          <HostBubble name={community.chat.host} time={CHAT_TIMES.opener}>
            {community.chat.opener}
          </HostBubble>

          {phase !== "idle" && (
            <div className="demo-rise flex shrink-0 items-end justify-end gap-[4px]">
              <span className="shrink-0 text-[11px]" style={{ color: appColors.black300 }}>
                {CHAT_TIMES.mine}
              </span>
              <span
                className="max-w-[240px] rounded-[10px] rounded-tr-none px-[12px] py-[8px] text-[14px] leading-[1.4] text-white"
                style={{ backgroundColor: appColors.blueVer2Basic }}
              >
                {community.chat.draft}
              </span>
            </div>
          )}

          {/* 답장 전에는 입력 중 점 세 개 - 사람이 저쪽에 있다는 신호다 */}
          {phase === "sent" && (
            <HostBubble name={community.chat.host}>
              <span className="flex items-center gap-[4px] py-[4px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-[6px] animate-pulse rounded-full"
                    style={{
                      backgroundColor: appColors.black300,
                      animationDelay: `${i * 200}ms`,
                    }}
                  />
                ))}
              </span>
            </HostBubble>
          )}
          {(phase === "replied" || phase === "invited") && (
            <HostBubble name={community.chat.host} time={CHAT_TIMES.reply}>
              {community.chat.reply}
            </HostBubble>
          )}

          {/* 게임 초대 카드 (community_chat_invite_card.dart) */}
          {phase === "invited" && (
            <HostBubble time={CHAT_TIMES.reply}>
              <span className="flex w-[218px] flex-col">
                <span className="flex items-center gap-[8px]">
                  <Image src="/demo/icon_game_console.svg" alt="" width={22} height={22} />
                  <span className="text-[15px] font-semibold" style={{ color: appColors.black }}>
                    {app.inviteOpened}
                  </span>
                </span>
                <span className="mt-[8px] text-[13px] leading-snug" style={{ color: appColors.black }}>
                  {app.inviteTitle(community.chat.host, post.title)}
                </span>
                <span className="mt-[8px] text-[13px]" style={{ color: appColors.black600 }}>
                  {app.inviteCodeLine(DEMO_ROOM_CODE)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onTask("chat-invite");
                    setDialogOpen(true);
                  }}
                  className="mt-[12px] flex h-[36px] items-center justify-center rounded-[6px] text-[13px] font-semibold text-white transition-transform active:scale-95"
                  style={{ backgroundColor: appColors.blue }}
                >
                  {app.inviteJoin}
                </button>
              </span>
            </HostBubble>
          )}
        </div>

        {/* 목록 위에 떠 있는 모임 카드 (community_chat_meeting_card.dart) */}
        <div
          className="absolute left-[16px] right-[16px] top-[10px] flex items-center gap-[12px] rounded-[12px] px-[16px] py-[14px]"
          style={{ backgroundColor: appColors.white, boxShadow: demoShadowVague }}
        >
          <Image src="/demo/icon_notice.svg" alt="" width={20} height={20} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[6px]">
              <span
                className="min-w-0 truncate text-[14px] font-medium"
                style={{ color: appColors.black }}
              >
                {post.meetingAt}
              </span>
              <span
                className="shrink-0 border-b pb-[1px] text-[12px]"
                style={{ color: appColors.black500, borderColor: appColors.black500 }}
              >
                {app.viewLocation}
              </span>
            </div>
            <p className="mt-[4px] text-[12px]" style={{ color: appColors.black600 }}>
              {app.meetingMembers(3, max)}
            </p>
          </div>
        </div>
      </div>

      {/* 입력창 (community_message_input.dart) - 인사가 미리 들어 있다 */}
      <div
        className="flex shrink-0 items-center gap-[10px] border-t px-[16px] py-[8px]"
        style={{ backgroundColor: appColors.white, borderColor: appColors.black100 }}
      >
        <span
          className="flex h-[40px] min-w-0 flex-1 items-center truncate rounded-[12px] px-[14px] text-[14px]"
          style={{
            backgroundColor: appColors.black100,
            color: phase === "idle" ? appColors.black : appColors.black400,
          }}
        >
          {phase === "idle" ? community.chat.draft : app.communityChatHint}
        </span>
        <button
          type="button"
          onClick={send}
          disabled={phase !== "idle"}
          className="flex size-[36px] shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
          style={{
            backgroundColor: phase === "idle" ? appColors.blue : appColors.black200,
          }}
        >
          <DemoSendArrow color={appColors.white} />
        </button>
      </div>

      {/* 초대장 다이얼로그 (app_dialog.dart - 거절/입장 2버튼) */}
      {dialogOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-[36px]">
          <div
            className="w-full rounded-[24px] px-[12px] pb-[16px] pt-[20px]"
            style={{ backgroundColor: appColors.white }}
          >
            <p className="text-center text-[12px]" style={{ color: appColors.black300 }}>
              {app.inviteDialogTitle}
            </p>
            <p
              className="mt-[12px] whitespace-pre-line text-center text-[15px] leading-snug"
              style={{ color: appColors.black }}
            >
              {app.inviteDialogBody(community.chat.host)}
            </p>
            <p className="mt-[12px] text-center text-[14px]" style={{ color: appColors.black600 }}>
              {app.inviteDialogCodeLabel}
              <span className="ml-[8px]">{DEMO_ROOM_CODE}</span>
            </p>
            <div className="mt-[20px] flex gap-[8px] px-[4px]">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="flex h-[52px] flex-1 items-center justify-center rounded-[12px] text-[16px] font-semibold transition-transform active:scale-95"
                style={{ backgroundColor: appColors.black100, color: appColors.black600 }}
              >
                {app.inviteDialogDecline}
              </button>
              <button
                type="button"
                onClick={onJoinRoom}
                className="flex h-[52px] flex-1 items-center justify-center rounded-[12px] text-[16px] font-semibold text-white transition-transform active:scale-95"
                style={{ backgroundColor: appColors.blue }}
              >
                {app.inviteDialogEnter}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 상대(방장) 말풍선 - 아바타 36 + 닉네임 + 흰 말풍선 + 시각.
// [name] 이 없으면 같은 사람의 연속 말풍선이라 아바타 자리만 지킨다.
function HostBubble({
  name,
  time,
  children,
}: {
  name?: string;
  time?: string;
  children: ReactNode;
}) {
  return (
    <div className="demo-rise flex shrink-0 gap-[8px]">
      {name ? (
        <Image
          src="/app-icons/profile_2.svg"
          alt=""
          width={36}
          height={36}
          className="shrink-0 rounded-full"
        />
      ) : (
        <span className="w-[36px] shrink-0" />
      )}
      <div className="flex min-w-0 flex-col items-start">
        {name && (
          <p className="mb-[4px] text-[12px] font-semibold" style={{ color: appColors.black700 }}>
            {name}
          </p>
        )}
        <div className="flex items-end gap-[4px]">
          <span
            className="max-w-[240px] rounded-[10px] rounded-tl-none px-[12px] py-[8px] text-[14px] leading-[1.4]"
            style={{ backgroundColor: appColors.white, color: appColors.black }}
          >
            {children}
          </span>
          {time && (
            <span className="shrink-0 text-[11px]" style={{ color: appColors.black300 }}>
              {time}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
