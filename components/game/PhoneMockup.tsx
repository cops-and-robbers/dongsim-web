"use client";

import { ReactNode } from "react";

// 목업 화면들은 앱 실측값 기반으로 mockups/ 아래에 분리되어 있다.
// 기존 import 경로를 유지하기 위해 여기서 재수출한다.
export { ZoneMockup } from "./mockups/ZoneMockup";
export { LocationMockup } from "./mockups/LocationMockup";
export { QrMockup } from "./mockups/QrMockup";
export { ChatMockup } from "./mockups/ChatMockup";
// v3 출시와 함께 배치할 화면들 (#67) - 컴포넌트만 준비, 페이지 배치는 출시 시점에
export { CreateRoomMockup } from "./mockups/CreateRoomMockup";
export {
  CommunityChatMockup,
  CommunityListMockup,
} from "./mockups/CommunityMockup";

// 폰 프레임 - 목업을 감싸는 기기 베젤. 다크 페이지에서는 베젤이 배경에
// 묻히지 않도록 밝은 외곽선을 한 겹 더 준다.
// [clock] 은 상태바 시각 - 데모처럼 실제 시각을 띄우고 싶을 때 넘긴다.
// [darkStatus] 는 상태바 뒤가 어두운 화면(도둑 인게임 등)일 때 시각을
// 밝은 톤으로 뒤집는다 - 검정 위 slate-600은 읽히지 않는다.
export function PhoneFrame({
  children,
  className = "",
  clock = "9:41",
  darkStatus = false,
}: {
  children: ReactNode;
  className?: string;
  clock?: string;
  darkStatus?: boolean;
}) {
  return (
    <div
      className={`relative mx-auto aspect-9/19 w-full max-w-75 rounded-[2.5rem] bg-slate-900 p-2 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/5 dark:ring-white/15 ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-4xl bg-white">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
        <div
          className={`absolute left-0 right-0 top-0 z-10 flex h-9 items-center justify-between px-6 pt-2 text-[10px] font-semibold ${
            darkStatus ? "text-white/80" : "text-slate-600"
          }`}
        >
          <span>{clock}</span>
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`inline-block h-1 w-1 rounded-full ${
                  darkStatus ? "bg-white/50" : "bg-slate-400"
                }`}
              />
            ))}
          </span>
        </div>
        <div className="absolute inset-0 pt-10">{children}</div>
        {/* 홈 인디케이터 - 화면 하단 세이프 에어리어의 실제 주인.
            밝은 화면·어두운 화면 어디서든 보이도록 중간 톤 반투명으로 둔다 */}
        <div className="absolute bottom-2 left-1/2 z-10 h-1 w-24 -translate-x-1/2 rounded-full bg-slate-500/60" />
      </div>
    </div>
  );
}
