"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { GameEndReason } from "@/__generated__/AdminGameHistories.graphql";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { GAME_FILTERS, GameList } from "@/components/admin/games/GameList";
import { HistoryPanel } from "@/components/admin/games/HistoryPanel";
import { RoomPanel } from "@/components/admin/games/RoomPanel";
import { DetailState, PanelSkeleton } from "@/components/admin/split/SplitParts";
import { SplitView } from "@/components/admin/split/SplitView";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import { useLiveRooms } from "@/lib/admin/useLiveRooms";

// 게임 (#315, docs/admin-ui.md "유저와 게임 두 칸 화면"). 지금 열린 방과 끝난 판을 한 목록에서 보고 오른쪽에서 연다.
// 거르기와 고른 방, 판을 주소(?f=, ?room=, ?h=)에 남겨 새로 고치거나 링크로 보내도 같은 화면이 열린다.
export default function GamesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const f = params.get("f");
  const filter = (GAME_FILTERS.some((x) => x.value === f) ? f : "") as GameEndReason | "";
  const room = params.get("room");
  const history = room ? null : params.get("h");

  const hrefWith = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const q = next.toString();
      return q ? `${pathname}?${q}` : pathname;
    },
    [params, pathname],
  );

  // 방 상태는 앱에서 바뀌어 화면을 보는 동안 30초마다 새로 받는다(lib/admin/useLiveRefresh.ts). 끝난 판 첫 쪽도 같은 차례에 다시 읽어 새 판을 붙인다
  const live = useLiveRefresh();
  const rooms = useLiveRooms(live);
  const userHref = (userId: string) => `/admin/users?u=${userId}`;

  return (
    <SplitView
      listLabel="게임 목록"
      detailLabel="게임 상세"
      selectionKey={room ? `room-${room}` : history ? `h-${history}` : null}
      closeHref={hrefWith({ room: null, h: null })}
      list={
        <GameList
          filter={filter}
          onFilter={(v) => router.replace(hrefWith({ f: v || null }), { scroll: false })}
          rooms={rooms.rooms}
          roomsReady={rooms.status !== "loading"}
          syncedAt={rooms.syncedAt}
          refreshKey={live}
          selected={{ room, history }}
          roomHref={(id) => hrefWith({ room: id, h: null })}
          historyHref={(id) => hrefWith({ h: id, room: null })}
        />
      }
      detail={
        room ? (
          <QueryBoundary key={`room-${room}`} pending={<PanelSkeleton />}>
            <RoomPanel id={room} userHref={userHref} />
          </QueryBoundary>
        ) : history ? (
          <QueryBoundary key={`h-${history}`} pending={<PanelSkeleton />}>
            <HistoryPanel id={history} userHref={userHref} />
          </QueryBoundary>
        ) : (
          <DetailState title="왼쪽에서 방이나 판을 골라 주세요" body="지금 열린 방은 맨 위에, 끝난 판은 날짜별로 이어져요." />
        )
      }
    />
  );
}
