"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { AdminDashboard } from "@/__generated__/AdminDashboard.graphql";
import type { AdminUsers } from "@/__generated__/AdminUsers.graphql";
import type { AdminGames } from "@/__generated__/AdminGames.graphql";
import { AdminDashboardQuery } from "@/lib/admin/gql/AdminDashboard";
import { AdminUsersQuery } from "@/lib/admin/gql/AdminUsers";
import { AdminGamesQuery } from "@/lib/admin/gql/AdminGames";
import { PageHeader, SectionCard, ScrollPage } from "@/components/admin/Parts";
import { Donut } from "@/components/admin/charts";
import { Stagger, StaggerItem, FadeIn } from "@/components/admin/motion";
import { Table, Th, Tr, Td } from "@/components/admin/Table";
import { GameStatusBadge } from "@/components/admin/StatusBadge";
import { InviteCode } from "@/components/admin/InviteCode";
import QueryBoundary from "@/components/admin/QueryBoundary";
import {
  ArrowRightIcon,
  GamesIcon,
  ReportIcon,
  BugIcon,
  InfoIcon,
} from "@/components/admin/icons";
import { END_REASON_LABEL, formatDate, formatDuration, labelOf } from "@/lib/admin/format";

// 디자인 시스템 시맨틱 토큰(라이트/다크 자동 대응). 하드코딩 hex 대신 var() 사용.
const REASON_COLOR: Record<string, string> = {
  ALL_ARRESTED: "var(--sd-info)",
  TIME_OVER: "var(--sd-positive)",
  ROBBER_FORFEITED: "var(--sd-warning)",
  POLICE_FORFEITED: "var(--sd-critical)",
};

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
  const d = useLazyLoadQuery<AdminDashboard>(AdminDashboardQuery, {}).adminDashboard;
  const games = useLazyLoadQuery<AdminGames>(AdminGamesQuery, {
    page: 0, size: 6, sortDirection: "DESC",
  });
  const users = useLazyLoadQuery<AdminUsers>(AdminUsersQuery, {
    page: 0, size: 6, sortDirection: "DESC",
  });

  const reasonSegments = d.endReasonDistribution.map((r) => ({
    label: labelOf(END_REASON_LABEL, r.endReason),
    value: r.count,
    color: REASON_COLOR[r.endReason] ?? "#868e96",
  }));
  const reasonTotal = d.endReasonDistribution.reduce((a, r) => a + r.count, 0);
  const pending = d.pendingReportCount + d.pendingBugReportCount;

  return (
    <>
      {/* 처리 대기 알림 - 조치가 필요할 때만 */}
      {pending > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sd-critical/25 bg-sd-critical-weak px-4 py-3.5">
          <InfoIcon className="h-5 w-5 shrink-0 text-sd-critical" />
          <p className="text-[14px] font-medium text-sd-fg">
            처리를 기다리는 신고{" "}
            <b className="font-bold text-sd-critical">{d.pendingReportCount}</b>건, 버그{" "}
            <b className="font-bold text-sd-critical">{d.pendingBugReportCount}</b>건이 있어요.
          </p>
        </div>
      )}

      {/* 1. 지금 챙길 것 */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StaggerItem className="h-full">
          <ActionCard icon={<GamesIcon className="h-5 w-5" />} label="진행중 게임" value={d.inProgressGameCount} sub="실시간 플레이 중" accent href="/admin/games?status=IN_PROGRESS" />
        </StaggerItem>
        <StaggerItem className="h-full">
          <ActionCard icon={<ReportIcon className="h-5 w-5" />} label="미처리 신고" value={d.pendingReportCount} href="/admin/reports?status=PENDING" warn />
        </StaggerItem>
        <StaggerItem className="h-full">
          <ActionCard icon={<BugIcon className="h-5 w-5" />} label="미처리 버그" value={d.pendingBugReportCount} href="/admin/bugs?status=PENDING" warn />
        </StaggerItem>
      </Stagger>

      {/* 2. 오늘의 지표 스트립 (gap-px 구분선 - 줄바꿈에도 안정) */}
      <FadeIn delay={0.08} className="mt-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-sd-line bg-sd-hairline sm:grid-cols-3 lg:grid-cols-5">
          <MiniStat label="오늘 게임" value={d.todayGameCount} href="/admin/games" />
          <MiniStat label="주간 게임" value={d.weeklyGameCount} href="/admin/games" />
          <MiniStat label="평균 게임 시간" value={formatDuration(d.averageGameDurationSeconds)} />
          <MiniStat label="전체 유저" value={d.totalUserCount.toLocaleString()} href="/admin/users" />
          <MiniStat label="오늘 신규 유저" value={d.todayNewUserCount} href="/admin/users" />
        </div>
      </FadeIn>

      {/* 3. 분포 그래프 */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn delay={0.12}>
          <SectionCard title="게임 종료 사유">
            {reasonTotal === 0 ? (
              <EmptyInline text="종료된 게임이 없어요." />
            ) : (
              <div className="py-1">
                <Donut segments={reasonSegments} centerLabel="종료 게임" centerValue={reasonTotal} />
              </div>
            )}
          </SectionCard>
        </FadeIn>
        <FadeIn delay={0.16}>
          <SectionCard title="팀별 승률">
            <WinVersus police={d.winRateByTeam.policeWinRate} robber={d.winRateByTeam.robberWinRate} />
          </SectionCard>
        </FadeIn>
      </div>

      {/* 4. 최근 게임 + 최근 가입 유저 */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <SectionCard title="최근 게임" right={<MoreLink href="/admin/games" />} flush>
            <div className="min-h-[192px]">
              {games.adminGames.content.length === 0 ? (
                <EmptyInline text="최근 게임이 없어요." />
              ) : (
                <Table head={<><Th>초대코드</Th><Th>상태</Th><Th>인원</Th><Th className="text-right">생성일</Th></>}>
                  {games.adminGames.content.map((g, i) => (
                    <Tr key={g.id} index={i}>
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
                    <Tr key={u.id} index={i}>
                      <Td>
                        <Link href={`/admin/users/${u.id}`} className="font-semibold text-sd-fg transition hover:text-accent">
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

function ActionCard({
  icon, label, value, sub, accent = false, warn = false, href,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
  href?: string;
}) {
  const has = value > 0;
  const isWarn = warn && has; // 처리 대기 - 레드(critical)로 또렷하게 강조
  const isClear = warn && !has; // 모두 처리됨 - 블루(안심) 신호
  // 카드는 중립, 숫자·아이콘·상태문구 색으로만 상태를 표현.
  const tone = accent
    ? "bg-accent text-accent-fg"
    : "border border-sd-line bg-sd-surface";
  const labelCls = accent ? "text-accent-fg opacity-85" : "text-sd-fg-subtle";
  const valueCls = accent ? "text-accent-fg" : isWarn ? "text-sd-critical" : "text-sd-fg";
  // 아이콘은 컨테이너 없이 상태색만. 카드 색과 이중으로 튀지 않게.
  const iconCls = accent
    ? "text-accent-fg opacity-90"
    : isWarn
      ? "text-sd-critical"
      : isClear
        ? "text-sd-info"
        : "text-sd-fg-subtle";
  const subCls = accent
    ? "text-accent-fg opacity-85"
    : isWarn
      ? "text-sd-critical"
      : isClear
        ? "text-sd-info"
        : "text-sd-fg-subtle";

  const inner = (
    <div className={`flex h-full flex-col rounded-2xl px-5 py-4 ${tone} ${href ? "transition hover:-translate-y-0.5" : ""}`}>
      <div className="flex items-center justify-between">
        <p className={`text-[13px] font-semibold ${labelCls}`}>{label}</p>
        <span className={iconCls}>{icon}</span>
      </div>
      <p className={`mt-3 text-[32px] font-bold leading-none tracking-tight tabular-nums ${valueCls}`}>{value}</p>
      <p className={`mt-auto flex items-center gap-1 pt-3 text-[12px] font-semibold ${subCls}`}>
        {warn ? (has ? "확인이 필요해요" : "모두 처리됐어요") : sub}
        {href && <ArrowRightIcon className="h-3 w-3" />}
      </p>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function MiniStat({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const inner = (
    <div className={`h-full bg-sd-surface px-5 py-4 ${href ? "transition hover:bg-sd-pressed" : ""}`}>
      <p className="text-[12px] font-medium text-sd-fg-subtle">{label}</p>
      <p className="mt-1.5 text-[20px] font-bold leading-none tabular-nums text-sd-fg">{value}</p>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

function WinVersus({ police, robber }: { police: number; robber: number }) {
  if (police + robber <= 0) {
    return <EmptyInline text="집계된 게임 결과가 없어요." />;
  }
  // BE는 이미 0~100 퍼센트로 내려줌(policeWins/total*100). 다시 곱하지 않는다.
  const p = Math.round(police);
  const r = Math.round(robber);
  return (
    <div className="pt-1">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-[13px] font-semibold text-sd-info">경찰</p>
          <p className="text-[22px] font-bold tabular-nums text-sd-info">{p}%</p>
        </div>
        <span className="pb-1 text-[12px] font-medium text-sd-fg-subtle">승률</span>
        <div className="text-right">
          <p className="text-[13px] font-semibold text-sd-positive">도둑</p>
          <p className="text-[22px] font-bold tabular-nums text-sd-positive">{r}%</p>
        </div>
      </div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        <div className="h-full rounded-l-full bg-sd-info" style={{ width: `${p}%` }} />
        <div className="h-full flex-1 rounded-r-full bg-sd-positive" />
      </div>
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return (
    <div className="flex min-h-[152px] items-center justify-center py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="flex flex-col items-center gap-2.5">
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
