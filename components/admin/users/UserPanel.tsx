"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";
import { fetchQuery, useLazyLoadQuery, useRelayEnvironment } from "react-relay";
import type { AdminUser } from "@/__generated__/AdminUser.graphql";
import type { AdminUserGameHistories, AdminUserGameHistories$data } from "@/__generated__/AdminUserGameHistories.graphql";
import type { AdminUserRadio } from "@/__generated__/AdminUserRadio.graphql";
import { AdminUserQuery } from "@/lib/admin/gql/AdminUser";
import { AdminUserGameHistoriesQuery } from "@/lib/admin/gql/AdminUserGameHistories";
import { AdminUserRadioQuery } from "@/lib/admin/gql/AdminUserRadio";
import { useRecordRecent } from "@/components/admin/RecentViewed";
import { DEVICE_LABEL, END_REASON_LABEL, SOCIAL_LABEL, TEAM_LABEL, labelOf } from "@/lib/admin/format";
import { formatRadio } from "@/lib/admin/gameExtras";
import { isFieldNotDeployed } from "@/lib/admin/notDeployed";
import { ago, clock, dayName, groupInOrder, kstClock, kstDay, kstTimeOfDay, sinceDay } from "@/lib/admin/people";
import { fetchStaffIds, setStaff } from "@/lib/admin/staffClient";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import { useOptionalQuery } from "@/lib/admin/useOptionalQuery";
import { finishedGamesReducer, gameOutcome, initialFinishedGames, limitFor, recordCounted, shownGames } from "@/lib/admin/userGames";
import { ChevronIcon, CopyText, DetailHead, DetailState, ExpandIcon, IconButton, KV, LiveDot, Panel, PersonAvatar, Stats, Tag } from "@/components/admin/split/SplitParts";

type Game = NonNullable<AdminUserGameHistories$data["adminUser"]>["gameHistories"][number];

/**
 * 유저 상세 칸 (#315, 시안 "경도 어드민 유저와 게임").
 * 위에서부터 운영진이 묻는 순서다. 지금 게임 중인가(있을 때만), 했나, 얼마나 했나, 최근에도 하나(숫자 세 칸),
 * 어떤 판을 했나(게임 기록), 자주 보지 않는 계정 정보와 운영진 스위치는 맨 아래
 */
export function UserPanel({ id, page = false, gamesHref }: { id: string; page?: boolean; gamesHref: (gameResultId: string) => string }) {
  const environment = useRelayEnvironment();
  const data = useLazyLoadQuery<AdminUser>(AdminUserQuery, { id }, { fetchPolicy: "store-and-network" });
  // 지금 들어가 있는 방은 앱에서 바뀌어 30초마다 뒤에서 다시 읽는다. 실패해도 보던 화면은 그대로 둔다
  const live = useLiveRefresh();
  useEffect(() => {
    if (live === 0) return;
    fetchQuery<AdminUser>(environment, AdminUserQuery, { id }, { fetchPolicy: "network-only" }).toPromise().catch(() => {});
  }, [environment, id, live]);
  const user = data.adminUser;
  useRecordRecent("user", id, user ? { title: user.nickname, detail: `유저 ID ${user.id}` } : null);
  const games = useUserGames(id);

  if (!user) return <DetailState title="유저를 찾을 수 없어요" body="탈퇴했거나 잘못된 주소일 수 있어요." art="robber" />;

  const room = user.participations[0];
  const view = games.view;
  const last = view?.rows[0];
  return (
    <>
      <DetailHead
        lead={<PersonAvatar id={user.id} size={56} />}
        title={
          <>
            {user.nickname}
            {user.role === "ADMIN" && <Tag tone="acc">운영자</Tag>}
          </>
        }
        sub={<CopyText text={user.id}>유저 ID {user.id}</CopyText>}
        actions={!page && <IconButton label="이 유저만 크게 보기" href={`/admin/users/${user.id}`}><ExpandIcon /></IconButton>}
      />

      {room && (
        // 지금 들어가 있는 방이 있을 때만. 누르면 그 방으로 간다
        <Link href={`/admin/games?room=${room.gameId}`} className="flex w-full items-center gap-3 rounded-[14px] bg-sd-surface px-[18px] py-3.5 shadow-[0_1px_2px_rgba(2,32,71,0.04)] transition-colors hover:bg-sd-fill">
          <LiveDot live={room.status !== "WAITING"} />
          <span className="flex-1 text-[14px] text-sd-fg">
            <b className="font-bold">{room.inviteCode}</b> 방에서 {room.status !== "WAITING" ? "게임 중" : "대기 중"}이에요
            {room.team ? ` · ${labelOf(TEAM_LABEL, room.team)}` : ""}
            {room.isHost ? " · 방장" : ""}
          </span>
          <span className="text-sd-fg-subtle">
            <ChevronIcon />
          </span>
        </Link>
      )}

      <Panel>
        <Stats
          items={[
            { label: "가입", value: sinceDay(user.createdAt) },
            {
              label: "끝난 게임",
              value: view ? (view.hasMore ? `${view.rows.length}+` : view.rows.length) : games.failure === "not-deployed" ? "-" : "…",
              unit: "판",
            },
            { label: "마지막 게임", value: last?.endedAt ? ago(last.endedAt) : view ? "아직 안 함" : "…" },
          ]}
        />
      </Panel>

      <GamesCard games={games} gamesHref={gamesHref} />

      <AccountCard user={user} />
    </>
  );
}

/* ─── 게임 기록 ─── */

function useUserGames(userId: string) {
  const environment = useRelayEnvironment();
  const [state, dispatch] = useReducer(finishedGamesReducer<Game>, initialFinishedGames);
  const { expanded, attempt, loaded, failure } = state;
  // 판이 끝날 때만 늘어나서 1분이면 충분하다. 배포 전에도 이 간격으로 물어 릴리즈되면 새로고침 없이 나온다
  const live = useLiveRefresh(60_000);
  useEffect(() => {
    let active = true;
    fetchQuery<AdminUserGameHistories>(environment, AdminUserGameHistoriesQuery, { id: userId, limit: limitFor(expanded) }, { fetchPolicy: "network-only" })
      .toPromise()
      .then((data) => active && dispatch({ type: "loaded", games: data?.adminUser?.gameHistories ?? [], expanded }))
      .catch((error: Error) => active && dispatch({ type: "failed", notDeployed: isFieldNotDeployed(error.message, "gameHistories"), expanded }));
    return () => {
      active = false;
    };
  }, [environment, userId, expanded, attempt, live]);
  const view = loaded ? shownGames(loaded.games, loaded.expanded) : null;
  return { view, failure, expanded, expand: () => dispatch({ type: "expand" }), retry: () => dispatch({ type: "retry" }) };
}

function GamesCard({ games, gamesHref }: { games: ReturnType<typeof useUserGames>; gamesHref: (id: string) => string }) {
  const { view, failure } = games;
  const wins = view ? view.rows.filter((g) => gameOutcome(g) === "win").length : 0;
  const days = useMemo(() => (view ? groupInOrder(view.rows, (g) => (g.endedAt ? kstDay(g.endedAt) : "-")) : []), [view]);

  return (
    <Panel
      title="게임 기록"
      sub={view && view.rows.length > 0 ? view.countLabel : undefined}
      right={view && view.rows.length > 0 ? `${view.rows.length === 1 ? "1판" : `최근 ${view.rows.length}판`} 중 ${wins}승` : undefined}
    >
      {failure === "not-deployed" ? (
        <p className="py-6 text-center text-[13.5px] text-sd-fg-subtle">서버 업데이트가 끝나면 게임 기록을 볼 수 있어요. 따로 할 일은 없어요.</p>
      ) : !view ? (
        failure === "other" ? (
          <div className="py-6 text-center text-[13.5px] text-sd-fg-subtle">
            불러오지 못했어요.{" "}
            <button type="button" onClick={games.retry} className="font-semibold text-accent hover:underline">
              다시 불러오기
            </button>
          </div>
        ) : (
          <div aria-busy className="space-y-2.5 py-1">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-sd-gray-200" />
            ))}
          </div>
        )
      ) : view.rows.length === 0 ? (
        <DetailState title="아직 끝난 게임이 없어요" body="8월 14일 밤 이후 게임만 볼 수 있어요." art="robber" />
      ) : (
        <>
          {days.map((d) => (
            <div key={d.key}>
              <p className="pt-3 pb-1 text-[12.5px] font-semibold text-sd-fg-subtle first:pt-0">{d.items[0].endedAt ? dayName(d.items[0].endedAt) : "시각 기록 없음"}</p>
              {d.items.map((g) => (
                <GameLine key={g.gameResultId} game={g} href={gamesHref(g.gameResultId)} />
              ))}
            </div>
          ))}
          {view.hasMore && (
            <div className="mt-3">
              {failure === "more" && (
                <p role="alert" className="mb-2 text-center text-[13px] text-sd-critical">
                  더 불러오지 못했어요. 다시 눌러 주세요.
                </p>
              )}
              <button
                type="button"
                onClick={games.expand}
                disabled={games.expanded}
                className="w-full rounded-[10px] bg-sd-gray-200 px-3.5 py-2.5 text-[14px] font-semibold text-sd-fg transition-colors hover:bg-sd-gray-300 disabled:opacity-60"
              >
                {games.expanded ? "불러오는 중이에요" : "100판까지 더 보기"}
              </button>
            </div>
          )}
          <p className="mt-3 text-[12.5px] text-sd-fg-subtle">{view.capped ? "최근 100판까지만 볼 수 있어요. " : ""}8월 14일 밤 이후 게임만 볼 수 있어요.</p>
        </>
      )}
    </Panel>
  );
}

// 신고된 판을 찾을 때 시각과 팀이 먼저 필요해서 그 순서다. 기록 칸은 경찰이면 체포, 도둑이면 잡힌 횟수
function GameLine({ game, href }: { game: Game; href: string }) {
  const outcome = gameOutcome(game);
  const cop = game.team === "POLICE";
  const record = recordCounted(game.endedAt) ? (cop ? `체포 ${game.arrestCount}회` : `잡힘 ${game.arrestedCount}회`) : null;
  const meta = [record, labelOf(END_REASON_LABEL, game.endReason), game.durationSeconds != null ? clock(game.durationSeconds) : null].filter(Boolean).join(" · ");
  // 넓으면 한 줄, 폰처럼 좁으면 설명을 둘째 줄로 내려 잘리지 않게 한다
  return (
    <Link
      href={href}
      className="-mx-2.5 grid w-[calc(100%+20px)] grid-cols-[44px_34px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-0.5 rounded-[10px] px-2.5 py-2 transition-colors hover:bg-sd-pressed sm:grid-cols-[44px_34px_64px_minmax(0,1fr)_auto]"
    >
      <time className="text-[13px] tabular-nums text-sd-fg-subtle">{game.endedAt ? kstClock(game.endedAt) : "-"}</time>
      <span className={`text-[13px] font-bold ${cop ? "text-sd-info" : "text-sd-positive"}`}>{labelOf(TEAM_LABEL, game.team)}</span>
      <span className={"whitespace-nowrap " + (outcome === "win" ? "font-bold text-sd-fg" : outcome === "left" ? "font-semibold text-sd-warning" : "font-medium text-sd-fg-subtle")}>
        {outcome === "win" ? "승리" : outcome === "lose" ? "패배" : outcome === "left" ? "중도 퇴장" : "-"}
      </span>
      <span className="flex justify-end gap-1 sm:col-start-5 sm:row-start-1">
        {game.isMvp && <Tag tone="warn">MVP</Tag>}
        {game.isHost && <Tag>방장</Tag>}
        {game.isEventGame && <Tag>이벤트</Tag>}
      </span>
      <span className="col-span-2 col-start-3 truncate text-[13.5px] tabular-nums text-sd-fg-muted sm:col-span-1 sm:col-start-4 sm:row-start-1">{meta}</span>
    </Link>
  );
}

/* ─── 계정 ─── */

type UserData = NonNullable<AdminUser["response"]["adminUser"]>;

// 자주 보지 않는 정보라 아래에 모았다. 약관은 위치 서비스에 동의하지 않으면 게임을 못 해서 그때만 빨갛다
function AccountCard({ user }: { user: UserData }) {
  const radioLive = useLiveRefresh(60_000);
  const radio = useOptionalQuery<AdminUserRadio>(AdminUserRadioQuery, { id: user.id }, "radioSeconds", radioLive);
  const radioSeconds = radio.data?.adminUser?.radioSeconds;
  const year = new Date(Date.parse(user.createdAt) + 9 * 3600_000).getUTCFullYear();
  const [, m, d] = kstDay(user.createdAt).split("-").map(Number);
  const requiredOk = user.termsOfServiceAgreed && user.privacyPolicyAgreed && user.locationTermsAgreed;
  return (
    <Panel title="계정">
      <KV label="로그인">{labelOf(SOCIAL_LABEL, user.socialType)}</KV>
      <KV label="가입일">
        <span className="tabular-nums">
          {year}년 {m}월 {d}일 {kstTimeOfDay(user.createdAt)}
        </span>
      </KV>
      <KV label="기기">{user.device ? labelOf(DEVICE_LABEL, user.device.deviceType) : <span className="text-sd-fg-subtle">미등록</span>}</KV>
      <KV label="필수 약관">
        {requiredOk ? (
          "모두 동의"
        ) : (
          <span className="text-sd-critical">{!user.locationTermsAgreed ? "위치 서비스 동의 안 함" : "동의 안 한 약관 있음"}</span>
        )}
      </KV>
      <KV label="마케팅 수신">{user.allowMarketingPush ? "받음" : <span className="text-sd-fg-subtle">안 받음</span>}</KV>
      {radio.status !== "not-deployed" && (
        <KV label="무전 사용" hint="경찰일 때 쓴 시간을 모두 더해요. 2분마다 세서 조금 적게 나와요">
          {radioSeconds != null ? <span className="tabular-nums">{formatRadio(radioSeconds)}</span> : <span className="text-sd-fg-subtle">-</span>}
        </KV>
      )}
      <StaffRow userId={user.id} isAdmin={user.role === "ADMIN"} />
    </Panel>
  );
}

// 팀원 계정이나 시험 계정을 지표에서 뺄 때 쓴다. 누르는 즉시 바뀐다
function StaffRow({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (isAdmin) return;
    let alive = true;
    fetchStaffIds().then(
      (ids) => alive && setOn(ids.has(userId)),
      () => alive && setOn(null),
    );
    return () => {
      alive = false;
    };
  }, [userId, isAdmin]);

  const toggle = async () => {
    if (on === null) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    setError(null);
    try {
      await setStaff(userId, next);
    } catch (e) {
      setOn(!next);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KV
      label={<span className="font-semibold text-sd-fg">운영진 계정</span>}
      hint={
        error ? (
          <span className="text-sd-critical">{error}</span>
        ) : isAdmin ? (
          "관리자 권한이 있어 자동으로 지표에서 빠져요"
        ) : (
          "켜면 이 계정을 지표에서 빼요. 팀원이나 테스트 계정일 때 켜요"
        )
      }
    >
      {isAdmin ? (
        <span className="rounded-md bg-sd-gray-200 px-2 py-0.5 text-[12px] font-bold text-sd-fg-muted">자동</span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={on === true}
          aria-label="운영진 계정"
          disabled={on === null || busy}
          onClick={() => void toggle()}
          className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-accent" : "bg-sd-gray-300"}`}
        >
          <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform ${on ? "translate-x-[21px]" : "translate-x-[3px]"} left-0`} />
        </button>
      )}
    </KV>
  );
}
