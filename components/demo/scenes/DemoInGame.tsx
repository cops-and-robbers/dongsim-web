"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import {
  FakeMap,
  ZoneCircle,
  CollapsedChatSheet,
  SheetHandle,
  Bubble,
  FakeQr,
} from "@/components/game/mockups/parts";
import { FOOTPRINT_SCRIPT, FOOTPRINT_INTERVAL_MS } from "@/lib/demo/scenes";
import { DemoParticipants } from "./DemoParticipants";
import { DemoConfirmDialog } from "./DemoConfirmDialog";
import { useDemoCopy } from "../demo-copy";

const LONG_PRESS_MS = 450;
// 라운드 남은 시간(초). 헤더 타이머가 여기서 1초씩 줄어든다
const ROUND_REMAINING = 14 * 60 + 32;

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

type Point = { left: string; top: string };
type Ping = Point & { kind: "found" | "suspect" };
type ChatMessage = { mine: boolean; name?: string; text: string; time: string };

// 인게임 경찰 시점. 발자국은 각본대로 찍히고 탭·핑·채팅·체포는 방문자 몫이다.
// 핑은 앱 그대로 길게 누르기 → 발견/의심 선택 카드 → 마커
// (google_map_view.dart, ping_selection_card.dart 실측).
export function DemoInGame({
  myTeam,
  onTask,
  onVictory,
  onLeave,
}: {
  myTeam: "police" | "robber";
  onTask: (taskId: string) => void;
  onVictory: () => void;
  onLeave: () => void;
}) {
  const [footprints, setFootprints] = useState(0);
  const [tapped, setTapped] = useState<number | null>(null);
  const [pingSelect, setPingSelect] = useState<Point | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [robberOut, setRobberOut] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [caught, setCaught] = useState(false);
  const copy = useDemoCopy();
  const { app } = copy;
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [locFocused, setLocFocused] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { mine: false, name: "든든한보안관3402", text: copy.chatScript.opener, time: "14:31" },
  ]);
  const pressTimer = useRef<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  // 각본: 발자국을 주기마다 하나씩 찍고, 다 찍히면 도둑이 모습을 드러낸다
  useEffect(() => {
    if (footprints >= FOOTPRINT_SCRIPT.length) {
      const t = window.setTimeout(() => setRobberOut(true), 900);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(
      () => setFootprints((n) => n + 1),
      FOOTPRINT_INTERVAL_MS,
    );
    return () => window.clearTimeout(t);
  }, [footprints]);

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

  // 새 메시지가 오면 목록을 맨 아래로
  useEffect(() => {
    chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight });
  }, [messages, chatOpen]);

  // 헤더 타이머 1초 틱
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

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

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setMessages((prev) => [...prev, { mine: true, text, time: "14:32" }]);
    onTask("ingame-chat");
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          mine: false,
          name: "든든한보안관3402",
          text: copy.chatScript.reply,
          time: "14:32",
        },
      ]);
    }, 1200);
  };

  return (
    <>
      {/* 상단 앱바 (game_page.dart _buildAppBar): 나가기(좌 18)·info(우 12),
          중앙 = 남은 시간 + 다음 도둑 위치 공개 카운트다운 */}
      <div
        className="relative flex h-[64px] shrink-0 flex-col items-center justify-center"
        style={{ backgroundColor: appColors.white }}
      >
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          className="absolute left-[18px] top-1/2 -translate-y-1/2 transition-transform active:scale-90"
        >
          <Image src="/demo/icon_exit.svg" alt="" width={24} height={24} />
        </button>
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
          {app.revealCountdown(fmt(robberOut ? 0 : 2 - (elapsed % 2)))}
        </p>
        <Image
          src="/demo/icon_info.svg"
          alt=""
          width={24}
          height={24}
          className="absolute right-[12px] top-1/2 -translate-y-1/2"
        />
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
        <ZoneCircle size={430} top="46%" filled={false} />
        <ZoneCircle
          size={90}
          left="38%"
          top="24%"
          filled={false}
          stroke={appColors.red500}
        />

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

      {/* 좌하단 내 위치 버튼 (my_location_button.dart: 포커스 시 blue, 아니면 blue500).
          버튼 bottom = 채팅 시트 겹침 20 + 시트와의 간격 45 (game_page.dart) */}
      {!showParticipants && (
        <button
          type="button"
          onClick={() => setLocFocused((v) => !v)}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-[65px] left-[20px] flex size-[56px] items-center justify-center rounded-[16px] shadow-[1px_1px_8px_rgba(8,10,12,0.1)] transition-transform active:scale-95"
          style={{ backgroundColor: appColors.white }}
        >
          <span
            className="size-[32px]"
            style={{
              backgroundColor: locFocused ? appColors.blue : appColors.blue500,
              WebkitMask: "url(/demo/mage_location-fill.svg) center / contain no-repeat",
              mask: "url(/demo/mage_location-fill.svg) center / contain no-repeat",
            }}
          />
        </button>
      )}

      {/* 우하단 액션 버튼 (svg_icon_button.dart: 56, radius 16, 아이콘 32) -
          지도에서는 참가자 목록, 목록에서는 지도로 돌아가기 + QR */}
      <div className="absolute bottom-[65px] right-[20px] flex flex-col gap-[8px]">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowParticipants((v) => !v)}
          className="flex size-[56px] items-center justify-center rounded-[16px] shadow-[1px_1px_8px_rgba(8,10,12,0.1)] transition-transform active:scale-95"
          style={{ backgroundColor: appColors.white }}
        >
          <span
            className="size-[32px]"
            style={{
              backgroundColor: appColors.blue,
              WebkitMask: `url(/demo/${showParticipants ? "icon_map" : "icon_person"}.svg) center / contain no-repeat`,
              mask: `url(/demo/${showParticipants ? "icon_map" : "icon_person"}.svg) center / contain no-repeat`,
            }}
          />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            if (!robberOut || scanning) return;
            setScanning(true);
            onTask("ingame-arrest");
          }}
          className="flex size-[56px] items-center justify-center rounded-[16px] shadow-[1px_1px_8px_rgba(8,10,12,0.1)] transition-transform active:scale-95"
          style={{ backgroundColor: appColors.white }}
        >
          <Image src="/demo/icon_qr_scan.svg" alt="" width={32} height={32} />
        </button>
      </div>
      </div>

      {/* 채팅 시트 (chat_overlay.dart): 접힘 <-> 펼침, 핸들이나 입력바를 누르면 열린다 */}
      <div className="relative z-10 -mt-[20px]">
        {!chatOpen ? (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="block w-full text-left"
          >
            <CollapsedChatSheet hint={app.chatHint} dark={false} />
          </button>
        ) : (
          <div
            className="flex h-[340px] flex-col rounded-t-[20px] shadow-[0_-8px_24px_rgba(15,23,42,0.35)]"
            style={{ backgroundColor: appColors.black100 }}
          >
            <button type="button" onClick={() => setChatOpen(false)} className="shrink-0">
              <SheetHandle dark={false} />
            </button>
            <div
              ref={chatListRef}
              className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[16px] py-[4px]"
            >
              {messages.map((message, i) => (
                <Bubble
                  key={i}
                  side={message.mine ? "right" : "left"}
                  name={message.mine ? undefined : message.name}
                  time={message.time}
                >
                  {message.text}
                </Bubble>
              ))}
            </div>
            <div className="shrink-0 px-[20px] py-[8px]">
              <div
                className="flex min-h-[48px] items-center gap-[8px] rounded-[12px] py-[6px] pl-[20px] pr-[12px]"
                style={{ backgroundColor: appColors.white }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder={app.chatHint}
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:text-[#B4BFC6]"
                  style={{ color: appColors.black }}
                />
                <button
                  type="button"
                  onClick={sendChat}
                  className="flex size-[32px] shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: chatInput.trim()
                      ? appColors.blue
                      : appColors.black200,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    className="-rotate-90"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 12h13M12 5l7 7-7 7"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-[16px] shrink-0" />
          </div>
        )}
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
    </>
  );
}
