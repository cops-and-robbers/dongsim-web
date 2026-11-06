"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { WebgameMode } from "@/lib/admin/webgame";

// 온라인 게임 설정 옆의 가로 폰. 고르는 값이 게임 첫 화면에 어떻게 나오는지 실제 게임 화면으로 보여 준다.
// 화면은 게임 저장소(cops-and-robbers-web-game) client/shell.html 의 #gate, #home 시트를 옮겼다.
// 크기는 폰 가로 화면(844x390)에서 게임이 실제로 고르는 값이고, 틀 크기에 맞춰 통째로 줄인다.
// 그림(배경, 로고, 캐릭터, 아이콘)은 게임 것을 그대로 복사해 public/admin/webgame 에 두었다.

const W = 844;
const H = 390;
const ASSET = "/admin/webgame";

// 고른 값이 나오는 자리 표시. 게임에는 없는 관리자용 테두리다(앱 설정 미리보기와 같은 표시)
const SPOT = "rounded-[10px] outline outline-[3px] outline-offset-[4px] outline-[#339DFF]";

// 게임 첫 화면 색(shell.html :root)
const INK = "#1D232B";
const SUB = "#545E6E";
const APP_SUB = "#5D6F83";
const APP_BLUE = "#0088FF";

/** 게임(client/net.js untilText)과 같은 규칙: 10분 단위 어림, 같은 날이면 날짜를 빼고 "오후 9시 30분쯤" */
export function untilPhrase(iso: string | null, now: number): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime()) || t.getTime() <= now) return "";
  t.setMinutes(Math.round(t.getMinutes() / 10) * 10, 0, 0);
  // 운영진과 사용자 모두 한국 시간으로 본다
  const kst = (d: Date) => new Date(d.getTime() + 9 * 3600_000);
  const k = kst(t), today = kst(new Date(now));
  const sameDay = k.getUTCFullYear() === today.getUTCFullYear() && k.getUTCMonth() === today.getUTCMonth() && k.getUTCDate() === today.getUTCDate();
  const h = k.getUTCHours(), m = k.getUTCMinutes(), h12 = h % 12 || 12;
  return `${sameDay ? "" : `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 `}${h < 12 ? "오전" : "오후"} ${h12}시${m ? ` ${m}분` : ""}쯤`;
}

/** 점검 화면 본문. 게임(client/net.js showGate)과 같은 순서로 고른다 */
export function pauseLines(message: string, until: string | null, now: number): string[] {
  const when = untilPhrase(until, now);
  return [message, when ? `${when} 다시 와 주세요` : message ? "" : "조금 뒤에 다시 와 주세요"].filter(Boolean);
}

export function GamePreview({ mode, message, until, now }: { mode: WebgameMode; message: string; until: string | null; now: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // 틀 폭에 맞춰 게임 화면을 통째로 줄인다. 글자 크기를 따로 줄이면 게임과 줄바꿈이 달라진다
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="rounded-[26px] bg-slate-900 p-[9px] shadow-[0_30px_60px_-30px_rgba(15,23,42,0.45)] ring-1 ring-black/5 dark:ring-white/15">
      <div ref={boxRef} className="relative w-full overflow-hidden rounded-[18px] bg-[#A6D8FF]" style={{ aspectRatio: `${W} / ${H}` }}>
        <div
          aria-hidden
          className="absolute left-0 top-0 origin-top-left select-none"
          style={{ width: W, height: H, transform: `scale(${scale})`, color: INK, fontFamily: "Pretendard, 'Pretendard Fallback', system-ui, sans-serif" }}
        >
          <img src={`${ASSET}/bg.svg`} alt="" className="absolute inset-0 h-full w-full" />
          <div className="relative flex h-full items-center justify-center" style={{ gap: 42, padding: "14px 20px" }}>
            <Hero />
            {mode === "open" ? <HomeCard /> : <GateCard mode={mode} message={message} until={until} now={now} />}
          </div>
        </div>
        {/* 화면 읽기 프로그램에는 그림 대신 무엇이 보이는지 글로 알린다 */}
        <p className="sr-only">{describe(mode, message, until, now)}</p>
      </div>
    </div>
  );
}

function describe(mode: WebgameMode, message: string, until: string | null, now: number) {
  if (mode === "open") return "게임 첫 화면: 방 만들기, 코드로 들어가기, 혼자 해 보기";
  if (mode === "soon") return "공개 전 화면: 경찰과 도둑 온라인 게임을 만들고 있어요";
  return `점검 화면: 점검하고 있어요. ${pauseLines(message, until, now).join(" ")}`;
}

// 왼쪽 로고와 냥파, 도둥이(.hero). 폰 가로 화면에서 로고 257px, 캐릭터 156px, 말풍선 11px 이다
function Hero() {
  return (
    <div className="flex flex-col items-center" style={{ gap: 12 }}>
      <img src={`${ASSET}/logo-ko.svg`} alt="" style={{ width: 257, height: "auto" }} />
      <div className="relative" style={{ paddingTop: 31 }}>
        <div
          className="absolute bg-white font-extrabold"
          style={{ left: "-4%", top: 0, borderRadius: 16, padding: "7px 12px 8px", fontSize: 11, lineHeight: 1.35, boxShadow: "0 3px 0 rgba(29,35,43,.14)", transform: "rotate(-4deg)" }}
        >
          누가 내 치즈
          <br />
          훔쳐갔어!!!!🧀
          <span className="absolute" style={{ left: 34, bottom: -8, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "9px solid #fff" }} />
        </div>
        <img src={`${ASSET}/pair.svg`} alt="" style={{ height: 156, width: "auto" }} />
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white text-left" style={{ width: 360, padding: 14, borderRadius: 24, boxShadow: "0 0 10px rgba(0,0,0,.07)" }}>
      {children}
    </div>
  );
}

// 공개 전, 점검 중(#gate). 값이 나오는 제목과 본문에 파란 테두리를 친다
function GateCard({ mode, message, until, now }: { mode: Exclude<WebgameMode, "open">; message: string; until: string | null; now: number }) {
  const soon = mode === "soon";
  const lines = soon ? ["동네에서 직접 뛰는 경찰과 도둑도 눈여겨봐 주세요"] : pauseLines(message, until, now);
  return (
    <Card>
      <h1 className="m-0 font-black" style={{ fontSize: 24, lineHeight: 1.3, wordBreak: "keep-all" }}>
        {soon ? "경찰과 도둑 온라인 게임을 만들고 있어요" : "점검하고 있어요"}
      </h1>
      <div className={soon ? "" : SPOT} style={{ marginTop: 6 }}>
        {lines.map((line) => (
          <p key={line} className="m-0" style={{ fontSize: 15, lineHeight: 1.55, color: SUB, wordBreak: "keep-all" }}>
            {line}
          </p>
        ))}
      </div>
      <div className="flex items-center justify-center font-extrabold text-white" style={{ minHeight: 52, marginTop: 18, borderRadius: 14, background: APP_BLUE, fontSize: 16 }}>
        앱 구경하기
      </div>
    </Card>
  );
}

// 누구나(#home). 열린 방 미리보기는 그때그때 달라 그리지 않는다
function HomeCard() {
  const button = "flex items-center justify-center font-extrabold";
  return (
    <Card>
      <div className="flex flex-col" style={{ gap: 8 }}>
        <div className={`${button} text-white`} style={{ minHeight: 46, gap: 8, borderRadius: 14, background: APP_BLUE, fontSize: 15 }}>
          <img src={`${ASSET}/siren.svg`} alt="" style={{ height: 20, width: "auto" }} />방 만들기
        </div>
        <div className={`${button} bg-white`} style={{ minHeight: 46, gap: 8, borderRadius: 14, border: "1px solid #E3E8ED", color: APP_SUB, fontSize: 15 }}>
          <img src={`${ASSET}/door.svg`} alt="" style={{ height: 20, width: "auto" }} />코드로 들어가기
        </div>
        <div className="flex items-center bg-white" style={{ gap: 12, minHeight: 60, marginTop: 4, padding: "8px 14px 8px 10px", borderRadius: 14, border: "1px solid #E3E8ED" }}>
          <img src={`${ASSET}/console.svg`} alt="" style={{ width: 40, height: 40, padding: 6, borderRadius: 12, background: "#EEF1FF" }} />
          <span className="flex-1">
            <b className="block font-extrabold" style={{ fontSize: 15 }}>
              혼자 해 보기
            </b>
            <small className="block font-bold" style={{ marginTop: 1, fontSize: 12, color: SUB }}>
              봇이랑 바로 한 판
            </small>
          </span>
          <i style={{ width: 9, height: 9, borderRight: "2.5px solid #9AA3B0", borderTop: "2.5px solid #9AA3B0", transform: "rotate(45deg)", marginRight: 4 }} />
        </div>
      </div>
    </Card>
  );
}
