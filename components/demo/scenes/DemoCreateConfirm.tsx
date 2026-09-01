"use client";

import Image from "next/image";
import { appColors } from "@/lib/app-tokens";
import { useDemoCopy } from "../demo-copy";
import { DemoStepBar, DemoCreateHeader } from "./DemoCreateParts";
import {
  type ZoneDraft,
  formatRadius,
  formatArea,
  polygonAreaM2,
} from "./DemoZoneSetup";
import type { SettingValues } from "./DemoCreateBasic";

// 최종 확인 (session_creation_flow_page.dart의 confirm 단계 실측:
// 구역 카드 + 설정 카드, 행을 탭하면 해당 화면으로 고치러 간다).
export function DemoCreateConfirm({
  zone,
  jail,
  settings,
  onBack,
  onEditZone,
  onEditSettings,
  onCreate,
}: {
  zone: ZoneDraft;
  jail: ZoneDraft;
  settings: SettingValues;
  onBack: () => void;
  onEditZone: () => void;
  onEditSettings: () => void;
  onCreate: () => void;
}) {
  const { app } = useDemoCopy();

  // 앱의 metricText: 원형은 "반경 500m", 핀은 "면적 12,345m²"
  const metricOf = (z: ZoneDraft) =>
    z.mode === "circle"
      ? app.radiusValue(formatRadius(z.radius))
      : app.areaValue(formatArea(polygonAreaM2(z.pins)));

  const card = (
    title: string,
    rows: { label: string; value: string }[],
    onEdit: () => void,
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
            onClick={onEdit}
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
        {card(
          app.sectionZone,
          [
            { label: app.zonePlayground, value: metricOf(zone) },
            { label: app.zoneJail, value: metricOf(jail) },
          ],
          onEditZone,
        )}
        {card(
          app.sectionSettings,
          [
            { label: app.fieldParticipants, value: app.maxPlayers(settings.participants) },
            { label: app.fieldRound, value: app.minutesValue(settings.roundDuration) },
            { label: app.fieldShare, value: app.minutesValue(settings.locationShare) },
            {
              label: app.fieldPolice,
              value: `${app.policePrefix} ${app.minutesValue(settings.policeWait)} ${app.policeSuffix}`,
            },
          ],
          onEditSettings,
        )}
      </div>

      <div className="shrink-0 p-[20px]">
        <button
          type="button"
          onClick={onCreate}
          className="flex h-[56px] w-full items-center justify-center rounded-[12px] text-[16px] font-semibold text-white transition-transform active:scale-95"
          style={{ backgroundColor: appColors.blue }}
        >
          {app.createRoom}
        </button>
      </div>
    </div>
  );
}
