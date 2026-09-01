"use client";

import { useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { FakeMap } from "@/components/game/mockups/parts";
import { useDemoCopy } from "../demo-copy";
import { DemoStepBar } from "./DemoCreateParts";

// 지도 위 좌표는 % 로 들고, 반경은 앱과 같은 미터 값을 그대로 쓴다.
// 화면에는 미터를 픽셀로 바꿔 그린다 (아래 SCALE_PX_PER_M).
export type ZoneDraft = {
  mode: "circle" | "polygon";
  /** circle: 중심(%)과 반경(m) */
  center: { x: number; y: number };
  radius: number;
  /** polygon: 꼭짓점(%) 목록 */
  pins: { x: number; y: number }[];
};

// 지도 1px = 몇 m 인지. 플레이그라운드 기본 500m 원이 화면에 알맞게 담기는 값.
const M_PER_PX = 3.4;
const MAP_H = 360;
const MAX_PINS = 10;

export const defaultZone = (radius: number): ZoneDraft => ({
  mode: "circle",
  center: { x: 50, y: 50 },
  radius,
  pins: [],
});

const toPx = (m: number) => m / M_PER_PX;

// % 좌표 → px (지도 393 x 360 기준)
const pxOf = (p: { x: number; y: number }) => ({
  x: (p.x / 100) * 393,
  y: (p.y / 100) * MAP_H,
});

// 꼭짓점을 무게중심 각도로 정렬 - 앱과 같은 방식으로 자기교차 없는
// 단순 다각형 미리보기를 만든다 (pin_zone_setting_widget.dart)
function sortByAngle(pins: { x: number; y: number }[]) {
  if (pins.length < 3) return pins;
  const cx = pins.reduce((s, p) => s + p.x, 0) / pins.length;
  const cy = pins.reduce((s, p) => s + p.y, 0) / pins.length;
  return [...pins].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );
}

// 점이 다각형 안에 있는지 (ray casting)
function insidePolygon(p: { x: number; y: number }, poly: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// 다각형 넓이(m²) - shoelace. 확인 화면의 "면적" 값에 쓴다
export function polygonAreaM2(pins: { x: number; y: number }[]) {
  const pts = sortByAngle(pins).map(pxOf);
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2) * M_PER_PX * M_PER_PX;
}

// 앱의 반경 표기 (zone_metric_formatter.dart)
export function formatRadius(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)}km` : `${Math.round(m)}m`;
}
export function formatArea(m2: number) {
  return m2 >= 1_000_000
    ? `${(m2 / 1_000_000).toFixed(2)}km²`
    : `${Math.round(m2).toLocaleString()}m²`;
}

// 구역 설정 화면 (setup_playground_page.dart / setup_prison_page.dart 실측).
// 플레이그라운드는 거리/핀 토글이 있고, 감옥은 플레이그라운드의 방식을
// 따라가며 빨간 테마 + 범위 검증이 붙는다.
export function DemoZoneSetup({
  variant,
  playground,
  initial,
  onBack,
  onDone,
}: {
  variant: "playground" | "jail";
  /** jail 화면에서 참고로 그리는 플레이그라운드 */
  playground?: ZoneDraft;
  initial: ZoneDraft;
  onBack: () => void;
  onDone: (zone: ZoneDraft) => void;
}) {
  const { app } = useDemoCopy();
  const isJail = variant === "jail";
  const [mode, setMode] = useState<ZoneDraft["mode"]>(
    isJail ? (playground?.mode ?? "circle") : initial.mode,
  );
  const [center, setCenter] = useState(initial.center);
  const [radius, setRadius] = useState(initial.radius);
  const [pins, setPins] = useState(initial.pins);

  const theme = isJail
    ? { main: appColors.red, stroke: appColors.red800, track: appColors.red100 }
    : { main: appColors.blue, stroke: appColors.blue800, track: appColors.blue100 };
  const minR = isJail ? 5 : 100;
  const maxR = isJail ? 300 : 1000;

  // 감옥이 플레이그라운드 안에 있는지 (거리+반경 / 꼭짓점 포함 검사)
  const jailInside = (() => {
    if (!isJail || !playground) return true;
    if (mode === "circle") {
      if (playground.mode === "polygon") {
        const poly = sortByAngle(playground.pins);
        return poly.length >= 3 && insidePolygon(center, poly);
      }
      const c = pxOf(center);
      const p = pxOf(playground.center);
      return Math.hypot(c.x - p.x, c.y - p.y) + toPx(radius) <= toPx(playground.radius);
    }
    const poly = sortByAngle(playground.pins);
    if (playground.mode === "circle") {
      const p = pxOf(playground.center);
      return pins.every((pin) => {
        const q = pxOf(pin);
        return Math.hypot(q.x - p.x, q.y - p.y) <= toPx(playground.radius);
      });
    }
    return poly.length >= 3 && pins.every((pin) => insidePolygon(pin, poly));
  })();

  const canComplete =
    mode === "circle" ? jailInside : pins.length >= 3 && jailInside;
  const showJailWarning = isJail && !jailInside && (mode === "circle" || pins.length >= 3);

  const onMapClick = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
    if (mode === "circle") {
      // 앱은 지도를 끌어 중심을 맞춘다 - 데모는 탭한 곳이 중심이 된다
      if (isJail) setCenter(p);
      return;
    }
    if (pins.length >= MAX_PINS) return;
    setPins((prev) => [...prev, p]);
  };

  // 우하단 정보 칩 (info_radius_chip.dart: 높이 40, radius 12).
  // 반경 칩은 앱처럼 폭 110 고정, 면적 칩은 내용만큼 넓어진다
  const infoChip = (label: string, value: string, fixedWidth = false) => (
    <div
      className={`absolute bottom-[16px] right-[20px] flex h-[40px] items-center rounded-[12px] px-[14px] ${
        fixedWidth ? "w-[110px] justify-between" : "gap-[8px]"
      }`}
      style={{ backgroundColor: theme.main }}
    >
      <span className="text-[14px] text-white">{label}</span>
      <span className="text-[16px] font-semibold text-white">{value}</span>
    </div>
  );

  const drawCircle = (
    at: { x: number; y: number },
    r: number,
    colors: { main: string; stroke: string },
    reference = false,
  ) => (
    <span
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
      style={{
        left: `${at.x}%`,
        top: `${at.y}%`,
        width: toPx(r) * 2,
        height: toPx(r) * 2,
        borderColor: colors.stroke,
        backgroundColor: reference ? `${colors.main}14` : `${colors.main}33`,
      }}
    />
  );

  const drawPolygon = (
    points: { x: number; y: number }[],
    colors: { main: string; stroke: string },
    reference = false,
  ) => {
    if (points.length < 2) return null;
    const sorted = sortByAngle(points).map(pxOf);
    return (
      <svg
        viewBox={`0 0 393 ${MAP_H}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <polygon
          points={sorted.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={reference ? `${colors.main}14` : `${colors.main}33`}
          stroke={colors.stroke}
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ backgroundColor: appColors.white }}>
      <DemoStepBar current={isJail ? 1 : 0} onBack={onBack} />

      {/* 거리/핀 토글 (segmented_toggle.dart: 350x40, pill, 흰 선택 세그먼트) -
          감옥은 플레이그라운드의 방식을 따라가므로 토글이 없다 */}
      {!isJail && (
        <div className="mt-[20px] flex shrink-0 justify-center">
          <div
            className="flex h-[40px] w-[350px] rounded-full p-[5px]"
            style={{ backgroundColor: appColors.black100 }}
          >
            {(["circle", "polygon"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-1 rounded-full text-[14px] font-semibold transition-colors"
                style={{
                  backgroundColor: mode === m ? appColors.white : "transparent",
                  color: mode === m ? appColors.black : appColors.black400,
                }}
              >
                {m === "circle" ? app.byDistance : app.byPin}
              </button>
            ))}
          </div>
        </div>
      )}

      <p
        className="mt-[20px] shrink-0 px-[24px] text-[16px] font-medium"
        style={{ color: appColors.black }}
      >
        {isJail
          ? mode === "polygon"
            ? app.jailPinDesc
            : app.jailDesc
          : mode === "polygon"
            ? app.playgroundPinDesc
            : app.playgroundDesc}
      </p>

      {/* 지도 (zone_setting_widget.dart: 높이 360, 반경 칩 우하단, 내 위치 좌하단) */}
      <div
        className="relative mt-[20px] shrink-0 touch-none overflow-hidden"
        style={{ height: MAP_H }}
        onPointerDown={onMapClick}
      >
        <FakeMap />

        {/* 감옥 화면에서는 플레이그라운드가 참고로 깔린다 */}
        {isJail &&
          playground &&
          (playground.mode === "circle"
            ? drawCircle(playground.center, playground.radius, { main: appColors.blue, stroke: appColors.blue800 }, true)
            : drawPolygon(playground.pins, { main: appColors.blue, stroke: appColors.blue800 }, true))}

        {mode === "circle" ? (
          <>
            {drawCircle(center, radius, theme)}
            {/* 중심점 (앱: 20x20) */}
            <span
              className="pointer-events-none absolute size-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white"
              style={{ left: `${center.x}%`, top: `${center.y}%`, backgroundColor: theme.main }}
            />
          </>
        ) : (
          <>
            {drawPolygon(pins, theme)}
            {/* 핀 - 탭하면 삭제 (앱과 동일) */}
            {pins.map((pin, i) => (
              <button
                key={i}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setPins((prev) => prev.filter((_, j) => j !== i))}
                className="absolute size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, backgroundColor: theme.main }}
              />
            ))}
          </>
        )}

        {/* 핀 전체 해제 칩 (action_chip.dart: 높이 40, radius 12, X 아이콘 16) */}
        {mode === "polygon" && pins.length > 0 && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setPins([])}
            className="absolute right-[20px] top-[16px] flex h-[40px] items-center gap-[6px] rounded-[12px] px-[12px] transition-transform active:scale-95"
            style={{ backgroundColor: theme.main }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M3.5 3.5 12.5 12.5 M12.5 3.5 3.5 12.5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[16px] font-semibold text-white">
              {app.clearAllPins}
            </span>
          </button>
        )}

        {/* 핀 3개부터 면적 칩 (pin_zone_setting_widget.dart 우하단) */}
        {mode === "polygon" &&
          pins.length >= 3 &&
          infoChip(app.areaLabel, formatArea(polygonAreaM2(pins)))}

        {/* 내 위치 버튼 (40, 아이콘 24, radius 12, 좌하단 16/20) */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-[16px] left-[20px] flex size-[40px] items-center justify-center rounded-[12px] shadow-[1px_1px_8px_rgba(8,10,12,0.1)]"
          style={{ backgroundColor: appColors.white }}
        >
          <span
            className="size-[24px]"
            style={{
              backgroundColor: theme.main,
              WebkitMask: "url(/demo/mage_location-fill.svg) center / contain no-repeat",
              mask: "url(/demo/mage_location-fill.svg) center / contain no-repeat",
            }}
          />
        </button>

        {/* 반경 칩 (우하단 16/20) */}
        {mode === "circle" && infoChip(app.radiusLabel, formatRadius(radius), true)}
      </div>

      {/* 반경 슬라이더 (원형 모드 전용, 트랙 활성 blue800/red800) */}
      {mode === "circle" && (
        <div className="mt-[20px] shrink-0 px-[20px]">
          <input
            type="range"
            min={minR}
            max={maxR}
            step={10}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="demo-range w-full"
            style={
              {
                "--range-fill": theme.stroke,
                "--range-track": theme.track,
                "--range-thumb": theme.main,
                "--range-pct": `${((radius - minR) / (maxR - minR)) * 100}%`,
              } as React.CSSProperties
            }
          />
        </div>
      )}

      <div className="min-h-0 flex-1" />

      {showJailWarning && (
        <p className="shrink-0 px-[24px] text-center text-[13px]" style={{ color: appColors.red }}>
          {app.jailOutside}
        </p>
      )}

      {/* 완료 (app_button.dart: 56, radius 12) */}
      <div className="shrink-0 p-[20px]">
        <button
          type="button"
          disabled={!canComplete}
          onClick={() => onDone({ mode, center, radius, pins })}
          className="flex h-[56px] w-full items-center justify-center rounded-[12px] text-[16px] font-semibold text-white transition-transform active:scale-95"
          style={{ backgroundColor: canComplete ? theme.main : appColors.black200 }}
        >
          {app.done}
        </button>
      </div>
    </div>
  );
}
