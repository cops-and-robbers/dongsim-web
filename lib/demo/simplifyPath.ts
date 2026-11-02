// 끌어 그린 궤적을 꼭짓점으로 줄인다 (앱 lib/core/utils/path_simplifier.dart).
// 양 끝점은 항상 남고 순서는 그대로다. tolerance 보다 덜 벗어난 점은 버리고(Douglas-Peucker),
// 그래도 maxPoints 를 넘으면 균등 간격으로 솎는다.
export type PathPoint = { x: number; y: number };

function distanceToSegment(p: PathPoint, a: PathPoint, b: PathPoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function simplifyPath<T extends PathPoint>(points: readonly T[], tolerance: number, maxPoints: number): T[] {
  if (points.length <= 2) return [...points];

  const keep = new Set<number>([0, points.length - 1]);
  const mark = (first: number, last: number) => {
    let farthest = -1;
    let max = tolerance;
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(points[i], points[first], points[last]);
      if (d > max) {
        max = d;
        farthest = i;
      }
    }
    if (farthest < 0) return;
    keep.add(farthest);
    mark(first, farthest);
    mark(farthest, last);
  };
  mark(0, points.length - 1);

  const kept = [...keep].sort((a, b) => a - b).map((i) => points[i]);
  if (kept.length <= maxPoints) return kept;

  const step = (kept.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => kept[Math.round(i * step)]);
}
