import { SHOEPRINT_PATH } from "@/components/icons/Footprint";

// 키오스크 배경 - 흩뿌린 발자국 + 가장자리 페이드(가운데는 비워 콘텐츠가 도드라지게).
// 사이트 게임 보드(Shell) 톤을 그대로 가져와 경찰·도둑 정체성을 깔아준다.
const PAWS = [
  { x: 50, y: 60, s: 48, r: -18, o: 0.08 },
  { x: 340, y: 70, s: 42, r: 20, o: 0.07 },
  { x: 70, y: 220, s: 38, r: 10, o: 0.06 },
  { x: 360, y: 230, s: 46, r: -12, o: 0.07 },
  { x: 40, y: 360, s: 44, r: 24, o: 0.07 },
  { x: 350, y: 360, s: 40, r: -22, o: 0.06 },
  { x: 200, y: 28, s: 32, r: 6, o: 0.05 },
];

export default function Backdrop() {
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full text-brand-blue dark:text-brand-green"
      aria-hidden="true"
    >
      <defs>
        <symbol id="pb-paw" viewBox="0 0 28 28">
          <path d={SHOEPRINT_PATH} fill="currentColor" />
        </symbol>
        <radialGradient id="pb-fade" cx="50%" cy="50%" r="62%">
          <stop
            offset="45%"
            className="[stop-color:white] dark:[stop-color:#080A0C]"
            stopOpacity="0"
          />
          <stop
            offset="100%"
            className="[stop-color:white] dark:[stop-color:#080A0C]"
            stopOpacity="0.9"
          />
        </radialGradient>
      </defs>
      {PAWS.map((p, i) => (
        <use
          key={i}
          href="#pb-paw"
          width={p.s}
          height={p.s}
          transform={`translate(${p.x - p.s / 2} ${p.y - p.s / 2}) rotate(${p.r} ${p.s / 2} ${p.s / 2})`}
          opacity={p.o}
        />
      ))}
      <rect width="400" height="400" fill="url(#pb-fade)" />
    </svg>
  );
}
