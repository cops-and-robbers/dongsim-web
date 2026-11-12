"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { RoomPanel } from "@/components/admin/games/RoomPanel";
import { BackIcon, PanelSkeleton } from "@/components/admin/split/SplitParts";
import { DetailPage } from "@/components/admin/split/SplitView";

// 방 하나만 담은 화면 (#315). 행사 부스에서 이 방만 띄워 두거나, 링크로 열 때 쓴다.
// 내용은 두 칸 화면의 방 상세와 같다(components/admin/games/RoomPanel.tsx)
export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [retry, setRetry] = useState(0);
  return (
    <DetailPage>
      <Link href={`/admin/games?room=${id}`} className="-ml-2 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-[13.5px] font-semibold text-sd-fg-subtle hover:bg-sd-pressed hover:text-sd-fg">
        <BackIcon />
        게임 목록
      </Link>
      <QueryBoundary key={retry} pending={<PanelSkeleton />} onRetry={() => setRetry((n) => n + 1)}>
        <RoomPanel id={id} page userHref={(userId) => `/admin/users/${userId}`} />
      </QueryBoundary>
    </DetailPage>
  );
}
