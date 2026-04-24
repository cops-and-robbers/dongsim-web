"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const SHOEPRINT_PATH =
  "M8.23193 1.12012C8.84587 1.12012 9.42985 1.32601 9.98389 1.73779C10.5379 2.14209 11.0321 2.67367 11.4663 3.33252C11.908 3.98389 12.2524 4.69141 12.4995 5.45508C12.7541 6.21875 12.8813 6.95996 12.8813 7.67871C12.8813 8.13542 12.8252 8.71566 12.7129 9.41943C12.6081 10.1157 12.4434 10.8607 12.2188 11.6543C11.9941 12.4404 11.7022 13.1929 11.3428 13.9116H5.13232C4.77295 13.1929 4.48096 12.4404 4.25635 11.6543C4.03174 10.8607 3.86328 10.1157 3.75098 9.41943C3.64616 8.71566 3.59375 8.13542 3.59375 7.67871C3.59375 6.95996 3.71729 6.21875 3.96436 5.45508C4.21891 4.69141 4.56331 3.98389 4.99756 3.33252C5.4318 2.67367 5.92594 2.14209 6.47998 1.73779C7.0415 1.32601 7.62549 1.12012 8.23193 1.12012ZM8.24316 20.5151C7.36719 20.5151 6.6971 20.1221 6.23291 19.3359C5.7762 18.5498 5.54785 17.5391 5.54785 16.3037C5.54785 16.1839 5.5516 16.0454 5.55908 15.8882C5.57406 15.731 5.59277 15.585 5.61523 15.4502H10.8711C10.8936 15.585 10.9085 15.731 10.916 15.8882C10.931 16.0454 10.9385 16.1839 10.9385 16.3037C10.9385 17.1273 10.8337 17.8573 10.624 18.4937C10.4219 19.1226 10.1187 19.6167 9.71436 19.9761C9.31755 20.3355 8.82715 20.5151 8.24316 20.5151ZM21.877 8.49854C22.4535 8.70817 22.9326 9.10124 23.3145 9.67774C23.6963 10.2467 23.9771 10.9131 24.1567 11.6768C24.3439 12.4404 24.4263 13.2266 24.4038 14.0352C24.3814 14.8363 24.2466 15.57 23.9995 16.2363C23.8423 16.6781 23.5915 17.2096 23.2471 17.8311C22.9102 18.445 22.4984 19.0851 22.0117 19.7515C21.5326 20.4103 21.001 21.0205 20.417 21.582L14.5771 19.4595C14.4948 18.6584 14.4798 17.8498 14.5322 17.0337C14.5921 16.2101 14.6895 15.4502 14.8242 14.7539C14.9665 14.0576 15.1162 13.4961 15.2734 13.0693C15.5205 12.3955 15.8911 11.7441 16.3853 11.1152C16.8869 10.4788 17.4522 9.92855 18.0811 9.46436C18.7174 9.00016 19.3651 8.67074 20.0239 8.47608C20.6903 8.28141 21.3079 8.2889 21.877 8.49854ZM15.251 26.7256C14.4274 26.4186 13.9333 25.8159 13.7686 24.9175C13.6113 24.0265 13.7424 23.0008 14.1616 21.8403C14.1991 21.728 14.2515 21.6008 14.3188 21.4585C14.3862 21.3088 14.4536 21.174 14.521 21.0542L19.4624 22.8623C19.4325 22.9971 19.395 23.1393 19.3501 23.2891C19.3127 23.4463 19.2715 23.5811 19.2266 23.6934C18.8073 24.8464 18.2458 25.7148 17.542 26.2988C16.8382 26.8828 16.0745 27.0251 15.251 26.7256Z";

type FrameProps = {
  children: ReactNode;
  className?: string;
};

export function PhoneFrame({ children, className = "" }: FrameProps) {
  return (
    <div
      className={`relative mx-auto aspect-9/19 w-full max-w-75 rounded-[2.5rem] bg-slate-900 p-2 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/5 ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-4xl bg-white">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
        <div className="absolute left-0 right-0 top-0 flex h-9 items-center justify-between px-6 pt-2 text-[10px] font-semibold text-slate-600">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1 w-1 rounded-full bg-slate-400" />
            <span className="inline-block h-1 w-1 rounded-full bg-slate-400" />
            <span className="inline-block h-1 w-1 rounded-full bg-slate-400" />
          </span>
        </div>
        <div className="absolute inset-0 pt-10">{children}</div>
      </div>
    </div>
  );
}

function MapBase() {
  return (
    <svg
      viewBox="0 0 280 560"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <rect width="280" height="560" fill="#F8FAFC" />
      <g stroke="#E2E8F0" strokeWidth="1.2" fill="none">
        <path d="M0 120 L280 90" />
        <path d="M0 260 L280 230" />
        <path d="M0 400 L280 370" />
        <path d="M0 500 L280 475" />
        <path d="M60 0 L50 560" />
        <path d="M140 0 L130 560" />
        <path d="M210 0 L220 560" />
      </g>
      <g fill="#EEF2F6">
        <rect x="30" y="140" width="40" height="50" rx="3" />
        <rect x="160" y="220" width="60" height="40" rx="3" />
        <rect x="70" y="400" width="50" height="40" rx="3" />
        <rect x="180" y="440" width="40" height="60" rx="3" />
      </g>
    </svg>
  );
}

function Shoeprints({
  points,
}: {
  points: { x: number; y: number; r: number; size: number }[];
}) {
  return (
    <svg
      viewBox="0 0 280 560"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <symbol id="pm-shoeprint" viewBox="0 0 28 28">
          <path d={SHOEPRINT_PATH} fill="currentColor" />
        </symbol>
      </defs>
      <g color="#1E293B">
        {points.map((p, i) => (
          <use
            key={i}
            href="#pm-shoeprint"
            width={p.size}
            height={p.size}
            transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}
            className="mockup-footprint"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </g>
    </svg>
  );
}

export function ZoneMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`relative h-full w-full ${visible ? "is-playing" : ""}`}
    >
      <MapBase />
      <svg
        viewBox="0 0 280 560"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <circle
          cx="140"
          cy="280"
          r="108"
          fill="#3F63D9"
          fillOpacity="0.08"
          stroke="#3F63D9"
          strokeWidth="2.4"
          strokeDasharray="6 6"
          className="mockup-zone-ring"
        />
        <circle cx="140" cy="280" r="4" fill="#3F63D9" />
        <g transform="translate(195 200)">
          <rect x="-16" y="-14" width="32" height="28" rx="4" fill="#0F172A" />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#F5EF38"
          >
            JAIL
          </text>
        </g>
      </svg>
      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white px-3 py-2 shadow-md ring-1 ring-slate-200">
        <p className="text-[10px] font-medium text-slate-400">플레이 구역</p>
        <p className="mt-0.5 text-xs font-bold text-slate-900">
          반경 200m · 공원
        </p>
      </div>
    </div>
  );
}

export function LocationMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`relative h-full w-full ${visible ? "is-playing" : ""}`}
    >
      <MapBase />
      <Shoeprints
        points={[
          { x: 80, y: 440, r: 10, size: 18 },
          { x: 108, y: 410, r: -5, size: 18 },
          { x: 135, y: 375, r: -15, size: 20 },
          { x: 158, y: 340, r: -25, size: 20 },
          { x: 175, y: 300, r: -40, size: 22 },
          { x: 185, y: 260, r: -55, size: 22 },
        ]}
      />
      <div className="absolute inset-x-3 top-3 rounded-xl bg-white px-3 py-2 shadow-md ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-slate-400">
            도둑 발자국 · 마지막 공개
          </p>
          <span className="font-mono text-[10px] font-bold tabular-nums text-slate-900">
            00:24
          </span>
        </div>
        <p className="mt-0.5 text-xs font-bold text-slate-900">3분 뒤 갱신</p>
      </div>
    </div>
  );
}

export function QrMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`relative flex h-full w-full flex-col items-center bg-[#F8FAFC] pt-[17%] ${visible ? "is-playing" : ""}`}
    >
      <p className="text-[13px] font-semibold text-slate-900">
        홍길동 님의 QR
      </p>
      <p className="mt-1 text-[10px] text-slate-500">경찰에게 보여주세요</p>
      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="relative h-36 w-36 overflow-hidden">
          <Image
            src="/demo-qr.svg"
            alt="QR 코드"
            width={144}
            height={144}
            className="h-36 w-36"
            aria-hidden="true"
          />
          <div
            aria-hidden="true"
            className="mockup-qr-scan pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-brand-blue to-transparent shadow-[0_0_10px_rgba(63,99,217,0.7)]"
          />
        </div>
      </div>
    </div>
  );
}

export function ChatMockup() {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`flex h-full flex-col bg-slate-50 ${visible ? "is-playing" : ""}`}
    >
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-slate-400">경찰팀 채널</p>
          <span className="font-mono text-[10px] text-slate-400">· 4명</span>
        </div>
        <p className="mt-0.5 text-sm font-bold text-slate-900">팀 채팅</p>
      </div>
      <div className="mockup-chat-bubbles flex flex-1 flex-col gap-2 px-3 py-4">
        <Bubble side="left" name="상희">
          공원 입구로 집결하자
        </Bubble>
        <Bubble side="left" name="혜림">
          도둑 2명 북쪽 근처
        </Bubble>
        <Bubble side="right">돌아서 접근할게</Bubble>
        <Bubble side="left" name="지희">
          1명 체포 완료
        </Bubble>
        <Bubble side="right">굿, 나머지 찾는 중</Bubble>
      </div>
      <div className="border-t border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
          <span className="text-[10px] text-slate-400">메시지 입력</span>
          <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[9px] font-bold text-white">
            ↑
          </span>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  side,
  name,
  children,
}: {
  side: "left" | "right";
  name?: string;
  children: ReactNode;
}) {
  if (side === "right") {
    return (
      <div className="mockup-chat-bubble self-end">
        <div className="rounded-2xl rounded-br-sm bg-brand-blue px-3 py-1.5 text-[11px] text-white">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="mockup-chat-bubble max-w-[80%]">
      {name && (
        <p className="mb-0.5 text-[9px] font-semibold text-slate-400">{name}</p>
      )}
      <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-1.5 text-[11px] text-slate-700 shadow-sm ring-1 ring-slate-200">
        {children}
      </div>
    </div>
  );
}
