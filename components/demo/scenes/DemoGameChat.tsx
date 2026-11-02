"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { Bubble } from "@/components/game/mockups/parts";
import { useDemoCopy } from "../demo-copy";
import { SegmentedToggle, TintIcon } from "./DemoGameParts";

// 인게임 채팅 (chat_overlay.dart, chat_preview_card.dart). 앱은 하단 시트를 없애고 오른쪽 세 번째 버튼으로 옮겼다.
// 누르면 앱바 아래를 덮는 전체 화면이고, 위에 팀/전체 토글이 있다. 팀이 기본이다.
// 닫혀 있을 때 새 메시지는 버튼 옆 말풍선으로 3초 보이고 버튼에 안 읽은 수가 뜬다.

export type GameChatMessage = { mine: boolean; name?: string; text: string; time: string };
type Scope = "team" | "all";

const PREVIEW_SECONDS = 3;

// 채팅 상태. 각본의 팀원 메시지는 경과 시간에서 나오고, 방문자가 보낸 말과 답장은 범위별로 쌓인다
export function useGameChat({
  elapsed,
  openerAt,
  teammate,
  opener,
  reply,
  onSent,
}: {
  elapsed: number;
  openerAt: number;
  teammate: string;
  opener: string;
  reply: string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("team");
  const [input, setInput] = useState("");
  const [sent, setSent] = useState<Record<Scope, GameChatMessage[]>>({ team: [], all: [] });
  const [seen, setSeen] = useState(0);

  const openerMessage: GameChatMessage = { mine: false, name: teammate, text: opener, time: "14:31" };
  const messages: Record<Scope, GameChatMessage[]> = {
    team: elapsed >= openerAt ? [openerMessage, ...sent.team] : sent.team,
    all: sent.all,
  };
  const others = [...messages.team, ...messages.all].filter((m) => !m.mine).length;
  // 열어 둔 동안 온 메시지는 읽은 것으로 친다
  if (open && seen !== others) setSeen(others);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const current = scope;
    setInput("");
    setSent((prev) => ({ ...prev, [current]: [...prev[current], { mine: true, text, time: "14:32" }] }));
    onSent();
    window.setTimeout(() => {
      setSent((prev) => ({
        ...prev,
        [current]: [...prev[current], { mine: false, name: teammate, text: reply, time: "14:32" }],
      }));
    }, 1200);
  };

  return {
    open,
    setOpen,
    scope,
    setScope,
    input,
    setInput,
    messages,
    send,
    unread: Math.max(0, others - seen),
    // 첫 메시지만 말풍선으로 띄운다. 답장은 채팅을 열어 둔 동안 온다
    preview: !open && seen === 0 && elapsed >= openerAt && elapsed < openerAt + PREVIEW_SECONDS ? openerMessage : null,
  };
}

export type GameChat = ReturnType<typeof useGameChat>;

// 오른쪽 세 번째 버튼 (game_page.dart _buildChatButton: 56, radius 16, 아이콘 32, 빨강 배지)
export function GameChatButton({ chat, dark }: { chat: GameChat; dark: boolean }) {
  const { app } = useDemoCopy();
  return (
    <button
      type="button"
      aria-label={app.chatScopeTeam}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => chat.setOpen(true)}
      className="relative flex size-[56px] items-center justify-center rounded-[16px] transition-transform active:scale-95"
      style={
        dark
          ? { backgroundColor: appColors.black, boxShadow: "1px 1px 8px rgba(8,10,12,0.4)" }
          : { backgroundColor: appColors.white, boxShadow: "1px 1px 8px rgba(8,10,12,0.1)" }
      }
    >
      <TintIcon src="/demo/icon_comment.svg" size={32} color={dark ? appColors.green : appColors.blue} />
      {chat.unread > 0 && (
        <span
          className="absolute right-[-2px] top-[-2px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-[4px] text-[10px] text-white"
          style={{ backgroundColor: appColors.red }}
        >
          {chat.unread}
        </span>
      )}
    </button>
  );
}

// 새 메시지 말풍선 (chat_preview_card.dart: 12/8 패딩, 오른쪽 아래만 4 라운드, 눌러서 채팅 열기)
export function GameChatPreview({ chat, dark }: { chat: GameChat; dark: boolean }) {
  const { app } = useDemoCopy();
  const message = chat.preview;
  if (!message) return null;
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => chat.setOpen(true)}
      className="demo-chat-preview absolute bottom-[72px] right-[84px] max-w-[230px] px-[12px] py-[8px] text-left"
      style={{ backgroundColor: dark ? appColors.black : appColors.white, borderRadius: "12px 12px 4px 12px" }}
    >
      <span className="flex items-center gap-[4px]">
        <Image
          src={`/demo/icon_role_${dark ? "robber" : "police"}_${dark ? "dark" : "light"}.svg`}
          alt=""
          width={12}
          height={12}
        />
        <span className="truncate text-[12px]" style={{ color: dark ? appColors.black400 : appColors.black600 }}>
          {message.name}
        </span>
        <span className="shrink-0 text-[12px]" style={{ color: dark ? appColors.green : appColors.blue }}>
          {app.chatPreviewTagTeam}
        </span>
      </span>
      <span className="mt-[2px] line-clamp-2 block text-[14px]" style={{ color: dark ? appColors.white : appColors.black }}>
        {message.text}
      </span>
    </button>
  );
}

// 전체 화면 채팅. 지도 영역을 덮어 앱바는 그대로 남는다(뒤로 버튼은 앱바에 있다)
export function GameChatPanel({ chat, dark }: { chat: GameChat; dark: boolean }) {
  const { app } = useDemoCopy();
  const listRef = useRef<HTMLDivElement>(null);
  const list = chat.messages[chat.scope];
  const canSend = chat.input.trim().length > 0;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [list.length, chat.scope, chat.open]);

  if (!chat.open) return null;
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col"
      style={{ backgroundColor: dark ? appColors.black900 : appColors.black100 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 p-[16px]" style={{ backgroundColor: dark ? appColors.black900 : appColors.white }}>
        <SegmentedToggle
          labels={[app.chatScopeTeam, app.chatScopeAll]}
          selected={chat.scope === "team" ? 0 : 1}
          onSelect={(i) => chat.setScope(i === 0 ? "team" : "all")}
          dark={dark}
        />
      </div>
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[16px] py-[12px]">
        {list.map((message, i) => (
          <Bubble
            key={i}
            side={message.mine ? "right" : "left"}
            name={message.mine ? undefined : message.name}
            time={message.time}
            dark={dark}
          >
            {message.text}
          </Bubble>
        ))}
      </div>
      {/* 입력 (community_message_input.dart: 14, 칸 라운드 12, 40 탭 영역 안의 24 전송 아이콘) */}
      <div
        className="flex shrink-0 items-center gap-[4px] py-[8px] pl-[16px] pr-[8px] pb-[34px]"
        style={{ backgroundColor: dark ? appColors.black900 : appColors.white }}
      >
        <input
          value={chat.input}
          onChange={(e) => chat.setInput(e.target.value)}
          onKeyDown={(e) => {
            // 한글 조합 중 Enter 는 신호가 두 번 와서 마지막 글자가 한 번 더 간다
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Enter") chat.send();
          }}
          placeholder={chat.scope === "team" ? app.chatTeamHint : app.chatAllHint}
          className="select-text min-w-0 flex-1 rounded-[12px] px-[16px] py-[12px] text-[14px] outline-none placeholder:text-[#93A2B3]"
          style={{
            backgroundColor: dark ? appColors.black800 : appColors.black100,
            color: dark ? appColors.white : appColors.black,
            caretColor: dark ? appColors.green : appColors.blueVer2Basic,
          }}
        />
        <button type="button" onClick={chat.send} className="flex size-[40px] shrink-0 items-center justify-center">
          <TintIcon
            src="/demo/icon_sending.svg"
            size={24}
            color={canSend ? (dark ? appColors.green : appColors.blueVer2Basic) : appColors.black400}
          />
        </button>
      </div>
    </div>
  );
}

// 좌표 격자 (zone_grid.dart, google_map_view.dart, grid_label_marker_factory.dart).
// 구역을 담는 정사각형을 칸으로 나눈다. 앱은 칸 크기를 50~1000m 후보에서 고르고, 데모의 500m 원은 100m 칸 10줄이다.
// 선은 두께 1(black400, 도둑 black600), 라벨은 12 semibold(black700, 도둑 black200)에 흰/검정 헤일로다
const GRID_SIZE = 10;

export function GameZoneGrid({ size, top, dark }: { size: number; top: string; dark: boolean }) {
  const cell = size / GRID_SIZE;
  const center = size / 2;
  const line = dark ? appColors.black600 : appColors.black400;
  const halo = dark ? appColors.black : appColors.white;
  const fill = dark ? appColors.black200 : appColors.black700;
  const indices = Array.from({ length: GRID_SIZE }, (_, i) => i);
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ top }}
    >
      {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
        <g key={i} stroke={line} strokeWidth="1">
          <line x1={i * cell} y1="0" x2={i * cell} y2={size} />
          <line x1="0" y1={i * cell} x2={size} y2={i * cell} />
        </g>
      ))}
      {indices.flatMap((row) =>
        indices.map((col) => {
          const x = (col + 0.5) * cell;
          const y = (row + 0.5) * cell;
          // 구역에 걸친 칸에만 라벨을 쓴다
          if (Math.hypot(x - center, y - center) > center) return null;
          return (
            <text
              key={`${row}-${col}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="12"
              fontWeight="600"
              fill={fill}
              stroke={halo}
              strokeWidth="3"
              paintOrder="stroke"
            >
              {`${String.fromCharCode(65 + col)}${row + 1}`}
            </text>
          );
        }),
      )}
    </svg>
  );
}
