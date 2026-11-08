"use client";

import { useState } from "react";
import { AppStoreMark, CheckIcon, GooglePlayMark } from "@/components/admin/icons";
import { OfficialLink } from "@/components/admin/store-page/FieldEditor";
import { OVERFLOW_ROWS } from "@/lib/store-page/display";
import { FIELDS, WHEN_LABEL, type Platform } from "@/lib/store-page/fields";
import { IMAGE_RULES, IMAGE_SPECS, WRITE_TIPS, type Spec } from "@/lib/store-page/specs";

// 스토어 페이지의 "규격과 안내" (docs/admin-ui.md "스토어 페이지").
// 디자이너와 마케터가 만들기 전에 보는 곳이다. 크기는 눌러서 복사하고, 칸마다 공식 문서로 바로 간다.

const STORE: Record<Platform, { name: string; Mark: (p: { className?: string }) => React.ReactNode }> = {
  ios: { name: "App Store", Mark: AppStoreMark },
  android: { name: "Google Play", Mark: GooglePlayMark },
};

function SizeChip({ size }: { size: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(size.replaceAll(" ", "")).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button type="button" onClick={copy} title="눌러서 복사" className="inline-flex h-7 items-center gap-1 rounded-lg bg-sd-fill px-2 text-[13px] font-semibold tabular-nums text-sd-fg transition hover:bg-sd-gray-300">
      {size}
      {copied && <CheckIcon className="size-3.5 text-sd-positive" />}
      <span className="sr-only">{copied ? "복사됐어요" : "복사"}</span>
    </button>
  );
}

const NEED: Record<Spec["need"], string> = {
  required: "bg-accent-weak text-accent",
  soon: "bg-sd-fill text-sd-fg-muted",
  optional: "bg-sd-fill text-sd-fg-subtle",
};

function SpecRow({ spec }: { spec: Spec }) {
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[14px] font-bold text-sd-fg">{spec.item}</p>
        <span className={`inline-flex h-[20px] items-center rounded-md px-1.5 text-[11.5px] font-semibold ${NEED[spec.need]}`}>{spec.needLabel}</span>
        <span className="ml-auto">
          <OfficialLink href={spec.link} />
        </span>
      </div>
      {spec.sizes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {spec.sizes.map((s) => (
            <SizeChip key={s} size={s} />
          ))}
        </div>
      )}
      {spec.sizeNote && <p className="mt-1.5 text-[12.5px] leading-relaxed text-sd-fg-muted">{spec.sizeNote}</p>}
      <p className="mt-1 text-[12.5px] leading-relaxed text-sd-fg-subtle">
        {spec.format} · {spec.count}
      </p>
    </li>
  );
}

function StoreSpecs({ platform }: { platform: Platform }) {
  const { name, Mark } = STORE[platform];
  return (
    <section aria-label={`${name} 규격`} className="overflow-hidden rounded-2xl border border-sd-line bg-sd-surface">
      <header className="flex items-center gap-2.5 border-b border-sd-hairline px-5 py-4">
        <Mark className="size-6" />
        <h2 className="text-[15px] font-bold text-sd-fg">{name}</h2>
      </header>

      <h3 className="px-5 pt-4 text-[12.5px] font-semibold text-sd-fg-subtle">문구</h3>
      <ul className="mt-1 px-5 pb-3">
        {FIELDS[platform].map((f) => (
          <li key={f.id} className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="text-[13.5px] font-semibold text-sd-fg">{f.label}</span>
            <span className="flex-1 text-right text-[12.5px] text-sd-fg-subtle">{WHEN_LABEL[f.when]}</span>
            <span className="w-14 flex-none text-right text-[13.5px] font-semibold tabular-nums text-sd-fg">{f.max.toLocaleString()}자</span>
          </li>
        ))}
      </ul>

      <h3 className="border-t border-sd-hairline px-5 pt-4 text-[12.5px] font-semibold text-sd-fg-subtle">글자가 넘치면</h3>
      <ul className="mt-1 px-5 pb-3">
        {OVERFLOW_ROWS[platform].map((r) => (
          <li key={`${r.field}-${r.where}`} className="flex items-baseline gap-3 py-1.5">
            <span className="w-[116px] flex-none text-[13px] font-semibold text-sd-fg">
              {r.field} <span className="font-normal text-sd-fg-subtle">{r.where}</span>
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-sd-fg-muted">
              {r.rule}
              {!r.seen && <span className="text-sd-fg-subtle"> 넘칠 때는 아직 못 봤어요.</span>}
            </span>
          </li>
        ))}
        <li className="pt-1.5 text-[12px] leading-relaxed text-sd-fg-subtle">실제 스토어 앱 캡처로 잰 값이에요(iPhone, Galaxy, 2026-11-07). 글자 수 한도를 넘으면 스토어에 저장되지 않아요.</li>
      </ul>

      <h3 className="border-t border-sd-hairline px-5 pt-4 text-[12.5px] font-semibold text-sd-fg-subtle">이미지와 영상</h3>
      <ul className="divide-y divide-sd-hairline">
        {IMAGE_SPECS[platform].map((s) => (
          <SpecRow key={s.item} spec={s} />
        ))}
      </ul>

      <div className="border-t border-sd-hairline px-5 py-4">
        <h3 className="text-[12.5px] font-semibold text-sd-fg-subtle">이미지에 글자를 넣을 때</h3>
        <ul className="mt-2 space-y-1.5">
          {IMAGE_RULES[platform].map((r) => (
            <li key={r.text} className="flex items-start gap-2 text-[13px] leading-relaxed text-sd-fg-muted">
              <span aria-hidden className="mt-[8px] size-1 flex-none rounded-full bg-sd-gray-400" />
              <span className="min-w-0 flex-1">{r.text}</span>
              <OfficialLink href={r.link} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SpecGuide() {
  return (
    <div className="space-y-5">
      <section aria-label="잘 쓰는 법" className="rounded-2xl border border-sd-line bg-sd-surface px-5 py-4">
        <h2 className="text-[15px] font-bold text-sd-fg">문구를 잘 쓰는 법</h2>
        <ul className="mt-3 grid gap-x-8 gap-y-2.5 lg:grid-cols-2">
          {WRITE_TIPS.map((t) => (
            <li key={t.text} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-sd-fg-muted">
              <span aria-hidden className="mt-[9px] size-1 flex-none rounded-full bg-accent" />
              <span className="min-w-0 flex-1">{t.text}</span>
              <OfficialLink href={t.link} />
            </li>
          ))}
        </ul>
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <StoreSpecs platform="ios" />
        <StoreSpecs platform="android" />
      </div>
    </div>
  );
}
