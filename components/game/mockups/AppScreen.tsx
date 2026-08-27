"use client";

import { ReactNode, RefObject, useEffect, useRef, useState } from "react";

// 실기기 세이프 에어리어 (앱 기준 기기 393x852)
export const STATUS_BAR_INSET = 59;

// 컨테이너 실제 폭을 재서 앱 원본 좌표계(393)를 프레임에 맞추는 배율을 구한다.
// CSS 컨테이너 단위는 브라우저·중첩 조건을 타서, 관측값으로 확실하게 건다.
function useAppScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 393);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

// 앱 화면을 원본 좌표계(393x852)로 그리는 레이어. 안쪽에서는 앱 위젯의
// 픽셀 값을 환산 없이 그대로 쓴다.
function AppScaled({ children }: { children: ReactNode }) {
  const { ref, scale } = useAppScale();
  return (
    <div ref={ref} className="absolute inset-0">
      <div
        className="flex h-[852px] w-[393px] origin-top-left flex-col"
        style={{
          transform: `scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// 목업 공통 셸 - 프레임의 상태바 여백(pt-10)을 무시하고 화면 전체를 앱처럼 쓴다.
// [statusBar] 를 주면 상단 상태바 영역(59)을 그 색으로 채워 콘텐츠가 그 아래에서
// 시작하고, 지도처럼 끝까지 깔리는 화면은 생략해 상태바 뒤로 지나가게 한다.
// [className] 은 스케일 오차로 생기는 가장자리 틈을 화면과 같은 색으로 메운다.
export function AppScreen({
  playing,
  scrollRef,
  statusBar,
  className = "",
  children,
}: {
  playing: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  statusBar?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={scrollRef}
      className={`relative -mt-10 h-[calc(100%+2.5rem)] w-full overflow-hidden ${className} ${playing ? "is-playing" : ""}`}
    >
      <AppScaled>
        {statusBar && (
          <div
            className="shrink-0"
            style={{ height: STATUS_BAR_INSET, backgroundColor: statusBar }}
          />
        )}
        {children}
      </AppScaled>
    </div>
  );
}
