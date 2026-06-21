/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";

export default function PhotoResult({ imageUrl }: { imageUrl: string | null }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    if (!imageUrl || busy) return;
    setBusy(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], "경찰과도둑-포토부스.jpg", {
        type: blob.type || "image/jpeg",
      });
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: "경찰과 도둑 포토부스" });
      } else {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = "경찰과도둑-포토부스.jpg";
        a.click();
        URL.revokeObjectURL(objectUrl);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        window.open(imageUrl, "_blank");
      }
    } finally {
      setBusy(false);
    }
  };

  // 이 페이지 링크를 친구에게 공유(카톡 등). 공유 시 OG 카드가 뜬다.
  const shareLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    const copyFallback = async () => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        // 클립보드도 막히면 조용히 무시
      }
    };
    try {
      if (navigator.share) {
        await navigator.share({
          title: "경찰과 도둑 포토부스",
          text: "포토부스 사진 받아가세요!",
          url,
        });
      } else {
        await copyFallback();
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        await copyFallback();
      }
    }
  };

  if (!imageUrl) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <img src="/photobooth/thief-flee.png" alt="" className="h-24 w-auto" />
        <h1 className="mt-6 text-xl font-bold text-brand-ink dark:text-white">
          사진을 찾을 수 없어요
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          QR을 다시 스캔하거나 부스에서 새로 찍어주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-sm flex-col items-center px-5 py-6 text-center">
      <div className="flex items-center gap-2">
        <img src="/photobooth/cop.png" alt="" className="h-9 w-auto" />
        <h1 className="text-xl font-bold text-brand-ink dark:text-white">
          사진이 나왔어요
        </h1>
        <img src="/photobooth/thief.png" alt="" className="h-9 w-auto" />
      </div>

      <img
        src={imageUrl}
        alt="경찰과 도둑 포토부스 사진"
        className="mt-4 max-h-[48vh] w-auto rounded-2xl shadow-xl"
      />

      <div className="mt-5 flex w-full flex-col gap-2.5">
        <button
          onClick={save}
          disabled={busy}
          className="w-full rounded-full bg-brand-blue px-10 py-4 text-lg font-bold text-white shadow-lg shadow-brand-blue/30 transition active:scale-95 disabled:opacity-50"
        >
          {busy ? "준비 중…" : "사진 저장하기"}
        </button>
        <button
          onClick={shareLink}
          className="w-full rounded-full border-2 border-brand-blue px-10 py-3.5 text-lg font-bold text-brand-blue transition active:scale-95"
        >
          {copied ? "링크가 복사됐어요" : "친구에게 공유하기"}
        </button>
      </div>

      <Link
        href="/download"
        className="mt-8 text-base font-bold text-brand-blue underline-offset-4 hover:underline"
      >
        경찰과 도둑, 친구들이랑 직접 해보기
      </Link>
    </section>
  );
}
