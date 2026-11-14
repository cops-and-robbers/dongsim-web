"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchQuery, useRelayEnvironment } from "react-relay";
import type { AdminGameHistories, AdminGameHistories$data, GameEndReason } from "@/__generated__/AdminGameHistories.graphql";
import type { AdminGameHistoriesPlaceNames } from "@/__generated__/AdminGameHistoriesPlaceNames.graphql";
import { AdminGameHistoriesQuery } from "@/lib/admin/gql/AdminGameHistories";
import { AdminGameHistoriesPlaceNamesQuery } from "@/lib/admin/gql/AdminGameHistoriesPlaceNames";
import { END_REASON_LABEL, TEAM_LABEL, gameEndedAt, labelOf } from "@/lib/admin/format";
import { shortPlaceName, waitingStage } from "@/lib/admin/gameExtras";
import { ago, dayName, durationText, groupInOrder, kstClock, kstDay } from "@/lib/admin/people";
import { usePagedQuery } from "@/lib/admin/usePagedQuery";
import type { LiveRoom } from "@/lib/admin/useLiveRooms";
import { RecentMenu } from "@/components/admin/RecentViewed";
import { Chip, EmptyRow, GroupHead, ListHead, ListRow, LiveDot, LoadMore, Segmented, Tag } from "@/components/admin/split/SplitParts";

type History = AdminGameHistories$data["adminGameHistories"]["content"][number] & { placeName: string | null };

/**
 * 거르기. 서버가 끝난 이유(endReason) 하나로만 거를 수 있어 이유마다 칩을 둔다.
 * 시안의 "이벤트" 칩은 서버 거르기가 없어 뺐다(받아 온 쪽만 거르면 몇 판 안 보이는데 다 본 것처럼 보인다). 줄의 "이벤트" 표시로 알아본다
 */
export const GAME_FILTERS: { value: GameEndReason | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: "ALL_ARRESTED", label: "전원 체포" },
  { value: "TIME_OVER", label: "시간 종료" },
  { value: "POLICE_FORFEITED", label: "경찰 기권" },
  { value: "ROBBER_FORFEITED", label: "도둑 기권" },
];

const PAGE = 30;

/** 목록 탭(#323). 끝난 판이 기본이고 지금 방은 주소에 ?tab=rooms 로 남긴다 */
export type GameTab = "done" | "rooms";

/**
 * 게임 목록 칸 (#315, 시안 "경도 어드민 유저와 게임").
 * 끝난 판과 지금 방을 두 탭으로 나눈다(#323). 운영진이 주로 보는 건 끝난 판이라 기본이고, 열린 방이 맨 위에 고정돼 있으면
 * 몇 달째 대기 중인 방까지 끝난 판을 밀어냈다. 방 상태는 대기 중과 게임 중뿐이라(판이 끝나면 다시 대기 중, 빈 방은 지워진다)
 * 지금 방 탭 안에서 게임 중을 위에, 대기 중을 아래에 묶는다. 게임 중인 방 수는 탭 이름 옆에 붙여 들어가지 않아도 보이게 한다.
 * 끝난 판 줄은 결과 다음에 바로 어디서 했는지가 온다. 게임은 실제 장소에서 하니 위치가 판을 알아보는 가장 큰 단서고, 방장 이름이 두 번째 단서다
 */
export function GameList({
  tab,
  onTab,
  filter,
  onFilter,
  rooms,
  roomsReady,
  syncedAt,
  refreshKey,
  selected,
  roomHref,
  historyHref,
}: {
  tab: GameTab;
  onTab: (t: GameTab) => void;
  filter: GameEndReason | "";
  onFilter: (f: GameEndReason | "") => void;
  rooms: readonly LiveRoom[];
  roomsReady: boolean;
  syncedAt: number | null;
  refreshKey: number;
  selected: { room: string | null; history: string | null };
  roomHref: (id: string) => string;
  historyHref: (id: string) => string;
}) {
  const environment = useRelayEnvironment();
  const fetchPage = useCallback(
    async (page: number) => {
      const vars = { page, size: PAGE, endReason: filter || undefined, sortDirection: "DESC" as const };
      const [d, places] = await Promise.all([
        fetchQuery<AdminGameHistories>(environment, AdminGameHistoriesQuery, vars, { fetchPolicy: "network-only" }).toPromise(),
        // 동네 이름은 운영에 아직 없을 수 있다(BE #241). 없으면 비워 둔다
        fetchQuery<AdminGameHistoriesPlaceNames>(environment, AdminGameHistoriesPlaceNamesQuery, vars, { fetchPolicy: "network-only" })
          .toPromise()
          .then((p) => new Map((p?.adminGameHistories.content ?? []).map((h) => [h.id, h.area?.placeName ?? null])))
          .catch(() => new Map<string, string | null>()),
      ]);
      if (!d) throw new Error("no data");
      return { ...d.adminGameHistories, content: d.adminGameHistories.content.map((h) => ({ ...h, placeName: places.get(h.id) ?? null })) };
    },
    [environment, filter],
  );
  const list = usePagedQuery<History>(filter, fetchPage, refreshKey);
  const days = useMemo(() => groupInOrder(list.items, (h) => kstDay(gameEndedAt(h))), [list.items]);
  const playing = rooms.filter((r) => r.live);
  const waiting = rooms.filter((r) => !r.live);

  return (
    <>
      <ListHead title="게임" right={<div className="flex items-center gap-1"><SyncLabel at={syncedAt} /><RecentMenu group="game" /></div>}>
        <Segmented
          group="game-tab"
          label="게임 목록 나누기"
          value={tab}
          onChange={onTab}
          options={[
            { value: "done", label: "끝난 판" },
            {
              value: "rooms",
              label: (
                <>
                  지금 방
                  {playing.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold tabular-nums text-sd-positive" aria-label={`게임 중 ${playing.length}`}>
                      <LiveDot live />
                      {playing.length}
                    </span>
                  )}
                </>
              ),
            },
          ]}
        />
        {tab === "done" && (
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
            {GAME_FILTERS.map((f) => (
              <Chip key={f.value || "all"} group="end-reason" on={filter === f.value} onClick={() => onFilter(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
        )}
      </ListHead>

      {/* 탭마다 스크롤을 따로 둔다. 키를 바꿔 다른 탭에서 내려간 위치를 끌고 오지 않게 한다 */}
      <div key={tab} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
        {tab === "rooms" ? (
          <RoomsTab ready={roomsReady} playing={playing} waiting={waiting} selected={selected.room} roomHref={roomHref} />
        ) : (
        <div className={`transition-opacity ${list.stale && !list.initial ? "opacity-50" : ""}`}>
          {list.initial ? (
            <div aria-busy className="space-y-2 px-3 pt-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-sd-gray-200" />
              ))}
            </div>
          ) : list.items.length === 0 ? (
            <>
              <GroupHead>끝난 게임</GroupHead>
              <EmptyRow>{list.failed ? "끝난 게임을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요." : filter ? "조건에 맞는 판이 없어요." : "아직 끝난 게임이 없어요."}</EmptyRow>
            </>
          ) : (
            days.map((d, di) => {
              const partial = di === days.length - 1 && list.hasMore;
              return (
                <div key={`${d.key}-${di}`}>
                  <GroupHead right={partial ? null : `${d.items.length}판`}>{dayName(gameEndedAt(d.items[0]))} 끝난 게임</GroupHead>
                  {d.items.map((h) => (
                    <HistoryRow key={h.id} h={h} href={historyHref(h.id)} current={selected.history === h.id} />
                  ))}
                </div>
              );
            })
          )}
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} failed={list.failed && list.items.length > 0} onMore={list.more} />
        </div>
        )}
      </div>
    </>
  );
}

// 지금 방 탭. 게임 중이 위, 대기 중이 아래. 게임 중이 없어도 그 묶음 제목은 남겨 "지금은 아무도 안 한다"가 바로 읽히게 한다
function RoomsTab({
  ready,
  playing,
  waiting,
  selected,
  roomHref,
}: {
  ready: boolean;
  playing: readonly LiveRoom[];
  waiting: readonly LiveRoom[];
  selected: string | null;
  roomHref: (id: string) => string;
}) {
  if (!ready)
    return (
      <div aria-busy className="space-y-2 px-3 pt-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-sd-gray-200" />
        ))}
      </div>
    );
  if (playing.length + waiting.length === 0) return <EmptyRow>지금 열린 방이 없어요.</EmptyRow>;
  return (
    <>
      <GroupHead right={`${playing.length}개`}>게임 중</GroupHead>
      {playing.length === 0 ? (
        <EmptyRow>지금 게임 중인 방이 없어요.</EmptyRow>
      ) : (
        playing.map((r) => <RoomRow key={r.id} room={r} href={roomHref(r.id)} current={selected === r.id} />)
      )}
      {waiting.length > 0 && (
        <>
          <GroupHead right={`${waiting.length}개`}>대기 중</GroupHead>
          {waiting.map((r) => (
            <RoomRow key={r.id} room={r} href={roomHref(r.id)} current={selected === r.id} />
          ))}
        </>
      )}
    </>
  );
}

// 방 줄은 방 코드, 어디서 하는지, 인원, 상태 순서다. 방 코드와 상태 글자만으로 끝난 판과 구분돼서 꾸밈 아이콘은 넣지 않았다
function RoomRow({ room, href, current }: { room: LiveRoom; href: string; current: boolean }) {
  const pol = room.people?.filter((p) => p.team === "POLICE").length ?? 0;
  const rob = room.people?.filter((p) => p.team === "ROBBER").length ?? 0;
  const teams = room.people && (room.live || pol + rob > 0) ? `경찰 ${pol} · 도둑 ${rob}` : `${room.participantCount}명`;
  const people = room.isEventGame ? teams : `${teams} / ${room.maxParticipants}명`;
  // 대기 중인 방은 시작 전인지, 몇 판 하고 쉬는 중인지를 붙인다. 몇 달째 대기 중인 방(앱을 끄고 나가지 않은 방)도 이걸로 가려진다
  const meta = [room.placeName ? shortPlaceName(room.placeName) : null, people, room.live ? null : waitingStage(room.roundNumber)].filter(Boolean).join(" · ");
  return (
    <ListRow href={href} current={current}>
      <span className="min-w-0 flex-1">
        <b className={`flex items-center gap-1.5 text-[15px] font-bold tracking-[0.06em] tabular-nums ${room.live ? "text-sd-fg" : "text-sd-fg-muted"}`}>
          {room.inviteCode}
          {room.isEventGame && <Tag>이벤트</Tag>}
        </b>
        <small className="mt-px block truncate text-[12.5px] text-sd-fg-subtle" title={room.placeName ?? undefined}>
          {meta}
        </small>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-[3px] text-[12.5px] text-sd-fg-subtle">
        <span className={`inline-flex items-center gap-1.5 font-semibold ${room.live ? "text-sd-positive" : "text-sd-fg-subtle"}`}>
          <LiveDot live={room.live} />
          {room.live ? "게임 중" : "대기 중"}
        </span>
        <span className="tabular-nums">{room.live && room.startedAt ? `${ago(room.startedAt)} 시작` : `${ago(room.createdAt)} 만듦`}</span>
      </span>
    </ListRow>
  );
}

function HistoryRow({ h, href, current }: { h: History; href: string; current: boolean }) {
  const host = h.hostUserId ? h.participants.find((p) => p.userId === h.hostUserId)?.nickname : null;
  const place = h.placeName ? shortPlaceName(h.placeName) : null;
  const meta = [place, `체포 ${h.arrestedRobberCount}/${h.totalRobberCount}`, host ? `${host} 님의 방` : null].filter(Boolean).join(" · ");
  const cop = h.winnerTeam === "POLICE";
  return (
    <ListRow href={href} current={current}>
      <span className="min-w-0 flex-1">
        <b className="flex items-center gap-1.5 text-[15px]">
          <span className={`font-bold ${cop ? "text-sd-info" : "text-sd-positive"}`}>{labelOf(TEAM_LABEL, h.winnerTeam)} 승</span>
          <span className="truncate font-medium text-sd-fg-subtle">· {labelOf(END_REASON_LABEL, h.endReason)}</span>
          {h.isEventGame && <Tag>이벤트</Tag>}
        </b>
        <small className="mt-px block truncate text-[12.5px] text-sd-fg-subtle" title={h.placeName ?? undefined}>
          {meta}
        </small>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-[3px] text-[12.5px] tabular-nums text-sd-fg-subtle">
        <span className="font-semibold text-sd-fg-muted">{kstClock(gameEndedAt(h))}</span>
        <span>{durationText(h.durationSeconds)} 경기</span>
      </span>
    </ListRow>
  );
}

// 방 상태는 앱에서 바뀌어 30초마다 새로 받는다. 언제 받은 정보인지 알아야 믿고 움직일 수 있다
function SyncLabel({ at }: { at: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (at === null) return null;
  const s = Math.max(0, Math.round((now - at) / 1000));
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium tabular-nums text-sd-fg-subtle">
      <LiveDot live />
      {s < 5 ? "방금 업데이트" : s < 60 ? `${s}초 전 업데이트` : `${Math.floor(s / 60)}분 전 업데이트`}
    </span>
  );
}
