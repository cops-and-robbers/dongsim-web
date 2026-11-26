"use client";

import type { ReactNode } from "react";
import { appColors } from "@/lib/app-tokens";
import { useDemoCopy } from "../demo-copy";

// 확인 다이얼로그 (app_dialog.dart의 AppDialog.confirm 실측: 마진 36,
// radius 24, 제목 20 bold + 본문 14 black600, 닫기/확인 2버튼).
// 위험 동작(나가기)은 앱과 같이 빨강, [tone]="primary"(게임 시작)는 팀 색이다
// (app_dialog.dart: isDestructive ? red : 경찰 blue / 도둑 green).
// [children] 은 앱의 customContent 자리 - 본문 아래에 들어간다.
// [dark] 는 도둑 시점 - 카드가 검정이 되고 글자 단이 뒤집힌다 (실측).
export function DemoConfirmDialog({
  title,
  message,
  confirmText,
  dark = false,
  tone = "danger",
  children,
  onCancel,
  onConfirm,
}: {
  title: string;
  message?: string;
  confirmText: string;
  dark?: boolean;
  tone?: "danger" | "primary";
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { app } = useDemoCopy();
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-[36px]">
      <div
        className="w-full rounded-[24px] px-[12px] pb-[16px] pt-[24px]"
        style={{ backgroundColor: dark ? appColors.black : appColors.white }}
      >
        <p
          className="px-[4px] text-center text-[20px] font-bold"
          style={{ color: dark ? appColors.white : appColors.black }}
        >
          {title}
        </p>
        {message && (
          <p
            className="mt-[12px] text-center text-[14px]"
            style={{ color: dark ? appColors.black300 : appColors.black600 }}
          >
            {message}
          </p>
        )}
        {children && <div className="mt-[20px]">{children}</div>}
        <div className="mt-[20px] flex gap-[8px] px-[4px]">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-[52px] flex-1 items-center justify-center rounded-[12px] text-[16px] font-semibold transition-transform active:scale-95"
            style={
              dark
                ? { backgroundColor: appColors.black800, color: appColors.black300 }
                : { backgroundColor: appColors.black100, color: appColors.black600 }
            }
          >
            {app.close}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-[52px] flex-1 items-center justify-center rounded-[12px] text-[16px] font-semibold transition-transform active:scale-95"
            style={
              tone === "danger"
                ? { backgroundColor: appColors.red, color: appColors.white }
                : dark
                  ? { backgroundColor: appColors.green, color: appColors.black }
                  : { backgroundColor: appColors.blue, color: appColors.white }
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
