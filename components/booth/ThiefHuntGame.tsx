"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IntroScreen from "./IntroScreen";
import PlayScreen from "./PlayScreen";
import ResultScreen from "./ResultScreen";
import { GAME_MS, freshGame, lerp, type Game } from "./types";

type Phase = "intro" | "playing" | "over";

export default function ThiefHuntGame() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [view, setView] = useState<Game>(() => freshGame());
  const [shaking, setShaking] = useState(false);
  const gameRef = useRef<Game>(freshGame());

  // 루프는 ref를 직접 다루고, 렌더에는 스냅샷(view)만 노출한다.
  const snapshot = useCallback(() => {
    const g = gameRef.current;
    setView({ ...g, holes: [...g.holes], pops: [...g.pops] });
  }, []);

  const start = useCallback(() => {
    const g = freshGame();
    const now = Date.now();
    g.startAt = now;
    g.nextSpawn = now + 350;
    gameRef.current = g;
    setShaking(false);
    snapshot();
    setPhase("playing");
  }, [snapshot]);

  const tap = useCallback(
    (i: number) => {
      const g = gameRef.current;
      const o = g.holes[i];
      if (!o || o.caught) return;
      const now = Date.now();
      o.caught = true;
      o.caughtAt = now;
      if (o.type === "civ") {
        g.combo = 0;
        g.score = Math.max(0, g.score - 5);
        g.pops.push({ id: g.nextId++, hole: i, text: "시민!", good: false, at: now });
        setShaking(true);
        window.setTimeout(() => setShaking(false), 360);
      } else {
        g.combo += 1;
        if (g.combo > g.maxCombo) g.maxCombo = g.combo;
        const gain = 10 + (g.combo - 1) * 2;
        g.score += gain;
        g.caught += 1;
        g.pops.push({ id: g.nextId++, hole: i, text: `+${gain}`, good: true, at: now });
      }
      snapshot();
    },
    [snapshot],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const g = gameRef.current;
    const id = window.setInterval(() => {
      const now = Date.now();
      g.timeLeft = Math.max(0, GAME_MS - (now - g.startAt));
      const d = Math.min(1, (now - g.startAt) / GAME_MS);

      for (let i = 0; i < g.holes.length; i++) {
        const o = g.holes[i];
        if (!o) continue;
        if (o.caught) {
          if (now - o.caughtAt > 260) g.holes[i] = null;
        } else if (now - o.born > o.ttl) {
          if (o.type === "robber") {
            g.combo = 0;
            g.misses += 1;
          }
          g.holes[i] = null;
        }
      }
      g.pops = g.pops.filter((p) => now - p.at < 650);

      const maxActive = d < 0.33 ? 2 : d < 0.66 ? 3 : 4;
      const active = g.holes.filter((o) => o && !o.caught).length;
      if (now >= g.nextSpawn && active < maxActive) {
        const empties = g.holes
          .map((o, i) => (o ? -1 : i))
          .filter((i) => i >= 0);
        if (empties.length) {
          const idx = empties[Math.floor(Math.random() * empties.length)];
          const type = Math.random() < lerp(0.16, 0.32, d) ? "civ" : "robber";
          g.holes[idx] = {
            id: g.nextId++,
            type,
            born: now,
            ttl: lerp(1300, 720, d),
            caught: false,
            caughtAt: 0,
          };
        }
        g.nextSpawn = now + lerp(820, 430, d) * (0.75 + Math.random() * 0.5);
      }

      if (g.timeLeft <= 0) {
        window.clearInterval(id);
        snapshot();
        setPhase("over");
        return;
      }
      snapshot();
    }, 60);
    return () => window.clearInterval(id);
  }, [phase, snapshot]);

  if (phase === "intro") return <IntroScreen onStart={start} />;
  if (phase === "over") return <ResultScreen game={view} onRestart={start} />;
  return <PlayScreen game={view} shaking={shaking} onTap={tap} />;
}
