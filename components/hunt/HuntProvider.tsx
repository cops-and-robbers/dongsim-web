"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "@/components/ThemeProvider";
import GameResultModal from "@/components/home/GameResultModal";
import HuntHUD from "./HuntHUD";
import { HuntContext, type HuntStatus } from "./context";

export const HUNT_SECONDS = 180;

/**
 * 숨은 캐릭터 잡기 이스터에그.
 * - 경찰 팀: 사이트 곳곳에 숨은 도둑(생쥐)을 제한시간 안에 모두 클릭해 잡으면 승리.
 * - 도둑 팀: 숨은 경찰(고양이)을 모두 따돌리면 생존(승리).
 * 첫 캐릭터를 클릭하면 헌팅과 타이머가 시작된다.
 */
export default function HuntProvider({ children }: { children: ReactNode }) {
  const { team } = useTheme();
  const targetsRef = useRef<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [caughtSet, setCaughtSet] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<HuntStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(HUNT_SECONDS);
  const [forced, setForced] = useState(false);

  const register = useCallback((id: string) => {
    targetsRef.current.add(id);
    setTotal(targetsRef.current.size);
  }, []);

  const unregister = useCallback((id: string) => {
    targetsRef.current.delete(id);
    setTotal(targetsRef.current.size);
  }, []);

  const capture = useCallback(
    (id: string) => {
      if (caughtSet.has(id)) return;
      const total = targetsRef.current.size;
      const nextSize = caughtSet.size + 1;
      setCaughtSet((prev) => new Set(prev).add(id));
      // 마지막 한 명까지 잡으면 승리, 아니면 사냥 시작/유지.
      if (total > 0 && nextSize >= total) {
        setStatus("won");
      } else {
        setStatus((s) => (s === "idle" ? "hunting" : s));
      }
    },
    [caughtSet],
  );

  const isCaught = useCallback((id: string) => caughtSet.has(id), [caughtSet]);

  // 타이머 - 0이 되면 패배
  useEffect(() => {
    if (status !== "hunting") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setStatus("lost");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // 팀이 바뀌면 쫓는 대상이 바뀌므로 사냥을 초기화한다.
  const [prevTeam, setPrevTeam] = useState(team);
  if (prevTeam !== team) {
    setPrevTeam(team);
    setStatus("idle");
    setCaughtSet(new Set());
    setTimeLeft(HUNT_SECONDS);
  }

  // ?result=open 으로 결과 모달 미리보기
  const [inited, setInited] = useState(false);
  if (!inited && typeof window !== "undefined") {
    setInited(true);
    if (new URLSearchParams(window.location.search).get("result") === "open") {
      setForced(true);
    }
  }

  const reset = useCallback(() => {
    setStatus("idle");
    setCaughtSet(new Set());
    setTimeLeft(HUNT_SECONDS);
    setForced(false);
  }, []);

  const resolved = status === "won" || status === "lost";

  return (
    <HuntContext.Provider
      value={{
        status,
        timeLeft,
        total,
        caught: caughtSet.size,
        isCaught,
        register,
        unregister,
        capture,
      }}
    >
      {children}
      <HuntHUD />
      <GameResultModal
        open={resolved || forced}
        onClose={reset}
        outcome={
          status === "won" ? "win" : status === "lost" ? "lose" : undefined
        }
        showToggle={forced && !resolved}
      />
    </HuntContext.Provider>
  );
}
