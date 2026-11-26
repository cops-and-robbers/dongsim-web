
// 앱 게임 시작 장면의 움직임 계산 (start_banners.dart, stripe_banner.dart).
// 체험하기 장면(components/demo/scenes/DemoGameStart.tsx)과 홈 팀 고르기 배너
// (components/home/RoleBannerOverlay.tsx)가 같은 움직임을 쓰도록 여기 모았다.

/** cubic-bezier(x1, y1, x2, y2) - 플러터 Cubic 과 같은 곡선 */
export function cubic(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < x) lo = mid;
      else hi = mid;
    }
    return by((lo + hi) / 2);
  };
}
export const linear = (t: number) => t;
export const easeOut = cubic(0, 0, 0.58, 1);
export const easeInOut = cubic(0.42, 0, 0.58, 1);
export const easeOutCubic = cubic(0.215, 0.61, 0.355, 1);
/** Interval(begin, end, curve).transform(t) */
export const interval = (t: number, begin: number, end: number, curve: (x: number) => number = linear) =>
  curve(Math.min(1, Math.max(0, (t - begin) / (end - begin))));

export type Pose = { x: number; sx: number; sy: number };
export const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: a.x + (b.x - a.x) * t,
  sx: a.sx + (b.sx - a.sx) * t,
  sy: a.sy + (b.sy - a.sy) * t,
});
/** STRIPE_IN: 가늘고 길게 빨려 나와 살짝 지나쳤다 제자리 */
export function stripeEnterPose(t: number): Pose {
  const p0 = { x: -2.05, sx: 1.9, sy: 0.12 };
  const p1 = { x: 0.03, sx: 0.94, sy: 1.12 };
  const p2 = { x: -0.01, sx: 1.02, sy: 0.97 };
  const p3 = { x: 0, sx: 1, sy: 1 };
  if (t < 0.7) return lerpPose(p0, p1, cubic(0.12, 0.9, 0.3, 1)(t / 0.7));
  if (t < 0.86) return lerpPose(p1, p2, easeOut((t - 0.7) / 0.16));
  return lerpPose(p2, p3, (t - 0.86) / 0.14);
}
/** STRIPE_OUT: 살짝 물러섰다가 오른쪽 끝으로 가늘게 빨려 나감 */
export const stripeExitCurve = cubic(0.5, 0, 0.8, 0.3);
export function stripeExitPose(t: number): Pose {
  const p0 = { x: 0, sx: 1, sy: 1 };
  const p1 = { x: -0.03, sx: 1.03, sy: 1.05 };
  const p2 = { x: 2.4, sx: 2.2, sy: 0.06 };
  if (t < 0.15) return lerpPose(p0, p1, stripeExitCurve(t / 0.15));
  return lerpPose(p1, p2, stripeExitCurve((t - 0.15) / 0.85));
}

export type PopPose = { y: number; sx: number; sy: number };
export const lerpPop = (a: PopPose, b: PopPose, t: number): PopPose => ({
  y: a.y + (b.y - a.y) * t,
  sx: a.sx + (b.sx - a.sx) * t,
  sy: a.sy + (b.sy - a.sy) * t,
});
/** 쫀득한 등장: 길게 늘어나며 튀어 올라 제자리를 지나치고, 눌리며 내려앉았다가 멈춘다 */
export function popPose(t: number): PopPose {
  const start = { y: 1.12, sx: 0.92, sy: 1.1 };
  const peak = { y: -0.05, sx: 0.97, sy: 1.04 };
  const squash = { y: 0.012, sx: 1.05, sy: 0.94 };
  const rebound = { y: -0.006, sx: 0.985, sy: 1.015 };
  const rest = { y: 0, sx: 1, sy: 1 };
  if (t < 0.42) return lerpPop(start, peak, easeOutCubic(t / 0.42));
  if (t < 0.68) return lerpPop(peak, squash, easeInOut((t - 0.42) / 0.26));
  if (t < 0.85) return lerpPop(squash, rebound, easeInOut((t - 0.68) / 0.17));
  return lerpPop(rebound, rest, easeOut(Math.min(1, (t - 0.85) / 0.15)));
}
/** 쫀득한 퇴장: 위로 움찔하며 눌렸다가 길쭉하게 늘어나며 아래로 빠진다 */
export function dropPose(t: number): PopPose {
  const rest = { y: 0, sx: 1, sy: 1 };
  const rise = { y: -0.06, sx: 1.03, sy: 0.97 };
  const gone = { y: 1.2, sx: 0.94, sy: 1.1 };
  if (t < 0.35) return lerpPop(rest, rise, easeOut(t / 0.35));
  return lerpPop(rise, gone, cubic(0.64, 0, 0.78, 0)(Math.min(1, (t - 0.35) / 0.65)));
}

/** 띠와 나란한 속도선. 시간은 배너 시작 기준(ms) */
export const SPEED_LINES = [
  { x: 84, y: 208, length: 224, fromLeft: true, start: 300, end: 560, outAt: 1620 },
  { x: 231.5, y: 181.8, length: 42, fromLeft: true, start: 520, end: 660, outAt: 1560 },
  { x: 256.6, y: 534.6, length: 238, fromLeft: false, start: 380, end: 640, outAt: 1700 },
  { x: 102.8, y: 560, length: 42, fromLeft: false, start: 600, end: 740, outAt: 1640 },
];
export const speedOutCurve = cubic(0.5, 0, 0.8, 0.3);

/** [text] 안의 [accent] 부분만 색을 바꾼다 */
export function Accented({ text, accent, color }: { text: string; accent: string; color: string }) {
  const at = text.indexOf(accent);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span style={{ color }}>{accent}</span>
      {text.slice(at + accent.length)}
    </>
  );
}

