import type { ReactNode } from "react";
import {
  OverviewIcon,
  UsersIcon,
  GamesIcon,
  NoticeIcon,
  BlogIcon,
  ReportIcon,
  BugIcon,
  TermsIcon,
  MetricsIcon,
  SlidersIcon,
  WebgameIcon,
  TicketIcon,
  ImageIcon,
  RocketIcon,
} from "@/components/admin/icons";

// 어드민 메뉴 정본. 데스크톱 사이드바(AdminShell)와 폰 하단 탭, 전체 메뉴(MobileNav)가 같은 목록을 쓴다

export type NavItem = {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => ReactNode;
  exact?: boolean;
  /** 미처리 건수를 옆에 띄우는 메뉴. */
  pending?: "reports" | "bugs";
  /** 폰 하단 탭에 바로 두는 메뉴. 나머지는 "전체"에서 연다. */
  tab?: boolean;
};

export type NavGroup = { label?: string; items: NavItem[] };

export const APP_CONFIG_HREF = "/admin/app-config";
export const WEBGAME_HREF = "/admin/webgame";
export const EVENTS_HREF = "/admin/events";
export const ASSETS_HREF = "/admin/assets";
export const RELEASE_HREF = "/admin/release";

// 역할별 그룹. 개요(현황) → 데이터(조회) → 처리(쌓이는 일) → 콘텐츠(발행) → 운영(모든 사용자에게 바로 닿는 스위치).
// 그룹 이름을 메뉴 위에 적어 훑어보게 한다(docs/admin-ui.md "내비게이션").
// 폰 하단 탭은 네 개만(개요, 유저, 게임, 신고). 폰으로 가장 자주 하는 일이 현황 보기, 사람과 판 찾기, 신고 처리라서다
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: "/admin", label: "개요", Icon: OverviewIcon, exact: true, tab: true }],
  },
  {
    label: "데이터",
    items: [
      { href: "/admin/users", label: "유저", Icon: UsersIcon, tab: true },
      { href: "/admin/games", label: "게임", Icon: GamesIcon, tab: true },
      { href: "/admin/metrics", label: "지표", Icon: MetricsIcon },
    ],
  },
  {
    label: "처리",
    items: [
      { href: "/admin/reports", label: "신고", Icon: ReportIcon, pending: "reports", tab: true },
      { href: "/admin/bugs", label: "버그", Icon: BugIcon, pending: "bugs" },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { href: "/admin/notices", label: "공지", Icon: NoticeIcon },
      { href: "/admin/blog", label: "블로그", Icon: BlogIcon },
    ],
  },
  {
    label: "운영",
    items: [
      { href: RELEASE_HREF, label: "출시", Icon: RocketIcon },
      { href: APP_CONFIG_HREF, label: "앱 설정", Icon: SlidersIcon },
      { href: "/admin/terms", label: "약관 재동의", Icon: TermsIcon },
      { href: WEBGAME_HREF, label: "온라인 게임", Icon: WebgameIcon },
      { href: EVENTS_HREF, label: "행사", Icon: TicketIcon },
      { href: ASSETS_HREF, label: "그림 보관함", Icon: ImageIcon },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const isActiveItem = (item: NavItem, pathname: string) =>
  item.exact ? pathname === item.href : pathname.startsWith(item.href);

export const shortCount = (n: number) => (n > 99 ? "99+" : String(n));

// 메뉴 옆 미처리 건수. 0건이면 그리지 않는다. 늘 보이는 자리라 배경 없이 숫자만 둔다(docs/admin-ui.md)
export function PendingCount({ count, className }: { count: number; className: string }) {
  if (count <= 0) return null;
  return (
    <span className={`font-semibold tabular-nums text-sd-critical ${className}`}>
      <span aria-hidden>{shortCount(count)}</span>
      <span className="sr-only">미처리 {count}건</span>
    </span>
  );
}
