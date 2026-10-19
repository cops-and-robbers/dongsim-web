"use client";

import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { EmptyBlock, SectionCard } from "@/components/admin/Parts";
import { Table, Td, Th, Tr } from "@/components/admin/Table";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { SITE_URL } from "@/lib/constants";
import { PLACES, autoCampaign, campaignToken, freshCode, isCode, linkResult, type MetricsLink } from "@/lib/download/links";
import { todayIn } from "@/lib/metrics/dates";
import type { MetricsEvent } from "@/lib/metrics/events";

/**
 * 행사 링크와 QR (#171). 지표 화면 유입 경로 탭 맨 아래.
 *
 * 행사 QR 은 /download?utm_... 긴 주소를 손으로 이어 붙여 썼다. 여기서 한 번 등록하면 짧은 주소 /q/<코드> 와 QR 이 나온다.
 * - 고르기만 하면 된다: 어디에 쓰는지(부스, 포스터, 블로그 ...)와 무슨 일정인지만 고르면 이름, 영어 꼬리표, 주소 코드는 자동으로 짓는다
 *   (lib/download/links.ts PLACES, autoCampaign, freshCode). 개발을 모르는 팀원이 영어 꼬리표 규칙을 몰라도 되게 했다.
 *   직접 정하고 싶으면 "직접 정하기"를 펼쳐 고친다
 * - 만들면 바로 인쇄용 QR 이 내려받아진다. 목록에서도 다시 받을 수 있다
 * - 짧은 주소: 주소가 짧을수록 QR 점이 성기어, 같은 크기로 뽑아도 멀리서 더 잘 읽힌다
 * - 매체는 qr 로 고정한다. 유입 채널에서 "직접 입력과 QR" 로 묶인다(channels.ts)
 * - 결과는 새로 모으지 않고 지표 화면이 받은 캠페인 표에서 이 링크의 출처, 매체, 캠페인으로 찾는다(linkResult).
 *   기간은 화면 위에서 고른 기간이다
 * - iOS 다운로드는 넣지 않는다. 애플 상세 리포트가 5명 미만 칸을 빼서 거의 비고, 앱은 어느 링크로 왔는지 모른다
 * - QR 은 인쇄용으로 넉넉하게(1024px, 둘레 여백 4칸) 내려받는다. 둘레 여백이 없으면 포스터 무늬와 섞여 안 읽힌다
 */

/** campaign.ts 의 APPSTORE_CT_MAX */
const CT_MAX = 30;
const NO_EVENT = "none";

const shortUrl = (code: string) => `${SITE_URL}/q/${code}`;
const fmt = (n: number) => n.toLocaleString("ko-KR");

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

/** 서버가 준 오류 문장. JSON 이 아니면(라우트가 없거나 서버가 죽음) 상태 코드라도 보여 준다 */
async function errorOf(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `서버에서 받은 답을 처리하지 못했어요(${res.status}). 잠시 뒤 다시 시도해 주세요.`;
}

/** 인쇄용 QR 을 PNG 로 내려받는다. 파일 이름은 코드로 */
async function downloadQr(code: string) {
  const url = await QRCode.toDataURL(shortUrl(code), { width: 1024, margin: 4, errorCorrectionLevel: "M" });
  const a = document.createElement("a");
  a.href = url;
  a.download = `qr-${code}.png`;
  a.click();
}

/** 연결할 일정 후보. 앞으로 있을 일정을 가까운 순으로 먼저, 지난 일정은 최근 순으로 */
function eventChoices(events: MetricsEvent[], today: string): MetricsEvent[] {
  const pick = events.filter((e) => e.category === "event" || e.category === "promo");
  const upcoming = pick.filter((e) => e.day >= today).sort((a, b) => a.day.localeCompare(b.day));
  const past = pick.filter((e) => e.day < today).sort((a, b) => b.day.localeCompare(a.day));
  return [...upcoming, ...past];
}

const md = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일`;

const inputClass = "h-9 min-w-0 rounded-xl border border-sd-line bg-sd-surface px-3 text-[13px] text-sd-fg outline-none placeholder:text-sd-placeholder focus:border-accent";

type Results = Parameters<typeof linkResult>[1];
/** 직접 정한 값. 비어 있으면 자동으로 지은 값을 쓴다 */
type Custom = { label: string; code: string; source: string; campaign: string; content: string };
const NO_CUSTOM: Custom = { label: "", code: "", source: "", campaign: "", content: "" };

export function LinksPanel({ d }: { d: Results }) {
  const [links, setLinks] = useState<MetricsLink[] | null>(null);
  const [events, setEvents] = useState<MetricsEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<string>(PLACES[0].source);
  const [eventId, setEventId] = useState<string>("");
  const [custom, setCustom] = useState<Custom>(NO_CUSTOM);
  const [advanced, setAdvanced] = useState(false);
  const [autoCode, setAutoCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [made, setMade] = useState<{ code: string; label: string } | null>(null);
  /** QR 미리보기. 어느 코드의 그림인지 같이 둬서, 코드를 바꾸면 옛 그림을 보이지 않는다 */
  const [qr, setQr] = useState<{ code: string; url: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const today = todayIn("Asia/Seoul");

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
      .then((all) => alive && setEvents(all))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // 처음 한 번만 읽는다. 넣고 지울 때는 load 로 다시 읽는다
  }, []);

  const choices = eventChoices(events, today);
  // 고르지 않았으면 가장 가까운 앞으로 있을 일정, 없으면 가장 최근 일정
  const chosenId = eventId || (choices[0] ? String(choices[0].id) : NO_EVENT);
  const event = choices.find((e) => String(e.id) === chosenId) ?? null;
  const placeLabel = PLACES.find((p) => p.source === place)?.label ?? "";

  // 자동으로 짓는 값. 직접 정한 칸이 있으면 그 값이 이긴다
  const taken = links ?? [];
  const auto = {
    label: event ? `${event.label} ${placeLabel}` : "",
    source: place,
    campaign: autoCampaign(event, today, place, taken),
    code: autoCode,
  };
  const label = (custom.label || auto.label).slice(0, 40);
  const source = custom.source || auto.source;
  const campaign = custom.campaign || auto.campaign;
  const code = (custom.code || auto.code).trim().toLowerCase();
  const content = custom.content.trim();
  const token = campaignToken(source, campaign, content || null);

  const startNew = () => {
    setAutoCode(freshCode(taken.map((l) => l.code)));
    setCustom(NO_CUSTOM);
    setEventId("");
    setFormError(null);
    setMade(null);
    setOpen(true);
  };

  // 코드가 정해지면 QR 을 미리 그린다
  useEffect(() => {
    if (!isCode(code)) return;
    let alive = true;
    void QRCode.toDataURL(shortUrl(code), { width: 320, margin: 4, errorCorrectionLevel: "M" }).then((url) => alive && setQr({ code, url }));
    return () => {
      alive = false;
    };
  }, [code]);
  const preview = isCode(code) && qr?.code === code ? qr.url : null;

  const post = (withCode: string) =>
    call("/api/admin/metrics/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, code: withCode, source, campaign, content, eventId: event ? event.id : null }),
    });

  const save = async () => {
    setSaving(true);
    setFormError(null);
    let used = code;
    let res = await post(used);
    // 자동으로 지은 코드가 그새 겹쳤으면 한 번 새로 지어 다시 보낸다
    if (res.status === 409 && !custom.code) {
      const msg = await errorOf(res.clone());
      if (/주소 코드/.test(msg)) {
        used = freshCode([...taken.map((l) => l.code), used]);
        res = await post(used);
      }
    }
    setSaving(false);
    if (!res.ok) {
      setFormError(await errorOf(res));
      return;
    }
    await downloadQr(used);
    setMade({ code: used, label });
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
  const canSave = !saving && !!label.trim() && isCode(code) && token.length <= CT_MAX;

  return (
    <SectionCard
      title="링크와 QR"
      flush
      right={
        <Button size="sm" variant={open ? "neutral" : "brand"} onClick={() => (open ? setOpen(false) : startNew())}>
          {open ? "닫기" : "링크 만들기"}
        </Button>
      }
    >
      {made && !open && (
        <div className="flex flex-wrap items-center gap-3 border-b border-sd-hairline px-5 py-3 text-[13px]">
          <span className="text-sd-fg">&ldquo;{made.label}&rdquo; QR 을 내려받았어요.</span>
          <button type="button" onClick={() => void copy(made.code)} className="font-semibold text-accent hover:underline">
            {copied === made.code ? "복사했어요" : "주소 복사하기"}
          </button>
          <button type="button" onClick={() => void downloadQr(made.code)} className="text-sd-fg-subtle hover:text-sd-fg">
            다시 내려받기
          </button>
        </div>
      )}

      {open && (
        <div className="grid grid-cols-1 gap-5 border-b border-sd-hairline p-5 md:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold text-sd-fg-muted">어디에 쓰나요?</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="쓸 곳">
                {PLACES.map((p) => (
                  <button
                    key={p.source}
                    type="button"
                    role="radio"
                    aria-checked={place === p.source}
                    onClick={() => setPlace(p.source)}
                    className={`h-8 rounded-full border px-3 text-[13px] ${place === p.source ? "border-accent bg-accent text-accent-fg" : "border-sd-line text-sd-fg-muted hover:text-sd-fg"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="무슨 일정인가요?" hint="달력에 넣은 행사와 홍보 일정이에요. 다가오는 일정이 먼저 보여요.">
              <select className={inputClass} value={chosenId} onChange={(e) => setEventId(e.target.value)}>
                {choices.map((e) => (
                  <option key={e.id} value={e.id}>
                    {md(e.day)} {e.label}
                  </option>
                ))}
                <option value={NO_EVENT}>일정 없이 만들기</option>
              </select>
            </Field>

            <Field label="이름" hint={event ? "자동으로 채웠어요. 바꿔도 돼요." : "목록에서 알아볼 이름을 적어 주세요."}>
              <input
                className={inputClass}
                value={custom.label || auto.label}
                maxLength={40}
                placeholder="예) 동아리 박람회 포스터"
                onChange={(e) => setCustom({ ...custom, label: e.target.value })}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced} className="self-start text-[12px] text-sd-fg-subtle hover:text-sd-fg">
                {advanced ? "직접 정하기 접기" : "직접 정하기"}
              </button>
              {advanced && (
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-sd-gray-100 p-3 sm:grid-cols-2">
                  <Field label="주소 코드" hint="/q/ 뒤에 붙어요. 소문자, 숫자, 하이픈만 써요.">
                    <input className={inputClass} value={custom.code || auto.code} maxLength={24} onChange={(e) => setCustom({ ...custom, code: e.target.value })} />
                  </Field>
                  <Field label="출처 (utm_source)" hint="영문, 숫자, 하이픈(-), 밑줄(_), 마침표(.)만 써요.">
                    <input className={inputClass} value={custom.source || auto.source} onChange={(e) => setCustom({ ...custom, source: e.target.value })} />
                  </Field>
                  <Field label="캠페인 (utm_campaign)" hint="일정 날짜와 번호가 자동으로 들어가요.">
                    <input className={inputClass} value={custom.campaign || auto.campaign} onChange={(e) => setCustom({ ...custom, campaign: e.target.value })} />
                  </Field>
                  <Field label="구분 (utm_content, 선택)" hint="같은 행사 안에서 자리를 구분해요. 예) table">
                    <input className={inputClass} value={custom.content} onChange={(e) => setCustom({ ...custom, content: e.target.value })} />
                  </Field>
                  <p className={`text-[12px] sm:col-span-2 ${token.length > CT_MAX ? "text-sd-critical" : "text-sd-fg-subtle"}`}>
                    매체에는 qr 이 자동으로 들어가요. App Store 캠페인 이름은 {CT_MAX}자 중 {token.length}자를 썼어요.
                    {token.length > CT_MAX && " 30자를 넘으면 App Store 가 잘라 다른 링크와 섞일 수 있어요."}
                  </p>
                </div>
              )}
            </div>

            {formError && <p className="text-[13px] text-sd-critical">{formError}</p>}
            <div>
              <Button size="sm" disabled={!canSave} onClick={() => void save()}>
                {saving ? "만들고 있어요" : "만들고 QR 받기"}
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL 미리보기라 next/image 를 거칠 게 없다
              <img src={preview} alt={`${shortUrl(code)} QR 미리보기`} width={160} height={160} className="rounded-lg border border-sd-line" />
            ) : (
              <div className="h-[160px] w-[160px] animate-pulse rounded-lg bg-sd-gray-100" />
            )}
            <span className="max-w-[160px] break-all text-center text-[12px] text-sd-fg-subtle">{shortUrl(code)}</span>
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
                <Td className="max-w-[180px] truncate text-sd-fg-muted">{[l.source, l.campaign, l.content].filter(Boolean).join(" / ")}</Td>
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
