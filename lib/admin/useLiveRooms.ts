"use client";

import { useEffect, useState } from "react";
import { fetchQuery, useRelayEnvironment } from "react-relay";
import type { AdminGame } from "@/__generated__/AdminGame.graphql";
import type { AdminGames } from "@/__generated__/AdminGames.graphql";
import type { AdminGamesPlaceNames } from "@/__generated__/AdminGamesPlaceNames.graphql";
import { AdminGameQuery } from "@/lib/admin/gql/AdminGame";
import { AdminGamesQuery } from "@/lib/admin/gql/AdminGames";
import { AdminGamesPlaceNamesQuery } from "@/lib/admin/gql/AdminGamesPlaceNames";

export type LiveRoomPerson = { userId: string; nickname: string; team: string | null | undefined; status: string; isHost: boolean };

export type LiveRoom = {
  id: string;
  inviteCode: string;
  live: boolean;
  isEventGame: boolean;
  maxParticipants: number;
  participantCount: number;
  roundNumber: number;
  createdAt: string;
  startedAt: string | null;
  /** 방 상세를 못 읽었으면 null. 그래도 목록 줄은 요약 값으로 그린다 */
  people: LiveRoomPerson[] | null;
  placeName: string | null;
};

// 방은 하루 평균 4.6개만 만들어진다(10/13~11/8). 한 번에 열린 방이 이보다 많을 일은 거의 없어 쪽을 넘기지 않는다
const MAX_ROOMS = 50;

/**
 * 지금 열린 방 (#315). 게임 목록 맨 위와, 유저 목록의 "지금 게임 중" 표시에 같이 쓴다.
 * 방 목록에는 명단이 없어 방마다 상세(AdminGame)를 한 번씩 더 읽는다. 상세를 읽은 값이 스토어에 남아 방을 누르면 바로 열린다.
 * 서버가 끝난 판을 다시 대기 중으로 돌리고 빈 방은 지우므로, 남는 상태는 대기 중과 진행 중뿐이다
 */
export function useLiveRooms(refreshKey: number) {
  const environment = useRelayEnvironment();
  const [state, setState] = useState<{ rooms: LiveRoom[]; status: "loading" | "ready" | "error"; syncedAt: number | null }>({
    rooms: [],
    status: "loading",
    syncedAt: null,
  });

  useEffect(() => {
    let alive = true;
    const vars = { page: 0, size: MAX_ROOMS, sortDirection: "DESC" as const };
    (async () => {
      const list = await fetchQuery<AdminGames>(environment, AdminGamesQuery, vars, { fetchPolicy: "network-only" }).toPromise();
      const open = (list?.adminGames.content ?? []).filter((g) => g.status === "WAITING" || g.status === "IN_PROGRESS");
      // 동네 이름은 운영에 아직 없을 수 있다(BE #241). 없으면 비워 두고 나머지는 그대로
      const places = await fetchQuery<AdminGamesPlaceNames>(environment, AdminGamesPlaceNamesQuery, vars, { fetchPolicy: "network-only" })
        .toPromise()
        .then((d) => new Map((d?.adminGames.content ?? []).map((g) => [g.id, g.placeName ?? null])))
        .catch(() => new Map<string, string | null>());
      const details = await Promise.all(
        open.map((g) =>
          fetchQuery<AdminGame>(environment, AdminGameQuery, { id: g.id }, { fetchPolicy: "network-only" })
            .toPromise()
            .then((d) => d?.adminGame ?? null)
            .catch(() => null),
        ),
      );
      const rooms: LiveRoom[] = open.map((g, i) => {
        const d = details[i];
        return {
          id: g.id,
          inviteCode: g.inviteCode,
          live: (d?.status ?? g.status) === "IN_PROGRESS",
          isEventGame: d?.isEventGame ?? g.isEventGame,
          maxParticipants: g.maxParticipants,
          participantCount: d ? d.participants.length : g.participantCount,
          roundNumber: g.roundNumber,
          createdAt: g.createdAt,
          startedAt: d?.startedAt ?? null,
          people: d ? d.participants.map((p) => ({ userId: p.userId, nickname: p.nickname, team: p.team, status: p.status, isHost: p.isHost })) : null,
          placeName: places.get(g.id) ?? null,
        };
      });
      // 게임 중인 방을 위로, 같은 상태끼리는 최근에 만든 방을 위로
      rooms.sort((a, b) => Number(b.live) - Number(a.live) || b.createdAt.localeCompare(a.createdAt));
      return rooms;
    })().then(
      (rooms) => alive && setState({ rooms, status: "ready", syncedAt: Date.now() }),
      () => alive && setState((s) => ({ ...s, status: s.syncedAt ? s.status : "error" })),
    );
    return () => {
      alive = false;
    };
  }, [environment, refreshKey]);

  return state;
}

/** 회원 번호로 지금 들어가 있는 방을 찾는다. 한 사람이 두 방에 있을 수는 없다(서버가 막는다) */
export function roomsByUser(rooms: readonly LiveRoom[]): Map<string, { room: LiveRoom; person: LiveRoomPerson }> {
  const map = new Map<string, { room: LiveRoom; person: LiveRoomPerson }>();
  for (const room of rooms) for (const person of room.people ?? []) map.set(person.userId, { room, person });
  return map;
}
