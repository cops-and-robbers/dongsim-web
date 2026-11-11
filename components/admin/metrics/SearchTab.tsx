"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { ErrorBlock, SURFACE } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { useToast } from "@/components/admin/Toast";
import { TrendChart, type Marker } from "@/components/admin/metrics/TrendChart";
import { useCompare } from "@/components/admin/metrics/compareContext";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { SearchResponse, SearchSetup } from "@/app/api/admin/search/route";
import type { InboxItem, NewPage, PageRow, QueryRow } from "@/lib/search/view";
import type { Kind, Locale } from "@/lib/search/status";

/**
 * 지표 "검색" 탭 (#309). 구글에 우리 페이지가 몇 개 올라가 있고, 어디서 멈췄고, 검색으로 몇 명이 왔는지.
 *
 * 숫자 칸과 카드를 늘어놓지 않고 문서처럼 읽히게 짠다(docs/search-indexing.md "화면").
 * - 맨 위는 답을 문장으로: "31개 중 10개가 구글에 올라가 있어요."
 * - 손댈 일이 있을 때만 그 아래에 줄이 생긴다
 * - 페이지는 단계별로 묶은 목록 하나. 이름(글 제목, 메뉴 이름)과 오른쪽 흐린 한 줄만 둔다.
 *   색은 문제가 있는 글자에만 쓴다. 잘 된 묶음(구글에 올라감)은 접어 둔다
 * - 판정(오늘 아침)과 실적(위의 기간)은 기준이 달라 "페이지 | 검색 실적"으로 나눠 본다
 */

type Props = {
  range: { start: string; end: string };
  previous: { start: string; end: string } | null;
  markers: Marker[];
};
type Data = SearchResponse | SearchSetup;
type View = "pages" | "performance";

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () =>
    fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

const md = (ymd: string | null | undefined) => {
  if (!ymd) return "-";
  const [, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return `${m}월 ${d}일`;
};
const seoulDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
const mdIso = (iso: string | null) => (iso ? md(seoulDay(iso)) : "-");
const LANG: Record<Locale, string> = { ko: "", en: "영어", ja: "일본어" };
const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");

/** 서치 콘솔의 그 주소 검사 화면 */
const consoleLink = (p: { url: string; link: string | null }) =>
  p.link ?? `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent("sc-domain:copsandrobbers.app")}&id=${encodeURIComponent(p.url)}`;

export function SearchTab({ range, previous, markers }: Props) {
  const [result, setResult] = useState<{ key: string; data?: Data; error?: string } | null>(null);
  // 기간을 바꾸면 새 결과가 올 때까지 이전 화면을 흐리게 둔다
  const [shown, setShown] = useState<Data | null>(null);
  const [attempt, setAttempt] = useState(0);
  const query = `from=${range.start}&to=${range.end}${previous ? `&pfrom=${previous.start}&pto=${previous.end}` : ""}`;
  const key = `${query}#${attempt}`;

  useEffect(() => {
    let alive = true;
    authedFetch(`/api/admin/search?${query}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Data & { error?: string };
        if (!alive) return;
        if (!res.ok) setResult({ key, error: body.error ?? `HTTP ${res.status}` });
        else {
          setResult({ key, data: body });
          setShown(body);
        }
      })
      .catch((e: unknown) => alive && setResult({ key, error: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [query, key]);

  const reload = () => setAttempt((n) => n + 1);
  const loading = result?.key !== key;
  const failed = result?.key === key && result.error ? result.error : null;

  if (failed && !shown) return <ErrorBlock message={failed} onRetry={reload} />;
  if (!shown) return <SearchSkeleton />;
  if ("setup" in shown) return <Setup />;
  return (
    <div className={`transition-opacity duration-200 ${loading ? "pointer-events-none opacity-50" : ""}`} aria-busy={loading}>
      {failed && (
        <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-sd-critical">
          새로 불러오지 못했어요. 아래는 전에 불러온 숫자예요.
          <button type="button" onClick={reload} className="font-semibold underline underline-offset-2">
            다시 불러오기
          </button>
        </p>
      )}
      <Body d={shown} markers={markers} onChanged={reload} />
    </div>
  );
}

function Body({ d, markers, onChanged }: { d: SearchResponse; markers: Marker[]; onChanged: () => void }) {
  const [view, setView] = useState<View>("pages");
  const [open, setOpen] = useState<string | null>(null);

  if (!d.checkedOn) {
    return (
      <div className="py-16 text-center">
        <p className="text-[16px] font-bold text-sd-fg">아직 첫 수집 전이에요</p>
        <p className="mt-1.5 text-[14px] text-sd-fg-subtle">매일 아침 5시 43분에 상태와 검색 실적을 수집해요. 첫 수집이 끝나면 여기에 보여요.</p>
      </div>
    );
  }

  const opened = open ? d.pages.find((p) => p.url === open) : undefined;

  return (
    <div className="flex flex-col gap-7 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        {view === "pages" ? <PagesHeadline d={d} /> : <PerformanceHeadline p={d.performance} />}
        <SegmentedControl<View>
          options={[
            { label: "페이지", value: "pages" },
            { label: "검색 실적", value: "performance" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>
      {view === "pages" ? (
        <>
          <SystemNotes items={d.inbox} />
          <PageList d={d} onOpen={setOpen} />
        </>
      ) : (
        <Performance p={d.performance} markers={markers} />
      )}
      {opened && (
        <PageDrawer page={opened} fresh={d.newPages.find((n) => n.url === opened.url)} writable={d.writable} onClose={() => setOpen(null)} onChanged={onChanged} />
      )}
    </div>
  );
}

/** 페이지 보기의 맨 위. 답 한 문장과, 그 수가 어떻게 나뉘는지 한 줄 */
function PagesHeadline({ d }: { d: SearchResponse }) {
  const indexed = d.counts.indexed;
  const parts: { kinds: Kind[]; word: string }[] = [
    { kinds: ["indexed"], word: "올라감" },
    { kinds: ["crawled"], word: "보류" },
    { kinds: ["discovered", "unknown"], word: "안 읽음" },
    { kinds: ["excluded"], word: "제외" },
    { kinds: ["error"], word: "오류" },
  ];
  const diff = d.indexedBefore === null ? null : indexed - d.indexedBefore;
  return (
    <div className="min-w-0">
      <p className="text-[22px] font-bold leading-snug tracking-[-0.01em] text-sd-fg">
        {fmt(d.total)}개 중 {fmt(indexed)}개가 구글에 올라가 있어요
      </p>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-sd-fg-subtle">
        {parts.map(({ kinds, word }) => {
          const n = kinds.reduce((a, k) => a + d.counts[k], 0);
          if (n === 0 && word !== "올라감") return null;
          return (
            <span key={word}>
              <span className={STATE[kinds[0]].color}>{word}</span> <span className="tabular-nums text-sd-fg-muted">{fmt(n)}</span>
            </span>
          );
        })}
        {diff !== null && <span>{diff === 0 ? "7일 전과 같음" : `7일 전보다 ${diff > 0 ? "+" : "-"}${Math.abs(diff)}`}</span>}
        <span>{md(d.checkedOn)} 아침 확인</span>
      </p>
    </div>
  );
}

/**
 * 목록에서 보이지 않는 문제만 따로 한 줄씩 둔다(수집이 멈춤, 사이트맵 오류).
 * 오류 페이지와 오래 멈춘 새 페이지는 바로 아래 목록 맨 위에 이미 있어서 두 번 보여 주지 않는다
 */
function SystemNotes({ items }: { items: InboxItem[] }) {
  const notes = items.filter((i) => i.paths.length === 0);
  if (notes.length === 0) return null;
  return (
    <div className="-mt-2 flex flex-col gap-1">
      {notes.map((n) => (
        <p key={n.title} className={`text-[13px] ${n.level === "urgent" ? "text-sd-critical" : "text-sd-warning"}`}>
          <span className="font-semibold">{n.title}</span> {n.detail}
        </p>
      ))}
    </div>
  );
}

/** 상태를 표 칸에 쓸 짧은 말과 색. 같은 "색인 안 됨"이라도 할 일이 달라 나눈다 */
const STATE: Record<Kind, { word: string; color: string }> = {
  error: { word: "오류", color: "text-sd-critical font-semibold" },
  crawled: { word: "보류", color: "text-sd-warning font-semibold" },
  discovered: { word: "안 읽음", color: "text-sd-fg-subtle" },
  unknown: { word: "안 읽음", color: "text-sd-fg-subtle" },
  excluded: { word: "제외", color: "text-sd-fg-subtle" },
  indexed: { word: "올라감", color: "text-sd-positive font-semibold" },
};
const ORDER: Kind[] = ["error", "crawled", "discovered", "unknown", "excluded", "indexed"];
const LOCALE_ORDER: Locale[] = ["ko", "en", "ja"];
const LOCALE_NAME: Record<Locale, string> = { ko: "한국어", en: "영어", ja: "일본어" };

/** 칸에 마우스를 올리면 보이는 한 줄 */
function hintOf(p: PageRow, n?: NewPage): string {
  if (p.kind === "error") return p.label;
  const read = p.lastCrawl ? `${mdIso(p.lastCrawl)}에 읽음` : "읽은 기록 없음";
  if (p.kind === "indexed") return p.impressions > 0 ? `${read} · 노출 ${fmt(p.impressions)}` : read;
  return n?.stuck ? `${read} · ${n.ageDays}일째` : read;
}

/** 언어 접두어를 뗀 경로. 같은 페이지의 세 언어를 한 줄로 묶는 열쇠 */
const baseOf = (path: string) => path.replace(/^\/(en|ja)(?=\/|$)/, "") || "/";

/**
 * 페이지 목록. 사이트 페이지와 블로그 글은 보는 법이 달라 나눈다.
 * - 사이트 페이지: 같은 페이지가 세 언어로 있어서, 한 줄에 한국어·영어·일본어 칸을 둔다(번역 상태 표처럼)
 * - 블로그 글: 글마다 언어가 하나라, 제목과 상태, 읽은 날, 노출을 좁은 열로 붙인다
 */
function PageList({ d, onOpen }: { d: SearchResponse; onOpen: (url: string) => void }) {
  const fresh = new Map(d.newPages.map((n) => [n.url, n]));
  const isPost = (p: { path: string }) => /^\/blog\/.+/.test(baseOf(p.path)) || /^\/g\/\d+/.test(baseOf(p.path));

  // 사이트 페이지: 경로마다 언어별 칸
  const site = new Map<string, Partial<Record<Locale, PageRow>>>();
  for (const p of d.pages.filter((x) => !isPost(x))) {
    const key = baseOf(p.path);
    site.set(key, { ...(site.get(key) ?? {}), [p.locale]: p });
  }
  const worst = (row: Partial<Record<Locale, PageRow>>) => Math.min(...LOCALE_ORDER.map((l) => (row[l] ? ORDER.indexOf(row[l]!.kind) : 99)));
  const siteRows = [...site.entries()].sort((a, b) => worst(a[1]) - worst(b[1]) || nameOf(a[1]).localeCompare(nameOf(b[1]), "ko"));

  // 블로그 글과 모집글: 손댈 것부터, 새 글 먼저, 같은 상태면 노출 많은 순
  const posts = d.pages
    .filter(isPost)
    .sort(
      (a, b) =>
        ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) ||
        Number(fresh.has(b.url)) - Number(fresh.has(a.url)) ||
        b.impressions - a.impressions ||
        a.name.localeCompare(b.name, "ko"),
    );
  // 오늘 알린 새 주소는 아직 판정이 없다. 블로그 표 맨 위에 같이 둔다
  const waiting = d.newPages.filter((n) => !d.pages.some((p) => p.url === n.url));

  return (
    <div className="flex flex-col gap-6">
      <section className={`${SURFACE} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-sd-hairline text-[12px] text-sd-fg-subtle">
                <th className="px-5 py-3 text-left font-medium">
                  <span className="text-[14px] font-bold text-sd-fg">사이트 페이지</span>
                </th>
                {LOCALE_ORDER.map((l) => (
                  <th key={l} className="w-28 px-3 py-3 text-left font-medium">
                    {LOCALE_NAME[l]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siteRows.map(([key, row]) => (
                <tr key={key} className="border-b border-sd-hairline last:border-b-0">
                  <td className="px-5 py-2.5 text-sd-fg">{nameOf(row)}</td>
                  {LOCALE_ORDER.map((l) => {
                    const p = row[l];
                    if (!p) return <td key={l} className="px-3 py-2.5 text-sd-fg-subtle">-</td>;
                    return (
                      <td key={l} className="px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => onOpen(p.url)}
                          aria-label={`${nameOf(row)} ${LOCALE_NAME[l]}: ${STATE[p.kind].word}, ${hintOf(p, fresh.get(p.url))}`}
                          className="flex w-full flex-col rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-sd-fill"
                        >
                          <span className={STATE[p.kind].color}>{STATE[p.kind].word}</span>
                          <span className="text-[11px] tabular-nums text-sd-fg-subtle">{p.lastCrawl ? mdIso(p.lastCrawl) : "-"}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${SURFACE} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-sd-hairline text-[12px] text-sd-fg-subtle">
                <th className="px-5 py-3 text-left font-medium">
                  <span className="text-[14px] font-bold text-sd-fg">블로그 글과 모집글</span>
                </th>
                <th className="w-28 px-3 py-3 text-left font-medium">상태</th>
                <th className="w-32 px-3 py-3 text-left font-medium">구글이 읽은 날</th>
                <th className="w-20 px-5 py-3 text-right font-medium">노출</th>
              </tr>
            </thead>
            <tbody>
              {waiting.map((n) => (
                <tr key={n.url} className="border-b border-sd-hairline">
                  <td className="max-w-0 px-5 py-2.5">
                    <span className="block truncate text-sd-fg">
                      {n.name}
                      {LANG[n.locale] && <span className="ml-1.5 text-[12px] text-sd-fg-subtle">{LANG[n.locale]}</span>}
                      <span className="ml-1.5 text-[12px] font-semibold text-accent">새 글</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sd-fg-subtle">알림 보냄</td>
                  <td className="px-3 py-2.5 text-sd-fg-subtle">확인 전</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-sd-fg-subtle">-</td>
                </tr>
              ))}
              {posts.map((p) => {
                const n = fresh.get(p.url);
                return (
                  <tr key={p.url} onClick={() => onOpen(p.url)} className="cursor-pointer border-b border-sd-hairline transition-colors last:border-b-0 hover:bg-sd-fill">
                    <td className="max-w-0 px-5 py-2.5">
                      <button type="button" onClick={() => onOpen(p.url)} className="block w-full truncate text-left text-sd-fg">
                        {p.name}
                        {LANG[p.locale] && <span className="ml-1.5 text-[12px] text-sd-fg-subtle">{LANG[p.locale]}</span>}
                        {n && <span className="ml-1.5 text-[12px] font-semibold text-accent">새 글</span>}
                      </button>
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2.5 ${STATE[p.kind].color}`}>
                      {STATE[p.kind].word}
                      {n?.stuck && !p.requestedAt && <span className="ml-1 text-[12px] font-normal">{n.ageDays}일째</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-sd-fg-muted">{p.lastCrawl ? mdIso(p.lastCrawl) : <span className="text-sd-fg-subtle">-</span>}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-sd-fg">{p.impressions > 0 ? fmt(p.impressions) : <span className="text-sd-fg-subtle">-</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** 사이트 페이지 줄의 이름. 한국어 이름을 쓰고 없으면 있는 언어 이름 */
function nameOf(row: Partial<Record<Locale, PageRow>>): string {
  return (row.ko ?? row.en ?? row.ja)?.name ?? "";
}

function PageDrawer({ page, fresh, writable, onClose, onChanged }: { page: PageRow; fresh?: NewPage; writable: boolean; onClose: () => void; onChanged: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // 닫으면 연 자리로 초점을 돌려준다
      before?.focus?.();
    };
  }, []);

  const sameCanonical = !page.googleCanonical || !page.userCanonical || page.googleCanonical === page.userCanonical;
  const canRequest = page.kind !== "indexed" && page.kind !== "excluded";
  const markRequested = async () => {
    setSaving(true);
    try {
      const res = await authedFetch("/api/admin/search/requested", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: page.url }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      toast("요청했다고 남겼어요");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "기록하지 못했어요");
    } finally {
      setSaving(false);
    }
  };
  const statusColor = page.kind === "error" ? "text-sd-critical" : page.kind === "indexed" ? "text-sd-positive" : page.kind === "crawled" ? "text-sd-warning" : "text-sd-fg-muted";
  // 최근 것부터. 같은 날이면 일이 일어난 순서(처음 봄 → 알림 → 요청 → 구글이 읽음 → 상태)를 거꾸로 쌓는다
  const log: { day: string; text: string; by?: string; order: number }[] = [
    ...(fresh ? [{ day: seoulDay(fresh.firstSeen), text: "새 페이지로 처음 봄", order: 0 }] : []),
    ...page.history.map((h) => ({ day: h.day, text: h.text, by: h.by, order: h.kind ? 4 : h.text.includes("요청") ? 2 : 1 })),
    ...(page.lastCrawl
      ? [{ day: seoulDay(page.lastCrawl), text: `구글이 마지막으로 읽음${page.crawledAs ? ` · ${page.crawledAs === "MOBILE" ? "모바일" : "데스크톱"}` : ""}`, order: 3 }]
      : []),
  ].sort((a, b) => b.day.localeCompare(a.day) || b.order - a.order);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${page.name} 상세`}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl border border-sd-line bg-sd-surface shadow-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[460px] sm:rounded-none sm:rounded-l-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-5">
          <div className="min-w-0">
            <p className="text-[17px] font-bold leading-snug text-sd-fg">{page.name}</p>
            <a href={page.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all font-mono text-[12px] text-sd-fg-subtle hover:text-accent">
              {page.url.replace(/^https?:\/\//, "")}
            </a>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="닫기" className="-mr-1.5 rounded-lg p-1.5 text-sd-fg-subtle hover:bg-sd-gray-200 hover:text-sd-fg">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-10">
          <p className={`text-[14px] font-semibold ${statusColor}`}>{page.label}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-sd-fg-muted">{page.meaning}</p>

          <h3 className="mt-7 text-[12px] font-bold text-sd-fg-subtle">이 페이지에 있었던 일</h3>
          <ol className="mt-2 flex flex-col">
            {log.map((h, i) => (
              <li key={`${h.day}-${h.text}-${i}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-1.5 text-[13px]">
                <span className="tabular-nums text-sd-fg-subtle">{md(h.day)}</span>
                <span className="text-sd-fg">
                  {h.text}
                  {h.by && <span className="text-sd-fg-subtle"> · {h.by}</span>}
                </span>
              </li>
            ))}
            {log.length === 0 && <li className="py-1.5 text-[13px] text-sd-fg-subtle">아직 기록이 없어요.</li>}
          </ol>

          <dl className="mt-7 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 border-t border-sd-hairline pt-5 text-[13px]">
            <Row label="대표 주소">
              {sameCanonical ? (
                "우리가 적은 주소와 구글이 고른 주소가 같아요"
              ) : (
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sd-warning">구글이 다른 주소를 골랐어요</span>
                  <span className="break-all text-sd-fg-subtle">우리: {page.userCanonical}</span>
                  <span className="break-all text-sd-fg-subtle">구글: {page.googleCanonical}</span>
                </span>
              )}
            </Row>
            <Row label="사이트맵">{page.inSitemap ? "있어요" : "없어요. 최근 검색에 나와서 같이 봐요"}</Row>
            <Row label="가져오기">
              {[page.fetchState === "SUCCESSFUL" ? "성공" : page.fetchState || "-", page.robotsState === "DISALLOWED" ? "robots.txt 차단" : "robots.txt 허용", page.indexingState.startsWith("BLOCKED") ? "noindex" : "색인 허용"].join(" · ")}
            </Row>
            <Row label="고른 기간">
              <span className="tabular-nums">
                노출 {fmt(page.impressions)} · 클릭 {fmt(page.clicks)}
              </span>
            </Row>
          </dl>
        </div>

        {canRequest && (
          <div className="flex flex-col gap-3 border-t border-sd-hairline px-6 py-4">
            <p className="text-[13px] leading-relaxed text-sd-fg-muted">
              {page.requestedAt
                ? `${page.requestedBy ?? "누군가"}님이 ${mdIso(page.requestedAt)}에 요청했다고 남겼어요. 다시 읽은 기록은 수집 뒤 보여요.`
                : "색인 요청은 서치 콘솔에서 할 수 있어요. 요청한 뒤 남겨 두면 다시 알리지 않아요."}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={consoleLink(page)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover"
              >
                서치 콘솔에서 열기
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </a>
              {!page.requestedAt &&
                (writable ? (
                  <Button variant="neutral" size="sm" disabled={saving} onClick={markRequested}>
                    {saving ? "남기는 중" : "요청했다고 남기기"}
                  </Button>
                ) : (
                  <span className="flex items-center gap-2">
                    <Button variant="neutral" size="sm" disabled>
                      요청했다고 남기기
                    </Button>
                    <span className="text-[12px] text-sd-fg-subtle">운영 사이트에서 남길 수 있어요</span>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className="whitespace-nowrap text-sd-fg-subtle">{label}</dt>
    <dd className="min-w-0 text-sd-fg">{children}</dd>
  </>
);

/** 실적 보기의 맨 위. 훑어보는 숫자라 문장 대신 숫자 한 줄로 둔다 */
function PerformanceHeadline({ p }: { p: SearchResponse["performance"] }) {
  const cmp = useCompare();
  const none = !p.freshThrough || p.freshThrough < p.range.start;
  const c = p.current;
  const b = cmp.on && p.before ? p.before : null;
  const stats: { label: string; value: string; diff?: number }[] = [
    { label: "노출", value: none ? "-" : fmt(c.impressions), diff: b ? c.impressions - b.impressions : undefined },
    { label: "클릭", value: none ? "-" : fmt(c.clicks), diff: b ? c.clicks - b.clicks : undefined },
    { label: "클릭률", value: none || c.impressions === 0 ? "-" : `${((c.clicks / c.impressions) * 100).toFixed(1)}%` },
    { label: "평균 순위", value: none || c.position === null ? "-" : c.position.toFixed(1) },
  ];
  return (
    <div className="min-w-0">
      <dl className="flex flex-wrap gap-x-9 gap-y-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col">
            <dt className="text-[12px] text-sd-fg-subtle">{s.label}</dt>
            <dd className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-bold leading-tight tabular-nums text-sd-fg">{s.value}</span>
              {s.diff !== undefined && s.diff !== 0 && !none && (
                <span className={`text-[12px] font-semibold tabular-nums ${s.diff > 0 ? "text-chart-up" : "text-sd-fg-muted"}`}>
                  {s.diff > 0 ? "+" : "-"}
                  {fmt(Math.abs(s.diff))}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[13px] text-sd-fg-subtle">
        {none ? "이 기간에 받은 검색 실적이 없어요" : `${md(p.range.start)}~${md(p.range.end)}`}
        {b && !none ? ` · 숫자 옆은 ${cmp.word}과의 차이` : ""} · 최근 수치는 늦게 들어올 수 있어요
      </p>
    </div>
  );
}

type QueryFilter = "all" | "brand" | "other" | "near";
type ChartMetric = "impressions" | "clicks";

function Performance({ p, markers }: { p: SearchResponse["performance"]; markers: Marker[] }) {
  const cmp = useCompare();
  const [filter, setFilter] = useState<QueryFilter>("all");
  const [metric, setMetric] = useState<ChartMetric>("impressions");
  const none = !p.freshThrough || p.freshThrough < p.range.start;
  const near = p.queries.filter((q) => q.nearTop).length;
  const queries = useMemo(
    () => p.queries.filter((q) => (filter === "all" ? true : filter === "brand" ? q.brand : filter === "other" ? !q.brand : q.nearTop)),
    [p.queries, filter],
  );
  if (none) return null;
  const filters: [QueryFilter, string][] = [
    ["all", "전체"],
    ["brand", "앱 이름"],
    ["other", "그 밖의 검색"],
    ...(near > 0 ? ([["near", `8-20위 ${near}`]] as [QueryFilter, string][]) : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className={`${SURFACE} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sd-hairline px-5 py-3">
          <h2 className="text-[14px] font-bold text-sd-fg">날마다</h2>
          <SegmentedControl<ChartMetric>
            options={[
              { label: "노출", value: "impressions" },
              { label: "클릭", value: "clicks" },
            ]}
            value={metric}
            onChange={setMetric}
          />
        </div>
        <div className="p-5">
          <TrendChart
            days={p.daily.map((x) => x.day)}
            series={[{ label: metric === "impressions" ? "노출" : "클릭", values: p.daily.map((x) => x[metric]) }]}
            previous={cmp.on && p.previousDaily ? p.previousDaily.map((x) => x[metric]) : undefined}
            markers={markers}
            unit=""
          />
        </div>
      </section>

      <section className={`${SURFACE} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sd-hairline px-5 py-3">
          <h2 className="text-[14px] font-bold text-sd-fg">검색어</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]" role="tablist" aria-label="검색어 묶음">
            {filters.map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={filter === v}
                onClick={() => setFilter(v)}
                className={filter === v ? "font-semibold text-sd-fg" : "text-sd-fg-subtle hover:text-sd-fg-muted"}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {filter === "near" && <p className="border-b border-sd-hairline px-5 py-2.5 text-[13px] text-sd-fg-muted">평균 순위 8-20위예요. 검색어에 맞는 제목과 내용인지 살펴볼 만해요.</p>}
        {queries.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-sd-fg-subtle">{p.queries.length === 0 ? "이 기간에 받은 검색어가 없어요." : "이 묶음에 맞는 검색어가 없어요."}</p>
        ) : (
          <QueryRows rows={queries.slice(0, 50)} />
        )}
        <p className="border-t border-sd-hairline px-5 py-2.5 text-[12px] text-sd-fg-subtle">일부 검색어는 개인정보 보호로 빠져서, 검색어 클릭을 더해도 위 클릭보다 작을 수 있어요.</p>
      </section>
    </div>
  );
}

function QueryRows({ rows }: { rows: QueryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-[12px] text-sd-fg-subtle">
            <th className="px-5 pb-1.5 pt-3 text-left font-medium">검색어</th>
            <th className="w-24 px-3 pb-1.5 pt-3 text-right font-medium">노출</th>
            <th className="w-24 px-3 pb-1.5 pt-3 text-right font-medium">클릭</th>
            <th className="w-28 px-5 pb-1.5 pt-3 text-right font-medium">평균 순위</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.query} className="hover:bg-sd-fill">
              <td className="px-5 py-2 text-sd-fg">
                {q.query}
                {q.brand && <span className="ml-1.5 text-[12px] text-sd-fg-subtle">앱 이름</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-sd-fg">{fmt(q.impressions)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-sd-fg">{fmt(q.clicks)}</td>
              <td className="px-5 py-2 text-right tabular-nums text-sd-fg-muted">{q.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Setup() {
  return (
    <div className="py-12">
      <p className="text-[16px] font-bold text-sd-fg">검색 현황을 보려면 준비가 필요해요</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] text-sd-fg-muted">
        <li>
          Supabase SQL Editor 에서 <code className="rounded bg-sd-gray-200 px-1 text-[13px]">supabase/migrations/0027_search_console.sql</code> 을 실행해요
        </li>
        <li>서치 콘솔 설정의 사용자 및 권한에 지표 수집 서비스 계정을 추가해요</li>
        <li>다음 날 아침 수집이 돌면 여기에 보여요</li>
      </ol>
      <p className="mt-3 text-[12px] text-sd-fg-subtle">자세한 순서는 docs/search-indexing.md 에 있어요.</p>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-80 max-w-full animate-pulse rounded bg-sd-gray-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-sd-gray-200" />
      </div>
      <div className={`${SURFACE} h-96 animate-pulse`} />
    </div>
  );
}
