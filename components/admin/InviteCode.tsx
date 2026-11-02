"use client";

import Link from "next/link";
import { SEEN_ROW_TITLE } from "@/components/admin/Table";

// 초대코드: 클릭하면 게임 상세로 바로 이동한다.
// 상세 모달 안에서는 newTabLabel 을 줘서 새 탭으로 열고 쓰던 처리 메모를 지킨다.
export function InviteCode({
  code,
  gameId,
  newTabLabel,
}: {
  code: string;
  gameId: string;
  newTabLabel?: string;
}) {
  return (
    <Link
      href={`/admin/games/${gameId}`}
      {...(newTabLabel ? { target: "_blank", rel: "noopener", "aria-label": newTabLabel } : {})}
      className={`font-mono text-[13px] font-bold tracking-wide text-sd-fg transition hover:text-accent ${SEEN_ROW_TITLE}`}
    >
      {code}
    </Link>
  );
}
