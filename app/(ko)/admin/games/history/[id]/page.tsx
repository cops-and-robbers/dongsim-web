"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { HistoryPanel } from "@/components/admin/games/HistoryPanel";
import { PanelSkeleton } from "@/components/admin/split/SplitParts";
import { BackToList } from "@/components/admin/split/BackToList";
import { DetailPage } from "@/components/admin/split/SplitView";

// 끝난 판 하나만 담은 화면 (#315). 신고 처리나 팀원에게 주소를 보낼 때 쓴다.
// 내용은 두 칸 화면의 판 상세와 같다(components/admin/games/HistoryPanel.tsx)
export default function GameHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [retry, setRetry] = useState(0);
  return (
    <DetailPage>
      <BackToList list="/admin/games" selectedHref={`/admin/games?h=${id}`} label="게임 목록" />
      <QueryBoundary key={retry} pending={<PanelSkeleton />} onRetry={() => setRetry((n) => n + 1)}>
        <HistoryPanel id={id} page userHref={(userId) => `/admin/users/${userId}`} />
      </QueryBoundary>
    </DetailPage>
  );
}
