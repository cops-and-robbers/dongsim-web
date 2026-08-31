"use client";

import Image from "next/image";
import { useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { useDemoCopy } from "../demo-copy";

// 인게임 참가자 목록 (participant_overlay.dart 실측). 흰 화면에 팀 섹션
// 두 개 - 경찰은 접힘, 도둑은 펼침이 기본이고 헤더를 눌러 여닫는다.
// 도둑 섹션 머리에는 "현재 N명 도주 중!" 배지가 붙는다.
const ME = "민첩한괴도5308";

type Member = { name: string; host?: boolean };

export function DemoParticipants({ myTeam }: { myTeam: "police" | "robber" }) {
  const { app } = useDemoCopy();
  const [policeOpen, setPoliceOpen] = useState(false);
  const [robberOpen, setRobberOpen] = useState(true);

  const police: Member[] = [
    { name: "든든한보안관3402", host: true },
    ...(myTeam === "police" ? [{ name: ME }] : []),
  ];
  const robber: Member[] = [
    { name: "잽싼그림자7215" },
    ...(myTeam === "robber" ? [{ name: ME }] : []),
  ];

  const card = (team: "police" | "robber", member: Member) => {
    const mine = member.name === ME;
    // 경찰은 항상 ready 모습, 도주 중인 도둑은 notready 모습이다
    const asset = team === "police" ? "police-ready" : "robber-notready";
    return (
      <div key={member.name} className="flex w-[72px] flex-col items-center">
        <div className="h-[84px] w-[72px]">
          <Image
            src={`/demo/${asset}.svg`}
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

  const section = (
    team: "police" | "robber",
    label: string,
    icon: string,
    members: Member[],
    open: boolean,
    onToggle: () => void,
    badge?: React.ReactNode,
  ) => (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center px-[24px] py-[16px]"
      >
        <Image src={icon} alt="" width={28} height={28} />
        <span
          className="ml-[8px] text-[16px] font-semibold"
          style={{ color: appColors.black }}
        >
          {label}
        </span>
        <span className="flex-1" />
        {badge}
        <Image
          src="/demo/icon_down.svg"
          alt=""
          width={24}
          height={24}
          className={`ml-[4px] opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="flex flex-wrap gap-[16px] pb-[20px] pl-[30px] pr-[24px]">
          {members.map((member) => card(team, member))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      style={{ backgroundColor: appColors.white }}
    >
      {section(
        "police",
        app.teamPolice,
        "/demo/icon_team_police.svg",
        police,
        policeOpen,
        () => setPoliceOpen((v) => !v),
      )}
      <div className="h-px" style={{ backgroundColor: appColors.black200 }} />
      {section(
        "robber",
        app.teamRobber,
        "/demo/icon_team_robber.svg",
        robber,
        robberOpen,
        () => setRobberOpen((v) => !v),
        <span className="text-[12px]" style={{ color: appColors.blue800 }}>
          {app.overlayCurrent}{" "}
          <span className="font-bold" style={{ color: appColors.blue }}>
            {app.overlayCount(robber.length)}
          </span>{" "}
          {app.escaping}
        </span>,
      )}
    </div>
  );
}
