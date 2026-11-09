"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Callout } from "@/components/admin/Callout";
import { RefreshIcon } from "@/components/admin/icons";
import { EmptyBlock, ErrorBlock, PageHeader, ScrollPage } from "@/components/admin/Parts";
import { ReplyTemplates } from "@/components/admin/reviews/ReplyTemplates";
import { ReviewCard } from "@/components/admin/reviews/ReviewCard";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { fetchInbox, fetchTemplates } from "@/lib/admin/reviewsClient";
import { listFor, stateOf, waitingCount, type Inbox, type Platform, type Review, type Tab } from "@/lib/reviews/model";
import type { ReplyLang, TemplateList } from "@/lib/reviews/templates";

// 어드민 리뷰 받은편지함 (docs/admin-ui.md "리뷰"). 무엇에 답해야 하는지부터 보여 준다.

const EMPTY: Record<Tab, string> = { waiting: "답글을 기다리는 리뷰가 없어요.", done: "끝낸 리뷰가 아직 없어요.", all: "아직 들어온 리뷰가 없어요." };

export default function ReviewsPage() {
  const [data, setData] = useState<Inbox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("waiting");
  const [store, setStore] = useState<Platform | "all">("all");
  const [view, setView] = useState<"inbox" | "templates">("inbox");
  const [templates, setTemplates] = useState<TemplateList>({ templates: [], writable: false });
  const [focus, setFocus] = useState<{ id: number; lang: ReplyLang } | null>(null);
  const seq = useRef(0);

  const load = useCallback((fresh = false) => {
    const id = ++seq.current;
    fetchInbox(fresh)
      .then((d) => {
        if (id !== seq.current) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => id === seq.current && setError(e.message))
      .finally(() => id === seq.current && setLoading(false));
  }, []);
  useEffect(() => load(), [load]);
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => undefined);
  }, []);

  const change = (next: Review) => setData((d) => d && { ...d, reviews: d.reviews.map((r) => (r.platform === next.platform && r.id === next.id ? next : r)) });

  const manage = (id?: number, lang?: ReplyLang) => {
    if (id !== undefined && lang) setFocus({ id, lang });
    setView("templates");
  };

  const reviews = data?.reviews ?? [];
  const list = listFor(tab, reviews, store);
  const waiting = waitingCount(reviews);
  const done = reviews.filter((r) => stateOf(r) !== "waiting").length;

  return (
    <MotionConfig reducedMotion="user">
      <ScrollPage>
        <div className={`mx-auto transition-[max-width] duration-200 ${view === "templates" ? "max-w-5xl" : "max-w-3xl"}`}>
          <PageHeader
            title="리뷰"
            description={view === "templates" ? "상황별로 써 두면 팀 누구나 답글을 쓸 때 골라서 시작할 수 있어요." : "두 스토어에 글로 남긴 리뷰를 보고 답글을 쓸 수 있어요."}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl<"inbox" | "templates">
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "inbox", label: "받은 리뷰" },
                    { value: "templates", label: `답변 문구 ${templates.templates.length}` },
                  ]}
                />
                {view === "inbox" && (
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
                )}
              </div>
            }
          />

          {error && !data ? (
            <ErrorBlock message={error} onRetry={() => load(true)} />
          ) : !data ? (
            <div aria-busy className="animate-pulse space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-sd-fill" />
              ))}
            </div>
          ) : (
            <>
              {/* 쓰던 답글과 고치던 문구가 사라지지 않게 둘 다 띄워 두고 가린다 */}
              <div className={view === "templates" ? "" : "hidden"}>
                <ReplyTemplates data={templates} focus={focus} onChange={(next) => setTemplates((d) => ({ ...d, templates: next }))} />
              </div>
              <div className={view === "inbox" ? "space-y-3" : "hidden"}>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <SegmentedControl<Tab>
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "waiting", label: `답글 대기 ${waiting}` },
                    { value: "done", label: `끝남 ${done}` },
                    { value: "all", label: "전체" },
                  ]}
                />
                <SegmentedControl<Platform | "all">
                  value={store}
                  onChange={setStore}
                  options={[
                    { value: "all", label: "두 스토어" },
                    { value: "ios", label: "App Store" },
                    { value: "android", label: "Google Play" },
                  ]}
                />
              </div>

              {data.syncError && <Callout variant="warning">{data.syncError}</Callout>}
              {data.readOnlyReason && <Callout variant="neutral">{data.readOnlyReason}</Callout>}
              {tab === "waiting" && list.length > 1 && <p className="text-[13px] text-sd-fg-muted">별점이 낮은 리뷰부터 보여 드려요.</p>}

              {list.length === 0 ? (
                <EmptyBlock title={EMPTY[tab]} />
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {list.map((r) => (
                    <motion.div key={`${r.platform}-${r.id}`} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.16 }}>
                      <ReviewCard review={r} disabled={!data.writable} templates={templates.templates} onManage={manage} onChange={change} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              <p className="pt-2 text-[12.5px] leading-relaxed text-sd-fg-subtle">별점만 남긴 평가는 스토어가 알려 주지 않아요. Google Play 는 최근 7일치만 받을 수 있어서 연결한 날부터 쌓여요.</p>
              </div>
            </>
          )}
        </div>
      </ScrollPage>
    </MotionConfig>
  );
}
