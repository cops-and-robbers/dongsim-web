"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ArrowRightIcon, CheckIcon, ChevronLeftIcon, SearchIcon, XIcon } from "@/components/admin/icons";
import { CardTile } from "@/components/admin/overview/OverviewCards";
import { RoleArt } from "@/components/admin/team/RoleArt";
import { RoleTile } from "@/components/admin/team/RolePicker";
import { useToast } from "@/components/admin/Toast";
import { CARD_KEYS, CARDS, cellsOf, isCardKey, MAX_CELLS, pack, type CardGroup, type CardKey } from "@/lib/admin/overview/cards";
import { SAMPLE_CARDS, SAMPLE_LIVE } from "@/lib/admin/overview/samples";
import { DESC_MAX, ICON_GROUPS, isBuiltin, NAME_MAX, roleProblem, type Role, type RoleInput, type Team } from "@/lib/admin/team";
import { archiveRole, createRole, updateRole } from "@/lib/admin/teamClient";

// 역할 편집 창 (docs/admin-ui.md "역할과 카드"). 1 이름과 아이콘, 2 보여 줄 카드.
// 카드는 실제 모양 그대로 작게 보여 주고, 고르는 즉시 오른쪽 개요 미리보기에 놓는다. 숫자는 예시다.

const FIELD = "h-11 w-full rounded-xl border border-sd-line bg-sd-surface px-3.5 text-[15px] text-sd-fg outline-none transition-colors placeholder:text-sd-placeholder focus:border-accent";
const GROUPS: (CardGroup | "전체")[] = ["전체", "성장", "게임", "안정성", "운영", "준비"];
/** 미리보기는 실제 개요 폭(네 칸)으로 그린 뒤 줄인다 */
const STAGE_W = 820;
const ROW_H = 172;
const GAP = 12;

const fitCards = (keys: string[]): CardKey[] => {
  const out: CardKey[] = [];
  for (const k of keys) if (isCardKey(k) && !out.includes(k) && cellsOf([...out, k]) <= MAX_CELLS) out.push(k);
  return out;
};

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

export function RoleSheet({ role, team, onClose, onSaved }: { role: Role | null; team: Team; onClose: () => void; onSaved: (next: Team) => void }) {
  const toast = useToast();
  const builtin = !!role && isBuiltin(role.key);
  const [initial] = useState<RoleInput>(() => (role ? { name: role.name, description: role.description, icon: role.icon, cards: fitCards(role.cards) } : { name: "", description: "", icon: "sparkles", cards: [] }));
  const [draft, setDraft] = useState<RoleInput>(initial);
  const [step, setStep] = useState<1 | 2>(1);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<CardGroup | "전체">("전체");
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const others = team.roles.filter((r) => r.key !== role?.key);
  const keys = fitCards(draft.cards);
  const used = cellsOf(keys);
  const problem = roleProblem(draft, others, builtin);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const holders = role ? team.members.filter((m) => m.roleKeys.includes(role.key)).length : 0;
  const isNew = !role;

  const set = (patch: Partial<RoleInput>) => setDraft((d) => ({ ...d, ...patch }));
  const setCards = (cards: CardKey[]) => {
    setNote(null);
    set({ cards });
  };
  const close = () => (dirty && !pending ? setLeaving(true) : onClose());

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || removing || leaving) return;
      if (dirty && !pending) setLeaving(true);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, pending, removing, leaving, onClose]);

  const next = () => {
    if (problem) {
      setNote({ text: problem, bad: true });
      nameRef.current?.focus();
      return;
    }
    setNote(null);
    setStep(2);
  };

  const toggle = (k: CardKey) => {
    if (keys.includes(k)) return setCards(keys.filter((x) => x !== k));
    if (used + CARDS[k].size > MAX_CELLS) return setNote({ text: "자리가 꽉 찼어요. 하나를 빼고 넣어 주세요.", bad: true });
    setCards([...keys, k]);
  };

  const fillFrom = (r: Role) => {
    setCards(fitCards(r.cards));
    setNote({ text: `${r.name} 역할의 카드로 채웠어요. 고쳐서 쓰세요.` });
  };

  const save = () => {
    setPending(true);
    setNote(null);
    const input = { ...draft, cards: keys };
    (role ? updateRole(role, input) : createRole(input))
      .then((saved) => {
        onSaved({ ...team, roles: role ? team.roles.map((r) => (r.key === saved.key ? saved : r)) : [...team.roles, saved] });
        toast(`${saved.name} 역할을 ${role ? "저장했어요" : "만들었어요"}.`);
        onClose();
      })
      .catch((e: Error) => {
        setNote({ text: e.message, bad: true });
        setPending(false);
      });
  };

  const remove = () => {
    if (!role) return;
    setPending(true);
    archiveRole(role)
      .then(() => {
        const strip = (ks: string[]) => ks.filter((k) => k !== role.key);
        onSaved({ ...team, roles: others, members: team.members.map((m) => ({ ...m, roleKeys: strip(m.roleKeys) })), me: { ...team.me, roleKeys: strip(team.me.roleKeys) } });
        toast(`${role.name} 역할을 지웠어요.`);
        onClose();
      })
      .catch((e: Error) => {
        setNote({ text: e.message, bad: true });
        setRemoving(false);
        setPending(false);
      });
  };

  const shown = CARD_KEYS.filter((k) => (group === "전체" || CARDS[k].group === group) && (!q.trim() || CARDS[k].title.includes(q.trim())));
  const tile: Role = { key: role?.key ?? "new", name: draft.name.trim() || "역할 이름", description: draft.description.trim() || "이 역할이 주로 하는 일", icon: draft.icon, cards: [], position: 0, updatedBy: "", updatedAt: "" };

  const stepButton = (n: 1 | 2, label: string) => (
    <button
      type="button"
      aria-current={step === n ? "step" : undefined}
      onClick={() => (n === 2 ? next() : setStep(1))}
      className={`inline-flex h-9 items-center gap-2 rounded-full pl-1.5 pr-3 text-[13px] transition-colors hover:bg-sd-fill ${step === n ? "font-semibold text-sd-fg" : "text-sd-fg-muted"}`}
    >
      <span className={`grid size-6 place-items-center rounded-full text-[12px] font-bold ${step === n ? "bg-accent text-accent-fg" : step > n ? "bg-accent-weak text-accent" : "bg-sd-fill"}`}>{step > n ? <CheckIcon className="size-3.5 [stroke-width:3]" /> : n}</span>
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 sm:p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-sheet-title"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className={`grid w-full max-w-[1080px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-sd-fill shadow-2xl sm:rounded-[22px] ${step === 1 ? "h-full sm:h-auto sm:max-h-full" : "h-full sm:h-[min(860px,100%)]"}`}
      >
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-sd-hairline bg-sd-surface px-4 py-3 sm:px-6 sm:py-3.5">
          <h2 id="role-sheet-title" className="min-w-0 flex-1 truncate text-[18px] font-bold tracking-tight text-sd-fg">
            {isNew ? "새 역할" : `${role.name} 역할 고치기`}
          </h2>
          <nav aria-label="단계" className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
            {stepButton(1, "이름과 아이콘")}
            <span aria-hidden className="h-0.5 w-4 rounded bg-sd-line" />
            {stepButton(2, "보여 줄 카드")}
          </nav>
          <button type="button" onClick={close} aria-label="닫기" className="grid size-9 place-items-center rounded-xl text-sd-fg-muted transition-colors hover:bg-sd-fill hover:text-sd-fg">
            <XIcon className="size-[18px]" />
          </button>
        </header>

        <div className={`overscroll-contain ${step === 2 ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto"}`}>
          {step === 1 ? (
            <div className="grid gap-7 px-4 py-6 sm:px-7 md:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-5">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-bold text-sd-fg">역할 이름</span>
                  <input
                    ref={nameRef}
                    value={draft.name}
                    maxLength={NAME_MAX}
                    autoFocus
                    onChange={(e) => {
                      setNote(null);
                      set({ name: e.target.value });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && next()}
                    placeholder="커뮤니티"
                    className={FIELD}
                  />
                  <span className="mt-1 block text-[12px] text-sd-fg-subtle">처음 고르는 화면과 운영진 목록에 이 이름이 보여요.</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-bold text-sd-fg">한 줄 설명</span>
                  <input value={draft.description} maxLength={DESC_MAX} onChange={(e) => set({ description: e.target.value })} onKeyDown={(e) => e.key === "Enter" && next()} placeholder="디스코드와 오픈채팅 응대" className={FIELD} />
                </label>
                {builtin ? (
                  <p className="text-[12.5px] text-sd-fg-subtle">처음부터 있는 역할이라 그림은 그대로예요.</p>
                ) : (
                  <div role="radiogroup" aria-label="아이콘">
                    <span className="mb-2 block text-[13px] font-bold text-sd-fg">아이콘</span>
                    <div className="space-y-2.5">
                      {ICON_GROUPS.map((g) => (
                        <div key={g.label} className="sm:flex sm:gap-3">
                          <span className="mb-1 block shrink-0 text-[12px] font-semibold text-sd-fg-subtle sm:mb-0 sm:w-16 sm:pt-2.5">{g.label}</span>
                          <div className="grid flex-1 grid-cols-6 gap-1 sm:grid-cols-10">
                            {g.icons.map((i) => (
                              <button key={i.key} type="button" role="radio" aria-checked={draft.icon === i.key} aria-label={i.label} title={i.label} onClick={() => set({ icon: i.key })} className={`grid h-10 place-items-center rounded-xl transition-colors ${draft.icon === i.key ? "bg-accent text-accent-fg" : "bg-sd-surface text-sd-fg-muted hover:bg-accent-weak hover:text-accent"}`}>
                                <RoleArt icon={i.key} className="size-5 [stroke-width:1.8]" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="md:sticky md:top-0 md:self-start">
                <span className="mb-2 block text-[13px] font-bold text-sd-fg">처음 고르는 화면에서는 이렇게 보여요</span>
                <div aria-hidden className="pointer-events-none max-w-[300px]">
                  <RoleTile role={tile} on={false} onToggle={() => undefined} />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-full grid-cols-[minmax(0,1fr)] md:h-full md:grid-cols-[minmax(0,1fr)_380px]">
              {/* 넓은 화면은 갤러리와 미리보기를 따로 스크롤해서 고르는 동안 미리보기가 늘 보인다 */}
              <section aria-label="카드 고르기" className="min-w-0 px-4 py-5 sm:px-6 md:overflow-y-auto md:overscroll-contain">
                <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-2xl bg-accent-weak px-3.5 py-3">
                  <span className="mr-1 text-[13px] font-semibold text-sd-fg">{keys.length ? "다른 역할의 카드로 바꾸기" : "비슷한 역할에서 시작하기"}</span>
                  {others.map((r) => (
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
                  <b className="truncate text-[15px] font-bold text-sd-fg">{draft.name.trim() || "이 역할"}의 개요</b>
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
                <p className="text-[12px] leading-relaxed text-sd-fg-subtle">{keys.length ? "끌어서 순서를 바꾸고 ✕로 빼요. 키보드로는 화살표로 옮기고 Delete 로 빼요. 숫자는 예시예요." : "이 역할을 맡은 분의 개요가 여기 놓인 카드로 시작해요."}</p>
              </aside>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-sd-hairline bg-sd-surface px-4 py-3 sm:px-6">
          {step === 1 && role && !builtin && (
            <button type="button" onClick={() => setRemoving(true)} className="mr-1 text-[13px] font-semibold text-sd-critical hover:underline">
              이 역할 지우기
            </button>
          )}
          <p role="status" className={`min-w-0 flex-1 basis-48 text-[13px] ${note?.bad ? "font-medium text-sd-critical" : "text-sd-fg-muted"}`}>
            {note?.text ?? (step === 1 ? "다음 단계에서 이 역할의 개요에 보일 카드를 골라요." : keys.length ? `카드 ${keys.length}장, ${used}/${MAX_CELLS}칸을 골랐어요.` : "카드를 고르지 않으면 팀 기본 카드를 보여 드려요.")}
          </p>
          <span className="ml-auto flex gap-2">
            {step === 1 ? (
              <>
                <Button variant="neutral" onClick={close}>
                  취소
                </Button>
                <Button onClick={next}>
                  다음: 보여 줄 카드
                  <ArrowRightIcon className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="neutral" onClick={() => setStep(1)} disabled={pending}>
                  <ChevronLeftIcon className="size-4" />
                  이전
                </Button>
                <Button onClick={save} disabled={pending || !!problem || (!isNew && !dirty)}>
                  {pending ? "저장하는 중..." : isNew ? "역할 만들기" : "저장"}
                </Button>
              </>
            )}
          </span>
        </footer>
      </motion.div>

      <ConfirmDialog open={removing} danger pending={pending} title={`${role?.name ?? ""} 역할을 지울까요?`} message={holders ? `맡고 있는 ${holders}명의 역할에서도 빠져요.` : "맡고 있는 분은 없어요."} confirmText="지우기" onConfirm={remove} onClose={() => setRemoving(false)} />
      <ConfirmDialog open={leaving} title="고친 내용을 버릴까요?" message="저장하지 않고 닫으면 고친 내용이 사라져요." confirmText="버리기" cancelText="계속 고치기" onConfirm={onClose} onClose={() => setLeaving(false)} />
    </div>
  );
}
