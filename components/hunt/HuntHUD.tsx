"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useHunt } from "./context";

export default function HuntHUD() {
  const { team } = useTheme();
  const { status, timeLeft, total, caught } = useHunt();

  if (status !== "hunting") return null;

  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, "0");
  const low = timeLeft <= 20;
  // 경찰은 도둑을 잡고, 도둑은 경찰을 따돌린다.
  const label = team === "police" ? "도둑" : "경찰";
  const verb = team === "police" ? "검거" : "회피";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-19 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-app-black/90 px-4 py-2 text-white shadow-xl ring-1 ring-white/10 backdrop-blur-md"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${low ? "animate-pulse bg-brand-red" : "bg-brand-green"}`}
        />
        <span
          className={`font-mono text-sm font-bold tabular-nums ${low ? "text-brand-red" : "text-white"}`}
        >
          {mm}:{ss}
        </span>
      </span>
      <span className="h-3.5 w-px bg-white/20" />
      <span className="text-sm font-semibold">
        {label} {verb}{" "}
        <span className="font-mono tabular-nums text-brand-green">
          {caught}/{total}
        </span>
      </span>
    </div>
  );
}
