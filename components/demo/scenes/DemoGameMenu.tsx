"use client";

import { useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { DEMO_SHRINK_INTERVAL_SECONDS, SHRINK_STAGES } from "@/lib/demo/scenes";
import { TintIcon } from "./DemoGameParts";
import { useDemoCopy } from "../demo-copy";

export type FabItem = {
  key: string;
  label: string;
  icon: string;
  onTap: () => void;
};

// 인게임 플로팅 메뉴 (game_fab_menu.dart 실측, 4.0.1 #656).
// 가운데 아래 56 원(경찰 파랑 원 + 흰 +, 도둑 검정 원 + 초록 +)을 누르면 화면이
// 어두워지고 항목(원 48, 아이콘 24, 라벨 흰 글자)이 반지름 132 호를 따라
// 왼쪽부터 펼쳐진다. 안쪽 아이콘이 돌아 X 가 되고, 항목을 누르면 닫힌 뒤 실행한다.
export function DemoFabMenu({ items, dark }: { items: FabItem[]; dark: boolean }) {
  const { app } = useDemoCopy();
  const [open, setOpen] = useState(false);
  const accent = dark ? appColors.green : appColors.blue;
  const RADIUS = 132;
  // 양 끝이 왼쪽 위·오른쪽 위를 향하는 호 (150도 → 30도)
  const angleOf = (i: number) =>
    items.length === 1 ? 90 : 150 - (120 * i) / (items.length - 1);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={app.menuClose}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          className="demo-fade-in fixed inset-0 z-20 bg-black/40"
        />
      )}
      <div
        className="absolute bottom-[72px] left-1/2 z-20 size-[56px] -translate-x-1/2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {open &&
          items.map((item, i) => {
            const rad = (angleOf(i) * Math.PI) / 180;
            const x = Math.cos(rad) * RADIUS;
            const y = -Math.sin(rad) * RADIUS;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onTap();
                }}
                className="demo-fade-in absolute left-1/2 top-1/2 flex w-[88px] flex-col items-center"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-24px + ${y}px))`,
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <span
                  className="flex size-[48px] items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-transform active:scale-95"
                  style={{ backgroundColor: dark ? appColors.black : appColors.white }}
                >
                  <TintIcon src={item.icon} size={24} color={accent} />
                </span>
                <span className="mt-[6px] text-[12px] font-semibold text-white">{item.label}</span>
              </button>
            );
          })}
        <button
          type="button"
          aria-label={open ? app.menuClose : app.menuOpen}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex size-[56px] items-center justify-center rounded-full shadow-[1px_1px_8px_rgba(8,10,12,0.1)] transition-transform active:scale-95"
          style={{ backgroundColor: dark ? appColors.black : appColors.blue }}
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            aria-hidden="true"
            className="transition-transform duration-200"
            style={{ transform: open ? "rotate(45deg)" : undefined }}
          >
            <path
              d="M12 5v14M5 12h14"
              stroke={dark ? appColors.green : appColors.white}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </>
  );
}

// 구역 축소 각본 (#668). 앱은 경찰 출동 뒤 (게임 시간 - 경찰 대기) / 5 간격으로
// 네 번 줄어든다. 데모는 지도가 열린 뒤 [DEMO_SHRINK_INTERVAL_SECONDS] 마다 한 단계씩 줄인다.
// 인게임의 경과 시간(초) 하나에서 모두 파생한다 - 타이머를 따로 두지 않는다.
// stage 0 = 아직 안 줄어듦, 4 = 마지막 구역. notice 는 줄어든 직후 잠깐 띄우는 안내,
// remaining 은 다음 축소까지 남은 초(꺼졌거나 마지막 구역이면 null)다.
const SHRINK_NOTICE_SECONDS = 3;

export function useDemoShrink(enabled: boolean, elapsed: number) {
  const { app } = useDemoCopy();
  if (!enabled) return { stage: 0, notice: null, remaining: null };
  const stage = Math.min(SHRINK_STAGES, Math.floor(elapsed / DEMO_SHRINK_INTERVAL_SECONDS));
  const sinceShrink = elapsed - stage * DEMO_SHRINK_INTERVAL_SECONDS;
  const notice =
    stage > 0 && sinceShrink < SHRINK_NOTICE_SECONDS
      ? stage >= SHRINK_STAGES
        ? app.shrinkFinalNotice
        : app.shrinkNotice(stage)
      : null;
  const remaining =
    stage >= SHRINK_STAGES ? null : DEMO_SHRINK_INTERVAL_SECONDS - sinceShrink;
  return { stage, notice, remaining };
}

// 줄어드는 플레이그라운드 원의 크기와 중심. 시작 원에서 마지막 원까지 네 번에
// 나눠 옮긴다 - 앱처럼 마지막 원이 감옥을 품도록 중심을 감옥 쪽으로 조금 당긴다.
export function shrinkCircle(
  stage: number,
  start: { size: number; left: number; top: number },
  final: { size: number; left: number; top: number },
) {
  const k = stage / SHRINK_STAGES;
  return {
    size: start.size + (final.size - start.size) * k,
    left: `${start.left + (final.left - start.left) * k}%`,
    top: `${start.top + (final.top - start.top) * k}%`,
  };
}

/** 축소 안내 토스트 - 지도 위 가운데에 잠깐 뜬다 */
export function ShrinkNotice({ text, dark }: { text: string | null; dark: boolean }) {
  if (!text) return null;
  return (
    <div className="demo-fade-in pointer-events-none absolute inset-x-0 top-[12px] z-10 flex justify-center px-[16px]">
      <span
        className="rounded-full px-[14px] py-[8px] text-[13px] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
        style={
          dark
            ? { backgroundColor: appColors.black, color: appColors.green }
            : { backgroundColor: appColors.white, color: appColors.blue }
        }
      >
        {text}
      </span>
    </div>
  );
}
