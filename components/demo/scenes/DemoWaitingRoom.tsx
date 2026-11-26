"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { DEMO_MY_NAME as ME, DEMO_ROOM_CODE } from "@/lib/demo/scenes";
import { DemoConfirmDialog } from "./DemoConfirmDialog";
import { TintIcon } from "./DemoGameParts";
import { useDemoCopy } from "../demo-copy";

// 대기실 (waiting_room_page.dart 실측). 앱바 초대코드(밑줄 2px),
// 팀 섹션 = 아이콘 28 + 팀명 + n명, 카드 Wrap(간격 16, 좌30 우24 하20),
// 첫 칸이 + 슬롯(black100, icon_change)이고 카드는 팀 캐릭터 SVG 72x84 다.
// 팀 이동은 앱과 같이 상대 팀의 + 슬롯을 탭해서 한다.
//
// 4.0.1 부터 준비 단계가 없다(#661). 참가자 하단은 빈자리이고, 방장이
// 게임 시작을 누르면 두 팀 인원을 보여 주는 확인창을 거쳐 바로 시작한다.
// [host] 모드(방 만들기 코스)에서는 내가 방장이다. 참가자들이 각본대로
// 들어오고, 경찰과 도둑이 한 명씩 생기면 게임 시작 버튼이 켜진다.
// 참가자 모드는 방장(각본)이 잠시 뒤 시작한다. [waitForTeamMove] 면
// 내가 팀을 옮긴 뒤에 시작한다 - 해볼 일을 마칠 때까지 기다린다.
//
// 도둑 팀이면 화면 전체가 다크다 (waiting_room_page.dart, team_section, participant_card).
// 팀은 상태바 색도 함께 바꾸므로 DemoApp 이 들고 있다.

type Member = { name: string; host?: boolean };
type Guest = { name: string; team: "police" | "robber" };

// 방장 시점 각본 - 입장 시점(ms)
const GUEST_SCRIPT: readonly (Guest & { joinAt: number })[] = [
  { name: "든든한보안관3402", team: "police", joinAt: 1200 },
  { name: "잽싼그림자7215", team: "robber", joinAt: 2400 },
];

// 참가자 시점에서 방장이 시작하기까지(ms). 팀을 옮긴 뒤라면 조금 더 빨리
const HOST_START_MS = 5000;
const HOST_START_AFTER_MOVE_MS = 2400;

export function DemoWaitingRoom({
  host = false,
  waitForTeamMove = false,
  myTeam,
  onTeamChange,
  onTeamMoved,
  onStart,
  onLeave,
}: {
  host?: boolean;
  waitForTeamMove?: boolean;
  myTeam: "police" | "robber";
  onTeamChange: (team: "police" | "robber") => void;
  onTeamMoved: () => void;
  onStart: (myTeam: "police" | "robber") => void;
  onLeave: () => void;
}) {
  const { app } = useDemoCopy();
  const dark = myTeam === "robber";
  const [moved, setMoved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);

  // 참가자 모드: 방장(각본)이 잠시 뒤 게임을 시작한다
  useEffect(() => {
    if (host || (waitForTeamMove && !moved)) return;
    const t = window.setTimeout(
      () => onStart(myTeam),
      moved ? HOST_START_AFTER_MOVE_MS : HOST_START_MS,
    );
    return () => window.clearTimeout(t);
  }, [host, waitForTeamMove, moved, myTeam, onStart]);

  // 방장 모드: 각본대로 참가자가 들어온다
  useEffect(() => {
    if (!host) return;
    const timers = GUEST_SCRIPT.map((g) =>
      window.setTimeout(
        () => setGuests((prev) => [...prev, { name: g.name, team: g.team }]),
        g.joinAt,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [host]);

  const me: Member = host ? { name: ME, host: true } : { name: ME };
  const scripted = (team: "police" | "robber"): Member[] =>
    host
      ? guests.filter((g) => g.team === team)
      : team === "police"
        ? [{ name: "든든한보안관3402", host: true }]
        : [{ name: "잽싼그림자7215" }];

  const police: Member[] = [
    ...scripted("police"),
    ...(myTeam === "police" ? [me] : []),
  ];
  const robber: Member[] = [
    ...scripted("robber"),
    ...(myTeam === "robber" ? [me] : []),
  ];

  // 서버와 같은 시작 조건 - 경찰과 도둑 각 1명 이상 (waiting_room_page.dart canStart)
  const canStart = police.length > 0 && robber.length > 0;

  // 대기방 캐릭터는 모두 ready.svg 다 (participant_card.dart, 준비 단계 제거 뒤)
  const charSrc = (team: "police" | "robber") => `/demo/${team}-ready.svg`;

  const card = (team: "police" | "robber", member: Member) => {
    const mine = member.name === ME;
    return (
      <div key={member.name} className="demo-footprint flex w-[72px] flex-col items-center">
        <div className="h-[84px] w-[72px]">
          <Image
            src={charSrc(team)}
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
            style={{ color: dark ? appColors.black100 : mine ? appColors.black600 : appColors.black800 }}
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
        if (myTeam === team) return;
        onTeamChange(team);
        setMoved(true);
        onTeamMoved();
      }}
      className="flex w-[72px] flex-col items-center"
    >
      <span
        className="flex h-[84px] w-[72px] items-center justify-center rounded-[8px] transition-transform active:scale-95"
        style={{ backgroundColor: dark ? appColors.black800 : appColors.black100 }}
      >
        <Image
          src="/demo/icon_change.svg"
          alt=""
          width={24}
          height={24}
          className={dark ? "opacity-50 brightness-0 invert" : "opacity-50"}
        />
      </span>
      <span className="mt-[4px] h-[13px]" />
    </button>
  );

  const section = (team: "police" | "robber", label: string, members: Member[]) => (
    <div>
      <div className="flex items-center px-[24px] py-[16px]">
        <Image src={`/demo/icon_role_${team}_${dark ? "dark" : "light"}.svg`} alt="" width={28} height={28} />
        <span
          className={`ml-[8px] text-[16px] ${dark ? "font-moneygraphy" : "font-semibold"}`}
          style={{ color: dark ? appColors.white : appColors.black }}
        >
          {label}
        </span>
        <span className="ml-[4px] text-[12px]" style={{ color: dark ? appColors.black400 : appColors.black600 }}>
          {app.personCount(members.length)}
        </span>
        <span className="flex-1" />
        {dark ? (
          <span className="rotate-180">
            <TintIcon src="/demo/icon_down.svg" size={24} color={appColors.black400} />
          </span>
        ) : (
          <Image src="/demo/icon_down.svg" alt="" width={24} height={24} className="rotate-180 opacity-60" />
        )}
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
      style={{ backgroundColor: dark ? appColors.black900 : appColors.white }}
    >
      {/* 앱바: 나가기 / 초대 코드(밑줄) / 규칙·설정 */}
      <div className="flex h-[56px] shrink-0 items-center justify-between pl-[18px] pr-[12px]">
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          className="transition-transform active:scale-90"
        >
          <TintIcon src="/demo/icon_gameout.svg" size={24} color={dark ? appColors.black200 : appColors.black500} />
        </button>
        <span className="flex flex-col items-center">
          <span
            className={`text-[20px] leading-none ${dark ? "font-moneygraphy" : "font-bold"}`}
            style={{ color: dark ? appColors.white : appColors.black }}
          >
            {DEMO_ROOM_CODE}
          </span>
          <span
            className="mt-[2px] h-[2px] w-full"
            style={{ backgroundColor: dark ? appColors.white : appColors.black }}
          />
        </span>
        <span className="flex items-center gap-[2px]">
          <TintIcon src="/demo/icon_info.svg" size={24} color={dark ? appColors.black200 : appColors.black500} />
          <TintIcon src="/demo/icon_settiing_2.svg" size={24} color={dark ? appColors.black200 : appColors.black500} />
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {section("police", app.teamPolice, police)}
        <div className="mx-[20px] h-px" style={{ backgroundColor: dark ? appColors.black800 : appColors.black100 }} />
        {section("robber", app.teamRobber, robber)}
      </div>

      {/* 하단 자리 (waiting_room_page.dart _buildBottomButton): 방장은 게임 시작,
          참가자는 버튼 높이만큼 빈자리라 방장이 바뀌어도 목록이 들썩이지 않는다 */}
      <div className="shrink-0 px-[20px] pb-[20px] pt-[12px]">
        {host ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => setStartOpen(true)}
            className={`flex h-[56px] w-full items-center justify-center rounded-[12px] text-[18px] transition-transform active:scale-95 ${dark ? "font-moneygraphy" : "font-semibold"}`}
            style={
              canStart
                ? dark
                  ? { backgroundColor: appColors.green, color: appColors.black }
                  : { backgroundColor: appColors.blue, color: appColors.white }
                : dark
                  ? { backgroundColor: appColors.black800, color: appColors.green }
                  : { backgroundColor: appColors.black200, color: appColors.black400 }
            }
          >
            {app.startGame}
          </button>
        ) : (
          <div className="h-[56px]" />
        )}
      </div>

      {/* 시작 확인 (dialogStartGame + start_game_team_preview.dart): 두 팀 캐릭터와
          인원을 보여 주고, 확인하면 기다림 없이 바로 시작한다 */}
      {startOpen && (
        <DemoConfirmDialog
          dark={dark}
          tone="primary"
          title={app.startDialogTitle}
          confirmText={app.startGame}
          onCancel={() => setStartOpen(false)}
          onConfirm={() => {
            setStartOpen(false);
            onStart(myTeam);
          }}
        >
          <div className="flex items-center">
            {(
              [
                ["police", app.startDialogPolice(police.length), police.length],
                ["robber", app.startDialogRobber(robber.length), robber.length],
              ] as const
            ).map(([team, label, count], i) => (
              <div key={team} className="flex flex-1 items-center">
                {i === 1 && (
                  <span
                    className="h-[64px] w-px"
                    style={{ backgroundColor: dark ? appColors.black800 : appColors.black100 }}
                  />
                )}
                <div
                  className="flex flex-1 flex-col items-center"
                  style={{ opacity: count === 0 ? 0.4 : 1 }}
                >
                  <Image
                    src={charSrc(team)}
                    alt=""
                    width={56}
                    height={64}
                    className="h-[64px] w-[56px] object-contain"
                  />
                  <span
                    className={`mt-[8px] text-[14px] ${dark ? "font-moneygraphy" : "font-semibold"}`}
                    style={{ color: dark ? appColors.white : appColors.black800 }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DemoConfirmDialog>
      )}

      {/* 방 나가기 확인 (dialogLeaveRoom 문구 그대로) */}
      {leaveOpen && (
        <DemoConfirmDialog
          dark={dark}
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
