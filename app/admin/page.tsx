"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
import { OverviewCards } from "@/components/admin/overview/OverviewCards";
import { useTeam } from "@/components/admin/team/TeamProvider";
import { ArrowRightIcon, InfoIcon } from "@/components/admin/icons";
import { presetCards } from "@/lib/admin/overview/cards";
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
  const pendingReports = dashboard.adminAllReports.totalElements;
  const games = useLazyLoadQuery<AdminGames>(AdminGamesQuery, {
    page: 0, size: 6, sortDirection: "DESC",
  }, fresh);
  const users = useLazyLoadQuery<AdminUsers>(AdminUsersQuery, {
    page: 0, size: 6, sortDirection: "DESC",
  }, fresh);
  const counts = usePendingCounts();
  const { team, error: teamError } = useTeam();

  const pending = pendingReports + d.pendingBugReportCount;
  const mine = team ? team.roles.filter((r) => team.me.roleKeys.includes(r.key)) : [];
  const keys = presetCards(mine.map((r) => r.cards));

  return (
    <>
      {/* 처리 대기 알림 - 조치가 필요할 때만 */}
      {pending > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sd-critical/25 bg-sd-critical-weak px-4 py-3.5">
          <InfoIcon className="h-5 w-5 shrink-0 text-sd-critical" />
          <p className="text-[14px] font-medium text-sd-fg">
            처리를 기다리는 신고{" "}
            <b className="font-bold text-sd-critical">{pendingReports}</b>건, 버그{" "}
            <b className="font-bold text-sd-critical">{d.pendingBugReportCount}</b>건이 있어요.
          </p>
        </div>
      )}

      {/* 1. 공통 띠. 누구에게나 같은 지금 숫자다 */}
      <FadeIn>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-sd-line bg-sd-hairline lg:grid-cols-4">
          <BandStat label="진행 중 게임" value={d.inProgressGameCount} href="/admin/games?status=IN_PROGRESS" live={d.inProgressGameCount > 0} />
          <BandStat label="오늘 게임" value={d.todayGameCount} href="/admin/games" />
          <BandStat label="오늘 새 사용자" value={d.todayNewUserCount} href="/admin/users" />
          <BandStat label="전체 사용자" value={d.totalUserCount.toLocaleString()} href="/admin/users" />
        </div>
      </FadeIn>

      {/* 2. 내 지표. 맡은 역할의 기본 카드를 합친다 */}
      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight text-sd-fg">내 지표</h2>
            <p className="mt-0.5 text-[13px] text-sd-fg-subtle">{mine.length ? `${mine.map((r) => r.name).join(", ")} 역할의 기본 카드예요.` : "역할을 고르면 맡은 일에 맞는 카드부터 보여 드려요."}</p>
          </div>
          <Link href="/admin/team" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent transition hover:opacity-70">
            {mine.length ? "역할 바꾸기" : "역할 고르기"}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
        {team || teamError ? (
          <OverviewCards
            keys={keys}
            live={{
              weeklyGames: d.weeklyGameCount,
              win: { police: d.winRateByTeam.policeWinRate, robber: d.winRateByTeam.robberWinRate },
              ends: [...d.endReasonDistribution],
              games: games.adminGames.content.map((g) => ({ id: g.id, inviteCode: g.inviteCode, status: g.status, participantCount: g.participantCount, maxParticipants: g.maxParticipants })),
              pending: counts,
            }}
          />
        ) : (
          <div aria-busy className="grid auto-rows-[172px] grid-cols-2 gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-2xl bg-sd-gray-200" />)}
          </div>
        )}
      </section>

      {/* 3. 최근 게임 + 최근 가입 유저 */}
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
