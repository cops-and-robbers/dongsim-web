"use client";

import Image from "next/image";
import { useState } from "react";
import { appColors } from "@/lib/app-tokens";
import type { DemoCommunityPost } from "@/lib/demo/copy";
import { useDemoCopy } from "../demo-copy";
import { DemoIconLabel, DemoStatusChip, demoShadowVer2 } from "./DemoCommunityParts";

// 커뮤니티 모집글 목록 (community_page.dart 실측). 상단 바(검색·알림) +
// 스코프 토글 + 정렬 라벨 + 카드 목록 + 떠 있는 작성 버튼.
// 스코프 토글은 실제로 움직이고, 우리 동네·내 모임은 앱처럼 준비 중이다.
// 눌리는 모집글은 맨 위 하나 - 나머지는 코스 밖 구경거리다.
export function DemoCommunityList({ onOpenPost }: { onOpenPost: () => void }) {
  const { app, community } = useDemoCopy();
  const [scope, setScope] = useState(0);
  const scopes = [app.scopeAll, app.scopeNearby, app.scopeMine];

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ backgroundColor: appColors.background }}
    >
      {/* 상단 바 - 가운데 제목, 우측 검색·알림 (탭 루트라 뒤로가기 없음) */}
      <div
        className="relative flex h-[56px] shrink-0 items-center justify-end gap-[20px] px-[16px]"
        style={{ backgroundColor: appColors.white }}
      >
        <p
          className="absolute inset-x-0 text-center text-[17px] font-semibold"
          style={{ color: appColors.black }}
        >
          {app.communityTitle}
        </p>
        <Image src="/demo/icon_search.svg" alt="" width={22} height={22} className="relative" />
        <Image src="/demo/icon_noti.svg" alt="" width={22} height={22} className="relative" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* 스코프 토글 (segmented_toggle.dart: 높이 40 트랙 + 인셋 5 흰 pill) */}
        <div className="shrink-0 px-[16px] pt-[14px]">
          <div
            className="relative grid h-[38px] grid-cols-3 rounded-full p-[4px]"
            style={{ backgroundColor: appColors.black100 }}
          >
            <span
              className="absolute bottom-[4px] top-[4px] w-[calc((100%-8px)/3)] rounded-full transition-[left] duration-300 ease-out"
              style={{
                backgroundColor: appColors.white,
                left: `calc(4px + ${scope} * (100% - 8px) / 3)`,
              }}
            />
            {scopes.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setScope(i)}
                className="relative text-[13px] font-medium transition-colors duration-300"
                style={{ color: i === scope ? appColors.black800 : appColors.black400 }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {scope === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-hidden px-[16px] pt-[14px]">
            {/* 정렬 라벨 (community_feed_list.dart: 우측 정렬, 12px black600) */}
            <div className="flex shrink-0 items-center justify-end gap-[4px] px-[8px]">
              <span className="text-[12px]" style={{ color: appColors.black600 }}>
                {app.sortLatest}
              </span>
              <Image src="/demo/icon_sort.svg" alt="" width={10} height={6} />
            </div>
            {community.posts.map((post, i) => (
              <PostCard key={post.title} post={post} onOpen={i === 0 ? onOpenPost : undefined} />
            ))}
          </div>
        ) : (
          // 우리 동네·내 모임은 앱과 같이 준비 중 안내다
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[14px]">
            <Image src="/characters/robber.svg" alt="" width={96} height={87} />
            <p className="text-[15px] font-semibold" style={{ color: appColors.black600 }}>
              {app.comingSoon}
            </p>
          </div>
        )}

        {/* 떠 있는 모집글 작성 버튼 (pill 134x42) - 데모에서는 구경만 한다 */}
        <span
          className="absolute bottom-[14px] left-1/2 flex h-[42px] w-[134px] -translate-x-1/2 items-center justify-center gap-[6px] rounded-full text-[14px] font-bold text-white"
          style={{ backgroundColor: appColors.blue, boxShadow: demoShadowVer2 }}
        >
          <Image
            src="/app-icons/icon_write.svg"
            alt=""
            width={14}
            height={14}
            className="brightness-0 invert"
          />
          {app.createPost}
        </span>
      </div>
    </div>
  );
}

// 모집글 카드 (community_post_card.dart 실측: 흰 바탕 라운드 12,
// 패딩 22/16, 배지+제목+메뉴 / 위치 / 일시·인원·반응 세 줄).
// 마감 글은 앱처럼 콘텐츠만 흐려진다 - 그림자는 남는다.
function PostCard({ post, onOpen }: { post: DemoCommunityPost; onOpen?: () => void }) {
  const { app } = useDemoCopy();
  const recruiting = post.status === "recruiting";
  const [current, max] = post.headcount;

  const body = (
    <div className={recruiting ? undefined : "opacity-60"}>
      <div className="flex items-center gap-[8px] pl-[2px]">
        <DemoStatusChip
          label={recruiting ? app.statusRecruiting : app.statusCompleted}
          recruiting={recruiting}
        />
        <p
          className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold"
          style={{ color: appColors.black }}
        >
          {post.title}
        </p>
        <Image src="/demo/icon_meatballs.svg" alt="" width={18} height={18} />
      </div>
      <div className="h-[10px]" />
      <div className="flex">
        <DemoIconLabel
          icon="/app-icons/icon_location.svg"
          size={14}
          text={post.location}
          textSize={12}
          color={appColors.black700}
        />
      </div>
      <div className="h-[8px]" />
      <div className="flex items-center gap-[12px]">
        <DemoIconLabel
          icon="/app-icons/icon_date.svg"
          size={14}
          text={post.meetingAt}
          textSize={12}
          color={appColors.black700}
        />
        <DemoIconLabel
          icon="/app-icons/icon_headcount.svg"
          size={14}
          text={app.headcount(current, max)}
          textSize={12}
          color={appColors.black600}
        />
        <span className="ml-auto flex items-center gap-[2px]">
          <Image src="/demo/icon_like_off.svg" alt="" width={12} height={12} />
          <span className="text-[12px]" style={{ color: appColors.red }}>
            {post.likes}
          </span>
        </span>
        <span className="flex items-center gap-[2px]">
          <Image src="/demo/icon_save_off.svg" alt="" width={12} height={12} />
          <span className="text-[12px]" style={{ color: appColors.yellow }}>
            {post.scraps}
          </span>
        </span>
      </div>
    </div>
  );

  const cardClass = "shrink-0 rounded-[12px] px-[20px] py-[14px] text-left";
  const cardStyle = { backgroundColor: appColors.white, boxShadow: demoShadowVer2 };
  if (!onOpen) {
    return (
      <div className={cardClass} style={cardStyle}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${cardClass} transition-transform active:scale-[0.98]`}
      style={cardStyle}
    >
      {body}
    </button>
  );
}
