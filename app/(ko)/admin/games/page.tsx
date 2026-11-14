"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { GameEndReason } from "@/__generated__/AdminGameHistories.graphql";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { GAME_FILTERS, GameList, type GameTab } from "@/components/admin/games/GameList";
import { HistoryPanel } from "@/components/admin/games/HistoryPanel";
import { RoomPanel } from "@/components/admin/games/RoomPanel";
import { DetailState, PanelSkeleton, setSameScreenUrl } from "@/components/admin/split/SplitParts";
import { SplitView } from "@/components/admin/split/SplitView";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import { useLiveRooms } from "@/lib/admin/useLiveRooms";

// 게임 (#315, docs/admin-ui.md "유저와 게임 두 칸 화면"). 끝난 판과 지금 방을 두 탭으로 보고 오른쪽에서 연다(#323).
// 탭, 거르기, 고른 방과 판을 주소(?tab=, ?f=, ?room=, ?h=)에 남겨 새로 고치거나 링크로 보내도 같은 화면이 열린다.
export default function GamesPage() {
  const pathname = usePathname();
  const params = useSearchParams();
  const f = params.get("f");
  const filter = (GAME_FILTERS.some((x) => x.value === f) ? f : "") as GameEndReason | "";
  const room = params.get("room");
  const history = room ? null : params.get("h");
  // 탭을 적지 않은 방 링크(유저 상세의 "○○ 방에서 게임 중")는 방이 보이는 지금 방 탭으로 연다
  const t = params.get("tab");
  const tab: GameTab = t === "rooms" || (t === null && room) ? "rooms" : "done";

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
          tab={tab}
          // 탭과 거르기는 서버를 다녀오지 않고 주소만 바꿔 누르는 즉시 바뀐다(#325)
          onTab={(v) => setSameScreenUrl(hrefWith({ tab: v === "rooms" ? "rooms" : room ? "done" : null }))}
          filter={filter}
          onFilter={(v) => setSameScreenUrl(hrefWith({ f: v || null }))}
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
          <DetailState
            title={tab === "rooms" ? "왼쪽에서 방을 골라 주세요" : "왼쪽에서 판을 골라 주세요"}
            body={tab === "rooms" ? "게임 중인 방이 위에, 대기 중인 방이 아래에 있어요." : "끝난 판은 날짜별로 이어져요. 지금 열린 방은 \"지금 방\"에 있어요."}
          />
        )
      }
    />
  );
}
