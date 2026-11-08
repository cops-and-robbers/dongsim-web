"use client";

import { Reorder } from "motion/react";
import { useRef, useState } from "react";
import { OfficialLink } from "@/components/admin/store-page/FieldEditor";
import { uploadStoreFile } from "@/lib/admin/storePageClient";
import type { Platform } from "@/lib/store-page/fields";
import { checkFile, IMAGE_SLOTS, itemId, pngHasAlpha, sameItems, type FileInfo, type ImageItem, type ImageSlot, type ImageSlotId } from "@/lib/store-page/images";

// 스토어 페이지의 "이미지와 영상" (docs/admin-ui.md "스토어 페이지").
// 스토어에 올라가 있는 것을 칸마다 보여 주고, 끌어서 순서를 바꾸고, 올리기 전에 규격을 검사한다. 스토어에는 보내지 않는다.

const THUMB_H = 190;

/** 파일을 열어 크기와 투명 여부, 영상 길이를 잰다 */
async function inspect(file: File, slot: ImageSlot): Promise<FileInfo> {
  if (slot.video) {
    const url = URL.createObjectURL(file);
    try {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      await new Promise<void>((ok, fail) => {
        v.onloadedmetadata = () => ok();
        v.onerror = () => fail(new Error("영상을 열지 못했어요."));
      });
      return { width: v.videoWidth, height: v.videoHeight, bytes: file.size, type: file.type, hasAlpha: false, seconds: v.duration };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("이미지를 열지 못했어요.");
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const info = { width: bitmap.width, height: bitmap.height, bytes: file.size, type: file.type, hasAlpha: pngHasAlpha(head) };
  bitmap.close();
  return info;
}

function Tile({ item, video, disabled, onRemove }: { item: ImageItem; video: boolean; disabled: boolean; onRemove: () => void }) {
  return (
    <div className="group relative h-full">
      {video ? (
        <video src={item.url} muted playsInline preload="metadata" className="h-full rounded-xl bg-sd-fill object-cover" style={{ height: THUMB_H }} />
      ) : (
        // 스토어와 저장소의 이미지를 그대로 보여 준다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" draggable={false} className="h-full max-w-none rounded-xl bg-sd-fill object-contain" style={{ height: THUMB_H }} />
      )}
      {item.kind === "new" && <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 text-[11px] font-bold leading-[18px] text-accent-fg">새 파일</span>}
      {!disabled && (
        <button type="button" aria-label="빼기" onClick={onRemove} className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-[14px] leading-none text-white opacity-0 transition focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          ×
        </button>
      )}
    </div>
  );
}

function SlotSection({ platform, slot, live, items, disabled, onChange }: { platform: Platform; slot: ImageSlot; live: ImageItem[]; items: ImageItem[]; disabled: boolean; onChange: (next: ImageItem[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const changed = !sameItems(items, live);
  const room = slot.max - items.length;

  const add = async (files: FileList) => {
    setErrors([]);
    const problems: string[] = [];
    let next = items;
    for (const file of Array.from(files)) {
      if (next.length >= slot.max) {
        problems.push(`${slot.max}개까지 올릴 수 있어요.`);
        break;
      }
      try {
        const info = await inspect(file, slot);
        const found = checkFile(slot, info);
        if (found.length) {
          problems.push(`${file.name}: ${found.join(" ")}`);
          continue;
        }
        setProgress(0);
        const uploaded = await uploadStoreFile(platform, slot, file, info, setProgress);
        next = [...next, uploaded];
        onChange(next);
      } catch (e) {
        problems.push(`${file.name}: ${e instanceof Error ? e.message : "올리지 못했어요."}`);
      } finally {
        setProgress(null);
      }
    }
    setErrors(problems);
    if (input.current) input.current.value = "";
  };

  return (
    <section aria-label={slot.label} className="px-5 py-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h3 className="text-[14px] font-bold text-sd-fg">{slot.label}</h3>
        <span className="inline-flex h-[20px] items-center rounded-md bg-sd-fill px-1.5 text-[11.5px] font-semibold text-sd-fg-subtle">{slot.need}</span>
        <span className="text-[12.5px] tabular-nums text-sd-fg-subtle">
          {items.length} / {slot.max}
        </span>
        {changed && (
          <button type="button" disabled={disabled} onClick={() => onChange(live)} className="text-[12.5px] font-semibold text-accent hover:underline disabled:opacity-50">
            되돌리기
          </button>
        )}
        <span className="ml-auto">
          <OfficialLink href={slot.link} />
        </span>
      </div>

      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1" style={{ minHeight: THUMB_H }}>
        <Reorder.Group axis="x" values={items} onReorder={(v: ImageItem[]) => !disabled && onChange(v)} className="flex gap-2.5" style={{ height: THUMB_H }}>
          {items.map((item) => (
            <Reorder.Item key={itemId(item)} value={item} drag={disabled || items.length < 2 ? false : "x"} className="flex-none cursor-grab active:cursor-grabbing" style={{ height: THUMB_H }}>
              <Tile item={item} video={!!slot.video} disabled={disabled} onRemove={() => onChange(items.filter((x) => itemId(x) !== itemId(item)))} />
            </Reorder.Item>
          ))}
        </Reorder.Group>
        {room > 0 && (
          <button type="button" disabled={disabled || progress !== null} onClick={() => input.current?.click()} className="flex w-[108px] flex-none flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-sd-line text-[12.5px] font-semibold text-sd-fg-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50" style={{ height: THUMB_H }}>
            {progress !== null ? (
              <span className="tabular-nums">{Math.round(progress * 100)}%</span>
            ) : (
              <>
                <span aria-hidden className="text-[22px] font-normal leading-none">
                  +
                </span>
                {slot.video ? "영상 올리기" : "이미지 올리기"}
              </>
            )}
          </button>
        )}
        <input ref={input} type="file" hidden multiple={slot.max > 1} accept={slot.types.join(",")} onChange={(e) => e.target.files?.length && void add(e.target.files)} />
      </div>
      {items.length === 0 && <p className="mt-1 text-[12.5px] text-sd-fg-subtle">{slot.video ? "올라간 영상이 없어요." : "올라간 이미지가 없어요."}</p>}
      {errors.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1">
          {errors.map((e) => (
            <li key={e} className="text-[12.5px] leading-relaxed text-sd-critical">
              {e}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ImageBoard({ platform, listOf, liveOf, disabled, onChange }: { platform: Platform; listOf: (s: ImageSlotId) => ImageItem[]; liveOf: (s: ImageSlotId) => ImageItem[]; disabled: boolean; onChange: (s: ImageSlotId, next: ImageItem[]) => void }) {
  return (
    <div className="divide-y divide-sd-hairline rounded-2xl border border-sd-line bg-sd-surface">
      {IMAGE_SLOTS[platform].map((s) => (
        <SlotSection key={s.id} platform={platform} slot={s} live={liveOf(s.id)} items={listOf(s.id)} disabled={disabled} onChange={(next) => onChange(s.id, next)} />
      ))}
    </div>
  );
}
