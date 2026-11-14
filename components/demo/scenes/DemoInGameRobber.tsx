"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { FakeMap, ZoneCircle, FakeQr } from "@/components/game/mockups/parts";
import {
  ROBBER_PATH,
  ROBBER_POLICE_START_SECONDS,
  ROBBER_REVEAL_INTERVAL_MS,
  ROBBER_ROUND_SECONDS,
} from "@/lib/demo/scenes";
import { DemoParticipants } from "./DemoParticipants";
import { DemoConfirmDialog } from "./DemoConfirmDialog";
import { TintIcon } from "./DemoGameParts";
import { GameChatButton, GameChatPanel, GameChatPreview, GameZoneGrid, useGameChat } from "./DemoGameChat";
import { DemoGameStart, DispatchBanner } from "./DemoGameStart";
import { DemoFabMenu } from "./DemoGameMenu";
import { useDemoCopy } from "../demo-copy";

const LONG_PRESS_MS = 450;
const REVEAL_SECONDS = ROBBER_REVEAL_INTERVAL_MS / 1000;
// 각본 시점(초) - 팀원 채팅과 체포 알림 배너
const TEAMMATE_CHAT_AT = 3;
const ARREST_AT = 22;
const ARREST_BANNER_SECONDS = 8;
// 함께 도망치는 팀원 - 대기실·참가자 목록과 같은 사람이다
const TEAMMATE = "잽싼그림자7215";

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

type Point = { left: string; top: string };
type Ping = Point & { kind: "found" | "suspect" };

// 체포 알림 배너 문구 - @icon_police·@icon_robber 토큰 자리에 진영 아이콘을
// 끼운다 (gameEventArrestNotice가 실제로 이 형식이다).
function ArrestNotice({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@icon_police|@icon_robber)/).map((part, i) =>
        part === "@icon_police" || part === "@icon_robber" ? (
          <Image
            key={i}
            src={`/demo/icon_team_${part === "@icon_police" ? "police" : "robber"}.svg`}
            alt=""
            width={20}
            height={20}
            className="inline-block align-text-bottom"
          />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// 인게임 도둑 시점 (#88). game_page.dart의 isDarkMode 분기 그대로 다크다.
// 경찰 위치는 보이지 않는다 - 실제 게임의 비대칭이다. 대신 내 위치가
// 주기마다 발자국으로 공개되는 긴장감과, 팀 채팅·체포 알림이 눈이 된다.
// 시간이 다하면 생존 승리다.
export function DemoInGameRobber({
  onTask,
  onSurvive,
  onLeave,
}: {
  onTask: (taskId: string) => void;
  onSurvive: () => void;
  onLeave: () => void;
}) {
  // 시작 장면(역할 배너, 설명 장면)이 끝나야 지도 각본이 돈다
  const [started, setStarted] = useState(false);
  const [gridOn, setGridOn] = useState(false);
  const [dispatchDone, setDispatchDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tapped, setTapped] = useState<number | null>(null);
  const [pingSelect, setPingSelect] = useState<Point | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [locFocused, setLocFocused] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const copy = useDemoCopy();
  const { app } = copy;
  // 팀원의 정찰 보고는 경과 시간에서 파생된다 - 경찰이 안 보이는 도둑에게는 채팅이 눈이다
  const chat = useGameChat({
    elapsed,
    openerAt: TEAMMATE_CHAT_AT,
    teammate: TEAMMATE,
    opener: copy.robberChatScript.opener,
    reply: copy.robberChatScript.reply,
    onSent: () => onTask("robber-chat"),
  });
  const pressTimer = useRef<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const onStarted = useCallback(() => setStarted(true), []);
  const hideDispatch = useCallback(() => setDispatchDone(true), []);

  // 각본은 전부 경과 시간에서 파생된다 - 타이머는 이 틱 하나뿐이다
  useEffect(() => {
    if (!started) return;
    const t = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [started]);

  const remaining = Math.max(0, ROBBER_ROUND_SECONDS - elapsed);
  // 위치 공개 횟수 = 남긴 발자국 수. 나는 항상 그 다음 지점에 있다
  const trail = Math.min(
    Math.floor(elapsed / REVEAL_SECONDS),
    ROBBER_PATH.length - 1,
  );
  const myPos = ROBBER_PATH[trail];
  const policeCountdown = ROBBER_POLICE_START_SECONDS - elapsed;
  const arrestBanner =
    elapsed >= ARREST_AT && elapsed < ARREST_AT + ARREST_BANNER_SECONDS;

  // 시간이 다 되면 잠깐 숨을 고른 뒤 생존 승리로 넘어간다
  useEffect(() => {
    if (remaining > 0) return;
    const t = window.setTimeout(onSurvive, 900);
    return () => window.clearTimeout(t);
  }, [remaining, onSurvive]);

  const startPress = (clientX: number, clientY: number) => {
    const el = mapRef.current;
    if (!el) return;
    pressTimer.current = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setPingSelect({
        left: `${(((clientX - rect.left) / rect.width) * 100).toFixed(1)}%`,
        top: `${(((clientY - rect.top) / rect.height) * 100).toFixed(1)}%`,
      });
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const dropPing = (kind: Ping["kind"]) => {
    if (!pingSelect) return;
    setPings((prev) => [...prev, { ...pingSelect, kind }]);
    setPingSelect(null);
    onTask("robber-ping");
  };

  // 다크 화면의 지도 위 버튼 공통 스타일 (svg_icon_button.dart: 배경 black)
  const darkButton = {
    backgroundColor: appColors.black,
    boxShadow: "1px 1px 8px rgba(8,10,12,0.4)",
  } as const;

  return (
    <>
      {/* 상단 앱바 - 다크 (game_page.dart: black900, 카운트다운은 black400) */}
      <div
        className="relative flex h-[64px] shrink-0 flex-col items-center justify-center"
        style={{ backgroundColor: appColors.black900 }}
      >
        {/* 채팅 중에는 나가기 자리가 지도로 돌아가는 버튼이 된다 */}
        {chat.open ? (
          <button
            type="button"
            aria-label={app.chatBackToMap}
            onClick={() => chat.setOpen(false)}
            className="absolute left-[18px] top-1/2 -translate-y-1/2 transition-transform active:scale-90"
          >
            <TintIcon src="/demo/icon_previous.svg" size={24} color={appColors.white} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="absolute left-[18px] top-1/2 -translate-y-1/2 transition-transform active:scale-90"
          >
            <TintIcon src="/demo/icon_gameout.svg" size={24} color={appColors.black200} />
          </button>
        )}
        <p className="text-[20px] font-bold leading-none text-white">{fmt(remaining)}</p>
        <p className="mt-[6px] text-[12px] leading-none" style={{ color: appColors.black400 }}>
          {app.revealCountdown(fmt(REVEAL_SECONDS - (elapsed % REVEAL_SECONDS)))}
        </p>
        <span className="absolute right-[12px] top-1/2 -translate-y-1/2">
          <TintIcon src="/demo/icon_info.svg" size={24} color={appColors.black200} />
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={mapRef}
          className="absolute inset-0 touch-none"
          onPointerDown={(e) => {
            // 앱처럼 선택 카드가 떠 있을 때 지도를 누르면 카드부터 닫힌다
            if (pingSelect) {
              setPingSelect(null);
              return;
            }
            startPress(e.clientX, e.clientY);
          }}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
        >
          <FakeMap night />
          <ZoneCircle size={430} top="46%" filled={false} />
          <ZoneCircle size={90} left="38%" top="24%" filled={false} stroke={appColors.red500} />
          {gridOn && <GameZoneGrid size={430} top="46%" dark />}

          {/* 공개된 내 발자국 - 경찰이 쫓는 바로 그 흔적이다 */}
          {ROBBER_PATH.slice(0, trail).map((print, i) => (
            <button
              key={i}
              type="button"
              className="demo-footprint absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: print.left, top: print.top }}
              onClick={() => setTapped(i)}
            >
              {tapped === i && (
                <span
                  className="absolute -inset-[10px] rounded-full border-2"
                  style={{ borderColor: appColors.green }}
                />
              )}
              <Image
                src="/app-icons/shoeprint_green.svg"
                alt=""
                width={54}
                height={38}
                style={{ transform: `rotate(${print.rotate}deg)` }}
              />
            </button>
          ))}

          {pings.map((ping, i) => (
            <span
              key={i}
              className="demo-footprint absolute -translate-x-1/2 -translate-y-full"
              style={{ left: ping.left, top: ping.top }}
            >
              <Image
                src={`/demo/icon_ping_${ping.kind}_marker_darkmode.svg`}
                alt=""
                width={32}
                height={40}
              />
            </span>
          ))}

          {/* 내 위치 (도둑 초록) - 공개될 때마다 다음 지점으로 옮겨 간다 */}
          <span
            className="absolute size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-white transition-all duration-1000"
            style={{ left: myPos.left, top: myPos.top, backgroundColor: appColors.green }}
          />

          {/* 핑 선택 카드 - 다크 (ping_selection_card.dart: 검정 카드, 초록 라벨) */}
          {pingSelect && (
            <div
              className="demo-footprint absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left: pingSelect.left, top: pingSelect.top }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center rounded-[8px]"
                style={{ backgroundColor: appColors.black }}
              >
                <button
                  type="button"
                  onClick={() => dropPing("found")}
                  className="flex flex-col items-center px-[16px] py-[8px]"
                >
                  <Image src="/demo/icon_ping_found_select_darkmode.svg" alt="" width={24} height={24} />
                  <span
                    className="mt-[2px] text-[12px] leading-[1.3]"
                    style={{ color: appColors.green }}
                  >
                    {app.pingFound}
                  </span>
                </button>
                <span
                  className="h-[40px] w-[2px] rounded-[2px]"
                  style={{ backgroundColor: appColors.black800 }}
                />
                <button
                  type="button"
                  onClick={() => dropPing("suspect")}
                  className="flex flex-col items-center px-[16px] py-[8px]"
                >
                  <Image src="/demo/icon_ping_suspect_select_darkmode.svg" alt="" width={24} height={24} />
                  <span
                    className="mt-[2px] text-[12px] leading-[1.3]"
                    style={{ color: appColors.green }}
                  >
                    {app.pingSuspect}
                  </span>
                </button>
              </div>
              <Image src="/demo/icon_ping_pin_darkmode.svg" alt="" width={20} height={32} />
            </div>
          )}
        </div>

        {/* 경찰 시작 카운트다운 (police_start_countdown.dart: 1분 미만은 빨강) */}
        {policeCountdown > 0 && !showParticipants && (
          <p
            className="pointer-events-none absolute inset-x-0 top-[24px] text-center text-[16px] font-semibold"
            style={{ color: appColors.red }}
          >
            {app.policeStartCountdown(fmt(policeCountdown))}
          </p>
        )}

        {/* 체포 알림 배너 (marquee_alert_banner.dart: 빨강, 흰 글자, 마퀴) */}
        {arrestBanner && !showParticipants && (
          <div className="pointer-events-none absolute inset-x-[20px] top-[8px]">
            <div
              className="overflow-hidden rounded-[12px] px-[16px] py-[12px]"
              style={{ backgroundColor: appColors.red }}
            >
              <p className="demo-marquee whitespace-nowrap text-[14px] font-semibold text-white">
                <ArrestNotice text={app.arrestNotice("든든한보안관3402", TEAMMATE)} />
              </p>
            </div>
          </div>
        )}

        {/* 참가자 목록 - 다크 화면으로 덮는다 (participant_overlay.dart) */}
        {showParticipants && (
          <div className="absolute inset-0 flex flex-col">
            <DemoParticipants myTeam="robber" dark />
          </div>
        )}

        {/* 좌하단: 내 위치 - 다크: 검정 배경 + 초록 아이콘. 좌표 격자는 4.0.1 부터 가운데 메뉴에 있다.
            버튼 bottom 은 앱의 38 + 세이프 영역 34 다 */}
        {!showParticipants && (
          <div className="absolute bottom-[72px] left-[20px] flex flex-col gap-[8px]">
            <button
              type="button"
              onClick={() => setLocFocused((v) => !v)}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex size-[56px] items-center justify-center rounded-[16px] transition-transform active:scale-95"
              style={darkButton}
            >
              <TintIcon
                src="/demo/mage_location-fill.svg"
                size={32}
                color={locFocused ? appColors.green : appColors.green500}
              />
            </button>
          </div>
        )}

        {/* 우하단 - 지도에서는 채팅만, 참가자 목록에서는 지도로 돌아가기 + 채팅.
            참가자와 내 QR 은 가운데 메뉴가 연다 (4.0.1 #656) */}
        <div className="absolute bottom-[72px] right-[20px] flex flex-col gap-[8px]">
          {showParticipants && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowParticipants(false)}
              className="flex size-[56px] items-center justify-center rounded-[16px] transition-transform active:scale-95"
              style={darkButton}
            >
              <TintIcon src="/demo/icon_map.svg" size={32} color={appColors.green} />
            </button>
          )}
          <GameChatButton chat={chat} dark />
        </div>

        {/* 가운데 아래 플로팅 메뉴: 좌표, 참가자, 내 QR */}
        {!showParticipants && !chat.open && !qrOpen && (
          <DemoFabMenu
            dark
            items={[
              {
                key: "grid",
                label: app.menuGrid,
                icon: "/demo/icon_grid.svg",
                onTap: () => setGridOn((v) => !v),
              },
              {
                key: "participants",
                label: app.menuParticipants,
                icon: "/demo/icon_person.svg",
                onTap: () => setShowParticipants(true),
              },
              {
                key: "myQr",
                label: app.menuMyQr,
                icon: "/demo/icon_qr_code.svg",
                onTap: () => {
                  setQrOpen(true);
                  onTask("robber-qr");
                },
              },
            ]}
          />
        )}
        <GameChatPreview chat={chat} dark />
        <GameChatPanel chat={chat} dark />
      </div>

      {/* 게임 나가기 확인 - 다크 (gameLeaveConfirm 문구 그대로) */}
      {leaveOpen && (
        <DemoConfirmDialog
          dark
          title={app.leaveGameTitle}
          message={app.leaveGameMessage}
          confirmText={app.leave}
          onCancel={() => setLeaveOpen(false)}
          onConfirm={onLeave}
        />
      )}

      {/* 수배 QR 다이얼로그 (qr_display_dialog.dart: 검정 카드, 초록 Moneygraphy) */}
      {qrOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-[36px]">
          <div
            className="flex w-full flex-col items-center rounded-[24px] px-[24px] py-[28px]"
            style={{ backgroundColor: appColors.black }}
          >
            <p className="font-moneygraphy text-[20px]" style={{ color: appColors.green }}>
              {app.qrDisplayTitle}
            </p>
            <div className="mt-[20px] rounded-[16px] bg-white p-[12px]">
              <FakeQr size={176} />
            </div>
            <p className="mt-[20px] text-[14px]" style={{ color: appColors.black300 }}>
              {app.qrDisplayMessage}
            </p>
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              className="mt-[20px] flex h-[52px] w-full items-center justify-center rounded-[12px] text-[16px] font-semibold transition-transform active:scale-95"
              style={{ backgroundColor: appColors.green, color: appColors.black }}
            >
              {app.close}
            </button>
          </div>
        </div>
      )}

      <DemoGameStart team="robber" onStarted={onStarted} />
      {/* 경찰 카운트다운이 끝나면 출동 배너가 지도 위로 지나간다 (터치는 막지 않는다) */}
      {policeCountdown <= 0 && !dispatchDone && <DispatchBanner team="robber" onDone={hideDispatch} />}
    </>
  );
}
