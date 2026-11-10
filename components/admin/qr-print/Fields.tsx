"use client";
/* eslint-disable @next/next/no-img-element */

import { useId, useRef, useState } from "react";
import { Dropdown } from "@/components/admin/Dropdown";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { Field, INPUT, inputBorder } from "@/components/admin/company/fields";
import { BUILTIN_ICONS, ICON_GROUPS, isOpenableUrl, linkUrl, type Caption, type IconChoice, type LinkChoice } from "@/lib/qr-print/layout";
import type { MetricsLink } from "@/lib/download/links";

/** 제목 두 줄. 한 줄만 써도 된다 */
export function TitleFields({ value, onChange }: { value: [string, string]; onChange: (v: [string, string]) => void }) {
  const id = useId();
  return (
    <Field label="제목" htmlFor={`${id}-1`} hint="한 줄만 쓰면 두 줄 자리의 가운데에 놓여요.">
      <div className="space-y-2">
        <input id={`${id}-1`} value={value[0]} placeholder="첫 줄" onChange={(e) => onChange([e.target.value, value[1]])} className={`${INPUT} ${inputBorder()}`} />
        <input aria-label="제목 둘째 줄" value={value[1]} placeholder="둘째 줄" onChange={(e) => onChange([value[0], e.target.value])} className={`${INPUT} ${inputBorder()}`} />
      </div>
    </Field>
  );
}

/** QR 아래 안내 두 줄. 둘째 줄 앞부분은 파랗게 강조한다 */
export function CaptionFields({ value, onChange }: { value: Caption; onChange: (v: Caption) => void }) {
  const id = useId();
  return (
    <Field label="안내 문구" htmlFor={`${id}-first`}>
      <div className="space-y-2">
        <input id={`${id}-first`} value={value.first} placeholder="첫 줄" onChange={(e) => onChange({ ...value, first: e.target.value })} className={`${INPUT} ${inputBorder()}`} />
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
          <input
            aria-label="둘째 줄 강조 부분"
            value={value.highlight}
            placeholder="파랗게 쓸 부분"
            onChange={(e) => onChange({ ...value, highlight: e.target.value })}
            className={`${INPUT} ${inputBorder()} font-semibold !text-[#2786C8] dark:!text-[#6cb4ea]`}
          />
          <input aria-label="둘째 줄 나머지" value={value.rest} placeholder="나머지" onChange={(e) => onChange({ ...value, rest: e.target.value })} className={`${INPUT} ${inputBorder()}`} />
        </div>
      </div>
    </Field>
  );
}

export type LinksState = { state: "loading" } | { state: "ready"; links: MetricsLink[] } | { state: "failed" };

/** QR 이 열 곳. 행사 링크(/q/, 결과가 지표에 잡힌다)나 아무 주소(구글 폼 등) */
export function LinkFields({ value, onChange, links, siteUrl }: { value: LinkChoice; onChange: (v: LinkChoice) => void; links: LinksState; siteUrl: string }) {
  const id = useId();
  const kind = value.kind;
  const url = linkUrl(value, siteUrl);
  const badUrl = value.kind === "url" && value.url.trim() !== "" && !isOpenableUrl(value.url);
  return (
    <Field
      label="찍으면 열리는 곳"
      htmlFor={`${id}-url`}
      error={badUrl ? "주소를 다시 확인해 주세요. 예: forms.gle/abc123" : undefined}
      hint={
        kind === "event" ? (
          "행사 링크로 들어온 방문과 설치는 지표 > 유입 경로 > 링크와 QR에 잡혀요."
        ) : (
          "구글 폼, 인스타그램처럼 아무 주소나 넣을 수 있어요. 몇 명이 찍었는지는 세지 않아요."
        )
      }
    >
      <div className="space-y-2">
        <SegmentedControl<LinkChoice["kind"]>
          options={[
            { label: "행사 링크", value: "event" },
            { label: "주소 직접 넣기", value: "url" },
          ]}
          value={kind}
          onChange={(k) => onChange(k === "event" ? { kind: "event", code: "" } : { kind: "url", url: "" })}
        />
        {value.kind === "event" ? (
          links.state === "loading" ? (
            <div className="h-10 animate-pulse rounded-lg bg-sd-fill" />
          ) : links.state === "failed" ? (
            <p className="text-[13px] text-sd-critical">행사 링크를 불러오지 못했어요. 새로고침해 주세요.</p>
          ) : links.links.length === 0 ? (
            <p className="text-[13px] text-sd-fg-subtle">아직 만든 행사 링크가 없어요. 지표 &gt; 유입 경로 &gt; 링크와 QR에서 먼저 만들어 주세요.</p>
          ) : (
            <Dropdown<string>
              value={value.code}
              onChange={(code) => onChange({ kind: "event", code })}
              options={[{ label: "행사 링크를 골라 주세요", value: "" }, ...links.links.map((l) => ({ label: `${l.label} (/q/${l.code})`, value: l.code }))]}
            />
          )
        ) : (
          <input
            id={`${id}-url`}
            value={value.url}
            inputMode="url"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="https://forms.gle/..."
            aria-invalid={badUrl}
            onChange={(e) => onChange({ kind: "url", url: e.target.value })}
            className={`${INPUT} ${inputBorder(badUrl)}`}
          />
        )}
        {url && !badUrl && (
          <p className="truncate text-[12px] text-sd-fg-subtle">
            QR에 담기는 주소 <span className="font-medium text-sd-fg-muted">{url}</span>
          </p>
        )}
      </div>
    </Field>
  );
}

type IconGroup = (typeof ICON_GROUPS)[number]["id"];

const ICON_TILE = "flex h-14 w-full items-center justify-center rounded-xl border bg-sd-surface transition";
// 아이콘은 흰 종이에 인쇄되니 다크 모드에서도 흰 바탕에 보여 준다. 검은 마크(틱톡, X, 스레드)가 어두운 칸에 묻히지 않게
const PAPER = "!bg-white";

/** 두 개짜리 왼쪽 아이콘. 자주 쓰는 마크와 캐릭터, 직접 올린 그림 */
export function IconFields({ value, onChange }: { value: IconChoice; onChange: (v: IconChoice) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const on = (active: boolean) => (active ? "border-accent ring-2 ring-accent/30" : "border-sd-line hover:border-sd-gray-400");
  // 처음엔 지금 고른 아이콘이 있는 묶음을 연다
  const current = value.kind === "builtin" ? BUILTIN_ICONS.find((i) => i.id === value.id)?.group : undefined;
  const [group, setGroup] = useState<IconGroup>(current ?? "sns");
  const shown = BUILTIN_ICONS.filter((i) => i.group === group);

  const upload = (f: File | undefined) => {
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && onChange({ kind: "upload", dataUrl: reader.result, name: f.name });
    reader.readAsDataURL(f);
  };

  return (
    <Field label="아이콘" hint="원하는 게 없으면 PNG, SVG 그림을 올려요. 배경이 투명하면 더 깔끔해요.">
      <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="아이콘 종류">
        {ICON_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={group === g.id}
            onClick={() => setGroup(g.id)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${group === g.id ? "bg-sd-fg text-sd-surface" : "bg-sd-fill text-sd-fg-subtle hover:text-sd-fg"}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="아이콘" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {shown.map((i) => {
          const active = value.kind === "builtin" && value.id === i.id;
          return (
            <button key={i.id} type="button" role="radio" aria-checked={active} title={i.label} onClick={() => onChange({ kind: "builtin", id: i.id })} className={`${ICON_TILE} ${PAPER} ${on(active)}`}>
              <img src={i.src} alt={i.label} className="h-8 w-8 object-contain" />
            </button>
          );
        })}
        <button type="button" role="radio" aria-checked={value.kind === "upload"} onClick={() => file.current?.click()} className={`${ICON_TILE} ${on(value.kind === "upload")} flex-col gap-0.5`}>
          {value.kind === "upload" ? <img src={value.dataUrl} alt={value.name} className="h-8 w-8 object-contain" /> : <span className="text-[20px] leading-none text-sd-fg-subtle">+</span>}
          <span className="text-[11px] font-semibold text-sd-fg-subtle">{value.kind === "upload" ? "바꾸기" : "올리기"}</span>
        </button>
        <button type="button" role="radio" aria-checked={value.kind === "none"} onClick={() => onChange({ kind: "none" })} className={`${ICON_TILE} ${on(value.kind === "none")}`}>
          <span className="text-[12px] font-semibold text-sd-fg-subtle">없음</span>
        </button>
        <input
          ref={file}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </Field>
  );
}
