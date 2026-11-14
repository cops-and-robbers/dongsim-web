"use client";

import { useEffect, useState } from "react";
import { appColors } from "@/lib/app-tokens";

// 게임 소개의 "움직이는 장면" 목업이 같이 쓰는 재생 장치.
// 화면에 들어오면 한 번 재생하고 끝나면 마지막 장면에 멈춘다. 다시 보기로 처음부터 튼다.
// 체험하기 장면(components/demo/scenes)을 그대로 끼워 쓰므로 앱 화면과 같은 연출이 나온다.

/** [playing] 이 처음 참이 되면 재생을 시작하고, [length] ms 뒤 멈춘다. [run] 이 바뀌면 장면을 새로 그린다 */
export function useScenePlayback(playing: boolean, length: number) {
  const [run, setRun] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ms, setMs] = useState(0);

  // 처음 보일 때 시작 - 콜백 안에서 상태를 바꾼다(효과 안 동기 setState 금지)
  useEffect(() => {
    if (!playing || startedAt !== null) return;
    const t = window.setTimeout(() => {
      setStartedAt(performance.now());
      setRun((n) => n + 1);
    }, 0);
    return () => window.clearTimeout(t);
  }, [playing, startedAt]);

  const finished = startedAt !== null && ms >= length;
  useEffect(() => {
    if (startedAt === null || finished) return;
    let raf = 0;
    const tick = () => setMs(performance.now() - startedAt);
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // 화면 갱신이 멈춘 환경에서도 끝까지 가게 느린 타이머를 같이 둔다
    const fallback = window.setInterval(tick, 250);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(fallback);
    };
  }, [startedAt, finished]);

  const replay = () => {
    setMs(0);
    setStartedAt(performance.now());
    setRun((n) => n + 1);
  };

  return { run, ms, started: startedAt !== null, finished, replay };
}

/** 장면이 끝나면 화면 아래에 뜨는 다시 보기 버튼 (앱 좌표계 393 기준 크기) */
export function ReplayButton({
  label,
  dark,
  onClick,
}: {
  label: string;
  dark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="demo-fade-in absolute bottom-[56px] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-[8px] rounded-full px-[20px] py-[12px] text-[16px] font-semibold shadow-[0_4px_16px_rgba(8,10,12,0.18)] transition-transform active:scale-95"
      style={
        dark
          ? { backgroundColor: appColors.black, color: appColors.green }
          : { backgroundColor: appColors.white, color: appColors.blue }
      }
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
