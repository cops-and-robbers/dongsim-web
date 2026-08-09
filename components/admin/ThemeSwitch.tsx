"use client";

import { motion } from "motion/react";
import { useTheme } from "@/components/ThemeProvider";

// 캐릭터 테마 스위치 - 냥파(라이트)·도둥이(다크) 두 원.
// 활성 쪽에 흰 원이 슬라이드하고 캐릭터가 커진다. 비활성은 작아지고 흐려진다.
const OPTIONS = [
  { key: "police", aria: "라이트 모드", src: "/characters/police.svg" },
  { key: "robber", aria: "다크 모드", src: "/characters/robber.svg" },
] as const;

export function ThemeSwitch() {
  const { team, setTeam } = useTheme();

  return (
    <div className="flex w-fit gap-1 rounded-full bg-sd-gray-200 p-1">
      {OPTIONS.map((o) => {
        const active = team === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setTeam(o.key)}
            aria-label={o.aria}
            aria-pressed={active}
            className="relative flex h-8 w-8 items-center justify-center rounded-full"
          >
            {active && (
              <motion.span
                layoutId="themeActive"
                className="absolute inset-0 rounded-full bg-sd-surface shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <motion.img
              src={o.src}
              alt=""
              className="relative z-10 h-[20px] w-auto"
              animate={{
                scale: active ? 1 : 0.78,
                opacity: active ? 1 : 0.4,
              }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
            />
          </button>
        );
      })}
    </div>
  );
}
