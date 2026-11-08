"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SectionCard } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { CheckIcon } from "@/components/admin/icons";
import type { PreviewMessage } from "@/components/photobooth/BoothPreview";
import { fetchAssets } from "@/lib/admin/assetsClient";
import { BUILTIN_CHARACTERS, BUILTIN_CHARACTER_SET, BUILTIN_FRAME, assetUrl, compatible, frameSrc, toFrameRef, type Asset, type FrameRef, type Side } from "@/lib/event/assets";
import {
  COPY,
  COPY_KEYS,
  COUNTDOWN_CHOICES,
  slotsOf,
  KIOSK_WHERE,
  METHODS,
  OVERSCAN_RANGE,
  RESTART_CHOICES,
  SCREEN_LABEL,
  SHOT_CHOICES,
  VARIABLES,
  flowLine,
  type CopyKey,
  type KioskConfig,
  type Method,
  type Screen,
} from "@/lib/event/kiosk";
import { kstNow, shortTime, type EventSettings, type Problems } from "@/lib/event/settings";

// 행사 화면 "포토부스" 탭 (#221, docs/admin-ui.md "포토부스").
// Shopify 테마 편집기처럼 왼쪽에 손님이 거치는 화면, 가운데에 그 화면 그대로, 오른쪽에 그 화면에서 바꿀 수 있는 것만.
// 칸에 초점이 가면 가운데 화면의 그 자리에 파란 테두리가 생긴다. 화면은 진짜 부스 화면을 실제 크기 창(iframe)에 그려 줄인다.

const FLOW: Screen[] = ["intro", "capture", "select", "preview", "qr"];
const CLOSED: Screen[] = ["closed", "over"];

/** 화면마다 바꿀 수 있는 문구 */
const COPY_OF = (s: Screen) => COPY_KEYS.filter((k) => COPY[k].screen === s);

export function BoothTab({
  draft,
  saved,
  onKiosk,
  problems,
  disabled,
  screen,
  onScreen,
}: {
  draft: EventSettings;
  saved: EventSettings;
  onKiosk: (k: KioskConfig) => void;
  problems: Problems;
  disabled: boolean;
  screen: Screen;
  onScreen: (s: Screen) => void;
}) {
  const k = draft.kiosk;
  const library = useLibrary();
  const [spot, setSpot] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const set = (p: Partial<KioskConfig>) => onKiosk({ ...k, ...p });
  const changedOn = (s: Screen) => COPY_OF(s).filter((key) => (k.copy[key] ?? COPY[key].text) !== (saved.kiosk.copy[key] ?? COPY[key].text)).length;
  const pickMethod = (m: Method) => set({ ...METHODS[m].values, method: m });
  const custom = (Object.keys(METHODS[k.method].values) as (keyof KioskConfig)[]).some((key) => METHODS[k.method].values[key] !== k[key]);

  return (
    <div className="space-y-5">
      <SectionCard title="부스 방식" right={<span className="hidden text-[12px] text-sd-fg-subtle sm:inline">고르면 아래 값이 채워지고, 하나씩 바꿀 수 있어요</span>}>
        <div role="radiogroup" aria-label="부스 방식" className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(METHODS) as Method[]).map((m) => {
            const on = k.method === m;
            const preset = { ...k, ...METHODS[m].values };
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => pickMethod(m)}
                className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-60 ${on ? "border-accent bg-accent-weak" : "border-sd-line bg-sd-surface hover:bg-sd-fill"}`}
              >
                <span className="flex items-center justify-between">
                  <span className={`text-[15px] font-bold ${on ? "text-accent" : "text-sd-fg"}`}>{METHODS[m].name}</span>
                  {on && <CheckIcon className="h-4 w-4 text-accent" />}
                </span>
                <span className="mt-0.5 block text-[13px] text-sd-fg-subtle">{METHODS[m].desc}</span>
                <span className="mt-3 block text-[12px] font-medium text-sd-fg-muted">{flowLine(preset)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-sd-fg-muted">
          지금 흐름: <span className="font-semibold text-sd-fg">{flowLine(k)}</span>
          {custom && <span className="ml-2 text-sd-fg-subtle">({METHODS[k.method].name}에서 직접 바꾼 값이 있어요)</span>}
        </p>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[176px_minmax(0,1fr)_360px]">
        {/* 손님이 거치는 화면. 넓은 화면은 세로 목록, 좁으면 가로 칩 */}
        <nav aria-label="부스 화면" className="flex flex-wrap gap-1.5 self-start xl:sticky xl:top-0 xl:flex-col xl:flex-nowrap xl:gap-0.5">
          <StepGroup label="손님 흐름" />
          {FLOW.map((s, i) => (
            <Step key={s} n={i + 1} label={s === "qr" ? (k.receive === "print" ? "받기 · 인쇄와 QR" : "받기 · QR") : SCREEN_LABEL[s]} on={screen === s} off={s === "select" && !k.select} changed={changedOn(s)} onClick={() => onScreen(s)} />
          ))}
          <StepGroup label="닫혀 있을 때" />
          {CLOSED.map((s) => (
            <Step key={s} label={SCREEN_LABEL[s]} on={screen === s} changed={changedOn(s)} onClick={() => onScreen(s)} />
          ))}
          <StepGroup label="손님 폰" />
          <Step label="사진 받기" on={screen === "result"} changed={changedOn("result")} onClick={() => onScreen("result")} />
        </nav>

        {/* 오른쪽 칸이 길어도 화면이 따라 내려오게 */}
        <div className="min-w-0 self-start xl:sticky xl:top-0">
          <PreviewFrame screen={screen} settings={draft} spot={spot} theme={theme} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-sd-fg-subtle" aria-live="polite">
              {spot ? (
                <>
                  <span className="font-semibold text-accent">파란 테두리</span>가 지금 고치는 자리예요
                </>
              ) : screen === "result" ? (
                "손님이 QR을 찍으면 폰에 열리는 화면이에요. 사진은 샘플이에요."
              ) : (
                "부스 노트북 화면(1280 x 800)을 줄여 보여요. 사진은 샘플이에요."
              )}
            </p>
            <SegmentedControl
              options={[
                { value: "light", label: "밝게" },
                { value: "dark", label: "어둡게" },
              ]}
              value={theme}
              onChange={setTheme}
            />
          </div>
        </div>

        <div className="min-w-0 space-y-4" onFocusCapture={(e) => setSpot((e.target as HTMLElement).closest("[data-field]")?.getAttribute("data-field") ?? null)}>
          <Panel screen={screen} k={k} set={set} problems={problems} disabled={disabled} saved={saved.kiosk} library={library} />
        </div>
      </div>
    </div>
  );
}

function StepGroup({ label }: { label: string }) {
  return <p className="hidden px-3 pb-1 pt-3 text-[12px] font-semibold text-sd-fg-subtle first:pt-0 xl:block">{label}</p>;
}

function Step({ n, label, on, off, changed, onClick }: { n?: number; label: string; on: boolean; off?: boolean; changed: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? "step" : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
        on ? "bg-accent-weak text-accent" : "bg-sd-gray-200 text-sd-fg-muted hover:bg-sd-gray-300 xl:bg-transparent xl:hover:bg-sd-gray-200"
      }`}
    >
      {n && <span className={`w-3 text-[11px] tabular-nums ${on ? "" : "text-sd-fg-subtle"}`}>{n}</span>}
      <span className={off ? "text-sd-fg-subtle line-through" : ""}>{label}</span>
      {off && <span className="text-[11px] font-medium text-sd-fg-subtle">꺼짐</span>}
      {changed > 0 && <span aria-label={`고친 문구 ${changed}개`} className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
    </button>
  );
}

// ── 가운데: 진짜 부스 화면 ──

function PreviewFrame({ screen, settings, spot, theme }: { screen: Screen; settings: EventSettings; spot: string | null; theme: "light" | "dark" }) {
  const phone = screen === "result";
  const W = phone ? 390 : 1280;
  const H = phone ? 760 : 800;
  const frame = useRef<HTMLIFrameElement>(null);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!box) return;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWidth(box.clientWidth);
    return () => ro.disconnect();
  }, [box]);

  const send = useCallback(() => {
    const msg: PreviewMessage = { type: "booth-preview", screen, settings, spot, theme };
    frame.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, [screen, settings, spot, theme]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && (e.data as { type?: string })?.type === "booth-preview-ready") setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  useEffect(() => {
    if (ready) send();
  }, [ready, send]);

  // 폰 화면은 가운데에 폰 폭만큼, 부스 화면은 칸 폭에 맞춰
  const shownW = phone ? Math.min(width, 300) : width;
  const s = shownW / W;
  return (
    <div ref={setBox} className={`flex justify-center ${phone ? "rounded-xl bg-sd-fill py-4" : ""}`}>
      <div className={`overflow-hidden shadow-[0_0_0_1px_var(--sd-line)] ${phone ? "rounded-[28px]" : "rounded-xl"}`} style={{ width: shownW, height: H * s }}>
        <iframe
          ref={frame}
          title={`${SCREEN_LABEL[screen]} 미리보기`}
          src="/photobooth/preview"
          width={W}
          height={H}
          tabIndex={-1}
          className="pointer-events-none block border-0 bg-white"
          style={{ transform: `scale(${s || 0.0001})`, transformOrigin: "top left" }}
        />
      </div>
    </div>
  );
}

// ── 오른쪽: 이 화면에서 바꿀 수 있는 것 ──

function Panel({ screen, k, set, problems, disabled, saved, library }: { screen: Screen; k: KioskConfig; set: (p: Partial<KioskConfig>) => void; problems: Problems; disabled: boolean; saved: KioskConfig; library: Library }) {
  const copyKeys = COPY_OF(screen);
  const selectOff = screen === "select" && !k.select;
  return (
    <>
      {screen === "capture" && (
        <Card title="동작">
          <Choice field="kiosk.shots" label="찍는 장수" hint={k.select ? "이 중에서 손님이 마음에 드는 칸 수만큼 골라요." : `고르기를 꺼서 프레임 칸 수(${slotsOf(k)}장)만큼만 찍어요.`}>
            <Seg value={String(k.shots)} disabled={disabled || !k.select} onChange={(v) => set({ shots: Number(v) })} options={SHOT_CHOICES.map((n) => [String(n), `${n}장`])} />
          </Choice>
          <Choice field="kiosk.countdown" label="한 장마다 기다리는 시간">
            <Seg value={String(k.countdown)} disabled={disabled} onChange={(v) => set({ countdown: Number(v) })} options={COUNTDOWN_CHOICES.map((n) => [String(n), `${n}초`])} />
          </Choice>
          <Toggle field="kiosk.tapToShoot" label="화면을 누르면 바로 찍기" hint="끄면 카운트다운이 끝나야 찍혀요. 아래 안내 문구도 빠져요." on={k.tapToShoot} disabled={disabled} onChange={(v) => set({ tapToShoot: v })} />
        </Card>
      )}

      {screen === "intro" && <CharactersCard k={k} set={set} disabled={disabled} library={library} />}

      {screen === "select" && <FramesCard k={k} set={set} disabled={disabled} library={library} />}

      {screen === "select" && (
        <Card title="동작">
          <Toggle
            field="kiosk.select"
            label="고르기 단계"
            hint={k.select ? `${k.shots}장 중에서 ${slotsOf(k)}장을 골라요.` : `찍은 ${slotsOf(k)}장이 그대로 프레임에 들어가요. 줄이 길 때 빨라요.`}
            on={k.select}
            disabled={disabled}
            onChange={(v) => set({ select: v, shots: v ? Math.max(k.shots, 6) : slotsOf(k) })}
          />
        </Card>
      )}

      {screen === "qr" && (
        <>
          <Card title="받는 방법">
            <Choice field="kiosk.receive" label="손님이 사진을 어떻게 받나요">
              <Seg
                value={k.receive}
                disabled={disabled}
                onChange={(v) => set({ receive: v as KioskConfig["receive"], autoPrint: v === "qr" ? false : k.autoPrint })}
                options={[
                  ["print", "인쇄하고 QR도"],
                  ["qr", "QR로만"],
                ]}
              />
            </Choice>
            {k.receive === "print" ? (
              <>
                <Choice field="kiosk.paper" label="인쇄 용지">
                  <Seg
                    value={k.paper}
                    disabled={disabled}
                    onChange={(v) => set({ paper: v as KioskConfig["paper"] })}
                    options={[
                      ["postcard-pair", "엽서에 2장"],
                      ["strip-2x6", "2x6 스트립"],
                    ]}
                  />
                </Choice>
                <Choice field="kiosk.overscan" label="가장자리 보정" hint="엽서 테두리 없는 인화는 그림을 약 4% 키워요. 시험 인쇄에서 잘리면 낮추고, 가장자리에 띠가 보이면 올려요.">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={OVERSCAN_RANGE.min}
                      max={OVERSCAN_RANGE.max}
                      step={1}
                      value={k.overscan}
                      disabled={disabled}
                      onChange={(e) => set({ overscan: Number(e.target.value) })}
                      aria-label="가장자리 보정"
                      className="flex-1 accent-[var(--accent)]"
                    />
                    <span className="w-11 text-right text-[14px] font-semibold tabular-nums text-sd-fg">{k.overscan}%</span>
                  </div>
                </Choice>
                <Toggle
                  field="kiosk.autoPrint"
                  label="버튼 없이 저절로 인쇄"
                  hint="받기 화면이 뜨면 바로 인쇄해요. 부스 노트북 크롬을 --kiosk-printing 으로 띄웠을 때만 인쇄 창 없이 나가요."
                  on={k.autoPrint}
                  disabled={disabled}
                  onChange={(v) => set({ autoPrint: v })}
                />
                <TestPrint k={k} saved={saved} set={set} disabled={disabled} />
              </>
            ) : (
              <p className="rounded-xl bg-sd-fill px-3.5 py-2.5 text-[13px] leading-relaxed text-sd-fg-muted">인쇄 버튼과 인쇄 설정이 빠지고, 손님은 QR로만 받아요.</p>
            )}
          </Card>
          <Card title="다음 손님">
            <Choice field="kiosk.restartSec" label={KIOSK_WHERE.restartSec.label} hint="손님이 처음으로를 누르지 않아도 이 시간이 지나면 시작 화면으로 돌아가요.">
              <Seg value={String(k.restartSec)} disabled={disabled} onChange={(v) => set({ restartSec: Number(v) })} options={RESTART_CHOICES.map((n) => [String(n), n < 60 ? `${n}초` : `${n / 60}분`])} />
            </Choice>
          </Card>
        </>
      )}

      {copyKeys.length > 0 && (
        <Card title="문구" note={CLOSED.includes(screen) ? "날짜와 장소는 정보와 시간 탭에서 바꿔요." : undefined}>
          {selectOff && <p className="text-[13px] text-sd-fg-subtle">고르기를 꺼서 이 화면은 손님에게 안 보여요.</p>}
          {copyKeys.map((key) => (
            <CopyField
              key={key}
              k={key}
              value={k.copy[key] ?? COPY[key].text}
              error={problems[`copy.${key}`]}
              disabled={disabled || selectOff || (key === "qr.print" && k.receive === "qr")}
              onChange={(v) => {
                const copy = { ...k.copy };
                if (v === COPY[key].text) delete copy[key];
                else copy[key] = v;
                set({ copy });
              }}
            />
          ))}
        </Card>
      )}
    </>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <SectionCard title={title}>
      <div className="space-y-4">{children}</div>
      {note && <p className="mt-4 text-[12px] leading-relaxed text-sd-fg-subtle">{note}</p>}
    </SectionCard>
  );
}

function Choice({ field, label, hint, children }: { field: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div data-field={field}>
      <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-sd-fg-subtle">{hint}</p>}
    </div>
  );
}

function Seg({ value, options, onChange, disabled }: { value: string; options: [string, string][]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className={disabled ? "pointer-events-none opacity-50" : ""}>
      <SegmentedControl value={value} onChange={onChange} options={options.map(([v, l]) => ({ value: v, label: l }))} />
    </div>
  );
}

function Toggle({ field, label, hint, on, disabled, onChange }: { field: string; label: string; hint?: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div data-field={field} className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[14px] font-semibold text-sd-fg">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] leading-relaxed text-sd-fg-subtle">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${on ? "bg-accent" : "bg-sd-gray-400"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-sd-surface shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/** 시험 인쇄를 했다고 표시. 준비 점검이 이 값을 본다 */
function TestPrint({ k, saved, set, disabled }: { k: KioskConfig; saved: KioskConfig; set: (p: Partial<KioskConfig>) => void; disabled: boolean }) {
  const changedPrint = k.paper !== saved.paper || k.overscan !== saved.overscan;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-sd-fill px-3.5 py-3">
      <div className="text-[13px] leading-relaxed">
        <p className="font-semibold text-sd-fg">시험 인쇄</p>
        <p className="text-sd-fg-subtle">
          {k.testPrinted ? `${shortTime(k.testPrinted)}에 확인했어요.` : "행사 프린터로 한 장 뽑아 가장자리를 봐요."}
          {k.testPrinted && changedPrint && " 용지나 보정을 바꿨으니 다시 뽑아 봐요."}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => set({ testPrinted: k.testPrinted && !changedPrint ? null : kstNow(Date.now()) })}
        className="h-8 shrink-0 rounded-lg bg-sd-surface px-3 text-[13px] font-semibold text-sd-fg-muted ring-1 ring-sd-line hover:bg-sd-gray-200 disabled:opacity-40"
      >
        {k.testPrinted && !changedPrint ? "취소" : "했어요"}
      </button>
    </div>
  );
}

function CopyField({ k, value, error, disabled, onChange }: { k: CopyKey; value: string; error?: string; disabled?: boolean; onChange: (v: string) => void }) {
  const def = COPY[k];
  const multi = "lines" in def && (def.lines ?? 1) > 1;
  const changed = value !== def.text;
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const longest = Math.max(...value.split("\n").map((l) => l.length));
  const insert = (token: string) => {
    const el = ref.current;
    const at = el?.selectionStart ?? value.length;
    const next = value.slice(0, at) + token + value.slice(el?.selectionEnd ?? at);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };
  const usable = VARIABLES.filter((v) => v !== "{컷 수}" || ["intro.body", "select.title"].includes(k) || value.includes(v));
  const cls = `w-full resize-none bg-transparent px-3.5 py-2.5 text-[14px] leading-relaxed text-sd-fg outline-none`;
  return (
    <div data-field={`copy.${k}`} className={disabled ? "opacity-50" : ""}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={`copy-${k}`} className="text-[13px] font-semibold text-sd-fg-subtle">
          {def.label}
          {changed && <span className="ml-1.5 rounded bg-sd-info-weak px-1.5 py-0.5 text-[11px] text-sd-info">바꿈</span>}
        </label>
        <span className={`text-[12px] tabular-nums ${longest > def.max ? "text-sd-critical" : "text-sd-fg-subtle"}`}>
          {multi ? `한 줄 ${longest}/${def.max}` : `${value.length}/${def.max}`}
        </span>
      </div>
      <div className={`rounded-xl border bg-sd-surface transition focus-within:border-accent ${error ? "border-sd-critical" : changed ? "border-sd-info" : "border-sd-line"}`}>
        {multi ? (
          <textarea id={`copy-${k}`} ref={ref} rows={def.lines} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cls} />
        ) : (
          <input id={`copy-${k}`} ref={ref} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value.replace(/\n/g, ""))} className={cls} />
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-[12px] leading-relaxed text-sd-critical">
          {error}
        </p>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {usable.map((v) => (
            <button key={v} type="button" disabled={disabled} onClick={() => insert(v)} className="rounded-md bg-sd-gray-200 px-1.5 py-0.5 text-[11px] font-semibold text-sd-fg-muted hover:bg-sd-gray-300 disabled:opacity-40" title={`${v} 넣기`}>
              + {v}
            </button>
          ))}
          {changed && (
            <button type="button" disabled={disabled} onClick={() => onChange(def.text)} className="ml-auto text-[12px] font-semibold text-accent hover:underline disabled:opacity-40">
              기본으로
            </button>
          )}
          {multi && <span className="text-[11px] text-sd-fg-subtle">Enter 로 줄을 나눠요</span>}
        </div>
      )}
    </div>
  );
}

// ── 그림 고르기 (#224) ──

type Library = { assets: Asset[]; error: string | null; loading: boolean };

/** 그림 보관함. 못 읽어도 탭은 그대로 쓰게 하고, 고르는 칸에만 알린다 */
function useLibrary(): Library {
  const [state, setState] = useState<Library>({ assets: [], error: null, loading: true });
  useEffect(() => {
    let alive = true;
    fetchAssets()
      .then((d) => alive && setState({ assets: d.assets.filter((a) => !a.archived), error: null, loading: false }))
      .catch((e: Error) => alive && setState({ assets: [], error: e.message, loading: false }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

function LibraryNote({ library, empty }: { library: Library; empty: string }) {
  if (library.loading) return <p className="text-[12px] text-sd-fg-subtle">보관함을 불러오는 중이에요…</p>;
  if (library.error) return <p className="text-[12px] text-sd-critical">보관함을 못 불러왔어요. {library.error}</p>;
  return (
    <p className="text-[12px] text-sd-fg-subtle">
      {empty}{" "}
      <a href="/admin/assets" className="font-semibold text-accent hover:underline">
        그림 보관함
      </a>
      에 올려요.
    </p>
  );
}

/** 쓸 프레임과 순서. 2개 이상이면 손님이 고르기 화면에서 고른다 */
function FramesCard({ k, set, disabled, library }: { k: KioskConfig; set: (p: Partial<KioskConfig>) => void; disabled: boolean; library: Library }) {
  const chosen: FrameRef[] = k.frames.length ? k.frames : [BUILTIN_FRAME];
  const options: FrameRef[] = [BUILTIN_FRAME, ...library.assets.map(toFrameRef).filter((f): f is FrameRef => f !== null)].filter((f) => !chosen.some((c) => c.key === f.key));
  const setFrames = (frames: FrameRef[]) => {
    // 기본 하나만 남으면 "고른 게 없음"으로 저장한다(기본 그림이 바뀌면 따라가게)
    const next = frames.length === 1 && frames[0].key === BUILTIN_FRAME.key ? [] : frames;
    // 칸 수가 바뀌면 찍는 장수가 칸 수보다 적지 않게
    const slots = (next[0] ?? BUILTIN_FRAME).slots.length;
    set({ frames: next, shots: k.select ? Math.max(k.shots, slots) : slots });
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...chosen];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setFrames(next);
  };
  return (
    <Card title="쓸 프레임">
      <div data-field="kiosk.frames" className="space-y-3">
        <ol className="space-y-2">
          {chosen.map((f, i) => (
            <li key={f.key} className="flex items-center gap-3 rounded-xl border border-sd-line p-2">
              <img src={frameSrc(f)} alt="" className="h-16 w-auto rounded-sm ring-1 ring-sd-line" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-sd-fg">
                  {i + 1}. {f.label}
                </p>
                <p className="text-[12px] text-sd-fg-subtle">
                  {f.slots.length}컷{i === 0 ? " · 손님에게 처음 보여요" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <IconBtn label="위로" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
                  ↑
                </IconBtn>
                <IconBtn label="아래로" disabled={disabled || i === chosen.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </IconBtn>
                <IconBtn label="빼기" disabled={disabled || chosen.length === 1} onClick={() => setFrames(chosen.filter((x) => x.key !== f.key))}>
                  ✕
                </IconBtn>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-[12px] leading-relaxed text-sd-fg-subtle">
          {chosen.length > 1 ? `손님이 고르기 화면에서 ${chosen.length}개 중에 골라요.` : "하나면 고르는 칸 없이 이 프레임으로 찍어요."} 인쇄 가장자리는 손님이 고른 프레임 대표색으로 채워요.
        </p>
        {options.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">더하기</p>
            <div className="grid grid-cols-3 gap-2">
              {options.map((f) => {
                const ok = compatible(chosen[0], f);
                return (
                  <button
                    key={f.key}
                    type="button"
                    disabled={disabled || !ok}
                    title={ok ? `${f.label} 더하기` : "칸 수나 칸 비율이 달라 같이 쓸 수 없어요"}
                    onClick={() => setFrames([...chosen, f])}
                    className="flex flex-col items-center gap-1 rounded-xl border border-sd-line p-2 text-center transition-colors hover:bg-sd-fill disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <img src={frameSrc(f)} alt="" className="h-20 w-auto rounded-sm" />
                    <span className="w-full truncate text-[12px] font-semibold text-sd-fg-muted">{f.label}</span>
                    {!ok && <span className="text-[11px] text-sd-fg-subtle">칸이 달라요</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <LibraryNote library={library} empty="새 프레임은" />
      </div>
    </Card>
  );
}

/** 부스 캐릭터 짝. 경찰 하나, 도둑 하나 */
function CharactersCard({ k, set, disabled, library }: { k: KioskConfig; set: (p: Partial<KioskConfig>) => void; disabled: boolean; library: Library }) {
  const pick = (side: Side, c: { key: string | null; label: string }) => set({ characters: { ...k.characters, [side]: c.key ? { key: c.key, label: c.label } : null } });
  return (
    <Card title="캐릭터 짝">
      <div data-field="kiosk.characters" className="space-y-4">
        {(["cop", "thief"] as const).map((side) => {
          const items = [
            { key: null as string | null, label: BUILTIN_CHARACTERS[side].label, src: BUILTIN_CHARACTERS[side].src },
            ...BUILTIN_CHARACTER_SET.filter((c) => c.side === side).map((c) => ({ key: c.key as string | null, label: c.label, src: c.src })),
            ...library.assets.filter((a) => a.kind === "character" && a.meta.side === side).map((a) => ({ key: a.key as string | null, label: a.label, src: assetUrl(a.key) })),
          ];
          return (
            <div key={side}>
              <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">{side === "cop" ? "경찰 쪽" : "도둑 쪽"}</p>
              <div role="radiogroup" aria-label={side === "cop" ? "경찰 쪽 캐릭터" : "도둑 쪽 캐릭터"} className="flex flex-wrap gap-2">
                {items.map((c) => {
                  const on = (k.characters[side]?.key ?? null) === c.key;
                  return (
                    <button
                      key={c.key ?? "builtin"}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={disabled}
                      onClick={() => pick(side, c)}
                      className={`flex w-[88px] flex-col items-center gap-1 rounded-xl border p-2 transition-colors disabled:opacity-50 ${on ? "border-accent bg-accent-weak" : "border-sd-line hover:bg-sd-fill"}`}
                    >
                      <img src={c.src} alt="" className="h-12 w-auto" />
                      <span className={`w-full truncate text-[11px] font-semibold ${on ? "text-accent" : "text-sd-fg-muted"}`}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="text-[12px] leading-relaxed text-sd-fg-subtle">시작, 찍기, 고르기, 미리보기, 받기 화면과 손님 폰에 늘 짝으로 나와요.</p>
        <LibraryNote library={library} empty="새 캐릭터는" />
      </div>
    </Card>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-lg text-[13px] text-sd-fg-muted hover:bg-sd-gray-200 disabled:opacity-30">
      {children}
    </button>
  );
}
