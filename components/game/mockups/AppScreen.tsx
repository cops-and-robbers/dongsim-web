"use client";

import { ReactNode, RefObject, useEffect, useRef, useState } from "react";

// 실기기 세이프 에어리어 (앱 기준 기기 393x852)
export const STATUS_BAR_INSET = 59;

// 목업 재생 시점 - 프레임이 절반쯤 보일 때 시작한다. 기본값(10%)으로는
// 사용자가 스크롤로 도착하기 전에 연출이 끝나 버린다.
export const MOCKUP_VIEW = { threshold: 0.45, rootMargin: "0px" };

const APP_WIDTH = 393;
const APP_HEIGHT = 852;

// 컨테이너 실제 크기를 재서 앱 원본 좌표계(폭 393)를 프레임에 맞추는 배율과,
// 그 배율에서 화면을 꽉 채우는 세로 길이를 구한다.
// CSS 컨테이너 단위는 브라우저·중첩 조건을 타서, 관측값으로 확실하게 건다.
function useAppScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 0, height: APP_HEIGHT });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const scale = el.clientWidth / APP_WIDTH;
      setBox({
        scale,
        height: scale ? el.clientHeight / scale : APP_HEIGHT,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, ...box };
}

// 앱 화면을 원본 좌표계(폭 393)로 그리는 레이어. 안쪽에서는 앱 위젯의
// 픽셀 값을 환산 없이 그대로 쓴다.
// 세로는 852 로 고정하지 않고 프레임을 꽉 채운다. 폰 프레임 비율(9:19, 테두리 포함)이
// 393x852 와 달라서, 고정하면 작은 폰에서 화면 아래(홈 인디케이터 자리)에 몇 px 틈이
// 생기고 다이얼로그의 어두운 덮개도 그 틈을 덮지 못했다. 큰 폰에서는 반대로 아래가 잘렸다.
function AppScaled({ children }: { children: ReactNode }) {
  const { ref, scale, height } = useAppScale();
  return (
    <div ref={ref} className="absolute inset-0">
      <div
        className="flex w-[393px] origin-top-left flex-col"
        style={{
          height,
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
