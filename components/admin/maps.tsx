/// <reference types="google.maps" />
"use client";

import { useEffect } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// 키가 없을 때 레이아웃이 깨지지 않게 하는 폴백.
function MapFallback({
  height,
  title,
  detail,
}: {
  height: number;
  title: string;
  detail?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-sd-line bg-sd-fill text-center"
      style={{ height }}
    >
      <p className="text-[14px] font-bold text-sd-fg-subtle">
        {title}
      </p>
      {detail && (
        <p className="text-[12px] text-sd-fg-subtle">{detail}</p>
      )}
      <p className="mt-1 text-[11px] text-sd-fg-subtle">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 를 넣으면 지도가 표시돼요
      </p>
    </div>
  );
}

// ── 게임 구역 지도 (원형 CIRCLE / 다각형 POLYGON 둘 다 지원) ──
type LatLng = { readonly latitude: number; readonly longitude: number };
// Relay 널러블(= T | null | undefined)과 enum union을 그대로 받는다.
type Nullable<T> = T | null | undefined;
type Area = {
  readonly areaType: string;
  // CIRCLE 전용 (POLYGON이면 null)
  readonly playgroundCenterLat: Nullable<number>;
  readonly playgroundCenterLng: Nullable<number>;
  readonly playgroundRadiusInMeters: Nullable<number>;
  readonly jailCenterLat: Nullable<number>;
  readonly jailCenterLng: Nullable<number>;
  readonly jailRadiusInMeters: Nullable<number>;
  // POLYGON 전용 (CIRCLE이면 null)
  readonly playgroundPolygon: Nullable<readonly LatLng[]>;
  readonly jailPolygon: Nullable<readonly LatLng[]>;
};

const PLAYGROUND_STYLE = {
  strokeColor: "#3f63d9",
  strokeWeight: 2,
  fillColor: "#3f63d9",
  fillOpacity: 0.1,
} as const;
const JAIL_STYLE = {
  strokeColor: "#fa342c",
  strokeWeight: 2,
  fillColor: "#fa342c",
  fillOpacity: 0.18,
} as const;

const toPath = (poly: readonly LatLng[]) =>
  poly.map((p) => ({ lat: p.latitude, lng: p.longitude }));

function AreaLayer({ area }: { area: Area }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const shapes: { setMap(m: google.maps.Map | null): void }[] = [];
    const bounds = new google.maps.LatLngBounds();

    if (area.areaType === "POLYGON" && area.playgroundPolygon) {
      const pgPath = toPath(area.playgroundPolygon);
      shapes.push(
        new google.maps.Polygon({ map, paths: pgPath, ...PLAYGROUND_STYLE })
      );
      pgPath.forEach((p) => bounds.extend(p));
      if (area.jailPolygon) {
        const jailPath = toPath(area.jailPolygon);
        shapes.push(
          new google.maps.Polygon({ map, paths: jailPath, ...JAIL_STYLE })
        );
        jailPath.forEach((p) => bounds.extend(p));
      }
    } else if (
      area.playgroundCenterLat != null &&
      area.playgroundCenterLng != null &&
      area.playgroundRadiusInMeters != null
    ) {
      const pg = { lat: area.playgroundCenterLat, lng: area.playgroundCenterLng };
      const playground = new google.maps.Circle({
        map,
        center: pg,
        radius: area.playgroundRadiusInMeters,
        ...PLAYGROUND_STYLE,
      });
      shapes.push(playground);
      const pgBounds = playground.getBounds();
      if (pgBounds) bounds.union(pgBounds);

      if (
        area.jailCenterLat != null &&
        area.jailCenterLng != null &&
        area.jailRadiusInMeters != null
      ) {
        const jail = { lat: area.jailCenterLat, lng: area.jailCenterLng };
        shapes.push(
          new google.maps.Circle({
            map,
            center: jail,
            radius: area.jailRadiusInMeters,
            ...JAIL_STYLE,
          })
        );
        shapes.push(
          new google.maps.Marker({
            map,
            position: jail,
            title: "감옥",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: "#fa342c",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
          })
        );
        bounds.extend(jail);
      }
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);

    return () => shapes.forEach((s) => s.setMap(null));
  }, [map, area]);
  return null;
}

// 지도 초기 중심: 원형이면 놀이터 중심, 다각형이면 첫 좌표.
function areaCenter(area: Area): google.maps.LatLngLiteral {
  if (area.playgroundCenterLat != null && area.playgroundCenterLng != null) {
    return { lat: area.playgroundCenterLat, lng: area.playgroundCenterLng };
  }
  const first = area.playgroundPolygon?.[0];
  if (first) return { lat: first.latitude, lng: first.longitude };
  return { lat: 36.5, lng: 127.8 };
}

export function GameAreaMap({ area }: { area: Area }) {
  if (!KEY) {
    const detail =
      area.areaType === "POLYGON"
        ? `다각형 구역 (놀이터 ${area.playgroundPolygon?.length ?? 0}점)`
        : `놀이터 ${area.playgroundRadiusInMeters ?? "-"}m · 감옥 ${area.jailRadiusInMeters ?? "-"}m`;
    return <MapFallback height={300} title="게임 구역" detail={detail} />;
  }
  return (
    <div className="overflow-hidden rounded-xl" style={{ height: 300 }}>
      <APIProvider apiKey={KEY}>
        <Map
          defaultCenter={areaCenter(area)}
          defaultZoom={16}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          style={{ width: "100%", height: "100%" }}
        >
          <AreaLayer area={area} />
        </Map>
      </APIProvider>
    </div>
  );
}

// ── 게임 위치 분포 지도 (클러스터링: 줌 레벨에 따라 겹치는 마커를 묶음) ──
type GamePoint = {
  gameId: string;
  inviteCode: string;
  lat: number;
  lng: number;
};

// 클러스터 버블: 개수만큼 커지는 accent 원 + 카운트 라벨.
const clusterRenderer: import("@googlemaps/markerclusterer").Renderer = {
  render: ({ count, position }) =>
    new google.maps.Marker({
      position,
      label: {
        text: String(count),
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "700",
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 15 + Math.min(count, 40) * 0.45,
        fillColor: "#3f63d9",
        fillOpacity: 0.9,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 1000 + count,
    }),
};

function ClusterLayer({ points }: { points: readonly GamePoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    let clusterer: import("@googlemaps/markerclusterer").MarkerClusterer | null =
      null;
    let cancelled = false;

    // 개별 게임 마커 - 확대 시 클러스터가 풀리면 이게 보인다.
    const markers = points.map(
      (p) =>
        new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          title: p.inviteCode,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#3f63d9",
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
          },
        })
    );

    import("@googlemaps/markerclusterer").then(({ MarkerClusterer }) => {
      if (cancelled) return;
      clusterer = new MarkerClusterer({
        map,
        markers,
        renderer: clusterRenderer,
      });
    });

    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 72);

    return () => {
      cancelled = true;
      clusterer?.clearMarkers();
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, points]);
  return null;
}

export function GameDistributionMap({
  points,
}: {
  points: readonly GamePoint[];
}) {
  if (!KEY) {
    return (
      <MapFallback
        height={320}
        title="게임 위치 분포"
        detail={`${points.length}개 게임 위치`}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl" style={{ height: 320 }}>
      <APIProvider apiKey={KEY}>
        <Map
          defaultCenter={{ lat: 36.5, lng: 127.8 }}
          defaultZoom={7}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          style={{ width: "100%", height: "100%" }}
        >
          <ClusterLayer points={points} />
        </Map>
      </APIProvider>
    </div>
  );
}
