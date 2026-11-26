"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { PanelSkeleton } from "@/components/admin/split/SplitParts";
import { BackToList } from "@/components/admin/split/BackToList";
import { DetailPage } from "@/components/admin/split/SplitView";
import { UserPanel } from "@/components/admin/users/UserPanel";

// 유저 한 명만 담은 화면 (#315). 신고 화면처럼 다른 곳에서 링크로 열거나 팀원에게 주소를 보낼 때 쓴다.
// 내용은 두 칸 화면의 상세와 같다(components/admin/users/UserPanel.tsx)
export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Relay 가 실패를 기억해서, 열쇠를 바꿔야 다시 시도 버튼이 실제로 다시 읽는다
  const [retry, setRetry] = useState(0);
  return (
    <DetailPage>
      <BackToList list="/admin/users" selectedHref={`/admin/users?u=${id}`} label="유저 목록" />
      <QueryBoundary key={retry} pending={<PanelSkeleton />} onRetry={() => setRetry((n) => n + 1)}>
        <UserPanel id={id} page gamesHref={(gameResultId) => `/admin/games/history/${gameResultId}`} />
      </QueryBoundary>
    </DetailPage>
  );
}
