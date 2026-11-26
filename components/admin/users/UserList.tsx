"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchQuery, useRelayEnvironment } from "react-relay";
import type { AdminUsers, AdminUsers$data } from "@/__generated__/AdminUsers.graphql";
import { AdminUsersQuery } from "@/lib/admin/gql/AdminUsers";
import { DEVICE_LABEL, SOCIAL_LABEL, labelOf } from "@/lib/admin/format";
import { dayName, groupInOrder, kstClock, kstDay } from "@/lib/admin/people";
import { usePagedQuery } from "@/lib/admin/usePagedQuery";
import type { LiveRoom, LiveRoomPerson } from "@/lib/admin/useLiveRooms";
import { RecentMenu } from "@/components/admin/RecentViewed";
import { ListViewSwitch } from "@/components/admin/ListViewSwitch";
import { EmptyRow, GroupHead, ListHead, ListRow, LiveDot, LoadMore, PersonAvatar, SearchIcon, SortIcon, Tag } from "@/components/admin/split/SplitParts";

type User = AdminUsers$data["adminUsers"]["content"][number];
const PAGE = 30;

/**
 * 유저 목록 칸 (#315, 시안 "경도 어드민 유저와 게임").
 * 유저 화면에 오는 일 대부분이 신고나 문의에 나온 닉네임을 찾는 일이라 검색을 맨 위에 두고 / 로 바로 칠 수 있게 했다.
 * 하루 새로 오는 사람이 열몇 명이라 가입한 날로 묶으면 오늘 몇 명이 왔는지가 따로 세지 않아도 보인다.
 * 줄의 표시는 운영자, 운영진, 위치 미동의처럼 예외일 때만 붙인다
 */
export function UserList({
  query,
  sort,
  selectedId,
  hrefFor,
  onQuery,
  onSort,
  staff,
  inRoom,
}: {
  query: string;
  sort: "DESC" | "ASC";
  selectedId: string | null;
  hrefFor: (id: string) => string;
  onQuery: (q: string) => void;
  onSort: (s: "DESC" | "ASC") => void;
  staff: Set<string> | null;
  inRoom: Map<string, { room: LiveRoom; person: LiveRoomPerson }>;
}) {
  const environment = useRelayEnvironment();
  const fetchPage = useCallback(
    (page: number) =>
      fetchQuery<AdminUsers>(environment, AdminUsersQuery, { page, size: PAGE, nickname: query || undefined, sortDirection: sort }, { fetchPolicy: "network-only" })
        .toPromise()
        .then((d) => {
          if (!d) throw new Error("no data");
          return d.adminUsers;
        }),
    [environment, query, sort],
  );
  const list = usePagedQuery<User>(`${query}|${sort}`, fetchPage);
  const groups = useMemo(() => groupInOrder(list.items, (u) => kstDay(u.createdAt)), [list.items]);

  return (
    <>
      <ListHead
        title="유저"
        count={list.initial ? null : `${list.total.toLocaleString("ko-KR")}명`}
        right={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSort(sort === "DESC" ? "ASC" : "DESC")}
              className="inline-flex items-center gap-1 rounded-[7px] px-1.5 py-1 text-[13px] font-medium text-sd-fg-muted transition-colors hover:bg-sd-pressed"
            >
              <SortIcon />
              {sort === "DESC" ? "최근 가입순" : "가입한 지 오래된 순"}
            </button>
            <RecentMenu group="user" />
            <ListViewSwitch />
          </div>
        }
      >
        <SearchBox value={query} onChange={onQuery} />
      </ListHead>

      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4 transition-opacity ${list.stale && !list.initial ? "opacity-50" : ""}`}>
        {list.initial ? (
          <RowsSkeleton />
        ) : list.items.length === 0 ? (
          list.failed ? (
            <div className="px-3 py-6 text-[13.5px] text-sd-fg-subtle">
              불러오지 못했어요.{" "}
              <button type="button" onClick={() => onQuery(query)} className="font-semibold text-accent hover:underline">
                다시 불러오기
              </button>
            </div>
          ) : query ? (
            <div className="px-3 py-10 text-center">
              <p className="text-[15px] font-bold text-sd-fg">&quot;{query}&quot; 유저가 없어요</p>
              <p className="mt-1 text-[13.5px] text-sd-fg-subtle">닉네임 일부만 입력해 보세요.</p>
              <button type="button" onClick={() => onQuery("")} className="mt-3 rounded-[10px] bg-sd-gray-200 px-3.5 py-2 text-[14px] font-semibold text-sd-fg hover:bg-sd-gray-300">
                검색 지우기
              </button>
            </div>
          ) : (
            <EmptyRow>아직 가입한 유저가 없어요.</EmptyRow>
          )
        ) : (
          groups.map((g, gi) => {
            // 마지막 묶음은 다음 쪽에 같은 날 사람이 더 있을 수 있어 사람 수를 적지 않는다
            const partial = gi === groups.length - 1 && list.hasMore;
            return (
              <div key={`${g.key}-${gi}`}>
                <GroupHead right={partial ? null : `${g.items.length}명`}>{dayName(g.items[0].createdAt)} 가입</GroupHead>
                {g.items.map((u) => (
                  <UserRow key={u.id} user={u} href={hrefFor(u.id)} current={u.id === selectedId} staff={staff?.has(u.id) ?? false} room={inRoom.get(u.id)} />
                ))}
              </div>
            );
          })
        )}
        <LoadMore hasMore={list.hasMore} loading={list.loadingMore} failed={list.failed && list.items.length > 0} onMore={list.more} />
      </div>
    </>
  );
}

function UserRow({ user, href, current, staff, room }: { user: User; href: string; current: boolean; staff: boolean; room?: { room: LiveRoom; person: LiveRoomPerson } }) {
  const meta = [labelOf(SOCIAL_LABEL, user.socialType), user.device ? labelOf(DEVICE_LABEL, user.device.deviceType) : "기기 미등록", `${kstClock(user.createdAt)} 가입`].join(" · ");
  return (
    <ListRow href={href} current={current}>
      <PersonAvatar id={user.id} size={40} />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px] font-semibold text-sd-fg">{user.nickname}</b>
        {room ? (
          // 신고 대상이 지금 게임 중인지가 가장 급한 정보라 초록으로 올린다
          <small className={`mt-px flex items-center gap-1.5 truncate text-[12.5px] font-semibold ${room.room.live ? "text-sd-positive" : "text-sd-fg-subtle"}`}>
            <LiveDot live={room.room.live} />
            {room.room.inviteCode} 방에서 {room.room.live ? "게임 중" : "대기 중"}
          </small>
        ) : (
          <small className="mt-px block truncate text-[12.5px] text-sd-fg-subtle">{meta}</small>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {user.role === "ADMIN" && <Tag tone="acc">운영자</Tag>}
        {staff && user.role !== "ADMIN" && <Tag>운영진</Tag>}
        {!user.locationTermsAgreed && <Tag tone="crit">위치 미동의</Tag>}
      </span>
    </ListRow>
  );
}

/** 닉네임 검색. 입력이 멈추면 0.3초 뒤에 찾는다. 어디서든 / 를 누르면 여기로 온다 */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  // 주소가 바뀌어(메뉴를 다시 누르는 등) 검색어가 달라지면 입력도 따라간다
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (text.trim() !== value) onChange(text.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [text, value, onChange]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      ref.current?.focus();
      ref.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <label className="flex h-[42px] items-center gap-2 rounded-xl bg-sd-gray-200 px-3 text-sd-fg-subtle transition-[box-shadow,background-color] focus-within:bg-sd-surface focus-within:shadow-[inset_0_0_0_1.5px_var(--color-accent)]">
      <SearchIcon />
      <input
        ref={ref}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setText("");
        }}
        aria-label="닉네임 검색"
        placeholder="닉네임으로 찾기"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-sd-fg outline-none placeholder:text-sd-fg-subtle [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button type="button" onClick={() => setText("")} className="rounded-md px-1.5 text-[12px] font-semibold text-sd-fg-subtle hover:text-sd-fg" aria-label="검색 지우기">
          지우기
        </button>
      ) : (
        <kbd className="rounded-[5px] bg-sd-surface px-[7px] py-px text-[11px] font-semibold text-sd-fg-subtle">/</kbd>
      )}
    </label>
  );
}

function RowsSkeleton() {
  return (
    <div aria-busy className="px-3 pt-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <span className="h-10 w-10 animate-pulse rounded-full bg-sd-gray-200" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-3.5 w-28 animate-pulse rounded bg-sd-gray-200" />
            <span className="block h-3 w-40 animate-pulse rounded bg-sd-gray-200" />
          </span>
        </div>
      ))}
    </div>
  );
}
