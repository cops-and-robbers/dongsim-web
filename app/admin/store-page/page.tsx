"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ErrorBlock, PageHeader, ScrollPage } from "@/components/admin/Parts";
import { AppStoreMark, GooglePlayMark, RefreshIcon } from "@/components/admin/icons";
import { PreviewPane } from "@/components/admin/ops/PreviewPane";
import { FieldEditor, OfficialLink } from "@/components/admin/store-page/FieldEditor";
import { ImageBoard } from "@/components/admin/store-page/ImageBoard";
import { SendDialog } from "@/components/admin/store-page/SendDialog";
import { useToast } from "@/components/admin/Toast";
import { blockers, changesOf, imageBlockers, imageChangesOf } from "@/lib/store-page/send";
import { SpecGuide } from "@/components/admin/store-page/SpecGuide";
import { StorePreview } from "@/components/admin/store-page/StorePreview";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import type { Surface } from "@/lib/store-page/display";
import { DraftConflict, fetchStorePage, saveImageDraft, saveStoreDraft } from "@/lib/admin/storePageClient";
import { draftKey, IMAGE_SLOTS, sameItems, type ImageDraft, type ImageItem, type ImageSlotId } from "@/lib/store-page/images";
import { baseOf, FIELDS, HUMAN_CHECKS, keyOf, LANGS, LINKS, type Draft, type FieldId, type Lang, type Platform, type Side, type StorePage, type Values } from "@/lib/store-page/fields";

// 어드민 "스토어 페이지" (docs/admin-ui.md "스토어 페이지"). 마케터와 디자이너가 쓴다.
// 왼쪽에서 고치면 오른쪽 폰에 바로 보이고, 칸을 고치면 잠시 뒤 초안으로 저장된다. 스토어에는 보내지 않는다.

const SAVE_DELAY = 800;
type View = "edit" | "images" | "spec";

/** 칸 옆에 표시를 붙일 수 있는 탭. 고른 알약은 미끄러지듯 옮겨 간다 */
function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[]; label: string }) {
  const gid = useId();
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-xl bg-sd-gray-200 p-1">
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button key={it.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.value)} className={`relative rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${on ? "text-sd-fg" : "text-sd-fg-subtle hover:text-sd-fg-muted"}`}>
            {on && <motion.span layoutId={gid} className="absolute inset-0 rounded-lg bg-sd-surface shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {it.label}
              {!!it.count && <span className="min-w-4 rounded-full bg-accent px-1 text-center text-[11px] font-bold tabular-nums leading-4 text-accent-fg">{it.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy className="grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="h-[560px] rounded-2xl bg-sd-gray-200" />
      <div className="h-[560px] rounded-2xl bg-sd-gray-200" />
    </div>
  );
}

export default function StorePageScreen() {
  const [data, setData] = useState<StorePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("edit");
  const [platform, setPlatform] = useState<Platform>("ios");
  const [lang, setLang] = useState<Lang>("ko");
  const [mode, setMode] = useState<Surface>("page");
  const [spot, setSpot] = useState<FieldId | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [conflicts, setConflicts] = useState<Record<string, Draft | null>>({});
  const [saving, setSaving] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [imageDrafts, setImageDrafts] = useState<Record<string, ImageDraft>>({});
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const timers = useRef<Record<string, number>>({});
  const seq = useRef(0);

  const load = useCallback((fresh = false) => {
    const id = ++seq.current;
    fetchStorePage(fresh)
      .then((d) => {
        if (id !== seq.current) return;
        setData(d);
        setDrafts(Object.fromEntries(d.drafts.map((x) => [keyOf(x.platform, x.lang, x.field), x])));
        setImageDrafts(Object.fromEntries(d.imageDrafts.map((x) => [draftKey(x.platform, x.lang, x.slot), x])));
        setError(null);
      })
      .catch((e: Error) => id === seq.current && setError(e.message))
      .finally(() => id === seq.current && setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  // 다른 탭에서 돌아오면 다른 사람이 고친 초안을 다시 읽는다
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const sideOf = useCallback((p: Platform, l: Lang): Side | undefined => {
    const page = data?.[p];
    return page?.ok ? page.langs[l] : undefined;
  }, [data]);

  const valueOf = useCallback((p: Platform, l: Lang, f: FieldId) => edits[keyOf(p, l, f)] ?? drafts[keyOf(p, l, f)]?.value ?? baseOf(sideOf(p, l), f), [edits, drafts, sideOf]);

  const save = useCallback(
    (p: Platform, l: Lang, f: FieldId, value: string, expect: string | null) => {
      const key = keyOf(p, l, f);
      const same = value === baseOf(sideOf(p, l), f);
      setSaving((n) => n + 1);
      setFailed(null);
      saveStoreDraft({ platform: p, lang: l, field: f, value: same ? null : value, expect })
        .then((d) => {
          setDrafts((m) => {
            const next = { ...m };
            if (d) next[key] = d;
            else delete next[key];
            return next;
          });
          setConflicts((m) => {
            const next = { ...m };
            delete next[key];
            return next;
          });
          setSavedAt(Date.now());
        })
        .catch((e: Error) => {
          if (e instanceof DraftConflict) setConflicts((m) => ({ ...m, [key]: e.current }));
          else setFailed(e.message);
        })
        .finally(() => setSaving((n) => n - 1));
    },
    [sideOf],
  );

  const change = (f: FieldId, value: string) => {
    const key = keyOf(platform, lang, f);
    setEdits((m) => ({ ...m, [key]: value }));
    if (!data?.writable) return;
    window.clearTimeout(timers.current[key]);
    const [p, l] = [platform, lang];
    const expect = drafts[key]?.updatedAt ?? null;
    timers.current[key] = window.setTimeout(() => save(p, l, f, value, expect), SAVE_DELAY);
  };

  const liveOf = useCallback(
    (p: Platform, l: Lang, slot: ImageSlotId): ImageItem[] => {
      const pg = data?.[p];
      return pg?.ok ? (pg.images[l][slot] ?? []) : [];
    },
    [data],
  );
  const listOf = useCallback((p: Platform, l: Lang, slot: ImageSlotId) => imageDrafts[draftKey(p, l, slot)]?.items ?? liveOf(p, l, slot), [imageDrafts, liveOf]);

  const changeImages = (slot: ImageSlotId, next: ImageItem[]) => {
    const key = draftKey(platform, lang, slot);
    const before = imageDrafts[key];
    const same = sameItems(next, liveOf(platform, lang, slot));
    setImageDrafts((m) => {
      const out = { ...m };
      if (same) delete out[key];
      else out[key] = { platform, lang, slot, items: next, updatedBy: before?.updatedBy ?? "", updatedAt: before?.updatedAt ?? "" };
      return out;
    });
    if (!data?.writable) return;
    setSaving((n) => n + 1);
    setFailed(null);
    saveImageDraft({ platform, lang, slot, items: same ? null : next, expect: before?.updatedAt || null })
      .then((d) => {
        setImageDrafts((m) => {
          const out = { ...m };
          if (d) out[key] = d;
          else delete out[key];
          return out;
        });
        setSavedAt(Date.now());
      })
      .catch((e: Error) => {
        setFailed(e.message);
        load();
      })
      .finally(() => setSaving((n) => n - 1));
  };

  const changedImages = (p: Platform, l: Lang) => IMAGE_SLOTS[p].filter((s) => !sameItems(listOf(p, l, s.id), liveOf(p, l, s.id))).length;

  const changedCount = useCallback(
    (p: Platform, l: Lang) => FIELDS[p].filter((f) => valueOf(p, l, f.id) !== baseOf(sideOf(p, l), f.id)).length,
    [valueOf, sideOf],
  );

  const changedIn = (p: Platform) => LANGS.reduce((sum, l) => sum + changedCount(p, l.id) + changedImages(p, l.id), 0);
  const values: Values = useMemo(() => Object.fromEntries(FIELDS[platform].map((f) => [f.id, valueOf(platform, lang, f.id)])), [platform, lang, valueOf]);
  const page = data?.[platform];
  const ios = data?.ios;

  const status = !data?.writable ? data?.readOnlyReason : failed ? failed : saving > 0 ? "저장하는 중이에요" : savedAt ? "초안에 저장했어요" : null;

  // 저장이 끝난 초안만 보낸다. 고치는 중인 글자는 저장된 뒤에 보낼 수 있다
  const saved = Object.values(drafts);
  const pageOk = page?.ok ? page : null;
  const changes = pageOk ? changesOf(platform, pageOk.langs, saved) : [];
  const imageChanges = pageOk ? imageChangesOf(platform, pageOk.images, Object.values(imageDrafts)) : [];
  const blocked = pageOk ? [...blockers(platform, pageOk.langs, changes), ...imageBlockers(platform, pageOk.images, imageChanges)] : [];
  const toSend = changes.length + imageChanges.length;
  const nextVersion = ios?.ok ? ios.nextVersion : null;

  const canSend = toSend > 0 && !!data?.writable;
  const sendBar = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sd-line bg-sd-surface px-4 py-3 shadow-lg">
      <p className="text-[13.5px] text-sd-fg">{blocked.length ? blocked[0] : `${toSend}칸을 스토어로 보낼 수 있어요.`}</p>
      <button type="button" disabled={blocked.length > 0 || saving > 0} onClick={() => setSending(true)} className="h-9 flex-none rounded-[10px] bg-accent px-3.5 text-[13.5px] font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
        {platform === "ios" ? "App Store로 보내기" : "Google Play로 보내기"}
      </button>
    </div>
  );

  const storeTabs = (
    <div className="flex flex-wrap items-center gap-2.5">
                <Tabs<Platform>
                  label="스토어"
                  value={platform}
                  onChange={(p) => {
                    setPlatform(p);
                    setSpot(null);
                    if (p === "ios" && mode === "details") setMode("page");
                  }}
                  items={[
                    { value: "ios", label: <span className="inline-flex items-center gap-1.5"><AppStoreMark className="size-4" />App Store</span>, count: changedIn("ios") },
                    { value: "android", label: <span className="inline-flex items-center gap-1.5"><GooglePlayMark className="size-4" />Google Play</span>, count: changedIn("android") },
                  ]}
                />
                <Tabs<Lang> label="언어" value={lang} onChange={setLang} items={LANGS.map((l) => ({ value: l.id, label: l.label, count: view === "images" ? changedImages(platform, l.id) : changedCount(platform, l.id) }))} />
              </div>
  );
  const screenshots = page?.ok ? listOf(platform, lang, platform === "ios" ? "iphone" : "phone").map((i) => i.url).filter(Boolean) : [];
  const icon = platform === "android" ? listOf(platform, lang, "icon")[0]?.url : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <ScrollPage>
        <AnimatePresence>
          {sending && (
            <SendDialog
              platform={platform}
              changes={changes}
              images={imageChanges}
              version={platform === "ios" ? nextVersion : null}
              onClose={() => setSending(false)}
              onDone={(message) => {
                setSending(false);
                setEdits({});
                toast(message);
                setLoading(true);
                load(true);
              }}
            />
          )}
        </AnimatePresence>
        <PageHeader
          title="스토어 페이지"
          description="문구와 이미지를 고치면 스토어에서 어떻게 보일지 바로 볼 수 있어요. 보내기 전까지 스토어는 바뀌지 않아요."
          actions={
            <div className="flex items-center gap-2.5">
              {/* 글이 나타날 때 머리 줄이 접히지 않게 자리를 늘 잡아 둔다 */}
              <span className={`text-[12.5px] ${failed ? "text-sd-critical" : "text-sd-fg-subtle"} ${status ? "" : "invisible"}`}>{status ?? "저장하는 중이에요"}</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  load(true);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sd-gray-200 px-3 text-[13px] font-semibold text-sd-fg-muted transition hover:bg-sd-gray-300 disabled:opacity-60"
              >
                <RefreshIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
                다시 확인
              </button>
            </div>
          }
        />

        <div className="mb-5">
          <SegmentedControl<View> value={view} onChange={setView} options={[{ value: "edit", label: "문구 고치기" }, { value: "images", label: "이미지와 영상" }, { value: "spec", label: "규격과 안내" }]} />
        </div>

        {view === "spec" ? (
          <SpecGuide />
        ) : view === "images" && data ? (
          <div className="space-y-4">
            {storeTabs}
            {page?.ok ? (
              <>
                <p className="text-[13px] leading-relaxed text-sd-fg-muted">끌어서 순서를 바꿀 수 있어요. 규격에 맞는지는 올리기 전에 확인해요. 보내기 전까지 스토어는 바뀌지 않아요.</p>
                <motion.div key={`${platform}-${lang}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
                  <ImageBoard platform={platform} listOf={(s) => listOf(platform, lang, s)} liveOf={(s) => liveOf(platform, lang, s)} disabled={!data.writable} onChange={changeImages} />
                </motion.div>
              </>
            ) : (
              <div className="rounded-2xl bg-sd-fill px-5 py-4 text-[14px] leading-relaxed text-sd-fg">{page?.error}</div>
            )}
          </div>
        ) : error && !data ? (
          <ErrorBlock message={error} onRetry={() => load(true)} />
        ) : !data ? (
          <Skeleton />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-4">
              {storeTabs}

              {page?.ok ? (
                <>
                  <p className="text-[13px] leading-relaxed text-sd-fg-muted">
                    {platform === "ios"
                      ? ios?.ok && ios.nextVersion
                        ? `다음 버전은 ${ios.nextVersion}이에요. 프로모션 문구만 빼고 ${ios.nextVersion}과 함께 나가요.`
                        : "지금 고칠 수 있는 버전이 없어요. 새 버전을 만들면 그 버전과 함께 나가요."
                      : "구글 심사를 통과하고 게시해야 나가요. 심사는 몇 시간에서 길면 7일 걸려요."}{" "}
                    {platform === "android" && <OfficialLink href={LINKS.playPublish} />}
                  </p>
                  <motion.div key={`${platform}-${lang}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }} className="divide-y divide-sd-hairline rounded-2xl border border-sd-line bg-sd-surface">
                      {FIELDS[platform].map((f) => {
                        const key = keyOf(platform, lang, f.id);
                        const side = sideOf(platform, lang);
                        const base = baseOf(side, f.id);
                        return (
                          <FieldEditor
                            key={key}
                            platform={platform}
                            field={f}
                            value={values[f.id] ?? ""}
                            side={side}
                            base={base}
                            ctx={values}
                            draft={drafts[key]}
                            conflict={key in conflicts ? conflicts[key] : undefined}
                            disabled={false}
                            onFocus={() => setSpot(f.id)}
                            onEdit={() => {
                              // 자세한 설명은 세부정보에서만 보이고, 동영상은 앱 상세에서만 보인다
                              if (f.id === "fullDescription") setMode("details");
                              else if (f.id === "video" && mode === "details") setMode("page");
                            }}
                            onChange={(v) => change(f.id, v)}
                            onRevert={() => change(f.id, base)}
                            onTakeTheirs={() => {
                              const theirs = conflicts[key];
                              setEdits((m) => ({ ...m, [key]: theirs?.value ?? base }));
                              setDrafts((m) => {
                                const next = { ...m };
                                if (theirs) next[key] = theirs;
                                else delete next[key];
                                return next;
                              });
                              setConflicts((m) => {
                                const next = { ...m };
                                delete next[key];
                                return next;
                              });
                            }}
                            onKeepMine={() => save(platform, lang, f.id, values[f.id] ?? "", conflicts[key]?.updatedAt ?? null)}
                          />
                        );
                      })}
                  </motion.div>
                  <section aria-label="사람이 볼 것" className="rounded-2xl border border-sd-line bg-sd-surface px-5 py-4">
                    <h2 className="text-[14px] font-bold text-sd-fg">자동으로 못 보는 것</h2>
                    <ul className="mt-2 space-y-1.5">
                      {HUMAN_CHECKS[platform].map((c) => (
                        <li key={c.text} className="flex items-start gap-2 text-[13px] leading-relaxed text-sd-fg-muted">
                          <span aria-hidden className="mt-[8px] size-1 flex-none rounded-full bg-sd-gray-400" />
                          <span className="min-w-0 flex-1">{c.text}</span>
                          <OfficialLink href={c.link} />
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              ) : (
                <div className="rounded-2xl bg-sd-fill px-5 py-4 text-[14px] leading-relaxed text-sd-fg">{page?.error}</div>
              )}
            </div>

            {page?.ok && (
              <PreviewPane title="스토어에서 이렇게 보여요">
                <div className="mb-3 flex justify-center">
                  <SegmentedControl<Surface> value={mode} onChange={setMode} options={[{ value: "page", label: platform === "ios" ? "제품 페이지" : "앱 상세" }, { value: "search", label: "검색 결과" }, ...(platform === "android" ? [{ value: "details" as const, label: "세부정보" }] : [])]} />
                </div>
                <StorePreview platform={platform} mode={mode} values={values} art={{ ...page.art, icon: icon ?? page.art.icon, screenshots: screenshots.length ? screenshots : page.art.screenshots }} spot={spot} onMode={setMode} />
                <p className="mt-2.5 text-center text-[12px] leading-relaxed text-sd-fg-subtle">
                  {spot === "keywords" ? "키워드는 사용자에게 보이지 않아요." : spot === "subtitle" && mode === "page" ? "부제는 검색 결과에 보여요." : "실제 스토어 앱 캡처로 잰 화면이에요."}
                </p>
              </PreviewPane>
            )}
          </div>
        )}
        {/* 줄이 나타나도 내용이 밀리지 않게 자리를 늘 비워 두고, 높이 없는 기준점 위에 띄운다 */}
        {view !== "spec" && pageOk && (
          <>
            <div aria-hidden className="h-20" />
            <div className="sticky bottom-4 z-20 h-0">
              <AnimatePresence>
                {canSend && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.16 }} className="absolute inset-x-0 bottom-0 mx-auto max-w-[720px]">
                    {sendBar}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </ScrollPage>
    </MotionConfig>
  );
}
