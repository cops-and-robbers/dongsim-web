import type { ReactNode } from "react";
import { ROLE_ICON_SHAPES } from "@/components/admin/team/roleIcons";

// 역할 그림. 처음부터 있는 네 역할은 고르는 화면의 얼굴이라 72 격자에 따로 그렸고,
// 새로 만드는 역할은 Lucide 원본(roleIcons.tsx)을 같은 선 굵기로 맞춘다.
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

export function RoleArt({ icon, className = "" }: { icon: string; className?: string }) {
  const own = BUILTIN[icon];
  return own ? (
    <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {own}
    </svg>
  ) : (
    // 72 격자 그림과 같은 굵기로 보이게 24 격자 선을 1로 둔다
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {ROLE_ICON_SHAPES[icon] ?? ROLE_ICON_SHAPES.sparkles}
    </svg>
  );
}
