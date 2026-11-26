"use client";

import type { ComponentProps } from "react";
import { GameAreaMap } from "@/components/admin/maps";
import { Panel } from "@/components/admin/split/SplitParts";

type Area = ComponentProps<typeof GameAreaMap>["area"];

/**
 * 위치 카드 (#315). 게임은 실제 장소에서 해서 어디서 했는지가 가장 먼저 확인하는 정보라 상세 맨 위에 크게 둔다.
 * 지도 위에 동네 이름, 구역 크기, 감옥을 칩으로 얹는다. 동네 이름은 BE #241 이 나가기 전이거나 아직 못 찾았으면 칩만 빠진다
 */
export function AreaCard({ area, placeName, shrinkTo, emptyText = "위치 기록이 없어요." }: { area: Area | null | undefined; placeName: string | null; shrinkTo?: number | null; emptyText?: string }) {
  if (!area)
    return (
      <Panel title="위치">
        <p className="text-[13.5px] text-sd-fg-subtle">{emptyText}</p>
      </Panel>
    );
  const hasJail = area.areaType === "POLYGON" ? (area.jailPolygon?.length ?? 0) > 0 : area.jailCenterLat != null && area.jailRadiusInMeters != null;
  const size = area.areaType === "CIRCLE" && area.playgroundRadiusInMeters != null ? `구역 반경 ${area.playgroundRadiusInMeters}m` : "다각형 구역";
  return (
    <section aria-label={placeName ? `${placeName} 게임 구역` : "게임 구역"} className="relative overflow-hidden rounded-[18px] bg-sd-surface shadow-[0_1px_2px_rgba(2,32,71,0.04)]">
      <GameAreaMap area={area} height={260} flush />
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
        {placeName && <MapChip strong>{placeName}</MapChip>}
        <MapChip>{size}</MapChip>
        {shrinkTo != null && <MapChip>끝에는 {shrinkTo}m 로 줄어듦</MapChip>}
        {hasJail ? (
          <MapChip>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sd-critical align-[1px]" aria-hidden />
            감옥
          </MapChip>
        ) : (
          // 감옥 좌표는 2026-08-15 배포부터 쌓인다. 그 전 기록은 놀이터만 그려진다
          <MapChip>감옥 위치 기록 없음</MapChip>
        )}
      </div>
    </section>
  );
}

function MapChip({ strong, children }: { strong?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-lg bg-sd-surface/95 px-2.5 py-1 text-[12.5px] shadow-[0_1px_3px_rgba(2,32,71,0.12)] backdrop-blur ${
        strong ? "font-bold text-sd-fg" : "font-semibold text-sd-fg-muted"
      }`}
    >
      {children}
    </span>
  );
}
