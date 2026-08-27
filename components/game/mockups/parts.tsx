import Image from "next/image";
import { ReactNode } from "react";
import { appColors } from "@/lib/app-tokens";

// 실제 지도 데이터 없이 지도 느낌만 낸다. 부모를 가득 채운다.
// [night] 는 도둑 시점(다크)의 어두운 지도 스타일이다.
export function FakeMap({
  night = false,
  dim = false,
}: {
  night?: boolean;
  dim?: boolean;
}) {
  const c = night
    ? { bg: "#22262B", block: "#2C3138", park: "#24352B", road: "#3A4048" }
    : { bg: "#E9EDF1", block: "#DFE5EA", park: "#D7E8D4", road: "#FFFFFF" };
  return (
    <svg
      viewBox="0 0 393 620"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="393" height="620" fill={c.bg} />
      <rect x="24" y="30" width="120" height="88" rx="8" fill={c.block} />
      <rect x="170" y="-10" width="150" height="128" rx="8" fill={c.block} />
      <rect x="24" y="152" width="90" height="120" rx="8" fill={c.block} />
      <rect x="140" y="152" width="130" height="130" rx="10" fill={c.park} />
      <rect x="60" y="320" width="180" height="110" rx="10" fill={c.block} />
      <rect x="280" y="330" width="120" height="140" rx="10" fill={c.block} />
      <path d="M0 136 H393" stroke={c.road} strokeWidth="12" />
      <path d="M158 0 V620" stroke={c.road} strokeWidth="10" />
      <path d="M276 124 V620" stroke={c.road} strokeWidth="8" />
      <path d="M0 300 H393" stroke={c.road} strokeWidth="10" />
      <path d="M0 470 H393" stroke={c.road} strokeWidth="8" />
      {dim && <rect width="393" height="620" fill="rgba(0,0,0,0.6)" />}
    </svg>
  );
}

// 플레이 구역 원. 설정 화면은 채움(파랑 16%) + blue800 테두리
// (pin_zone_setting_widget.dart), 인게임은 테두리만 (game_page.dart).
export function ZoneCircle({
  size,
  left = "50%",
  top = "50%",
  filled = true,
  stroke = appColors.blue800,
}: {
  size: number;
  left?: string;
  top?: string;
  filled?: boolean;
  stroke?: string;
}) {
  return (
    <span
      className="mockup-zone-ring absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
      style={{
        width: size,
        height: size,
        left,
        top,
        backgroundColor: filled ? `${appColors.blue}29` : "transparent",
        borderColor: stroke,
      }}
    />
  );
}

// 앱의 전송 화살표를 색 지정이 가능하게 인라인으로 그린 것.
// 앱은 icon_arrow 를 -90도 회전해 위로 향하게 쓴다 (chat_input_bar.dart).
function ArrowUpIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="-rotate-90"
      aria-hidden="true"
    >
      <path
        d="M4 12h13M12 5l7 7-7 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// 채팅 입력 필드 + 전송 버튼 (chat_input_bar.dart 실측값).
// 라이트: 흰 필드 + 대기 black200 원 / 다크: 검정 필드 + 대기 black900 원.
export function ChatInputField({ hint, dark }: { hint: string; dark: boolean }) {
  return (
    <div
      className="flex min-h-[48px] items-center gap-[8px] rounded-[12px] py-[6px] pl-[20px] pr-[12px]"
      style={{ backgroundColor: dark ? appColors.black : appColors.white }}
    >
      <span
        className="flex-1 text-[16px] font-medium"
        style={{ color: dark ? appColors.black200 : appColors.black400 }}
      >
        {hint}
      </span>
      <span
        className="flex size-[32px] shrink-0 items-center justify-center self-end rounded-full"
        style={{
          backgroundColor: dark ? appColors.black900 : appColors.black200,
        }}
      >
        <ArrowUpIcon
          size={20}
          color={dark ? appColors.black400 : appColors.white}
        />
      </span>
    </div>
  );
}

// 접힌 채팅 시트 - 인게임 화면 하단에 항상 붙어 있다 (chat_overlay.dart 최소 스냅).
// 드래그 핸들 + 입력바 + 홈 인디케이터 영역까지가 한 덩어리다.
export function CollapsedChatSheet({
  hint,
  dark,
}: {
  hint: string;
  dark: boolean;
}) {
  return (
    <div
      className="shrink-0 rounded-t-[20px] shadow-[0_-8px_24px_rgba(15,23,42,0.35)]"
      style={{
        backgroundColor: dark ? appColors.black900 : appColors.black100,
      }}
    >
      <SheetHandle dark={dark} />
      <div className="px-[20px] pb-[8px]">
        <ChatInputField hint={hint} dark={dark} />
      </div>
      <div className="h-[34px]" />
    </div>
  );
}

// 시트 드래그 핸들: 높이 28 영역에 48x4 바 (chat_overlay.dart)
export function SheetHandle({ dark }: { dark: boolean }) {
  return (
    <div className="flex h-[28px] shrink-0 items-center justify-center">
      <div
        className="h-[4px] w-[48px] rounded-[2px]"
        style={{
          backgroundColor: dark ? appColors.black600 : appColors.black200,
        }}
      />
    </div>
  );
}

// 앱 ChatBubble 실측값 그대로. 내 메시지는 오른쪽 아래, 상대는 왼쪽 아래 꼬리(4).
// 라이트: 흰 바탕 + 검정 / 다크(도둑): 검정 바탕 + 흰 글자 (chat_message_bubble.dart).
export function Bubble({
  side,
  name,
  time,
  dark = false,
  children,
}: {
  side: "left" | "right";
  name?: string;
  time?: string;
  dark?: boolean;
  children: ReactNode;
}) {
  const isMe = side === "right";
  const bubble = (
    <div
      className="max-w-[275px] px-[12px] py-[8px] text-[14px] leading-[1.4]"
      style={{
        backgroundColor: dark ? appColors.black : appColors.white,
        color: dark ? appColors.white : appColors.black,
        borderRadius: isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
      }}
    >
      {children}
    </div>
  );
  const timeLabel = time ? (
    <span
      className="shrink-0 pb-[2px] text-[10px]"
      style={{ color: appColors.black400 }}
    >
      {time}
    </span>
  ) : null;
  return (
    <div
      className={`mockup-chat-bubble flex flex-col ${isMe ? "items-end" : "items-start"}`}
    >
      {name && (
        <p
          className="mb-[4px] flex items-center gap-[4px] text-[12px] font-semibold"
          style={{ color: dark ? appColors.black400 : appColors.black600 }}
        >
          <Image
            src={
              dark
                ? "/app-icons/mdi_robber_darkmode.svg"
                : "/app-icons/icon_police_lightmode.svg"
            }
            alt=""
            width={12}
            height={12}
          />
          {name}
        </p>
      )}
      <div className="flex items-end gap-[4px]">
        {isMe ? (
          <>
            {timeLabel}
            {bubble}
          </>
        ) : (
          <>
            {bubble}
            {timeLabel}
          </>
        )}
      </div>
    </div>
  );
}

// 가짜 QR. 파인더 3개 + 결정적 모듈 배치로 QR 느낌만 낸다.
const QR_ROWS = [
  "1111111010011111111",
  "1000001001101000001",
  "1011101110101011101",
  "1011101010001011101",
  "1011101101101011101",
  "1000001011001000001",
  "1111111010101111111",
  "0000000110100000000",
  "1101011011011011010",
  "0110100101100101101",
  "1011011010011010110",
  "0000000101101011010",
  "1111111011010110101",
  "1000001101101101011",
  "1011101010110010110",
  "1011101101011101101",
  "1011101011010110011",
  "1000001110101011010",
  "1111111011011010110",
];

export function FakeQr({ size }: { size: number }) {
  const cell = size / QR_ROWS.length;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
    >
      {QR_ROWS.flatMap((row, y) =>
        row.split("").map((bit, x) =>
          bit === "1" ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell + 0.2}
              height={cell + 0.2}
              fill={appColors.black}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
