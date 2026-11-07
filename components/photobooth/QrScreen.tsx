/* eslint-disable @next/next/no-img-element */
"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SITE_URL } from "@/lib/constants";
import type { FrameDef } from "./frames";
import { Copy, useKiosk } from "./KioskContext";
import type { IssuedStrip } from "./PreviewScreen";

export default function QrScreen({
  issued,
  frame,
  onRestart,
  demo = false,
}: {
  issued: IssuedStrip;
  /** 인쇄 가장자리 띠를 이 프레임 대표색으로 채운다 */
  frame: FrameDef;
  onRestart: () => void;
  /** 어드민 미리보기: 처음 화면으로 돌아가지도, 저절로 인쇄하지도 않는다 */
  demo?: boolean;
}) {
  const [qr, setQr] = useState<string | null>(null);
  // 받는 방법, 용지, 보정, 돌아가는 시간은 행사 설정(#221). 프린터가 없는 행사는 인쇄 버튼을 빼요
  const { kiosk, chars } = useKiosk();
  const printing = kiosk.receive === "print";
  const paper = kiosk.paper;
  const overscanScale = kiosk.overscan / 100;
  // 인쇄는 스트립 원본 그대로 - QR은 화면에서만 보여준다(팀 결정, #123).
  // 프레임 하단 밴드가 로고·캐릭터로 차 있어 QR을 얹으면 그림을 해쳐서다.
  // blob은 이 화면이 떠 있는 동안 바뀌지 않으므로(phase 전환 시 리마운트)
  // 초기화 한 번이면 된다 - effect에서 setState 하면 린트가 막는 패턴이기도 하다.
  const [printUrl] = useState(() => URL.createObjectURL(issued.blob));
  // 손님 폰이 열 주소 - 전체 URL 대신 오브젝트 키만 담아 QR을 성기게 만든다 (#123).
  const target = `${SITE_URL}/p?k=${encodeURIComponent(issued.key)}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(target, {
      width: 520,
      margin: 2,
      color: { dark: "#0f1a33", light: "#ffffff" },
    })
      .then((d) => {
        if (!cancelled) setQr(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => () => URL.revokeObjectURL(printUrl), [printUrl]);

  // 다음 손님을 위해 일정 시간 뒤 처음 화면으로.
  const onRestartRef = useRef(onRestart);
  useEffect(() => {
    onRestartRef.current = onRestart;
  });
  useEffect(() => {
    if (demo) return;
    const id = window.setTimeout(() => onRestartRef.current(), kiosk.restartSec * 1000);
    return () => window.clearTimeout(id);
  }, [kiosk.restartSec, demo]);

  // 저절로 인쇄: 화면이 뜨고 인쇄용 그림이 준비되면 한 번. 키오스크 크롬을 --kiosk-printing 으로 띄워야 다이얼로그 없이 나간다
  useEffect(() => {
    if (demo || !printing || !kiosk.autoPrint) return;
    const id = window.setTimeout(() => window.print(), 800);
    return () => window.clearTimeout(id);
  }, [printing, kiosk.autoPrint, demo]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <img src={chars.cop} alt="" className="h-12 w-auto sm:h-14" />
        <h2 className="text-2xl font-extrabold text-brand-ink sm:text-3xl dark:text-white">
          <Copy k="qr.title" />
        </h2>
        <img src={chars.thief} alt="" className="h-12 w-auto sm:h-14" />
      </div>

      <p className="mb-6 text-lg text-slate-500 dark:text-slate-400">
        <Copy k="qr.body" />
      </p>

      <div className="rounded-3xl bg-white p-5 shadow-2xl ring-4 ring-brand-blue/20">
        {qr ? (
          <img src={qr} alt="사진 다운로드 QR" className="h-64 w-64 sm:h-72 sm:w-72" />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center text-slate-400 sm:h-72 sm:w-72">
            QR 만드는 중…
          </div>
        )}
      </div>

      <p className="mt-6 text-base font-medium text-brand-blue">
        <Copy k="qr.keep" />
      </p>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onRestart}
          className="rounded-full border border-slate-300 px-10 py-4 text-lg font-bold text-slate-600 transition active:scale-95 dark:border-app-black-800 dark:text-slate-300"
        >
          <Copy k="qr.restart" />
        </button>
        {printing && (
          <button
            onClick={() => window.print()}
            className="rounded-full bg-brand-blue px-10 py-4 text-lg font-bold text-white shadow-lg shadow-brand-blue/30 transition active:scale-95"
          >
            <Copy k="qr.print" />
          </button>
        )}
      </div>

      {/*
        인쇄 전용 트리: 화면에는 절대 안 보이고, 인쇄 시에는 이것만 보인다.
        @page 규칙(스트립 용지)이 사이트의 다른 인쇄(블로그 등)를 오염시키지
        않도록, 스타일도 이 화면이 떠 있는 동안에만 존재하게 함께 포털로 넣는다.
        키오스크 Chrome을 --kiosk-printing 으로 띄우면 다이얼로그 없이 바로 출력된다.
      */}
      {printing &&
        printUrl &&
        createPortal(
          <div id="pb-print" aria-hidden="true">
            <style>{`
              #pb-print { display: none; }
              @media print {
                @page {
                  size: ${paper === "postcard-pair" ? "100mm 148mm" : "2in 6in"};
                  margin: 0;
                }
                body > *:not(#pb-print) { display: none !important; }
                #pb-print {
                  display: flex !important;
                  align-items: center;
                  justify-content: center;
                  width: ${paper === "postcard-pair" ? "100mm" : "2in"};
                  height: ${paper === "postcard-pair" ? "148mm" : "6in"};
                  /* SELPHY 보더리스 확대가 잡아먹을 가장자리 띠 - 흰색이면 티가 나서
                     프레임 배경색으로 채운다. 배경 인쇄를 지우는 브라우저 기본값도 끈다. */
                  background: ${frame.swatch};
                  print-color-adjust: exact;
                  -webkit-print-color-adjust: exact;
                }
                #pb-print img {
                  display: block;
                  width: ${paper === "postcard-pair" ? `calc(50mm * ${overscanScale})` : "2in"};
                  height: ${paper === "postcard-pair" ? `calc(148mm * ${overscanScale})` : "6in"};
                  object-fit: contain;
                }
              }
            `}</style>
            <img src={printUrl} alt="" />
            {paper === "postcard-pair" && <img src={printUrl} alt="" />}
          </div>,
          document.body,
        )}
    </div>
  );
}
