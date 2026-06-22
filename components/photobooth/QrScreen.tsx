/* eslint-disable @next/next/no-img-element */
"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { SITE_URL } from "@/lib/constants";

const AUTO_RESTART_MS = 60_000;

export default function QrScreen({
  imageUrl,
  onRestart,
}: {
  imageUrl: string;
  onRestart: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  // 손님 폰이 열 주소 — 전체 Blob URL을 ?u= 로 담는다.
  const target = `${SITE_URL}/p?u=${encodeURIComponent(imageUrl)}`;

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

      <button
        onClick={onRestart}
        className="mt-8 rounded-full border border-slate-300 px-10 py-4 text-lg font-bold text-slate-600 transition active:scale-95 dark:border-app-black-800 dark:text-slate-300"
      >
        처음으로
      </button>
    </div>
  );
}
