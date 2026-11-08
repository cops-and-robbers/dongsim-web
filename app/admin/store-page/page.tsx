"use client";

import { MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ErrorBlock, PageHeader, ScrollPage } from "@/components/admin/Parts";
import { AppStoreMark, GooglePlayMark, RefreshIcon } from "@/components/admin/icons";
import { PreviewPane } from "@/components/admin/ops/PreviewPane";
import { FieldEditor, OfficialLink } from "@/components/admin/store-page/FieldEditor";
import { SpecGuide } from "@/components/admin/store-page/SpecGuide";
import { StorePreview } from "@/components/admin/store-page/StorePreview";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import type { Surface } from "@/lib/store-page/display";
import { DraftConflict, fetchStorePage, saveStoreDraft } from "@/lib/admin/storePageClient";
import { baseOf, FIELDS, HUMAN_CHECKS, keyOf, LANGS, LINKS, type Draft, type FieldId, type Lang, type Platform, type Side, type StorePage, type Values } from "@/lib/store-page/fields";

// 어드민 "스토어 페이지" (docs/admin-ui.md "스토어 페이지"). 마케터와 디자이너가 쓴다.
// 왼쪽에서 고치면 오른쪽 폰에 바로 보이고, 칸을 고치면 잠시 뒤 초안으로 저장된다. 스토어에는 보내지 않는다.

const SAVE_DELAY = 800;
type View = "edit" | "spec";

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
  const timers = useRef<Record<string, number>>({});
  const seq = useRef(0);

  const load = useCallback((fresh = false) => {
    const id = ++seq.current;
    fetchStorePage(fresh)
      .then((d) => {
        if (id !== seq.current) return;
        setData(d);
        setDrafts(Object.fromEntries(d.drafts.map((x) => [keyOf(x.platform, x.lang, x.field), x])));
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

  const changedCount = useCallback(
    (p: Platform, l: Lang) => FIELDS[p].filter((f) => valueOf(p, l, f.id) !== baseOf(sideOf(p, l), f.id)).length,
    [valueOf, sideOf],
  );

  const total = useMemo(() => (["ios", "android"] as Platform[]).reduce((sum, p) => sum + LANGS.reduce((s, l) => s + changedCount(p, l.id), 0), 0), [changedCount]);
  const values: Values = useMemo(() => Object.fromEntries(FIELDS[platform].map((f) => [f.id, valueOf(platform, lang, f.id)])), [platform, lang, valueOf]);
  const page = data?.[platform];
  const ios = data?.ios;

  const status = !data?.writable ? data?.readOnlyReason : failed ? failed : saving > 0 ? "저장하는 중이에요" : savedAt ? "초안에 저장했어요" : null;

  return (
    <MotionConfig reducedMotion="user">
      <ScrollPage>
        <PageHeader
          title="스토어 페이지"
          description={total > 0 ? `고친 칸이 ${total}개 있어요. 초안으로만 저장되고 스토어에는 아직 보내지 않아요.` : "문구를 고치면 스토어에서 어떻게 보일지 바로 볼 수 있어요. 초안으로만 저장돼요."}
          actions={
            <div className="flex items-center gap-2.5">
              {status && <span className={`text-[12.5px] ${failed ? "text-sd-critical" : "text-sd-fg-subtle"}`}>{status}</span>}
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
          <SegmentedControl<View> value={view} onChange={setView} options={[{ value: "edit", label: "문구 고치기" }, { value: "spec", label: "규격과 안내" }]} />
        </div>

        {view === "spec" ? (
          <SpecGuide />
        ) : error && !data ? (
          <ErrorBlock message={error} onRetry={() => load(true)} />
        ) : !data ? (
          <Skeleton />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-4">
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
                    { value: "ios", label: <span className="inline-flex items-center gap-1.5"><AppStoreMark className="size-4" />App Store</span> },
                    { value: "android", label: <span className="inline-flex items-center gap-1.5"><GooglePlayMark className="size-4" />Google Play</span> },
                  ]}
                />
                <Tabs<Lang> label="언어" value={lang} onChange={setLang} items={LANGS.map((l) => ({ value: l.id, label: l.label, count: changedCount(platform, l.id) }))} />
              </div>

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
                <StorePreview platform={platform} mode={mode} values={values} art={page.art} spot={spot} onMode={setMode} />
                <p className="mt-2.5 text-center text-[12px] leading-relaxed text-sd-fg-subtle">
                  {spot === "keywords" ? "키워드는 사용자에게 보이지 않아요." : spot === "subtitle" && mode === "page" ? "부제는 검색 결과에 보여요." : "실제 스토어 앱 캡처로 잰 화면이에요."}
                </p>
              </PreviewPane>
            )}
          </div>
        )}
      </ScrollPage>
    </MotionConfig>
  );
}
