"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { CheckIcon, XIcon } from "@/components/admin/icons";
import { composeStrip } from "@/components/photobooth/compose";
import { loadImage } from "@/components/photobooth/image";
import { useSamplePhotos } from "@/components/photobooth/samplePhotos";
import type { FrameDef } from "@/components/photobooth/frames";
import { uploadAsset } from "@/lib/admin/assetsClient";
import { CHARACTER_TYPES, MAX_BYTES, checkFrame, edgeColor, findSlots, type Asset, type FrameCheck, type Side, type Slot } from "@/lib/event/assets";

// 그림 올리기 (#224, docs/admin-ui.md "그림 보관함"). 디자이너가 개발자 없이 프레임과 캐릭터를 넣는다.
// 프레임은 고르는 즉시 브라우저가 투명한 사진 칸을 재고 검사한다. 칸을 파란 상자로 겹쳐 보여 주고,
// 샘플 사진을 넣어 합성한 모습도 나란히 보여 줘 "이대로 부스에 나간다"를 올리기 전에 확인한다.

type Analysed = { url: string; file: File; width: number; height: number; slots: Slot[]; swatch: string; checks: FrameCheck[] };

async function analyseFrame(file: File): Promise<Analysed> {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("이 브라우저에서 그림을 읽지 못했어요.");
  ctx.drawImage(img, 0, 0);
  const px = { width: canvas.width, height: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
  const slots = findSlots(px);
  return { url, file, width: px.width, height: px.height, slots, swatch: edgeColor(px), checks: checkFrame(px, slots, file.size, file.type) };
}

const baseName = (f: File) => f.name.replace(/\.[^.]+$/, "").slice(0, 20);

export function FrameUploader({ onDone, onCancel, disabled }: { onDone: (a: Asset) => void; onCancel: () => void; disabled: boolean }) {
  const [frame, setFrame] = useState<Analysed | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const blocked = frame ? frame.checks.some((c) => c.level === "error" && !c.ok) : true;

  useEffect(() => () => (frame ? URL.revokeObjectURL(frame.url) : undefined), [frame]);

  const pick = async (file: File) => {
    setError(undefined);
    try {
      const a = await analyseFrame(file);
      setFrame(a);
      setLabel((l) => l || baseName(file));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submit = async () => {
    if (!frame) return;
    setBusy(true);
    setError(undefined);
    try {
      const form = new FormData();
      form.set("kind", "frame");
      form.set("file", frame.file);
      form.set("label", label.trim());
      form.set("slots", JSON.stringify(frame.slots));
      form.set("swatch", frame.swatch);
      onDone(await uploadAsset(form));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog title="프레임 올리기" onClose={onCancel} busy={busy}>
      {!frame ? (
        <Drop accept="image/png" hint="1800 x 5400px PNG, 사진 칸은 완전히 투명하게" onFile={pick} />
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex justify-center gap-4 rounded-xl bg-sd-fill p-4">
            <figure className="m-0 text-center">
              <SlotOverlay src={frame.url} width={frame.width} height={frame.height} slots={frame.slots} />
              <figcaption className="mt-1.5 text-[12px] text-sd-fg-subtle">찾은 사진 칸</figcaption>
            </figure>
            <figure className="m-0 text-center">
              <Composed frame={frame} />
              <figcaption className="mt-1.5 text-[12px] text-sd-fg-subtle">샘플 사진을 넣으면</figcaption>
            </figure>
          </div>
          <div className="flex flex-col gap-4">
            <ul className="space-y-2 text-[13px]">
              {frame.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  {c.ok ? (
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-sd-positive" />
                  ) : (
                    <XIcon className={`mt-0.5 h-4 w-4 shrink-0 ${c.level === "error" ? "text-sd-critical" : "text-sd-warning"}`} />
                  )}
                  <span className={c.ok ? "text-sd-fg-muted" : c.level === "error" ? "text-sd-critical" : "text-sd-warning"}>{c.text}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-sd-fg-muted">
                <span className="h-4 w-4 shrink-0 rounded ring-1 ring-sd-line" style={{ backgroundColor: frame.swatch }} />
                대표색 {frame.swatch}
                <span className="text-[12px] text-sd-fg-subtle">· 인쇄 가장자리를 이 색으로 채워요</span>
              </li>
            </ul>
            <Name value={label} onChange={setLabel} />
            {error && <p className="text-[13px] text-sd-critical">{error}</p>}
            <div className="mt-auto flex gap-2">
              <Button variant="neutral" size="sm" onClick={() => setFrame(null)} disabled={busy}>
                다른 파일
              </Button>
              <Button size="sm" className="flex-1" onClick={submit} disabled={disabled || blocked || !label.trim() || busy}>
                {busy ? "올리는 중…" : "보관함에 올리기"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {!frame && error && <p className="mt-3 text-[13px] text-sd-critical">{error}</p>}
    </Dialog>
  );
}

export function CharacterUploader({ onDone, onCancel, disabled }: { onDone: (a: Asset) => void; onCancel: () => void; disabled: boolean }) {
  const [file, setFile] = useState<{ file: File; url: string; clear: boolean } | null>(null);
  const [side, setSide] = useState<Side>("cop");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const okType = file ? (CHARACTER_TYPES as readonly string[]).includes(file.file.type) : false;
  const okSize = file ? file.file.size <= MAX_BYTES.character : false;

  const pick = async (f: File) => {
    setError(undefined);
    const url = URL.createObjectURL(f);
    // 네 모서리가 투명한지. 캐릭터는 화면 바탕 위에 얹혀서 흰 배경이 있으면 상자처럼 보인다
    let clear = false;
    try {
      const img = await loadImage(url);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const a = (x: number, y: number) => ctx?.getImageData(x, y, 1, 1).data[3] ?? 255;
      clear = [a(1, 1), a(c.width - 2, 1), a(1, c.height - 2), a(c.width - 2, c.height - 2)].every((v) => v < 10);
    } catch {
      setError("그림을 읽지 못했어요.");
    }
    setFile({ file: f, url, clear });
    setLabel((l) => l || baseName(f));
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      const form = new FormData();
      form.set("kind", "character");
      form.set("file", file.file);
      form.set("label", label.trim());
      form.set("side", side);
      onDone(await uploadAsset(form));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog title="캐릭터 올리기" onClose={onCancel} busy={busy} narrow>
      {!file ? (
        <Drop accept="image/png,image/webp" hint="투명 배경 PNG 나 WebP, 1MB 아래. 경찰 쪽 하나, 도둑 쪽 하나가 짝이에요" onFile={pick} />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center rounded-xl bg-[conic-gradient(#eee_25%,#fff_0_50%,#eee_0_75%,#fff_0)] bg-[length:16px_16px] p-4">
            <img src={file.url} alt="" className="max-h-48 w-auto" />
          </div>
          <ul className="space-y-1.5 text-[13px]">
            <Check ok={okType} text="PNG 나 WebP" />
            <Check ok={okSize} text={`파일 크기 ${Math.round(file.file.size / 1024)}KB (1MB 까지)`} />
            <Check ok={file.clear} warn text={file.clear ? "배경이 투명해요" : "모서리가 투명하지 않아요. 흰 배경이면 화면에서 상자처럼 보여요"} />
          </ul>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">어느 쪽인가요</p>
            <SegmentedControl<Side>
              value={side}
              onChange={setSide}
              options={[
                { value: "cop", label: "경찰 쪽" },
                { value: "thief", label: "도둑 쪽" },
              ]}
            />
            <p className="mt-1.5 text-[12px] text-sd-fg-subtle">부스 화면에는 늘 경찰 하나, 도둑 하나가 짝으로 나와요.</p>
          </div>
          <Name value={label} onChange={setLabel} />
          {error && <p className="text-[13px] text-sd-critical">{error}</p>}
          <div className="flex gap-2">
            <Button variant="neutral" size="sm" onClick={() => setFile(null)} disabled={busy}>
              다른 파일
            </Button>
            <Button size="sm" className="flex-1" onClick={submit} disabled={disabled || !okType || !okSize || !label.trim() || busy}>
              {busy ? "올리는 중…" : "보관함에 올리기"}
            </Button>
          </div>
        </div>
      )}
      {!file && error && <p className="mt-3 text-[13px] text-sd-critical">{error}</p>}
    </Dialog>
  );
}

// ── 조각 ──

function Dialog({ title, onClose, busy, narrow = false, children }: { title: string; onClose: () => void; busy: boolean; narrow?: boolean; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button type="button" aria-label="닫기" onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/50" />
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-sd-line bg-sd-surface p-6 ${narrow ? "max-w-md" : "max-w-3xl"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-sd-fg">{title}</h2>
          <button type="button" onClick={() => !busy && onClose()} aria-label="닫기" className="rounded-lg p-1 text-sd-fg-subtle hover:bg-sd-gray-200">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Drop({ accept, hint, onFile }: { accept: string; hint: string; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${over ? "border-accent bg-accent-weak" : "border-sd-line hover:bg-sd-fill"}`}
    >
      <span className="text-[15px] font-semibold text-sd-fg">파일을 끌어다 놓거나 눌러서 고르기</span>
      <span className="text-[13px] text-sd-fg-subtle">{hint}</span>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

function Name({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="asset-name" className="mb-1.5 block text-[13px] font-semibold text-sd-fg-subtle">
        이름 <span className="font-normal">(행사에서 고를 때 보여요)</span>
      </label>
      <div className="flex items-center rounded-xl border border-sd-line bg-sd-surface focus-within:border-accent">
        <input id="asset-name" value={value} maxLength={20} onChange={(e) => onChange(e.target.value)} placeholder="예: 겨울 축제" className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[14px] text-sd-fg outline-none" />
        <span className="pr-3.5 text-[12px] tabular-nums text-sd-fg-subtle">{value.length}/20</span>
      </div>
    </div>
  );
}

function Check({ ok, warn = false, text }: { ok: boolean; warn?: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-sd-positive" /> : <XIcon className={`mt-0.5 h-4 w-4 shrink-0 ${warn ? "text-sd-warning" : "text-sd-critical"}`} />}
      <span className={ok ? "text-sd-fg-muted" : warn ? "text-sd-warning" : "text-sd-critical"}>{text}</span>
    </li>
  );
}

/** 프레임 위에 찾은 칸을 파란 상자로 */
export function SlotOverlay({ src, width, height, slots, h = 360 }: { src: string; width: number; height: number; slots: Slot[]; h?: number }) {
  return (
    <div className="relative" style={{ height: h, aspectRatio: `${width} / ${height}` }}>
      <img src={src} alt="" className="h-full w-full" />
      {slots.map((s, i) => (
        <span
          key={i}
          className="absolute flex items-center justify-center rounded-[2px] border-2 border-accent bg-accent/15 text-[11px] font-bold text-accent"
          style={{ left: `${(s.x / width) * 100}%`, top: `${(s.y / height) * 100}%`, width: `${(s.w / width) * 100}%`, height: `${(s.h / height) * 100}%` }}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

/** 샘플 사진을 넣어 합성한 모습. 부스가 쓰는 합성 함수 그대로 */
function Composed({ frame }: { frame: Analysed }) {
  const def: FrameDef | null = frame.slots.length ? { id: "upload", label: "", src: frame.url, swatch: frame.swatch, width: frame.width, height: frame.height, slots: frame.slots } : null;
  const shots = useSamplePhotos(6, def);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!def || shots.length < frame.slots.length) return;
    let alive = true;
    let made = "";
    Promise.all(shots.slice(0, frame.slots.length).map(loadImage))
      .then((imgs) => composeStrip(imgs, def, { mirror: false }))
      .then((blob) => {
        made = URL.createObjectURL(blob);
        if (alive) setUrl(made);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
    // def 는 frame 에서 만든다. frame 이 같으면 다시 합성하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, shots]);
  return (
    <div className="flex items-center justify-center" style={{ height: 360, aspectRatio: `${frame.width} / ${frame.height}` }}>
      {url ? <img src={url} alt="샘플 사진을 넣은 프레임" className="h-full w-auto rounded-sm shadow-md" /> : <span className="text-[12px] text-sd-fg-subtle">{frame.slots.length ? "합성 중…" : "칸이 없어요"}</span>}
    </div>
  );
}
