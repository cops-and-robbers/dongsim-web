"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { FakeMap, ZoneCircle, FakeQr } from "@/components/game/mockups/parts";
import { FOOTPRINT_SCRIPT, FOOTPRINT_INTERVAL_MS } from "@/lib/demo/scenes";
import { DemoParticipants } from "./DemoParticipants";
import { DemoConfirmDialog } from "./DemoConfirmDialog";
import { TintIcon } from "./DemoGameParts";
import { GameChatButton, GameChatPanel, GameChatPreview, GameZoneGrid, useGameChat } from "./DemoGameChat";
import { DemoGameStart, demoReleaseAt } from "./DemoGameStart";
import {
  DemoFabMenu,
  ShrinkNotice,
  shrinkCircle,
  useDemoShrink,
} from "./DemoGameMenu";
import { useDemoCopy } from "../demo-copy";

// 플레이그라운드 원(시작)과 축소를 켰을 때의 마지막 원. 마지막 원은 감옥(38%, 24%)을 품는다
const ZONE_START = { size: 430, left: 50, top: 46 };
const ZONE_FINAL = { size: 250, left: 46, top: 36 };

const LONG_PRESS_MS = 450;
// 라운드 남은 시간(초). 헤더 타이머가 여기서 1초씩 줄어든다
const ROUND_REMAINING = 14 * 60 + 32;
// 지도가 열린 뒤 팀원 첫 메시지가 도착하는 시점(초). 말풍선과 안 읽은 수를 보여 주는 각본이다
const CHAT_OPENER_AT = 3;

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

type Point = { left: string; top: string };
type Ping = Point & { kind: "found" | "suspect" };

// 인게임 경찰 시점. 발자국은 각본대로 찍히고 탭·핑·채팅·체포는 방문자 몫이다.
// 핑은 앱 그대로 길게 누르기 → 발견/의심 선택 카드 → 마커
// (google_map_view.dart, ping_selection_card.dart 실측).
export function DemoInGame({
  myTeam,
  shrink = false,
  onTask,
  onVictory,
  onLeave,
  onIntroEnd,
}: {
  myTeam: "police" | "robber";
  /** 방 만들기에서 구역 축소를 켰는지 */
  shrink?: boolean;
  onTask: (taskId: string) => void;
  onVictory: () => void;
  onLeave: () => void;
  /** 시작 장면(역할 배너·대기·출동 카운팅)이 끝나 지도가 열렸을 때 */
  onIntroEnd?: () => void;
}) {
  // 시작 장면(역할 배너, 대기 장면)이 끝나야 지도 각본이 돈다
  const [started, setStarted] = useState(false);
  // 경찰 출동 시각 - 대기 장면과 출동 카운팅이 이 값을 센다
  const [releaseAt] = useState(() => demoReleaseAt("police"));
  const [gridOn, setGridOn] = useState(false);
  const [footprints, setFootprints] = useState(0);
  const [tapped, setTapped] = useState<number | null>(null);
  const [pingSelect, setPingSelect] = useState<Point | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [robberOut, setRobberOut] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [caught, setCaught] = useState(false);
  const copy = useDemoCopy();
  const { app } = copy;
  const [elapsed, setElapsed] = useState(0);
  // 구역 축소는 지도가 열린 뒤 경과 시간에서 파생된다
  const zoneShrink = useDemoShrink(shrink, elapsed);
  const zoneNow = shrinkCircle(zoneShrink.stage, ZONE_START, ZONE_FINAL);
  const shrinkLeft = zoneShrink.remaining;
  const [locFocused, setLocFocused] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const chat = useGameChat({
    elapsed,
    openerAt: CHAT_OPENER_AT,
    teammate: "든든한보안관3402",
    opener: copy.chatScript.opener,
    reply: copy.chatScript.reply,
    onSent: () => onTask("ingame-chat"),
  });
  const pressTimer = useRef<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const onStarted = useCallback(() => {
    setStarted(true);
    onIntroEnd?.();
  }, [onIntroEnd]);

  // 각본: 발자국을 주기마다 하나씩 찍고, 다 찍히면 도둑이 모습을 드러낸다
  useEffect(() => {
    if (!started) return;
    if (footprints >= FOOTPRINT_SCRIPT.length) {
      const t = window.setTimeout(() => setRobberOut(true), 900);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(
      () => setFootprints((n) => n + 1),
      FOOTPRINT_INTERVAL_MS,
    );
    return () => window.clearTimeout(t);
  }, [started, footprints]);

  // 스캔 연출이 끝나면 체포 성공 표시를 잠깐 보여주고 승리로 넘어간다
  useEffect(() => {
    if (!scanning) return;
    const toCaught = window.setTimeout(() => setCaught(true), 1700);
    const toWin = window.setTimeout(onVictory, 2800);
    return () => {
      window.clearTimeout(toCaught);
      window.clearTimeout(toWin);
    };
  }, [scanning, onVictory]);

  // 헤더 타이머 1초 틱
  useEffect(() => {
    if (!started) return;
    const t = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [started]);

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
    onTask("ingame-ping");
  };

  return (
    <>
      {/* 상단 앱바 (game_page.dart _buildAppBar): 나가기(좌 18)·info(우 12),
          중앙 = 남은 시간 + 다음 도둑 위치 공개 카운트다운 */}
      <div
        className="relative flex h-[64px] shrink-0 flex-col items-center justify-center"
        style={{ backgroundColor: appColors.white }}
      >
        {/* 채팅 중에는 나가기 자리가 지도로 돌아가는 버튼이 된다 */}
        {chat.open ? (
          <button
            type="button"
            aria-label={app.chatBackToMap}
            onClick={() => chat.setOpen(false)}
            className="absolute left-[18px] top-1/2 -translate-y-1/2 transition-transform active:scale-90"
          >
            <Image src="/demo/icon_previous.svg" alt="" width={24} height={24} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="absolute left-[18px] top-1/2 -translate-y-1/2 transition-transform active:scale-90"
          >
            <TintIcon src="/demo/icon_gameout.svg" size={24} color={appColors.black500} />
          </button>
        )}
        <p
          className="text-[20px] font-bold leading-none"
          style={{ color: appColors.black }}
        >
          {fmt(Math.max(0, ROUND_REMAINING - elapsed))}
        </p>
        <p
          className="mt-[6px] text-[12px] leading-none"
          style={{ color: appColors.red }}
        >
          {shrink && shrinkLeft !== null
            ? app.revealShrinkCountdown(fmt(robberOut ? 0 : 2 - (elapsed % 2)), fmt(shrinkLeft))
            : app.revealCountdown(fmt(robberOut ? 0 : 2 - (elapsed % 2)))}
        </p>
        <span className="absolute right-[12px] top-1/2 -translate-y-1/2">
          <TintIcon src="/demo/icon_info.svg" size={24} color={appColors.black500} />
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
        <FakeMap />
        <ZoneCircle size={zoneNow.size} left={zoneNow.left} top={zoneNow.top} filled={false} smooth />
        <ZoneCircle
          size={90}
          left="38%"
          top="24%"
          filled={false}
          stroke={appColors.red500}
        />
        {gridOn && <GameZoneGrid size={430} top="46%" dark={false} />}

        {FOOTPRINT_SCRIPT.slice(0, footprints).map((print, i) => (
          <button
            key={i}
            type="button"
            className="demo-footprint absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: print.left, top: print.top }}
            onClick={() => {
              setTapped(i);
              onTask("ingame-footprint");
            }}
          >
            {tapped === i && (
              <span
                className="absolute -inset-[10px] rounded-full border-2"
                style={{ borderColor: appColors.blue }}
              />
            )}
            <Image
              src="/app-icons/shoeprint.svg"
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
              src={`/demo/ping_${ping.kind}_marker.svg`}
              alt=""
              width={32}
              height={40}
            />
          </span>
        ))}

        {robberOut && (
          <button
            type="button"
            onClick={() => {
              setScanning(true);
              onTask("ingame-arrest");
            }}
            className="demo-footprint absolute left-[66%] top-[72%] -translate-x-1/2 -translate-y-full"
          >
            {/* 잡을 수 있다는 신호 - 마커 주위로 퍼지는 파문 */}
            <span
              className="demo-pulse absolute left-1/2 top-1/2 size-[80px] rounded-full border-[3px]"
              style={{ borderColor: appColors.blue }}
            />
            <Image src="/characters/robber.svg" alt="" width={72} height={65} />
          </button>
        )}

        {/* 내 위치 (경찰 파랑) - 플레이그라운드 원 안에서 시작한다 */}
        <span
          className="absolute left-[54%] top-[72%] size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-white"
          style={{ backgroundColor: appColors.blue }}
        />

        {/* 핑 선택 카드: 파랑 카드(발견|의심) + 아래 핀 */}
        {pingSelect && (
          <div
            className="demo-footprint absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center"
            style={{ left: pingSelect.left, top: pingSelect.top }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center rounded-[8px]"
              style={{ backgroundColor: appColors.blue }}
            >
              <button
                type="button"
                onClick={() => dropPing("found")}
                className="flex flex-col items-center px-[16px] py-[8px]"
              >
                <Image src="/demo/ping_found_select.svg" alt="" width={24} height={24} />
                <span className="mt-[2px] text-[12px] leading-[1.3] text-white">{app.pingFound}</span>
              </button>
              <span
                className="h-[40px] w-[2px] rounded-[2px]"
                style={{ backgroundColor: appColors.blue800 }}
              />
              <button
                type="button"
                onClick={() => dropPing("suspect")}
                className="flex flex-col items-center px-[16px] py-[8px]"
              >
                <Image src="/demo/ping_suspect_select.svg" alt="" width={24} height={24} />
                <span className="mt-[2px] text-[12px] leading-[1.3] text-white">{app.pingSuspect}</span>
              </button>
            </div>
            <Image src="/demo/ping_pin.svg" alt="" width={20} height={32} />
          </div>
        )}
      </div>

      {/* 참가자 목록 - 지도 위를 흰 화면으로 덮는다 (participant_overlay.dart) */}
      {showParticipants && (
        <div className="absolute inset-0 flex flex-col">
          <DemoParticipants myTeam={myTeam} />
        </div>
      )}

      {/* 좌하단: 내 위치 (my_location_button.dart: 포커스 시 blue, 아니면 blue500).
          4.0.1 부터 좌표 격자는 가운데 메뉴로 옮겨 갔다.
          버튼 bottom 은 앱의 38 + 세이프 영역 34 다. 채팅 시트가 사라져 지도가 화면 끝까지 내려간다 */}
      {!showParticipants && (
        <div className="absolute bottom-[72px] left-[20px] flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={() => setLocFocused((v) => !v)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex size-[56px] items-center justify-center rounded-[16px] shadow-[1px_1px_8px_rgba(8,10,12,0.1)] transition-transform active:scale-95"
            style={{ backgroundColor: appColors.white }}
          >
            <TintIcon
              src="/demo/mage_location-fill.svg"
              size={32}
              color={locFocused ? appColors.blue : appColors.blue500}
            />
          </button>
        </div>
      )}

      {/* 우하단 (svg_icon_button.dart: 56, radius 16, 아이콘 32) - 지도에서는 채팅만,
          참가자 목록에서는 지도로 돌아가기 + 채팅. 참가자·체포는 가운데 메뉴가 연다 */}
      <div className="absolute bottom-[72px] right-[20px] flex flex-col gap-[8px]">
        {showParticipants && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowParticipants(false)}
            className="flex size-[56px] items-center justify-center rounded-[16px] shadow-[1px_1px_8px_rgba(8,10,12,0.1)] transition-transform active:scale-95"
            style={{ backgroundColor: appColors.white }}
          >
            <TintIcon src="/demo/icon_map.svg" size={32} color={appColors.blue} />
          </button>
        )}
        <GameChatButton chat={chat} dark={false} />
      </div>

      {/* 가운데 아래 플로팅 메뉴 (4.0.1 #656): 좌표, 참가자, 체포 */}
      {!showParticipants && !chat.open && !scanning && (
        <DemoFabMenu
          dark={false}
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
              key: "arrest",
              label: app.menuArrest,
              icon: "/demo/icon_qr_scan.svg",
              onTap: () => {
                if (!robberOut || scanning) return;
                setScanning(true);
                onTask("ingame-arrest");
              },
            },
          ]}
        />
      )}
      <ShrinkNotice text={zoneShrink.notice} dark={false} />
      <GameChatPreview chat={chat} dark={false} />
      <GameChatPanel chat={chat} dark={false} />
      </div>

      {/* 게임 나가기 확인 (game_page.dart _confirmLeaveGame 문구 그대로) */}
      {leaveOpen && (
        <DemoConfirmDialog
          title={app.leaveGameTitle}
          message={app.leaveGameMessage}
          confirmText={app.leave}
          onCancel={() => setLeaveOpen(false)}
          onConfirm={onLeave}
        />
      )}

      {/* QR 스캐너 오버레이 (qr_scanner_page.dart 실측: 검정 배경 + 250 스캔 창) */}
      {scanning && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center"
          style={{ backgroundColor: appColors.black }}
        >
          <p className="mb-[28px] text-[20px] font-semibold text-white">
            {caught ? copy.caught : app.qrScanTitle}
          </p>
          <div
            className="relative overflow-hidden rounded-[16px] border-2"
            style={{
              width: 250,
              height: 250,
              borderColor: caught ? appColors.green : appColors.blue,
              backgroundColor: appColors.black900,
            }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] bg-white p-[8px]">
              <FakeQr size={140} />
            </div>
            {!caught && (
              <span className="mockup-qr-scan absolute inset-x-0 top-0 h-[3px] bg-brand-blue/80" />
            )}
            {caught && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55">
                <svg viewBox="0 0 48 48" width="72" height="72" aria-hidden="true">
                  <circle cx="24" cy="24" r="22" fill={appColors.green} />
                  <path
                    d="M14 24.5 21 31.5 34 17.5"
                    stroke="#fff"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </span>
            )}
          </div>
        </div>
      )}

      <DemoGameStart team={myTeam} releaseAt={releaseAt} onStarted={onStarted} />
    </>
  );
}
