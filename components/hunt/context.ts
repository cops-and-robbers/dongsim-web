"use client";

import { createContext, useContext } from "react";

export type HuntStatus = "idle" | "hunting" | "won" | "lost";

export type HuntContextValue = {
  status: HuntStatus;
  timeLeft: number;
  total: number;
  caught: number;
  isCaught: (id: string) => boolean;
  register: (id: string) => void;
  unregister: (id: string) => void;
  capture: (id: string) => void;
};

export const HuntContext = createContext<HuntContextValue | null>(null);

export function useHunt() {
  const ctx = useContext(HuntContext);
  if (!ctx) {
    throw new Error("useHunt must be used within HuntProvider");
  }
  return ctx;
}
