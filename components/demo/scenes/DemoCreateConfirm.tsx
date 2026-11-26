"use client";

import Image from "next/image";
import { appColors } from "@/lib/app-tokens";
import {
  SHRINK_JAIL_MARGIN_M,
  shrinkFinalRadius,
  type DemoSettingFieldId,
} from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";
import { DemoStepBar, DemoCreateHeader } from "./DemoCreateParts";
import {
  type ZoneDraft,
  formatRadius,
  formatArea,
  polygonAreaM2,
} from "./DemoZoneSetup";
import type { SettingValues } from "./DemoCreateBasic";

// 구역 축소를 켤 수 있는지 (shrink_schedule.dart shrinkLockFor)
export function shrinkLockOf(zone: ZoneDraft, jail: ZoneDraft) {
  if (zone.mode !== "circle") return "notCircle" as const;
  const jailRadius = jail.mode === "circle" ? Math.round(jail.radius) : 0;
  return Math.round(zone.radius) <= jailRadius + SHRINK_JAIL_MARGIN_M
    ? ("tooSmall" as const)
    : null;
}

// 최종 확인 (session_creation_flow_page.dart의 confirm 단계 실측).
// 4.0.1 부터 기본 정보를 따로 묻지 않고 추천값을 채워 둔다. 맨 위가 구역 축소
// 카드(shrink_toggle_card.dart), 그 아래 구역 카드와 설정 카드이고, 행을 탭하면
// 그 항목을 고치러 간다.
export function DemoCreateConfirm({
  zone,
  jail,
  settings,
  shrink,
  onShrinkChange,
  onBack,
  onEditZone,
  onEditSetting,
  onCreate,
}: {
  zone: ZoneDraft;
  jail: ZoneDraft;
  settings: SettingValues;
  shrink: boolean;
  onShrinkChange: (on: boolean) => void;
  onBack: () => void;
  onEditZone: () => void;
  onEditSetting: (field: DemoSettingFieldId) => void;
  onCreate: () => void;
}) {
  const { app } = useDemoCopy();

  // 앱의 metricText: 원형은 "반경 500m", 핀은 "면적 12,345m²"
  const metricOf = (z: ZoneDraft) =>
    z.mode === "circle"
      ? app.radiusValue(formatRadius(z.radius))
      : app.areaValue(formatArea(polygonAreaM2(z.pins)));

  const lock = shrinkLockOf(zone, jail);
  const on = shrink && lock === null;
  const shrinkDesc =
    lock === "notCircle"
      ? app.shrinkLockNotCircle
      : lock === "tooSmall"
        ? app.shrinkLockTooSmall
        : on
          ? app.shrinkDescOn(
              formatRadius(zone.radius),
              formatRadius(
                shrinkFinalRadius(
                  Math.round(zone.radius),
                  jail.mode === "circle" ? Math.round(jail.radius) : 0,
                ),
              ),
            )
          : app.shrinkDescOff;

  const card = (
    title: string,
    rows: { label: string; value: string; onEdit: () => void }[],
  ) => (
    <div
      className="rounded-[20px] border px-[24px] py-[16px]"
      style={{ backgroundColor: appColors.white, borderColor: appColors.black100 }}
    >
      <p className="text-[16px] font-semibold" style={{ color: appColors.black }}>
        {title}
      </p>
      <div className="mt-[12px] flex flex-col gap-[12px]">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={row.onEdit}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-[14px]" style={{ color: appColors.black800 }}>
              {row.label}
            </span>
            <span className="flex items-center gap-[6px]">
              <span className="text-[14px] font-semibold" style={{ color: appColors.black }}>
                {row.value}
              </span>
              <Image
                src="/demo/icon_previous.svg"
                alt=""
                width={16}
                height={16}
                className="rotate-180 opacity-40"
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ backgroundColor: appColors.white }}>
      <DemoStepBar current={2} onBack={onBack} />
      <DemoCreateHeader title={app.reviewTitle} hint={app.reviewHint} />

      <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto px-[20px]">
        {/* 구역 축소 카드. 잠기면(핀 구역, 작은 구역) 글자와 스위치가 흐려진다 */}
        <button
          type="button"
          disabled={lock !== null}
          onClick={() => onShrinkChange(!on)}
          role="switch"
          aria-checked={on}
          className="flex items-center gap-[12px] rounded-[20px] border px-[24px] py-[20px] text-left"
          style={{ backgroundColor: appColors.white, borderColor: appColors.black100 }}
        >
          <span className="min-w-0 flex-1">
            <span
              className="block text-[16px] font-semibold"
              style={{ color: lock ? appColors.black400 : appColors.black }}
            >
              {app.shrinkTitle}
            </span>
            <span
              className="mt-[8px] block truncate text-[12px]"
              style={{ color: lock ? appColors.black400 : appColors.black600 }}
            >
              {shrinkDesc}
            </span>
          </span>
          <span
            className="relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: on ? appColors.blueVer2Basic : appColors.black200,
              opacity: lock ? 0.4 : 1,
            }}
          >
            <span
              className="absolute top-[3px] size-[22px] rounded-full bg-white shadow transition-[left] duration-200"
              style={{ left: on ? 23 : 3 }}
            />
          </span>
        </button>

        {card(app.sectionZone, [
          { label: app.zonePlayground, value: metricOf(zone), onEdit: onEditZone },
          { label: app.zoneJail, value: metricOf(jail), onEdit: onEditZone },
        ])}
        {card(app.sectionSettings, [
          {
            label: app.fieldParticipants,
            value: app.maxPlayers(settings.participants),
            onEdit: () => onEditSetting("participants"),
          },
          {
            label: app.fieldRound,
            value: app.minutesValue(settings.roundDuration),
            onEdit: () => onEditSetting("roundDuration"),
          },
          {
            label: app.fieldShare,
            value: app.minutesValue(settings.locationShare),
            onEdit: () => onEditSetting("locationShare"),
          },
          {
            label: app.fieldPolice,
            value: `${app.policePrefix} ${app.minutesValue(settings.policeWait)} ${app.policeSuffix}`,
            onEdit: () => onEditSetting("policeWait"),
          },
        ])}
      </div>

      <div className="shrink-0 p-[20px]">
        <button
          type="button"
          onClick={onCreate}
          className="flex h-[56px] w-full items-center justify-center rounded-[12px] text-[18px] font-semibold text-white transition-transform active:scale-95"
          style={{ backgroundColor: appColors.blue }}
        >
          {app.createRoom}
        </button>
      </div>
    </div>
  );
}
