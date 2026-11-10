"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, SearchIcon, XIcon } from "@/components/admin/icons";
import { CardTile } from "@/components/admin/overview/OverviewCards";
import { RoleArt } from "@/components/admin/team/RoleArt";
import { CARD_KEYS, CARDS, cellsOf, MAX_CELLS, pack, type CardGroup, type CardKey } from "@/lib/admin/overview/cards";
import { fitCards } from "@/lib/admin/overview/layout";
import { SAMPLE_CARDS, SAMPLE_LIVE } from "@/lib/admin/overview/samples";

// 개요 카드 고르기 (docs/admin-ui.md "역할과 카드", "내 개요 구성"). 역할 편집 창과 내 개요 구성이 같이 쓴다.
// 왼쪽은 실제 모양 그대로 줄인 카드 갤러리, 오른쪽은 고른 카드를 실제 배치로 놓은 미리보기다. 숫자는 예시다.

const GROUPS: (CardGroup | "전체")[] = ["전체", "성장", "게임", "안정성", "운영", "준비"];
/** 미리보기는 실제 개요 폭(네 칸)으로 그린 뒤 줄인다 */
const STAGE_W = 820;
const ROW_H = 172;
const GAP = 12;

function Mini({ k }: { k: CardKey }) {
  const size = CARDS[k].size;
  return (
    <div aria-hidden className="relative h-[104px] overflow-hidden rounded-xl bg-sd-fill">
      <div className="pointer-events-none absolute left-0 top-0 origin-top-left scale-[0.6]" style={{ width: size === 2 ? 252 * 2 + GAP : 252, height: ROW_H }}>
        <CardTile k={k} span={1} live={SAMPLE_LIVE} result={SAMPLE_CARDS[k]} link={false} />
      </div>
    </div>
  );
}

/** 이 역할의 개요. 끌거나 화살표로 순서를 바꾸고, ✕나 Delete 로 뺀다 */
function Preview({ keys, onChange }: { keys: CardKey[]; onChange: (next: CardKey[]) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const items = useRef(new Map<CardKey, HTMLDivElement>());
  const [width, setWidth] = useState(360);
  const [drag, setDrag] = useState<CardKey | null>(null);
  const [focusKey, setFocusKey] = useState<CardKey | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // 화살표로 옮긴 뒤에도 같은 카드에 초점을 둔다
  useEffect(() => {
    if (focusKey) items.current.get(focusKey)?.focus();
  }, [focusKey, keys]);

  const move = useCallback((key: CardKey, to: number) => {
    const rest = keys.filter((k) => k !== key);
    rest.splice(Math.max(0, Math.min(to, rest.length)), 0, key);
    onChange(rest);
  }, [keys, onChange]);

  // 끄는 동안 손가락 아래 칸으로 옮긴다. 나머지는 layout 으로 비켜 준다.
  // 미끄러지는 중인 카드 위치로 재면 앞뒤로 흔들려서, 카드가 아니라 격자의 고정된 칸 위치로 잰다
  const grid = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  useEffect(() => {
    if (!drag) return;
    let timer = 0;
    let at = { x: 0, y: 0 };
    const check = (force: boolean) => {
      const g = grid.current;
      const wait = 180 - (performance.now() - last.current);
      if (!g) return;
      // 멈춘 채로 기다리는 중이면 기다린 뒤에 마지막 위치로 맞춘다
      if (!force && wait > 0) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => check(true), wait);
        return;
      }
      const e = { clientX: at.x, clientY: at.y };
      const box = g.getBoundingClientRect();
      const s = box.width / STAGE_W;
      const x = (e.clientX - box.left) / s;
      const y = (e.clientY - box.top) / s;
      const cw = (STAGE_W - 3 * GAP) / 4;
      let col = 0;
      let row = 0;
      for (const { key, span } of pack(keys, 4)) {
        if (col + span > 4) {
          col = 0;
          row++;
        }
        const left = col * (cw + GAP);
        const top = row * (ROW_H + GAP);
        if (x >= left && x <= left + span * cw + (span - 1) * GAP && y >= top && y <= top + ROW_H) {
          if (key !== drag) {
            last.current = performance.now();
            move(drag, keys.indexOf(key));
          }
          return;
        }
        col += span;
      }
    };
    const onMove = (e: PointerEvent) => {
      at = { x: e.clientX, y: e.clientY };
      check(false);
    };
    // 손을 뗀 곳에 놓는다
    const onUp = (e: PointerEvent) => {
      window.clearTimeout(timer);
      at = { x: e.clientX, y: e.clientY };
      check(true);
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.clearTimeout(timer);
    };
  }, [drag, keys, move]);

  const onKey = (k: CardKey) => (e: KeyboardEvent) => {
    const i = keys.indexOf(k);
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (step) {
      e.preventDefault();
      setFocusKey(k);
      move(k, i + step);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onChange(keys.filter((x) => x !== k));
    }
  };

  const placed = pack(keys, 4);
  const rows = Math.ceil(placed.reduce((n, p) => n + p.span, 0) / 4);
  const scale = (width - 20) / STAGE_W;
  // 비어 있을 때도 같은 상자를 두어야 폭을 재는 장치가 처음부터 붙는다
  if (!keys.length)
    return (
      <div ref={wrap} className="grid min-h-[150px] place-items-center rounded-2xl border-[1.5px] border-dashed border-sd-line px-4 text-center text-[13px] leading-relaxed text-sd-fg-subtle">
        <span>
          카드를 고르면
          <br />
          여기에 바로 놓여요
        </span>
      </div>
    );
  return (
    <div ref={wrap} className="relative overflow-hidden rounded-2xl bg-sd-fill p-2.5" style={{ height: (rows * ROW_H + (rows - 1) * GAP) * scale + 20 }}>
      <div ref={grid} className="absolute left-2.5 top-2.5 grid origin-top-left" style={{ width: STAGE_W, gap: GAP, gridAutoRows: ROW_H, gridTemplateColumns: "repeat(4, minmax(0, 1fr))", transform: `scale(${scale})` }}>
        {placed.map(({ key, span }) => (
          <motion.div
            key={key}
            layout
            ref={(el: HTMLDivElement | null) => {
              if (el) items.current.set(key, el);
              else items.current.delete(key);
            }}
            tabIndex={0}
            role="listitem"
            aria-label={`${CARDS[key].title}. 화살표로 옮기고 Delete 로 빼요`}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              setDrag(key);
            }}
            onKeyDown={onKey(key)}
            animate={{ scale: drag === key ? 1.04 : 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 40 }}
            style={{ gridColumn: `span ${span}`, zIndex: drag === key ? 10 : 1 }}
            className={`relative touch-none select-none rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-accent ${drag === key ? "cursor-grabbing shadow-[0_24px_48px_-16px_rgba(0,0,0,0.35)]" : "cursor-grab"}`}
          >
            <CardTile k={key} span={span} live={SAMPLE_LIVE} result={SAMPLE_CARDS[key]} link={false} />
            {/* 줄인 만큼 키워서 손가락으로 누를 수 있는 크기를 지킨다 */}
            <button
              type="button"
              aria-label={`${CARDS[key].title} 빼기`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onChange(keys.filter((x) => x !== key))}
              className="absolute right-2.5 top-2.5 grid size-7 origin-top-right place-items-center rounded-full bg-sd-fg text-sd-surface"
              style={{ transform: `scale(${1 / scale})` }}
            >
              <XIcon className="size-3.5 [stroke-width:3]" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

type Starter = { key: string; name: string; icon: string; cards: string[] };

export function CardPicker({ keys, onChange, onNote, title, starters, emptyHint }: { keys: CardKey[]; onChange: (next: CardKey[]) => void; onNote: (note: { text: string; bad?: boolean } | null) => void; title: string; starters: Starter[]; emptyHint: string }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<CardGroup | "전체">("전체");
  const used = cellsOf(keys);
  const setCards = (next: CardKey[]) => {
    onNote(null);
    onChange(next);
  };
  const toggle = (k: CardKey) => {
    if (keys.includes(k)) return setCards(keys.filter((x) => x !== k));
    if (used + CARDS[k].size > MAX_CELLS) return onNote({ text: "자리가 꽉 찼어요. 하나를 빼고 넣어 주세요.", bad: true });
    setCards([...keys, k]);
  };
  const fillFrom = (r: Starter) => {
    onChange(fitCards(r.cards));
    onNote({ text: `${r.name} 카드로 채웠어요. 고쳐서 쓰세요.` });
  };
  const shown = CARD_KEYS.filter((k) => (group === "전체" || CARDS[k].group === group) && (!q.trim() || CARDS[k].title.includes(q.trim())));

  return (
    <div className="grid min-h-full grid-cols-[minmax(0,1fr)] md:h-full md:grid-cols-[minmax(0,1fr)_380px]">
              {/* 넓은 화면은 갤러리와 미리보기를 따로 스크롤해서 고르는 동안 미리보기가 늘 보인다 */}
              <section aria-label="카드 고르기" className="min-w-0 px-4 py-5 sm:px-6 md:overflow-y-auto md:overscroll-contain">
                <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-2xl bg-accent-weak px-3.5 py-3">
                  <span className="mr-1 text-[13px] font-semibold text-sd-fg">{keys.length ? "다른 역할의 카드로 바꾸기" : "비슷한 역할에서 시작하기"}</span>
                  {starters.map((r) => (
                    <button key={r.key} type="button" onClick={() => fillFrom(r)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sd-surface px-3 text-[12.5px] font-medium text-sd-fg transition active:scale-95">
                      <RoleArt icon={r.icon} className="size-[18px] text-accent" />
                      {r.name}
                    </button>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <label className="relative min-w-40 max-w-64 flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sd-fg-subtle" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="카드 이름으로 찾기" aria-label="카드 찾기" className="h-9 w-full rounded-xl border border-sd-line bg-sd-surface pl-9 pr-3 text-[13.5px] text-sd-fg outline-none placeholder:text-sd-placeholder focus:border-accent" />
                  </label>
                  <div role="group" aria-label="카드 묶음" className="flex flex-wrap gap-1">
                    {GROUPS.map((g) => (
                      <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={`h-8 rounded-full px-3 text-[12.5px] transition-colors ${group === g ? "bg-sd-fg font-semibold text-sd-surface" : "bg-sd-surface text-sd-fg-muted hover:text-sd-fg"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                {shown.length ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,164px)]">
                    {shown.map((k) => {
                      const on = keys.includes(k);
                      const full = !on && used + CARDS[k].size > MAX_CELLS;
                      return (
                        <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)} style={{ gridColumn: `span ${CARDS[k].size}` }} className={`relative rounded-2xl bg-sd-surface p-1.5 text-left transition hover:-translate-y-0.5 active:scale-[0.98] ${on ? "ring-2 ring-accent" : "ring-1 ring-sd-hairline hover:ring-sd-line"} ${full ? "opacity-45" : ""}`}>
                          <span aria-hidden className={`absolute left-3 top-3 z-10 grid size-[22px] place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-200 ${on ? "scale-100" : "scale-0"}`}>
                            <CheckIcon className="size-3.5 [stroke-width:3]" />
                          </span>
                          <Mini k={k} />
                          <span className="block px-1.5 pb-1 pt-2">
                            <b className="block text-[13px] font-semibold leading-snug text-sd-fg">{CARDS[k].title}</b>
                            <span className="mt-1 flex flex-wrap gap-1 text-[11px]">
                              <span className={`rounded-md px-1.5 py-0.5 ${CARDS[k].fresh === "실시간" ? "bg-sd-positive-weak text-sd-positive" : "bg-sd-fill text-sd-fg-muted"}`}>{CARDS[k].fresh}</span>
                              {CARDS[k].size === 2 && <span className="rounded-md bg-sd-fill px-1.5 py-0.5 text-sd-fg-muted">2칸</span>}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-[13.5px] text-sd-fg-subtle">&ldquo;{q.trim()}&rdquo;와 맞는 카드가 없어요. 다른 말로 찾아보세요.</p>
                )}
              </section>
              <aside aria-label="이 역할의 개요 미리보기" className="order-first flex flex-col gap-3 border-b border-sd-hairline bg-sd-surface px-4 py-5 sm:px-5 md:order-none md:overflow-y-auto md:border-b-0 md:border-l">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="truncate text-[15px] font-bold text-sd-fg">{title}</b>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-sd-fg-muted">
                    {used}/{MAX_CELLS}칸 · {used < MAX_CELLS ? `${MAX_CELLS - used}칸 남았어요` : "꽉 찼어요"}
                  </span>
                </div>
                <div aria-hidden className="grid grid-cols-8 gap-[3px]">
                  {Array.from({ length: MAX_CELLS }, (_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-colors ${i < used ? "bg-accent" : "bg-sd-fill"}`} />
                  ))}
                </div>
                <div role="list" aria-label="고른 카드">
                  <Preview keys={keys} onChange={setCards} />
                </div>
                <p className="text-[12px] leading-relaxed text-sd-fg-subtle">{keys.length ? "끌어서 순서를 바꾸고 ✕로 빼요. 키보드로는 화살표로 옮기고 Delete 로 빼요. 숫자는 예시예요." : emptyHint}</p>
              </aside>
            </div>
  );
}
