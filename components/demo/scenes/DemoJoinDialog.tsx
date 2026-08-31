"use client";

import Image from "next/image";
import { useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { DEMO_ROOM_CODE } from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";

// 방 참여 다이얼로그 (home_page.dart의 AppDialog 실측: 라운드 24, 양옆 36,
// 텍스트필드 48 + QR 스캔 아이콘, 닫기/참여하기 2버튼). 코드는 6자리 대문자고
// 데모에서는 친구에게 받았다는 설정으로 미리 채워 둔다.
export function DemoJoinDialog({
  onClose,
  onJoin,
}: {
  onClose: () => void;
  onJoin: () => void;
}) {
  const { app } = useDemoCopy();
  const [code, setCode] = useState(DEMO_ROOM_CODE);
  const full = code.length === 6;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 px-[36px]">
      <div
        className="w-full rounded-[24px] px-[20px] pb-[20px] pt-[28px]"
        style={{ backgroundColor: appColors.white }}
      >
        <p
          className="text-center text-[20px] font-bold"
          style={{ color: appColors.black }}
        >
          {app.joinTitle}
        </p>
        <div className="h-[20px]" />
        <div
          className="flex h-[48px] items-center rounded-[12px] px-[16px]"
          style={{ backgroundColor: appColors.black100 }}
        >
          <input
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 6),
              )
            }
            placeholder={app.joinHint}
            className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none"
            style={{ color: appColors.black }}
          />
          <Image src="/demo/icon_camera.svg" alt="" width={24} height={24} className="opacity-40" />
        </div>
        <div className="h-[20px]" />
        <div className="flex gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-[52px] flex-1 items-center justify-center rounded-[12px] text-[16px] font-semibold transition-transform active:scale-95"
            style={{ backgroundColor: appColors.black100, color: appColors.black }}
          >
            {app.close}
          </button>
          <button
            type="button"
            disabled={!full}
            onClick={onJoin}
            className="flex h-[52px] flex-1 items-center justify-center rounded-[12px] text-[16px] font-semibold text-white transition-transform active:scale-95"
            style={{
              backgroundColor: full ? appColors.black : appColors.black200,
            }}
          >
            {app.join}
          </button>
        </div>
      </div>
    </div>
  );
}
