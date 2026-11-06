import type { ReactNode } from "react";

// 가로로 눕힌 폰 틀. 사이트의 PhoneFrame(components/game/PhoneMockup.tsx)과 같은 베젤과 그림자를 쓰고,
// 노치는 왼쪽에 둔다. 게임은 가로 화면이 기본이라 장면을 이 틀에 넣는다
export default function LandscapeFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative w-full rounded-[2rem] bg-slate-900 p-2 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/5 sm:rounded-[2.5rem] sm:p-2.5 dark:ring-white/15 ${className}`}
    >
      {/* translateZ: 안의 GPU 층(지도, 캐릭터, 안개)도 둥근 모서리로 잘리게 한다. 사파리는 이게 없으면 잘림이 풀리거나 깜빡인다 */}
      <div className="relative aspect-[844/390] w-full overflow-hidden rounded-[1.5rem] bg-white [transform:translateZ(0)] sm:rounded-[2rem]">
        <div aria-hidden className="absolute left-1.5 top-1/2 z-10 h-10 w-2.5 -translate-y-1/2 rounded-full bg-slate-900 sm:left-2.5 sm:h-20 sm:w-4" />
        {children}
      </div>
    </div>
  );
}
