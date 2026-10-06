"use client";

import { useEffect, useState } from "react";

/**
 * 폰 키보드가 화면 아래를 가린 높이(px)와 지금 보이는 영역의 높이 (#155).
 *
 * iOS Safari 와 최근 안드로이드 Chrome 은 키보드가 떠도 레이아웃 높이를 줄이지 않고 보이는 영역
 * (visualViewport)만 줄인다. 그래서 `fixed bottom-0` 시트는 키보드 뒤에 그대로 숨어, 입력하는 글자가
 * 안 보였다. 시트의 bottom 을 가린 높이만큼 올리고 높이를 보이는 영역 안으로 줄이면 키보드 바로 위에 붙는다.
 * active 일 때만 듣는다(시트가 열려 있을 때).
 */
export function useKeyboardInset(active: boolean): { inset: number; height: number | null } {
  const [state, setState] = useState<{ inset: number; height: number | null }>({ inset: 0, height: null });

  useEffect(() => {
    const vv = typeof window === "undefined" ? null : window.visualViewport;
    if (!active || !vv) return;
    const update = () => {
      // 보이는 영역의 아래 끝(레이아웃 기준)과 레이아웃 아래 끝의 차이가 키보드가 가린 높이다
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setState({ inset: Math.round(inset), height: Math.round(vv.height) });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setState({ inset: 0, height: null });
    };
  }, [active]);

  return state;
}
