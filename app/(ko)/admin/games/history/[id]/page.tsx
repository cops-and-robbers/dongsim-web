"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { HistoryPanel } from "@/components/admin/games/HistoryPanel";
import { BackIcon, PanelSkeleton } from "@/components/admin/split/SplitParts";
import { DetailPage } from "@/components/admin/split/SplitView";

// 끝난 판 하나만 담은 화면 (#315). 신고 처리나 팀원에게 주소를 보낼 때 쓴다.
// 내용은 두 칸 화면의 판 상세와 같다(components/admin/games/HistoryPanel.tsx)
export default function GameHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [retry, setRetry] = useState(0);
  return (
    <DetailPage>
      <Link href={`/admin/games?h=${id}`} className="-ml-2 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-[13.5px] font-semibold text-sd-fg-subtle hover:bg-sd-pressed hover:text-sd-fg">
        <BackIcon />
        게임 목록
      </Link>
      <QueryBoundary key={retry} pending={<PanelSkeleton />} onRetry={() => setRetry((n) => n + 1)}>
        <HistoryPanel id={id} page userHref={(userId) => `/admin/users/${userId}`} />
      </QueryBoundary>
    </DetailPage>
  );
}
