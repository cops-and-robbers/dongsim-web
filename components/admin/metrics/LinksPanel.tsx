"use client";

import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { EmptyBlock, SectionCard } from "@/components/admin/Parts";
import { Table, Td, Th, Tr } from "@/components/admin/Table";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { SITE_URL } from "@/lib/constants";
import { campaignToken, isCode, linkResult, type MetricsLink } from "@/lib/download/links";
import type { MetricsEvent } from "@/lib/metrics/events";

/**
 * 행사 링크와 QR (#171). 지표 화면 유입 경로 탭 맨 아래.
 *
 * 행사 QR 은 /download?utm_... 긴 주소를 손으로 이어 붙여 썼다. 여기서 한 번 등록하면 짧은 주소 /q/<코드> 와 QR 이 나온다.
 * - 짧은 주소: 주소가 짧을수록 QR 점이 성기어, 같은 크기로 뽑아도 멀리서 더 잘 읽힌다
 * - 매체는 qr 로 고정한다. 유입 채널에서 "직접 입력과 QR" 로 묶인다(channels.ts)
 * - 결과는 새로 모으지 않고 지표 화면이 받은 캠페인 표에서 이 링크의 출처, 매체, 캠페인으로 찾는다(linkResult).
 *   기간은 화면 위에서 고른 기간이다
 * - iOS 다운로드는 넣지 않는다. 애플 상세 리포트가 5명 미만 칸을 빼서 거의 비고, 앱은 어느 링크로 왔는지 모른다
 * - QR 은 인쇄용으로 넉넉하게(1024px, 둘레 여백 4칸) 내려받는다. 둘레 여백이 없으면 포스터 무늬와 섞여 안 읽힌다
 */

type Draft = { label: string; code: string; source: string; campaign: string; content: string; eventId: string };
const EMPTY: Draft = { label: "", code: "", source: "", campaign: "", content: "", eventId: "" };
/** campaign.ts 의 APPSTORE_CT_MAX */
const CT_MAX = 30;

const shortUrl = (code: string) => `${SITE_URL}/q/${code}`;
const fmt = (n: number) => n.toLocaleString("ko-KR");

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

async function errorOf(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "잠시 뒤 다시 해 주세요.";
}

/** 인쇄용 QR 을 PNG 로 내려받는다. 파일 이름은 코드로 */
async function downloadQr(code: string) {
  const url = await QRCode.toDataURL(shortUrl(code), { width: 1024, margin: 4, errorCorrectionLevel: "M" });
  const a = document.createElement("a");
  a.href = url;
  a.download = `qr-${code}.png`;
  a.click();
}

const inputClass = "h-9 min-w-0 rounded-xl border border-sd-line bg-sd-surface px-3 text-[13px] text-sd-fg outline-none placeholder:text-sd-placeholder focus:border-accent";

type Results = Parameters<typeof linkResult>[1];

export function LinksPanel({ d }: { d: Results }) {
  const [links, setLinks] = useState<MetricsLink[] | null>(null);
  const [events, setEvents] = useState<MetricsEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** QR 미리보기. 어느 코드의 그림인지 같이 둬서, 코드를 지우거나 바꾸면 옛 그림을 보이지 않는다 */
  const [qr, setQr] = useState<{ code: string; url: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  /** 목록을 읽어 넣는다. 응답이 온 뒤에만 상태를 바꾼다 */
  const fetchLinks = () =>
    call("/api/admin/metrics/links").then(async (res) => {
      if (!res.ok) return { error: await errorOf(res) };
      return { links: (await res.json()) as MetricsLink[] };
    });
  const apply = (r: { error?: string; links?: MetricsLink[] }) => {
    setLoadError(r.error ?? null);
    if (r.links) setLinks(r.links);
  };
  const load = async () => apply(await fetchLinks());

  useEffect(() => {
    let alive = true;
    fetchLinks()
      .then((r) => alive && apply(r))
      .catch(() => alive && setLoadError("링크를 못 불러왔어요."));
    // 연결할 일정 목록. 못 읽어도 링크는 만들 수 있어서 조용히 넘긴다
    call("/api/admin/metrics/events")
      .then((r) => (r.ok ? (r.json() as Promise<MetricsEvent[]>) : []))
      .then((all) => alive && setEvents(all.filter((e) => e.category === "event" || e.category === "promo")))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // 처음 한 번만 읽는다. 넣고 지울 때는 load 로 다시 읽는다
  }, []);

  const code = draft.code.trim().toLowerCase();
  const token = campaignToken(draft.source.trim(), draft.campaign.trim(), draft.content.trim() || null);

  // 코드를 적는 동안 QR 을 미리 그린다
  useEffect(() => {
    if (!isCode(code)) return;
    let alive = true;
    void QRCode.toDataURL(shortUrl(code), { width: 320, margin: 4, errorCorrectionLevel: "M" }).then((url) => alive && setQr({ code, url }));
    return () => {
      alive = false;
    };
  }, [code]);
  const preview = isCode(code) && qr?.code === code ? qr.url : null;

  const save = async () => {
    setSaving(true);
    setFormError(null);
    const res = await call("/api/admin/metrics/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: draft.label,
        code,
        source: draft.source,
        campaign: draft.campaign,
        content: draft.content,
        eventId: draft.eventId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setFormError(await errorOf(res));
      return;
    }
    setDraft(EMPTY);
    setOpen(false);
    await load();
  };

  const remove = async (l: MetricsLink) => {
    if (!window.confirm(`"${l.label}" 링크를 지울까요? 이미 인쇄한 QR 은 꼬리표 없이 다운로드 화면으로 가요.`)) return;
    const res = await call(`/api/admin/metrics/links?id=${l.id}`, { method: "DELETE" });
    if (!res.ok) {
      setLoadError(await errorOf(res));
      return;
    }
    await load();
  };

  const copy = async (c: string) => {
    await navigator.clipboard.writeText(shortUrl(c));
    setCopied(c);
    setTimeout(() => setCopied((v) => (v === c ? null : v)), 1500);
  };

  const eventLabel = (id: number | null) => events.find((e) => e.id === id)?.label ?? null;

  return (
    <SectionCard
      title="링크와 QR"
      flush
      right={
        <Button size="sm" variant={open ? "neutral" : "brand"} onClick={() => setOpen((v) => !v)}>
          {open ? "닫기" : "링크 만들기"}
        </Button>
      }
    >
      {open && (
        <div className="grid grid-cols-1 gap-5 border-b border-sd-hairline p-5 md:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="이름" hint="목록에서 알아볼 이름을 적어요. 예) 노원 축제 부스">
              <input className={inputClass} value={draft.label} maxLength={40} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </Field>
            <Field label="주소 코드" hint="/q/ 뒤에 붙어요. 소문자, 숫자, 하이픈만 써요.">
              <input className={inputClass} value={draft.code} maxLength={24} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="nowon" />
            </Field>
            <Field label="출처" hint="어디에 붙일 링크인가요? 예) booth, poster">
              <input className={inputClass} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
            </Field>
            <Field label="캠페인" hint="무슨 행사인가요? 예) nowon-festival-2026">
              <input className={inputClass} value={draft.campaign} onChange={(e) => setDraft({ ...draft, campaign: e.target.value })} />
            </Field>
            <Field label="구분 (선택)" hint="같은 행사 안에서 자리를 구분해요. 예) table, banner">
              <input className={inputClass} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
            </Field>
            <Field label="연결할 일정 (선택)" hint="행사나 홍보 일정에 묶어 둬요">
              <select className={inputClass} value={draft.eventId} onChange={(e) => setDraft({ ...draft, eventId: e.target.value })}>
                <option value="">없음</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.day} {e.label}
                  </option>
                ))}
              </select>
            </Field>
            <p className={`text-[12px] sm:col-span-2 ${token.length > CT_MAX ? "text-sd-critical" : "text-sd-fg-subtle"}`}>
              매체는 qr 로 붙어요. 출처, 캠페인, 구분을 이은 App Store 캠페인 이름은 {token.length}/{CT_MAX}자예요.
              {token.length > CT_MAX && " 30자를 넘으면 App Store 가 잘라 다른 링크와 섞일 수 있어요."}
            </p>
            {formError && <p className="text-[13px] text-sd-critical sm:col-span-2">{formError}</p>}
            <div className="sm:col-span-2">
              <Button size="sm" disabled={saving || !draft.label.trim() || !isCode(code) || !draft.source.trim() || !draft.campaign.trim()} onClick={() => void save()}>
                {saving ? "만드는 중" : "만들기"}
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL 미리보기라 next/image 를 거칠 게 없다
              <img src={preview} alt={`${shortUrl(code)} QR 미리보기`} width={160} height={160} className="rounded-lg border border-sd-line" />
            ) : (
              <div className="flex h-[160px] w-[160px] items-center justify-center rounded-lg border border-dashed border-sd-line text-center text-[12px] text-sd-fg-subtle">
                주소 코드를 적으면
                <br />
                QR 이 보여요
              </div>
            )}
            {preview && <span className="max-w-[160px] break-all text-center text-[12px] text-sd-fg-subtle">{shortUrl(code)}</span>}
          </div>
        </div>
      )}

      {loadError ? (
        <p className="px-5 py-4 text-[13px] text-sd-critical">{loadError}</p>
      ) : links === null ? (
        <div className="h-[120px] animate-pulse bg-sd-gray-100" />
      ) : links.length === 0 ? (
        <EmptyBlock title="아직 만든 링크가 없어요" />
      ) : (
        <Table
          head={
            <>
              <Th className="whitespace-nowrap">링크</Th>
              <Th className="whitespace-nowrap">꼬리표</Th>
              <Th className="whitespace-nowrap text-right">방문</Th>
              <Th className="whitespace-nowrap text-right">스토어로 이동</Th>
              <Th className="whitespace-nowrap text-right">Android 첫 실행</Th>
              <Th className="whitespace-nowrap text-right">QR</Th>
            </>
          }
        >
          {links.map((l, i) => {
            const r = linkResult(l, d);
            const ev = eventLabel(l.eventId);
            return (
              <Tr key={l.id} index={i}>
                <Td className="max-w-[220px]">
                  <div className="truncate font-semibold text-sd-fg">{l.label}</div>
                  <button type="button" onClick={() => void copy(l.code)} className="truncate text-[12px] text-sd-fg-subtle hover:text-sd-fg" aria-label={`${l.label} 짧은 주소 복사`}>
                    {copied === l.code ? "복사했어요" : `/q/${l.code}`}
                  </button>
                  {ev && <div className="truncate text-[12px] text-sd-fg-subtle">일정: {ev}</div>}
                </Td>
                <Td className="max-w-[180px] truncate text-sd-fg-muted">
                  {[l.source, l.campaign, l.content].filter(Boolean).join(" / ")}
                </Td>
                <Td className="text-right tabular-nums">{fmt(r.visits)}</Td>
                <Td className="text-right tabular-nums">{fmt(r.storeMoves)}</Td>
                <Td className="text-right tabular-nums">{fmt(r.androidFirstOpens)}</Td>
                <Td className="whitespace-nowrap text-right">
                  <button type="button" onClick={() => void downloadQr(l.code)} className="text-[13px] font-semibold text-accent hover:underline">
                    내려받기
                  </button>
                  <button type="button" onClick={() => void remove(l)} className="ml-3 text-[13px] text-sd-fg-subtle hover:text-sd-critical" aria-label={`${l.label} 지우기`}>
                    지우기
                  </button>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}
      <p className="px-5 py-3 text-[12px] leading-relaxed text-sd-fg-subtle">
        숫자는 위에서 고른 기간의 집계예요. 방문과 스토어로 이동은 사이트 GA4 로 세요. Android 첫 실행은 Play 로 설치한 기기만 세요. iOS 는 어느
        링크로 왔는지 알 수 없어 뺐어요. QR 은 인쇄용으로 넉넉한 크기로 받아요.
      </p>
    </SectionCard>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] font-semibold text-sd-fg-muted">{label}</span>
      {children}
      <span className="text-[11px] text-sd-fg-subtle">{hint}</span>
    </label>
  );
}
