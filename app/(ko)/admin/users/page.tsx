"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { DetailState, PanelSkeleton, setSameScreenUrl } from "@/components/admin/split/SplitParts";
import { SplitView } from "@/components/admin/split/SplitView";
import { UserList } from "@/components/admin/users/UserList";
import { UserPanel } from "@/components/admin/users/UserPanel";
import { fetchStaffIds } from "@/lib/admin/staffClient";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import { roomsByUser, useLiveRooms } from "@/lib/admin/useLiveRooms";

// 유저 (#315, docs/admin-ui.md "유저와 게임 두 칸 화면"). 왼쪽에서 찾고 오른쪽에서 본다.
// 검색어, 정렬, 고른 사람을 주소(?q=, ?sort=asc, ?u=)에 남겨 새로 고치거나 링크로 보내도 같은 화면이 열린다.
export default function UsersPage() {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const sort = params.get("sort") === "asc" ? "ASC" : "DESC";
  const selected = params.get("u");

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
  // 검색어와 정렬은 서버를 다녀오지 않고 주소만 바꾼다. 글자를 칠 때마다 서버를 다녀오면 늦게 따라왔다(#325)
  const replace = useCallback((patch: Record<string, string | null>) => setSameScreenUrl(hrefWith(patch)), [hrefWith]);

  // 지금 방에 있는 사람은 게임 데이터와 맞춰 보면 서버 추가 없이 알 수 있다. 방 상태는 앱에서 바뀌어 30초마다 다시 읽는다
  const live = useLiveRefresh();
  const rooms = useLiveRooms(live);
  const inRoom = useMemo(() => roomsByUser(rooms.rooms), [rooms.rooms]);

  // 운영진 표시는 한 번만 읽는다. 못 읽으면 표시만 빠진다
  const [staff, setStaffIds] = useState<Set<string> | null>(null);
  useEffect(() => {
    let alive = true;
    fetchStaffIds().then(
      (ids) => alive && setStaffIds(ids),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SplitView
      listLabel="유저 찾기"
      detailLabel="유저 상세"
      selectionKey={selected}
      closeHref={hrefWith({ u: null })}
      list={
        <UserList
          query={query}
          sort={sort}
          selectedId={selected}
          hrefFor={(id) => hrefWith({ u: id })}
          onQuery={(q) => replace({ q })}
          onSort={(s) => replace({ sort: s === "ASC" ? "asc" : null })}
          staff={staff}
          inRoom={inRoom}
        />
      }
      detail={
        selected ? (
          <QueryBoundary key={selected} pending={<PanelSkeleton />}>
            <UserPanel id={selected} gamesHref={(gameResultId) => `/admin/games?h=${gameResultId}`} />
          </QueryBoundary>
        ) : (
          <DetailState title="왼쪽에서 유저를 골라 주세요" body="닉네임으로 찾거나 / 를 눌러 바로 검색할 수 있어요." />
        )
      }
    />
  );
}
