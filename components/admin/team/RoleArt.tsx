import type { ReactNode } from "react";

// 역할 그림. 처음부터 있는 네 역할은 고르는 화면의 얼굴이라 72 격자에 따로 그렸고,
// 새로 만드는 역할은 Lucide 원본(ISC, lucide-static 0.460.0)을 같은 선 굵기로 맞춘다.
// 면 색은 부모가 정한다: --tf 는 그림 안쪽, --clip 은 겹친 부분을 끊어 보이게 하는 바탕색이다.

const FILL = "fill-[var(--tf,var(--color-accent-weak))] transition-[fill] duration-200";
const CLIP = { fill: "var(--clip,var(--color-sd-surface))" };

const BUILTIN: Record<string, ReactNode> = {
  dev: (
    <>
      <rect className={FILL} x="9" y="13" width="54" height="46" rx="10" />
      <path d="M9 26h54" />
      <circle cx="18" cy="19.5" r=".9" fill="currentColor" />
      <circle cx="25" cy="19.5" r=".9" fill="currentColor" />
      <path d="M21 35l7.5 6.5L21 48" />
      <path d="M36 48h14" />
    </>
  ),
  des: (
    <>
      <path className={FILL} d="M36 9C20.5 9 8 21 8 36s12.5 27 28 27c4 0 6.5-3 6.5-6.3 0-1.7-.7-3-1.6-4.2-1-1.3-1.6-2.5-1.6-4 0-3.2 2.5-5.5 5.7-5.5H52c7 0 12-5.3 12-12C64 19 51.5 9 36 9z" />
      <circle cx="19" cy="37" r="2" fill="currentColor" />
      <circle cx="24" cy="24" r="2" fill="currentColor" />
      <circle cx="37" cy="18" r="2" fill="currentColor" />
      <circle cx="53" cy="36" r="2" fill="currentColor" />
      {/* 붓이 팔레트를 가로지른다. 붓 몸통을 바탕색으로 칠해 겹친 선을 끊는다 */}
      <g transform="rotate(45 36 36)">
        <rect x="32" y="1" width="8" height="37" rx="4" style={CLIP} />
        <path d="M30 38h12v8H30z" style={CLIP} />
        <path d="M30 46h12c1 7 .5 13-6 20-6.5-7-7-13-6-20z" style={CLIP} />
        <path className={FILL} d="M30 46h12c1 7 .5 13-6 20-6.5-7-7-13-6-20z" />
      </g>
    </>
  ),
  mkt: (
    <>
      <path className={FILL} d="M9 30v11a4 4 0 0 0 4 4h8l23 12.5a2.5 2.5 0 0 0 3.7-2.2V16.7a2.5 2.5 0 0 0-3.7-2.2L21 27h-8a4 4 0 0 0-4 4z" />
      <path d="M21 27v18" />
      <path d="M22 45l3.2 13a3 3 0 0 0 2.9 2.3h3a3 3 0 0 0 2.9-3.8L32 50.5" />
      <path d="M55 28a11 11 0 0 1 0 16" />
      <path d="M61 21a22 22 0 0 1 0 30" />
    </>
  ),
  ops: (
    <>
      <rect className={FILL} x="13" y="14" width="46" height="50" rx="9" />
      <rect x="26" y="8" width="20" height="12" rx="4" style={CLIP} />
      <path d="M23 35l3.5 3.5L33 31.5" />
      <path d="M40 35h10" />
      <path d="M23 51l3.5 3.5L33 47.5" />
      <path d="M40 51h10" />
    </>
  ),
};

/** 새 역할 아이콘. 키는 lib/admin/team.ts 의 ROLE_ICONS 와 같다 */
const LUCIDE: Record<string, ReactNode> = {
  headphones: <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />,
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  gamepad: (
    <>
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </>
  ),
  shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  sparkles: (
    <>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </>
  ),
  pen: (
    <>
      <path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" />
      <path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" />
      <path d="m2.3 2.3 7.286 7.286" />
      <circle cx="11" cy="11" r="2" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  message: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  briefcase: (
    <>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </>
  ),
};

export const ICON_LABEL: Record<string, string> = { headphones: "헤드폰", camera: "카메라", users: "사람들", gamepad: "게임패드", shield: "방패", sparkles: "반짝임", flag: "깃발", pen: "펜", pin: "위치", message: "말풍선", heart: "하트", briefcase: "가방" };

export function RoleArt({ icon, className = "" }: { icon: string; className?: string }) {
  const own = BUILTIN[icon];
  return own ? (
    <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {own}
    </svg>
  ) : (
    // 72 격자 그림과 같은 굵기로 보이게 24 격자 선을 1로 둔다
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {LUCIDE[icon] ?? LUCIDE.sparkles}
    </svg>
  );
}
