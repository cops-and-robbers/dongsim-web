/* eslint-disable @next/next/no-img-element */
"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SITE_URL } from "@/lib/constants";
import { PRINT_LAYOUT } from "./config";
import type { IssuedStrip } from "./PreviewScreen";

const AUTO_RESTART_MS = 60_000;

export default function QrScreen({
  issued,
  onRestart,
}: {
  issued: IssuedStrip;
  onRestart: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [printUrl, setPrintUrl] = useState<string | null>(null);
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

  // 인쇄는 스트립 원본 그대로 - QR은 화면에서만 보여준다(팀 결정, #123).
  // 프레임 하단 밴드가 로고·캐릭터로 차 있어 QR을 얹으면 그림을 해쳐서다.
  useEffect(() => {
    const url = URL.createObjectURL(issued.blob);
    setPrintUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setPrintUrl(null);
    };
  }, [issued.blob]);

  // 다음 손님을 위해 일정 시간 뒤 처음 화면으로.
  const onRestartRef = useRef(onRestart);
  useEffect(() => {
    onRestartRef.current = onRestart;
  });
  useEffect(() => {
    const id = window.setTimeout(() => onRestartRef.current(), AUTO_RESTART_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <img src="/photobooth/cop.svg" alt="" className="h-12 w-auto sm:h-14" />
        <h2 className="text-2xl font-extrabold text-brand-ink sm:text-3xl dark:text-white">
          예쁜 사진이 나왔어요
        </h2>
        <img src="/photobooth/thief.svg" alt="" className="h-12 w-auto sm:h-14" />
      </div>

      <p className="mb-6 text-lg text-slate-500 dark:text-slate-400">
        QR을 스캔해서 가져가세요
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
        오늘 하루만 받을 수 있어요
      </p>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onRestart}
          className="rounded-full border border-slate-300 px-10 py-4 text-lg font-bold text-slate-600 transition active:scale-95 dark:border-app-black-800 dark:text-slate-300"
        >
          처음으로
        </button>
        <button
          onClick={() => window.print()}
          disabled={!printUrl}
          className="rounded-full bg-brand-blue px-10 py-4 text-lg font-bold text-white shadow-lg shadow-brand-blue/30 transition active:scale-95 disabled:opacity-40"
        >
          인쇄하기
        </button>
      </div>

      {/*
        인쇄 전용 트리: 화면에는 절대 안 보이고, 인쇄 시에는 이것만 보인다.
        @page 규칙(스트립 용지)이 사이트의 다른 인쇄(블로그 등)를 오염시키지
        않도록, 스타일도 이 화면이 떠 있는 동안에만 존재하게 함께 포털로 넣는다.
        키오스크 Chrome을 --kiosk-printing 으로 띄우면 다이얼로그 없이 바로 출력된다.
      */}
      {printUrl &&
        createPortal(
          <div id="pb-print" aria-hidden="true">
            <style>{`
              #pb-print { display: none; }
              @media print {
                @page {
                  size: ${PRINT_LAYOUT === "postcard-pair" ? "100mm 148mm" : "2in 6in"};
                  margin: 0;
                }
                body > *:not(#pb-print) { display: none !important; }
                #pb-print { display: flex !important; }
                #pb-print img {
                  display: block;
                  width: ${PRINT_LAYOUT === "postcard-pair" ? "50mm" : "2in"};
                  height: ${PRINT_LAYOUT === "postcard-pair" ? "148mm" : "6in"};
                  object-fit: contain;
                }
              }
            `}</style>
            <img src={printUrl} alt="" />
            {PRINT_LAYOUT === "postcard-pair" && <img src={printUrl} alt="" />}
          </div>,
          document.body,
        )}
    </div>
  );
}
