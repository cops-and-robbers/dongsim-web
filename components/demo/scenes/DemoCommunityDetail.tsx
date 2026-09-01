"use client";

import Image from "next/image";
import { useState } from "react";
import { FakeMap } from "@/components/game/mockups/parts";
import { appColors } from "@/lib/app-tokens";
import { useDemoCopy } from "../demo-copy";
import {
  DemoCommunityTopBar,
  DemoIconLabel,
  DemoSendArrow,
  DemoStatusChip,
  demoShadowVague,
} from "./DemoCommunityParts";

// 좋아요 · 스크랩 · 공유 버튼 하나 (community_detail_page.dart _ActionButton
// 실측: h46 흰 카드 + vague 그림자, 아이콘 14 + 팔레트 색 라벨).
// [onClick] 이 없으면(공유) 데모에서는 구경만 하는 자리다.
function ReactionButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: string;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Image src={icon} alt="" width={14} height={14} />
      <span className="text-[15px] font-medium" style={{ color }}>
        {label}
      </span>
    </>
  );
  const style = { backgroundColor: appColors.white, boxShadow: demoShadowVague };
  if (!onClick) {
    return (
      <span
        className="flex h-[46px] flex-1 items-center justify-center gap-[6px] rounded-[12px]"
        style={style}
      >
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[46px] flex-1 items-center justify-center gap-[6px] rounded-[12px] transition-transform active:scale-95"
      style={style}
    >
      {content}
    </button>
  );
}

// 모임 장소 핀 (google_maps 마커 상당). 실제 지도 SDK를 안 쓰므로
// 목업 지도 위에 마커 모양만 그린다.
function MapPin() {
  return (
    <svg
      viewBox="0 0 24 34"
      width="30"
      height="42"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow"
      aria-hidden="true"
    >
      <path
        d="M12 1C5.9 1 1 5.9 1 12c0 8.3 11 21 11 21s11-12.7 11-21C23 5.9 18.1 1 12 1Z"
        fill={appColors.red}
        stroke="#C42A2D"
      />
      <circle cx="12" cy="12" r="4.2" fill="#FFFFFF" />
    </svg>
  );
}

// 모집글 상세 (community_detail_page.dart 실측). 지도 미리보기 + 배지·제목 +
// 모임 정보 + 본문 + 좋아요/스크랩/공유 + 채팅 참여 + 댓글.
// 좋아요·스크랩은 실제로 눌린다 - 앱의 낙관적 갱신처럼 즉시 바뀐다.
export function DemoCommunityDetail({
  onBack,
  onJoinChat,
  onTask,
}: {
  onBack: () => void;
  onJoinChat: () => void;
  onTask: (taskId: string) => void;
}) {
  const { app, community } = useDemoCopy();
  const post = community.posts[0];
  const [current, max] = post.headcount;
  const [liked, setLiked] = useState(false);
  const [scrapped, setScrapped] = useState(false);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ backgroundColor: appColors.white }}
    >
      <DemoCommunityTopBar
        title={app.detailTitle}
        onBack={onBack}
        right={
          <span className="flex w-[40px] shrink-0 justify-end">
            <Image src="/demo/icon_meatballs.svg" alt="" width={22} height={22} />
          </span>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 지도 미리보기 (community_map_preview.dart: 높이 180, 조작 없는 정지 상태) */}
        <div className="relative h-[180px] w-full shrink-0 overflow-hidden">
          <FakeMap />
          <MapPin />
        </div>

        <div className="px-[16px]">
          <div className="h-[20px]" />
          <div className="flex items-center gap-[8px]">
            <DemoStatusChip label={app.statusRecruiting} recruiting />
            <span className="text-[12px]" style={{ color: appColors.black600 }}>
              {app.headcount(current, max)}
            </span>
          </div>
          <p
            className="mt-[12px] text-[20px] font-bold leading-snug"
            style={{ color: appColors.black }}
          >
            {post.title}
          </p>

          <div className="mt-[16px] flex flex-col gap-[6px]">
            <DemoIconLabel
              icon="/app-icons/icon_location.svg"
              size={16}
              text={post.location}
              textSize={14}
              color={appColors.black700}
            />
            <DemoIconLabel
              icon="/app-icons/icon_date.svg"
              size={16}
              text={post.meetingAt}
              textSize={14}
              color={appColors.black700}
            />
          </div>

          <p
            className="mt-[20px] text-[14px] leading-relaxed"
            style={{ color: appColors.black800 }}
          >
            {community.detail.content}
          </p>

          {/* 좋아요 · 스크랩 · 공유 (h46 카드 3개, 균등 분배) */}
          <div className="mt-[24px] flex gap-[14px]">
            <ReactionButton
              icon={liked ? "/demo/icon_like_on.svg" : "/demo/icon_like_off.svg"}
              label={`${post.likes + (liked ? 1 : 0)}`}
              color={appColors.red}
              onClick={() => {
                setLiked((v) => !v);
                onTask("detail-like");
              }}
            />
            <ReactionButton
              icon={scrapped ? "/demo/icon_save_on.svg" : "/demo/icon_save_off.svg"}
              label={`${post.scraps + (scrapped ? 1 : 0)}`}
              color={appColors.yellow}
              onClick={() => setScrapped((v) => !v)}
            />
            <ReactionButton
              icon="/demo/icon_upload.svg"
              label={app.share}
              color={appColors.black700}
            />
          </div>

          {/* 채팅 참여하기 - 이 코스의 다음 걸음 */}
          <button
            type="button"
            onClick={() => {
              onTask("detail-join");
              onJoinChat();
            }}
            className="mt-[16px] flex h-[56px] w-full items-center justify-center gap-[12px] rounded-[12px] text-[16px] font-semibold text-white shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: appColors.blue }}
          >
            <Image
              src="/demo/icon_joining_game.svg"
              alt=""
              width={20}
              height={24}
              className="brightness-0 invert"
            />
            {app.joinChat}
          </button>

          <div className="mt-[24px] h-px" style={{ backgroundColor: appColors.black100 }} />
          <p
            className="mt-[16px] text-[16px] font-semibold"
            style={{ color: appColors.black600 }}
          >
            {app.commentCount(community.detail.comments.length)}
          </p>

          {/* 댓글 (community_comment_list.dart: 프로필 34 + 닉네임·본문·시각) */}
          <div className="flex flex-col pb-[20px]">
            {community.detail.comments.map((comment) => (
              <div key={comment.text} className="flex items-start gap-[10px] pt-[16px]">
                <Image
                  src={`/app-icons/profile_${comment.profile}.svg`}
                  alt=""
                  width={34}
                  height={34}
                  className="shrink-0 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center">
                    <p
                      className="min-w-0 flex-1 truncate text-[14px] font-semibold"
                      style={{ color: appColors.black }}
                    >
                      {comment.name}
                    </p>
                    <span className="flex shrink-0 items-center gap-[10px] opacity-40">
                      <Image src="/demo/icon_speech_bubble.svg" alt="" width={16} height={16} />
                      <Image src="/demo/icon_meatballs.svg" alt="" width={16} height={16} />
                    </span>
                  </div>
                  <p className="mt-[4px] text-[14px]" style={{ color: appColors.black700 }}>
                    {comment.text}
                  </p>
                  <p className="mt-[6px] text-[12px]" style={{ color: appColors.black300 }}>
                    {comment.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 댓글 입력창 (community_message_input.dart) - 데모에서는 구경만 한다 */}
      <div
        className="flex shrink-0 items-center gap-[10px] border-t px-[16px] py-[8px]"
        style={{ backgroundColor: appColors.white, borderColor: appColors.black100 }}
      >
        <span
          className="flex h-[40px] min-w-0 flex-1 items-center rounded-[12px] px-[14px] text-[14px]"
          style={{ backgroundColor: appColors.black100, color: appColors.black400 }}
        >
          {app.commentHint}
        </span>
        <span className="flex size-[36px] items-center justify-center">
          <DemoSendArrow color={appColors.black300} />
        </span>
      </div>
    </div>
  );
}
