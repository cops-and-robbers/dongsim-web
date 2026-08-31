"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { DEMO_ROOM_CODE } from "@/lib/demo/scenes";
import { DemoConfirmDialog } from "./DemoConfirmDialog";
import { useDemoCopy } from "../demo-copy";

// 대기실 (waiting_room_page.dart 실측). 앱바 초대코드(밑줄 2px),
// 팀 섹션 = 아이콘 28 + 팀명 + n명, 카드 Wrap(간격 16, 좌30 우24 하20),
// 첫 칸이 + 슬롯(black100, icon_change)이고 카드는 팀 캐릭터 SVG 72x84 다.
// 팀 이동은 앱과 같이 상대 팀의 + 슬롯을 탭해서 한다.
const ME = "민첩한괴도5308";

type Member = { name: string; host?: boolean; ready?: boolean };

export function DemoWaitingRoom({
  onTeamMoved,
  onReady,
  onStart,
  onLeave,
}: {
  onTeamMoved: () => void;
  onReady: () => void;
  onStart: (myTeam: "police" | "robber") => void;
  onLeave: () => void;
}) {
  const { app } = useDemoCopy();
  const [myTeam, setMyTeam] = useState<"police" | "robber">("robber");
  const [ready, setReady] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // 준비를 마치면 잠시 뒤 방장이 게임을 시작한다. 인게임이 내 팀을 이어받는다
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => onStart(myTeam), 2000);
    return () => window.clearTimeout(t);
  }, [ready, myTeam, onStart]);

  const me: Member = { name: ME, ready };
  const police: Member[] = [
    { name: "든든한보안관3402", host: true, ready: true },
    ...(myTeam === "police" ? [me] : []),
  ];
  const robber: Member[] = [
    { name: "잽싼그림자7215", ready: true },
    ...(myTeam === "robber" ? [me] : []),
  ];

  // 캐릭터는 레디 상태를 SVG 파일이 표현한다 (participant_card.dart)
  const charSrc = (team: "police" | "robber", isReady: boolean) =>
    `/demo/${team}-${isReady ? "ready" : "notready"}.svg`;

  const card = (team: "police" | "robber", member: Member) => {
    const mine = member.name === ME;
    return (
      <div key={member.name} className="demo-footprint flex w-[72px] flex-col items-center">
        <div className="h-[84px] w-[72px]">
          <Image
            src={charSrc(team, member.host || member.ready || false)}
            alt=""
            width={72}
            height={84}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="mt-[4px] flex w-[72px] items-center justify-center gap-[4px]">
          {member.host && (
            <Image src="/demo/icon_crown.svg" alt="" width={12} height={12} />
          )}
          <span
            className={`truncate text-[10px] ${mine ? "font-bold" : ""}`}
            style={{ color: mine ? appColors.black600 : appColors.black800 }}
          >
            {member.name}
          </span>
        </div>
      </div>
    );
  };

  const addSlot = (team: "police" | "robber") => (
    <button
      key="add"
      type="button"
      onClick={() => {
        if (ready || myTeam === team) return;
        setMyTeam(team);
        onTeamMoved();
      }}
      className="flex w-[72px] flex-col items-center"
    >
      <span
        className="flex h-[84px] w-[72px] items-center justify-center rounded-[8px] transition-transform active:scale-95"
        style={{ backgroundColor: appColors.black100 }}
      >
        <Image
          src="/demo/icon_change.svg"
          alt=""
          width={24}
          height={24}
          className="opacity-50"
        />
      </span>
      <span className="mt-[4px] h-[13px]" />
    </button>
  );

  const section = (
    team: "police" | "robber",
    label: string,
    icon: string,
    members: Member[],
  ) => (
    <div>
      <div className="flex items-center px-[24px] py-[16px]">
        <Image src={icon} alt="" width={28} height={28} />
        <span
          className="ml-[8px] text-[16px] font-semibold"
          style={{ color: appColors.black }}
        >
          {label}
        </span>
        <span className="ml-[4px] text-[12px]" style={{ color: appColors.black600 }}>
          {app.personCount(members.length)}
        </span>
        <span className="flex-1" />
        <Image src="/demo/icon_down.svg" alt="" width={24} height={24} className="rotate-180 opacity-60" />
      </div>
      <div className="flex flex-wrap gap-[16px] pb-[20px] pl-[30px] pr-[24px]">
        {addSlot(team)}
        {members.map((member) => card(team, member))}
      </div>
    </div>
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ backgroundColor: appColors.white }}
    >
      {/* 앱바: 나가기 / 초대 코드(밑줄) / 규칙·설정 */}
      <div className="flex h-[56px] shrink-0 items-center justify-between pl-[18px] pr-[12px]">
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          className="transition-transform active:scale-90"
        >
          <Image src="/demo/icon_exit.svg" alt="" width={24} height={24} />
        </button>
        <span className="flex flex-col items-center">
          <span
            className="text-[20px] font-bold leading-none"
            style={{ color: appColors.black }}
          >
            {DEMO_ROOM_CODE}
          </span>
          <span
            className="mt-[2px] h-[2px] w-full"
            style={{ backgroundColor: appColors.black }}
          />
        </span>
        <span className="flex items-center gap-[2px]">
          <Image src="/demo/icon_info.svg" alt="" width={24} height={24} />
          <Image src="/demo/icon_settiing_2.svg" alt="" width={24} height={24} />
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {section("police", app.teamPolice, "/demo/icon_team_police.svg", police)}
        <div className="mx-[20px] h-px" style={{ backgroundColor: appColors.black100 }} />
        {section("robber", app.teamRobber, "/demo/icon_team_robber.svg", robber)}
      </div>

      {/* 하단 준비 버튼 (비방장, waiting_room_page.dart): 준비 전 파랑,
          준비 완료는 blue100 바탕 + 파랑 글자 */}
      <div className="shrink-0 px-[20px] pb-[20px] pt-[12px]">
        <button
          type="button"
          disabled={ready}
          onClick={() => {
            setReady(true);
            onReady();
          }}
          className="flex h-[56px] w-full items-center justify-center rounded-[12px] text-[16px] font-semibold transition-transform active:scale-95"
          style={
            ready
              ? { backgroundColor: appColors.blue100, color: appColors.blue }
              : { backgroundColor: appColors.blue, color: appColors.white }
          }
        >
          {ready ? app.readyDone : app.ready}
        </button>
      </div>

      {/* 방 나가기 확인 (dialogLeaveRoom 문구 그대로) */}
      {leaveOpen && (
        <DemoConfirmDialog
          title={app.leaveRoomTitle}
          message={app.leaveRoomMessage}
          confirmText={app.leave}
          onCancel={() => setLeaveOpen(false)}
          onConfirm={onLeave}
        />
      )}
    </div>
  );
}
