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

// 파비콘 교체 - 기존 아이콘 링크를 모두 지우고 하나만 다시 얹어야 브라우저가
// 탭 아이콘을 확실히 다시 그린다(단순 href 변경은 자주 무시된다). metadata로
// 선언하지 않아 Next가 되돌리지 않으므로, 이 링크는 라우트 이동에도 유지된다.
// apple-touch-icon은 rel 토큰이 'icon'과 달라 매칭되지 않아 보존된다.
function applyFavicon(isDark: boolean) {
  document.querySelectorAll("link[rel~='icon']").forEach((el) => el.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = isDark ? "/favicon-dark.svg" : "/favicon-light.svg";
  document.head.appendChild(link);
}

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
    // 최초 마운트에선 인라인 스크립트가 칠한 클래스·파비콘을 그대로 둠(깜빡임 방지)
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

    // 파비콘도 같은 토글에 맞춰 교체(첫 마운트는 위에서 걸러져 인라인 값 유지)
    applyFavicon(isDark);
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
