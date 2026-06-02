import { SHOEPRINT_PATH } from "@/components/icons/Footprint";

// 게임 배경 — 흩뿌린 발바닥 + 가장자리 페이드(가운데는 비워 카드가 도드라지게)
const BACKDROP_PAWS = [
  { x: 34, y: 70, s: 46, r: -18, o: 0.09 },
  { x: 330, y: 50, s: 40, r: 22, o: 0.08 },
  { x: 60, y: 300, s: 52, r: 12, o: 0.08 },
  { x: 352, y: 300, s: 44, r: -14, o: 0.09 },
  { x: 200, y: 24, s: 34, r: 6, o: 0.07 },
  { x: 18, y: 190, s: 30, r: 28, o: 0.06 },
  { x: 372, y: 180, s: 32, r: -24, o: 0.06 },
];

function BoardBackdrop() {
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full text-brand-blue dark:text-brand-green"
      aria-hidden="true"
    >
      <defs>
        <symbol id="booth-paw" viewBox="0 0 28 28">
          <path d={SHOEPRINT_PATH} fill="currentColor" />
        </symbol>
        <radialGradient id="booth-fade" cx="50%" cy="50%" r="62%">
          <stop offset="48%" className="[stop-color:white] dark:[stop-color:#080A0C]" stopOpacity="0" />
          <stop offset="100%" className="[stop-color:white] dark:[stop-color:#080A0C]" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      {BACKDROP_PAWS.map((p, i) => (
        <use
          key={i}
          href="#booth-paw"
          width={p.s}
          height={p.s}
          transform={`translate(${p.x - p.s / 2} ${p.y - p.s / 2}) rotate(${p.r} ${p.s / 2} ${p.s / 2})`}
          opacity={p.o}
        />
      ))}
      <rect width="400" height="400" fill="url(#booth-fade)" />
    </svg>
  );
}

// 헤더 높이를 뺀 가용 영역(dvh: 모바일 주소창까지 반영).
const HEIGHT = "min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)]";
const FIXED = "h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]";

type Variant = "center" | "fit" | "scroll";

const VARIANT: Record<Variant, string> = {
  // 짧은 화면(인트로) — 가운데 정렬
  center: `${HEIGHT} items-center overflow-x-clip py-8`,
  // 게임 — 정확히 한 화면, 스크롤 없음
  fit: `${FIXED} items-center overflow-hidden py-3`,
  // 결과 — 위 정렬, 길면 스크롤
  scroll: `${HEIGHT} items-start overflow-x-clip py-8`,
};

export default function Shell({
  children,
  variant = "center",
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <section
      className={`relative flex w-full bg-linear-to-b from-brand-blue-bg via-white to-white px-4 transition-colors duration-500 dark:from-app-black-900 dark:via-app-black dark:to-app-black ${VARIANT[variant]}`}
    >
      <BoardBackdrop />
      {children}
    </section>
  );
}
