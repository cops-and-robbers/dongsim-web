import type { SVGProps } from "react";

// 어드민 기능 아이콘. 전부 같은 선 스타일(1.8 stroke, round). currentColor 상속.
// 브랜드 마크(소셜·기기)는 색이 의미라 별도 파일(brand.tsx)에 둔다.

type IconProps = { className?: string };

function Line(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function OverviewIcon({ className }: IconProps) {
  // Lucide 'activity'. 실시간 운영 현황(진행중 게임 등)을 살아있게 표현. 원본 path 그대로.
  return (
    <Line className={className}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </Line>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0111 0" />
      <path d="M15.5 5.2a3 3 0 010 5.6M21 19.5a5.5 5.5 0 00-3.8-5.2" />
    </Line>
  );
}

export function GamesIcon({ className }: IconProps) {
  // Lucide 'gamepad-2'. 원본 path 그대로.
  return (
    <Line className={className}>
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </Line>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </Line>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M15 5l-7 7 7 7" />
    </Line>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M9 5l7 7-7 7" />
    </Line>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Line>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M5 9l7 7 7-7" />
    </Line>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Line>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </Line>
  );
}

export function NoticeIcon({ className }: IconProps) {
  // 바탕화면 icon_notice.svg 기반. 색은 빼고 currentColor로, 원본 3색은 명암(불투명도)으로
  // 매핑해 레이어 구분을 살린다(듀오톤). 라이트·다크 모두 대응.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path opacity="0.32" d="M15.1054 24.0004H18.5507C19.0386 24.0004 19.4319 23.5761 19.4319 23.0499L20.5098 13.263C20.5098 12.7368 20.1164 12.3125 19.6286 12.3125H16.1833C15.6954 12.3125 15.3021 12.7368 15.3021 13.263L14.2242 23.0499C14.2242 23.5761 14.6175 24.0004 15.1054 24.0004Z" />
      <path opacity="0.32" d="M19.4957 6.8125H23.3041C23.6884 6.8125 24 7.14857 24 7.56314V13.3439C24 13.7584 23.6884 14.0945 23.3041 14.0945H19.4957C19.1114 14.0945 18.7999 13.7584 18.7999 13.3439V7.56314C18.7999 7.14857 19.1114 6.8125 19.4957 6.8125Z" />
      <path d="M2.587 12.5613C1.15834 12.5613 0.000175476 11.312 0.000175476 9.77088C0.000175476 8.22978 1.15834 6.98047 2.587 6.98047C4.01567 6.98047 5.17383 8.22978 5.17383 9.77088C5.17383 11.312 4.01567 12.5613 2.587 12.5613Z" />
      <path opacity="0.32" d="M15.7402 6.11683V6.6023V14.1127V14.8348L5.15845 18.1801V14.1127V6.6023V2.53906L15.7402 6.11683Z" />
      <path opacity="0.68" d="M2.30356 3.04335C2.30356 1.36255 3.56585 0 5.12297 0C6.68009 0 7.94238 1.36255 7.94238 3.04335V17.2443C7.94238 18.9251 6.68009 20.2876 5.12297 20.2876C3.56585 20.2876 2.30356 18.9251 2.30356 17.2443V3.04335Z" />
      <path opacity="0.68" d="M15.4792 4.8125H20.165C20.706 4.8125 21.1445 5.28556 21.1445 5.8691V15.044C21.1445 15.6276 20.706 16.1006 20.165 16.1006H15.4792C14.9383 16.1006 14.4997 15.6276 14.4997 15.044V5.8691C14.4997 5.28556 14.9383 4.8125 15.4792 4.8125Z" />
    </svg>
  );
}

export function ReportIcon({ className }: IconProps) {
  // Lucide 'siren'. 경찰과 도둑 테마에 맞는 신고 = 사이렌. 원본 path 그대로.
  return (
    <Line className={className}>
      <path d="M7 18v-6a5 5 0 1 1 10 0v6" />
      <path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
      <path d="M21 12h1" />
      <path d="M18.5 4.5 18 5" />
      <path d="M2 12h1" />
      <path d="M12 2v1" />
      <path d="m4.929 4.929.707.707" />
      <path d="M12 12v6" />
    </Line>
  );
}

export function BugIcon({ className }: IconProps) {
  // Lucide 'bug'. 원본 path 그대로.
  return (
    <Line className={className}>
      <path d="M12 20v-9" />
      <path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z" />
      <path d="M14.12 3.88 16 2" />
      <path d="M21 21a4 4 0 0 0-3.81-4" />
      <path d="M21 5a4 4 0 0 1-3.55 3.97" />
      <path d="M22 13h-4" />
      <path d="M3 21a4 4 0 0 1 3.81-4" />
      <path d="M3 5a4 4 0 0 0 3.55 3.97" />
      <path d="M6 13H2" />
      <path d="m8 2 1.88 1.88" />
      <path d="M9 7.13V6a3 3 0 1 1 6 0v1.13" />
    </Line>
  );
}

export function TermsIcon({ className }: IconProps) {
  // 문서 + 체크. 다른 기능 아이콘과 같은 듀오톤(불투명도) 방식.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path opacity="0.32" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M15 2v5h5l-5-5Z" />
      <path d="M8.6 14.6a1 1 0 0 1 1.4-1.4l1.3 1.3 3.1-3.1a1 1 0 1 1 1.4 1.4l-3.8 3.8a1 1 0 0 1-1.4 0l-2-2Z" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Line>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </Line>
  );
}
