"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { RoomPanel } from "@/components/admin/games/RoomPanel";
import { PanelSkeleton } from "@/components/admin/split/SplitParts";
import { BackToList } from "@/components/admin/split/BackToList";
import { DetailPage } from "@/components/admin/split/SplitView";

// 방 하나만 담은 화면 (#315). 행사 부스에서 이 방만 띄워 두거나, 링크로 열 때 쓴다.
// 내용은 두 칸 화면의 방 상세와 같다(components/admin/games/RoomPanel.tsx)
export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [retry, setRetry] = useState(0);
  return (
    <DetailPage>
      <BackToList list="/admin/games" selectedHref={`/admin/games?room=${id}`} label="게임 목록" />
      <QueryBoundary key={retry} pending={<PanelSkeleton />} onRetry={() => setRetry((n) => n + 1)}>
        <RoomPanel id={id} page userHref={(userId) => `/admin/users/${userId}`} />
      </QueryBoundary>
    </DetailPage>
  );
}
