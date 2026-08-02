"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Team = "police" | "robber";

type ThemeContextValue = {
  team: Team;
  setTeam: (team: Team) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "team";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [team, setTeamState] = useState<Team>("police");
  const firstToggle = useRef(true);

  // 첫 진입: 저장된 선택 → 기기 선호 → 경찰 순(인라인 스크립트가 페인트 전 같은 우선순위로 적용해 깜빡임 없음)
  useEffect(() => {
    let initial: Team = "police";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "police" || stored === "robber") {
        initial = stored;
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        initial = "robber";
      }
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial !== "police") setTeamState(initial);
  }, []);

  // 명시적 선택만 기억(디바이스 기본값은 휘발)
  const setTeam = useCallback((next: Team) => {
    setTeamState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  useEffect(() => {
    // 최초 마운트에선 인라인 스크립트가 칠한 클래스를 그대로 둠
    if (firstToggle.current) {
      firstToggle.current = false;
      return;
    }

    const root = document.documentElement;
    const isDark = team === "robber";
    root.classList.toggle("dark", isDark);

    const metaThemeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (metaThemeColor) {
      metaThemeColor.content = isDark ? "#080a0c" : "#ffffff";
    }
  }, [team]);

  // 파비콘도 테마에 동기화 - 라이트(경찰)는 파랑, 다크(도둑)는 초록 SVG.
  // 기존 아이콘 링크를 모두 지우고 하나만 다시 얹어야 브라우저가 확실히 갱신한다.
  // (favicon.ico가 남아 있으면 그게 우선권을 가져 스왑이 안 먹힘.)
  // apple-touch-icon은 rel 토큰이 달라 매칭되지 않으므로 유지된다.
  useEffect(() => {
    document.querySelectorAll("link[rel~='icon']").forEach((el) => el.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = team === "robber" ? "/favicon-dark.svg" : "/favicon-light.svg";
    document.head.appendChild(link);
  }, [team]);

  return (
    <ThemeContext.Provider value={{ team, setTeam }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
