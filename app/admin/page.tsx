"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useLazyLoadQuery } from "react-relay";
import { useLiveRefresh } from "@/lib/admin/useLiveRefresh";
import { usePendingCounts } from "@/lib/admin/usePendingCounts";
import type { AdminDashboard } from "@/__generated__/AdminDashboard.graphql";
import type { AdminUsers } from "@/__generated__/AdminUsers.graphql";
import type { AdminGames } from "@/__generated__/AdminGames.graphql";
import { AdminDashboardQuery } from "@/lib/admin/gql/AdminDashboard";
import { AdminUsersQuery } from "@/lib/admin/gql/AdminUsers";
import { AdminGamesQuery } from "@/lib/admin/gql/AdminGames";
import { PageHeader, SectionCard, ScrollPage } from "@/components/admin/Parts";
import { FadeIn } from "@/components/admin/motion";
import { LAST_ROW_TITLE, Table, Th, Tr, Td } from "@/components/admin/Table";
import { GameStatusBadge } from "@/components/admin/StatusBadge";
import { InviteCode } from "@/components/admin/InviteCode";
import QueryBoundary from "@/components/admin/QueryBoundary";
import { LayoutSheet } from "@/components/admin/overview/LayoutSheet";
import { NowTasks } from "@/components/admin/overview/NowTasks";
import { OverviewCards, useServerCards } from "@/components/admin/overview/OverviewCards";
import { useTeam } from "@/components/admin/team/TeamProvider";
import { ArrowRightIcon, SlidersIcon } from "@/components/admin/icons";
import { useToast } from "@/components/admin/Toast";
import { CARDS, isCardKey, TEAM_CARDS, type CardKey, type LiveValues } from "@/lib/admin/overview/cards";
import { addCards, myCards, newRoleOffer } from "@/lib/admin/overview/layout";
import { saveLayout } from "@/lib/admin/teamClient";
import { splitTasks, TASK_SOURCES, tasksOf } from "@/lib/admin/overview/tasks";
import { todayIn } from "@/lib/metrics/dates";
import { formatDate } from "@/lib/admin/format";

// 개요 (docs/admin-ui.md "개요 카드"). 모두에게 같은 공통 띠, 맡은 역할의 카드, 최근 게임과 가입 순서다.

export default function AdminOverviewPage() {
  return (
    <ScrollPage>
      <PageHeader title="개요" description="경찰과 도둑 운영 현황이에요." />
      <QueryBoundary pending={<DashboardSkeleton />}>
        <Overview />
      </QueryBoundary>
    </ScrollPage>
  );
}

function Overview() {
  // 진행중 게임, 처리 대기 수는 지금 상태라 열어 둔 동안 뒤에서 새로 받는다(lib/admin/useLiveRefresh.ts)
  const live = useLiveRefresh();
  const fresh = { fetchKey: live, fetchPolicy: "store-and-network" } as const;
  const dashboard = useLazyLoadQuery<AdminDashboard>(AdminDashboardQuery, {}, fresh);
  const d = dashboard.adminDashboard;
  const games = useLazyLoadQuery<AdminGames>(AdminGamesQuery, {
    page: 0, size: 6, sortDirection: "DESC",
  }, fresh);
  const users = useLazyLoadQuery<AdminUsers>(AdminUsersQuery, {
    page: 0, size: 6, sortDirection: "DESC",
  }, fresh);
  const counts = usePendingCounts();
  const { team, error: teamError, changeMember } = useTeam();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  // 저장한 직후에만 되돌리기를 보여 준다
  const [undo, setUndo] = useState<{ before: string[] | null; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 10_000);
    return () => window.clearTimeout(t);
  }, [undo]);

  const mine = team ? team.roles.filter((r) => team.me.roleKeys.includes(r.key)) : [];
  const layout = team ? myCards(team.me, team.roles) : { keys: [] as CardKey[], custom: false };
  const keys = layout.keys.length ? layout.keys : TEAM_CARDS;
  const offer = team ? newRoleOffer(team.me, team.roles) : null;
  // 물어볼 때부터 몇 장이 들어가는지 알려 준다
  const offerFit = offer ? addCards(layout.keys, offer.cards) : null;
  const canEdit = !!team && team.writable && team.layoutReady;

  const store = (cards: string[] | null, done: string, before: string[] | null) => {
    if (!team) return;
    setBusy(true);
    saveLayout(cards, team.me.roleKeys)
      .then((member) => {
        changeMember(member);
        setUndo({ before, text: done });
      })
      .catch((e: Error) => toast(e.message))
      .finally(() => setBusy(false));
  };
  const liveValues: LiveValues = {
    weeklyGames: d.weeklyGameCount,
    win: { police: d.winRateByTeam.policeWinRate, robber: d.winRateByTeam.robberWinRate },
    ends: [...d.endReasonDistribution],
    games: games.adminGames.content.map((g) => ({ id: g.id, inviteCode: g.inviteCode, status: g.status, participantCount: g.participantCount, maxParticipants: g.maxParticipants })),
    pending: counts,
  };
  // 카드와 지금 할 일이 같은 값을 쓴다. 할 일에 필요한 값은 화면에 카드가 없어도 읽는다
  const server = useServerCards(team || teamError ? [...keys, ...TASK_SOURCES] : []);
  const tasks = tasksOf(server.cards, counts, todayIn("Asia/Seoul"));
  // 내 역할의 카드 전체(8칸에 다 못 들어간 것까지)와 이어진 일을 내 일로 본다
  // 내 개요에 놓은 카드도 내 일로 본다
  const me = mine.length || layout.custom ? { cards: [...new Set([...mine.flatMap((r) => r.cards), ...keys].filter(isCardKey))] as CardKey[], roles: mine.map((r) => r.key) } : null;
  const split = splitTasks(tasks, me);

  return (
    <>
      {/* 1. 공통 띠. 누구에게나 같은 지금 숫자다 */}
      <FadeIn>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-sd-line bg-sd-hairline lg:grid-cols-4">
          <BandStat label="진행 중 게임" value={d.inProgressGameCount} href="/admin/games?status=IN_PROGRESS" live={d.inProgressGameCount > 0} />
          <BandStat label="오늘 게임" value={d.todayGameCount} href="/admin/games" />
          <BandStat label="오늘 새 사용자" value={d.todayNewUserCount} href="/admin/users" />
          <BandStat label="전체 사용자" value={d.totalUserCount.toLocaleString()} href="/admin/users" />
        </div>
      </FadeIn>

      {/* 2. 지금 할 일. 처리를 기다리는 것만 모은다 */}
      <NowTasks mine={split.mine} others={split.others} loading={server.loading || counts === null} hasRoles={!!me} />

      {/* 3. 내 지표. 맡은 역할의 기본 카드를 합친다 */}
      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-sd-fg">
              내 지표
              {layout.custom && <span className="rounded-md bg-accent-weak px-1.5 py-px text-[11.5px] font-bold text-accent">내가 고침</span>}
            </h2>
            <p className="mt-0.5 text-[13px] text-sd-fg-subtle">
              {layout.custom ? "나에게만 보이는 구성이에요." : mine.length ? `${mine.map((r) => r.name).join(", ")} 역할의 기본 카드예요.` : "역할을 고르면 맡은 일에 맞는 카드부터 보여 드려요."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/admin/team" className="inline-flex items-center gap-1 text-[13px] font-semibold text-sd-fg-muted transition hover:text-accent">
              {mine.length ? "역할 바꾸기" : "역할 고르기"}
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-sd-gray-200 px-3 text-[13px] font-semibold text-sd-fg-muted transition hover:bg-sd-gray-300">
                <SlidersIcon className="size-4" />
                구성 고치기
              </button>
            )}
          </div>
        </div>
        {/* 고친 뒤에 새 역할을 맡았으면, 고친 구성을 말없이 바꾸지 않고 물어본다 */}
        {offer && canEdit && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-accent-weak px-4 py-3">
            <p className="min-w-0 flex-1 basis-60 text-[13.5px] text-sd-fg">
              새로 맡은 <b>{offer.roles.map((r) => r.name).join(", ")}</b> 역할의 카드 {offer.cards.length}장을 내 개요에 더할까요?
              <span className="mt-0.5 block text-[12.5px] text-sd-fg-muted">
                {offerFit && offerFit.skipped
                  ? offerFit.keys.length > layout.keys.length
                    ? `자리가 남은 만큼 ${offerFit.keys.length - layout.keys.length}장을 더해요. 나머지는 구성 고치기에서 바꿔 넣을 수 있어요.`
                    : "자리가 꽉 찼어요. 구성 고치기에서 바꿔 넣어 주세요."
                  : offer.cards.map((k) => CARDS[k].title).join(", ")}
              </span>
            </p>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => store(team!.me.overviewCards, "새 역할 카드는 더하지 않았어요.", team!.me.overviewCards)}
                className="h-8 rounded-xl px-3 text-[13px] font-semibold text-sd-fg-muted transition hover:bg-sd-surface disabled:opacity-50"
              >
                괜찮아요
              </button>
              {offerFit?.skipped ? (
                <button type="button" disabled={busy} onClick={() => setEditing(true)} className="h-8 rounded-xl px-3 text-[13px] font-semibold text-accent transition hover:bg-sd-surface disabled:opacity-50">
                  직접 고르기
                </button>
              ) : null}
              {offerFit && offerFit.keys.length > layout.keys.length && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const added = addCards(keys, offer.cards);
                  store(added.keys, added.skipped ? `${added.keys.length - keys.length}장을 더했어요. 자리가 없어 ${added.skipped}장은 못 넣었어요.` : `${added.keys.length - keys.length}장을 더했어요.`, team!.me.overviewCards);
                }}
                className="h-8 rounded-xl bg-accent px-3 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-hover disabled:opacity-50"
              >
                {offerFit.skipped ? `${offerFit.keys.length - layout.keys.length}장 더하기` : "더하기"}
              </button>
              )}
            </span>
          </div>
        )}
        {undo && (
          <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-sd-inverted-bg px-4 py-2.5 text-[13px] text-sd-inverted-fg">
            <span>{undo.text}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const before = undo.before;
                setUndo(null);
                store(before, "되돌렸어요.", team?.me.overviewCards ?? null);
              }}
              className="font-bold underline-offset-2 hover:underline disabled:opacity-50"
            >
              되돌리기
            </button>
          </div>
        )}
        {team || teamError ? (
          <OverviewCards keys={keys} live={liveValues} cards={server.cards} failed={server.failed} />
        ) : (
          <div aria-busy className="grid auto-rows-[172px] grid-cols-2 gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-2xl bg-sd-gray-200" />)}
          </div>
        )}
        {editing && team && (
          <LayoutSheet
            team={team}
            current={keys}
            custom={layout.custom}
            onClose={() => setEditing(false)}
            onSaved={(member, before) => {
              changeMember(member);
              setUndo({ before, text: member.overviewCards ? "내 개요 구성을 저장했어요." : "역할 기본 카드로 되돌렸어요." });
            }}
          />
        )}
      </section>

      {/* 4. 최근 게임 + 최근 가입 유저 */}
      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <SectionCard title="최근 게임" right={<MoreLink href="/admin/games" />} flush>
            <div className="min-h-[192px]">
              {games.adminGames.content.length === 0 ? (
                <EmptyInline text="최근 게임이 없어요." />
              ) : (
                <Table head={<><Th>초대코드</Th><Th>상태</Th><Th>인원</Th><Th className="text-right">생성일</Th></>}>
                  {games.adminGames.content.map((g, i) => (
                    <Tr key={g.id} index={i} href={`/admin/games/${g.id}`}>
                      <Td><InviteCode code={g.inviteCode} gameId={g.id} /></Td>
                      <Td><GameStatusBadge status={g.status} /></Td>
                      <Td className="tabular-nums text-sd-fg-subtle">
                        {g.participantCount}
                        <span className="text-sd-disabled">/{g.maxParticipants}</span>
                      </Td>
                      <Td className="text-right text-sd-fg-subtle">{formatDate(g.createdAt)}</Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </div>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.24}>
          <SectionCard title="최근 가입 유저" right={<MoreLink href="/admin/users" />} flush>
            <div className="min-h-[192px]">
              {users.adminUsers.content.length === 0 ? (
                <EmptyInline text="가입한 유저가 없어요." />
              ) : (
                <Table head={<><Th>유저</Th><Th className="text-right">가입일</Th></>}>
                  {users.adminUsers.content.map((u, i) => (
                    <Tr key={u.id} index={i} href={`/admin/users/${u.id}`}>
                      <Td>
                        <Link href={`/admin/users/${u.id}`} className={`font-semibold text-sd-fg transition hover:text-accent ${LAST_ROW_TITLE}`}>
                          {u.nickname}
                        </Link>
                      </Td>
                      <Td className="text-right text-sd-fg-subtle">{formatDate(u.createdAt)}</Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </div>
          </SectionCard>
        </FadeIn>
      </div>
    </>
  );
}


function BandStat({ label, value, href, live = false }: { label: string; value: ReactNode; href: string; live?: boolean }) {
  return (
    <Link href={href} className="block h-full bg-sd-surface px-5 py-4 transition hover:bg-sd-pressed">
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-sd-fg-subtle">
        {live && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-sd-positive" />}
        {label}
      </p>
      <p className={`mt-1.5 text-[24px] font-bold leading-none tabular-nums ${live ? "text-accent" : "text-sd-fg"}`}>{value}</p>
    </Link>
  );
}


function EmptyInline({ text }: { text: string }) {
  return (
    <div className="flex min-h-[152px] items-center justify-center py-8">
      <div className="flex flex-col items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/photobooth/cop-search.svg" alt="" className="h-12 w-auto opacity-90 drop-shadow-sm" />
        <p className="text-[13px] font-medium text-sd-fg-subtle">{text}</p>
      </div>
    </div>
  );
}

function MoreLink({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent transition hover:opacity-70">
      전체 보기
      <ArrowRightIcon className="h-3.5 w-3.5" />
    </Link>
  );
}

function DashboardSkeleton() {
  const box = "animate-pulse rounded-2xl bg-sd-gray-200";
  return (
    <div className="space-y-4">
      <div className="h-4 w-72 animate-pulse rounded bg-sd-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className={`${box} h-32`} />)}
      </div>
      <div className={`${box} h-[76px]`} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className={`${box} h-44`} />)}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className={`${box} h-56`} />)}
      </div>
    </div>
  );
}
