"use client";

import { useEffect, useRef, useState } from "react";

// 게임 소개의 "움직이는 장면" 목업이 같이 쓰는 재생 장치.
// 폰이 화면에 들어올 때마다 처음부터 한 번 재생하고, 끝나면 마지막 장면에 멈춘다.
// 화면 밖으로 나가면 처음으로 되돌려 두어, 다시 보고 싶으면 스크롤만 하면 된다(다시 보기 버튼을 두지 않는다).
// 체험하기 장면(components/demo/scenes)을 그대로 끼워 쓰므로 앱 화면과 같은 연출이 나온다.

/** 요소가 화면에 [threshold] 만큼 보이는지. 들어오고 나갈 때마다 바뀐다 */
export function useInView<T extends HTMLElement>(threshold = 0.45) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/**
 * [inView] 가 참이 될 때마다 처음부터 재생하고 [length] ms 뒤 멈춘다. 거짓이 되면 처음으로 되돌린다.
 * [run] 이 바뀌면 장면을 새로 그린다(key 로 쓴다).
 */
export function useScenePlayback(inView: boolean, length: number) {
  const [run, setRun] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ms, setMs] = useState(0);

  // 들어오면 시작, 나가면 되돌림 - 콜백 안에서 상태를 바꾼다(효과 안 동기 setState 금지)
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (inView) {
        setMs(0);
        setStartedAt(performance.now());
        setRun((n) => n + 1);
      } else {
        setStartedAt(null);
        setMs(0);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [inView]);

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

  return { run, ms, started: startedAt !== null, finished };
}
