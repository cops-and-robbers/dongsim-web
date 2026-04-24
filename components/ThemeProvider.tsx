"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Team = "police" | "robber";

type ThemeContextValue = {
  team: Team;
  setTeam: (team: Team) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team>("police");

  useEffect(() => {
    const root = document.documentElement;
    if (team === "robber") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
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
