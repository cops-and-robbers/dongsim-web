"use client";

import { useRef, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import {
  DEMO_SETTING_FIELDS,
  type DemoSettingFieldId,
} from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";
import { DemoStepBar, DemoCreateHeader, BackspaceIcon } from "./DemoCreateParts";

export type SettingValues = Record<DemoSettingFieldId, number>;

export const defaultSettings = (): SettingValues =>
  Object.fromEntries(
    DEMO_SETTING_FIELDS.map((f) => [f.id, f.initial]),
  ) as SettingValues;

// 설정 항목 고치기 (basic_settings_form.dart + number_pad.dart 실측).
// 4.0.1 부터 기본 정보를 따로 묻지 않고, 최종 확인에서 행을 누르면 이 화면이
// 열린다. 네 항목이 모두 펼쳐진 채 [editTarget]만 키패드가 겨냥하고,
// 확인 한 번으로 돌아간다. 다른 카드를 탭하면 키패드가 그 항목을 겨냥한다.
export function DemoCreateBasic({
  initial,
  editTarget,
  onBack,
  onDone,
}: {
  initial: SettingValues;
  editTarget: DemoSettingFieldId;
  onBack: () => void;
  onDone: (values: SettingValues) => void;
}) {
  const { app } = useDemoCopy();
  const [values, setValues] = useState(initial);
  const revealed = DEMO_SETTING_FIELDS.length;
  const [activeId, setActiveId] = useState<DemoSettingFieldId>(editTarget);
  // 키패드로 건드린 항목 - 안 건드린 활성 항목은 값이 흐리게 보인다.
  // ref 미러는 빠른 연타에서도 직전 입력을 정확히 보기 위한 것
  const [touched, setTouched] = useState<Set<DemoSettingFieldId>>(new Set());
  const touchedRef = useRef<Set<DemoSettingFieldId>>(new Set());

  const fieldOf = (id: DemoSettingFieldId) =>
    DEMO_SETTING_FIELDS.find((f) => f.id === id)!;
  const active = fieldOf(activeId);

  const labelOf = (id: DemoSettingFieldId) =>
    ({
      participants: app.fieldParticipants,
      roundDuration: app.fieldRound,
      locationShare: app.fieldShare,
      policeWait: app.fieldPolice,
    })[id];
  const unitOf = (id: DemoSettingFieldId) =>
    id === "participants" ? app.unitPerson : app.unitMinutes;

  const markTouched = (id: DemoSettingFieldId) => {
    touchedRef.current.add(id);
    setTouched(new Set(touchedRef.current));
  };

  const onDigit = (d: number) => {
    const f = fieldOf(activeId);
    // 처음 누르면 그 숫자부터 새로 쓴다 (앱 키패드 동작)
    const wasTouched = touchedRef.current.has(activeId);
    setValues((prev) => ({
      ...prev,
      [activeId]: Math.min(f.max, wasTouched ? prev[activeId] * 10 + d : d),
    }));
    markTouched(activeId);
  };
  const onQuickAdd = (amount: number) => {
    const f = fieldOf(activeId);
    setValues((prev) => ({
      ...prev,
      [activeId]: Math.min(f.max, prev[activeId] + amount),
    }));
    markTouched(activeId);
  };
  const onBackspace = () => {
    setValues((prev) => ({ ...prev, [activeId]: Math.floor(prev[activeId] / 10) }));
    markTouched(activeId);
  };

  const ctaEnabled = DEMO_SETTING_FIELDS.every(
    (f) => values[f.id] >= f.min && values[f.id] <= f.max,
  );

  const onCta = () => onDone(values);

  // 카드 아래 안내/경고 줄 (game_setting_values_editor.dart의 힌트 규칙)
  const hintOf = (id: DemoSettingFieldId): { text: string; warning: boolean } | null => {
    const f = fieldOf(id);
    const v = values[id];
    if (v < f.min || v > f.max)
      return { text: id === "participants" ? app.participantsHint : "", warning: true };
    if (id === "participants") return { text: app.participantsHint, warning: false };
    if (id === "locationShare" && v === 0)
      return { text: app.noShareWarning, warning: false };
    return null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ backgroundColor: appColors.white }}>
      <DemoStepBar current={2} onBack={onBack} />
      <DemoCreateHeader title={app.basicTitle} hint={app.basicHint} />

      {/* 답한 카드들 - 새 질문이 위에 온다 (setting_field_card.dart) */}
      <div className="flex min-h-0 flex-1 flex-col gap-[8px] overflow-y-auto px-[20px] py-[4px]">
        {DEMO_SETTING_FIELDS.slice(0, revealed)
          .slice()
          .reverse()
          .map((f) => {
            const isActive = f.id === activeId;
            const hint = hintOf(f.id);
            const dimmed = isActive && !touched.has(f.id);
            const textColor = isActive ? appColors.black : appColors.black400;
            const valueColor = dimmed ? appColors.black300 : textColor;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => (isActive ? undefined : setActiveId(f.id))}
                className="w-full rounded-[20px] border px-[24px] py-[16px] text-left"
                style={{ backgroundColor: appColors.white, borderColor: appColors.black100 }}
              >
                <span className="flex h-[24px] items-center">
                  <span className="flex-1 truncate text-[16px] font-semibold" style={{ color: textColor }}>
                    {labelOf(f.id)}
                  </span>
                  {f.id === "policeWait" && (
                    <span className="text-[14px]" style={{ color: valueColor }}>
                      {app.policePrefix}&nbsp;
                    </span>
                  )}
                  <span className="text-[14px] font-bold" style={{ color: valueColor }}>
                    {values[f.id]}
                    {unitOf(f.id)}
                  </span>
                  {f.id === "policeWait" && (
                    <span className="text-[14px]" style={{ color: valueColor }}>
                      &nbsp;{app.policeSuffix}
                    </span>
                  )}
                </span>
                {isActive && hint?.text && (
                  <span
                    className="mt-[6px] block text-[12px]"
                    style={{ color: hint.warning ? appColors.red : appColors.black400 }}
                  >
                    {hint.text}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* 키패드 위 CTA (keypad_cta_button.dart: 높이 56) */}
      <button
        type="button"
        disabled={!ctaEnabled}
        onClick={onCta}
        className="flex h-[56px] w-full shrink-0 items-center justify-center text-[18px] font-semibold"
        style={{
          backgroundColor: ctaEnabled ? appColors.blue : appColors.black200,
          color: ctaEnabled ? appColors.white : appColors.black400,
        }}
      >
        {app.confirm}
      </button>

      {/* 키패드 (number_pad.dart: 높이 361, 배경 #F4FAFF, 빠른 추가 칩 3개) */}
      <div
        className="flex h-[300px] shrink-0 flex-col pt-[14px]"
        style={{ backgroundColor: appColors.background }}
      >
        <div className="flex shrink-0 gap-[5px] px-[20px]">
          {active.quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onQuickAdd(amount)}
              className="flex h-[34px] flex-1 items-center justify-center gap-[5px] rounded-[9px] text-[14px] font-semibold transition-transform active:scale-95"
              style={{ backgroundColor: appColors.blueVer2_70, color: appColors.black700 }}
            >
              <span>+</span>
              <span>
                {amount}
                {unitOf(activeId)}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-[10px] grid min-h-0 flex-1 grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDigit(d)}
              className="flex items-center justify-center text-[26px] font-semibold active:opacity-60"
              style={{ color: appColors.black700 }}
            >
              {d}
            </button>
          ))}
          <span />
          <button
            type="button"
            onClick={() => onDigit(0)}
            className="flex items-center justify-center text-[26px] font-semibold active:opacity-60"
            style={{ color: appColors.black700 }}
          >
            0
          </button>
          <button
            type="button"
            onClick={onBackspace}
            className="flex items-center justify-center active:opacity-60"
          >
            <BackspaceIcon color={appColors.black700} />
          </button>
        </div>
      </div>
    </div>
  );
}
