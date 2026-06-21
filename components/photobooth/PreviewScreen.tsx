/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { composeStrip } from "./compose";
import { type FrameDef } from "./frames";
import { loadImage } from "./image";
import { uploadStrip } from "./upload";

export default function PreviewScreen({
  shots,
  selected,
  frame,
  onRetake,
  onIssued,
}: {
  shots: string[];
  selected: number[];
  frame: FrameDef;
  onRetake: () => void;
  onIssued: (imageUrl: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const imgs = await Promise.all(selected.map((i) => loadImage(shots[i])));
        const blob = await composeStrip(imgs, frame, { mirror: false });
        if (cancelled) return;
        blobRef.current = blob;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setError("사진 합성에 실패했어요. 다시 시도해 주세요.");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shots, selected, frame]);

  const issue = async () => {
    const blob = blobRef.current;
    if (!blob || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const imageUrl = await uploadStrip(blob);
      onIssued(imageUrl);
    } catch {
      setError("발급에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-6">
      <div className="flex items-center justify-center gap-2 pt-2">
        <img src="/photobooth/cop.png" alt="" className="h-12 w-auto sm:h-14" />
        <h2 className="text-2xl font-extrabold text-brand-ink sm:text-3xl dark:text-white">
          이렇게 나왔어요
        </h2>
        <img src="/photobooth/thief.png" alt="" className="h-12 w-auto sm:h-14" />
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        괜찮으면 QR로 받아가세요
      </p>

      <div className="flex w-full flex-1 items-center justify-center py-4">
        {error ? (
          <p className="text-base text-brand-red">{error}</p>
        ) : url ? (
          <img
            src={url}
            alt="완성된 포토부스 스트립"
            className="max-h-[60vh] w-auto rounded-xl shadow-2xl"
          />
        ) : (
          <p className="text-base text-slate-500 dark:text-slate-400">합성 중…</p>
        )}
      </div>

      <div className="flex w-full max-w-3xl items-center justify-between gap-3 pt-2">
        <button
          onClick={onRetake}
          disabled={uploading}
          className="rounded-full border border-slate-300 px-8 py-4 text-lg font-bold text-slate-600 transition active:scale-95 disabled:opacity-40 dark:border-app-black-800 dark:text-slate-300"
        >
          다시 찍기
        </button>
        <button
          onClick={issue}
          disabled={!url || uploading}
          className="rounded-full bg-brand-blue px-12 py-4 text-lg font-bold text-white shadow-lg shadow-brand-blue/30 transition active:scale-95 disabled:opacity-40"
        >
          {uploading ? "QR 만드는 중…" : "QR 만들기"}
        </button>
      </div>
    </div>
  );
}
