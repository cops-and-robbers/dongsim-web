"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openInApp } from "@/lib/deeplink-bridge";

// 모집글 하단 "앱에서 참여하기" 버튼 (#101).
// 설치자는 앱의 글 상세(copsandrobbers://open/community/{postId})로 바로 가고,
// 미설치자는 스토어로, 데스크톱은 다운로드 페이지로 흘려보낸다.
// 인스타그램처럼 탈출이 불가능한 인앱 브라우저에서는 수동 안내로 바뀐다.

export default function OpenInAppButton({
  postId,
  label,
  guideTitle,
  guideBody,
  className,
}: {
  postId: number;
  label: string;
  guideTitle: string;
  guideBody: string;
  className?: string;
}) {
  const router = useRouter();
  const [showGuide, setShowGuide] = useState(false);

  const handleClick = () => {
    const result = openInApp(`open/community/${postId}`);
    if (result === "guide") setShowGuide(true);
    if (result === "desktop") router.push("/download");
  };

  if (showGuide) {
    return (
      <div className="ml-auto text-right text-xs leading-relaxed max-sm:w-full max-sm:text-center">
        <p className="font-bold text-slate-900 dark:text-white">{guideTitle}</p>
        <p className="text-slate-500 dark:text-slate-400">{guideBody}</p>
      </div>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
