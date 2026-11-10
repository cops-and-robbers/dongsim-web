"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { AppStoreMark, ChevronDownIcon, ExternalLinkIcon, GooglePlayMark, RefreshIcon } from "@/components/admin/icons";
import { ErrorBlock, PageHeader, ScrollPage, SURFACE } from "@/components/admin/Parts";
import { useToast } from "@/components/admin/Toast";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { daysLeft, type Check, type Level, type StoreCheck } from "@/lib/store-check/model";

// 어드민 스토어 점검 (docs/admin-ui.md "스토어 점검"). 콘솔마다 흩어진 경고를 지금 할 일부터 보여 준다.

async function send(init: RequestInit = {}, query = ""): Promise<Response> {
  const go = () => fetch(`/api/admin/store-check${query}`, { ...init, headers: { Authorization: `Bearer ${getAccessToken() ?? ""}`, ...(init.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  const res = await go();
  if (res.status === 401 && (await reissue())) return go();
  return res;
}

function Due({ due }: { due: string }) {
  const left = daysLeft(due, new Date());
  const urgent = left <= 30;
  return <span className={`inline-flex h-[20px] flex-none items-center rounded-md px-1.5 text-[11.5px] font-semibold tabular-nums ${urgent ? "bg-sd-critical-weak text-sd-critical" : "bg-sd-fill text-sd-fg-subtle"}`}>{left < 0 ? `${-left}일 지났어요` : left === 0 ? "오늘까지" : `${left}일 남았어요`}</span>;
}

function Row({ c, disabled, onDone }: { c: Check; disabled: boolean; onDone: (done: boolean) => void }) {
  const done = !!c.doneAt;
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-4">
      <span className="mt-0.5 flex flex-none gap-1">
        {c.store !== "android" && <AppStoreMark className="size-[18px]" />}
        {c.store !== "ios" && <GooglePlayMark className="size-[18px]" />}
      </span>
      <div className="min-w-0 flex-1 basis-[240px]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[14.5px] font-semibold text-sd-fg">{c.title}</h3>
          {c.due && !done && <Due due={c.due} />}
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-sd-fg-muted">{done ? `${c.doneBy}님이 끝냈다고 표시했어요.` : c.detail}</p>
      </div>
      <div className="flex flex-none items-center gap-2">
        {c.link && !done &&
          (c.link.external ? (
            <a href={c.link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
              {c.link.label}
              <ExternalLinkIcon className="size-3.5" />
            </a>
          ) : (
            <Link href={c.link.href} className="text-[12.5px] font-semibold text-accent hover:underline">
              {c.link.label}
            </Link>
          ))}
        {c.manual && (
          <Button variant="neutral" size="sm" disabled={disabled} onClick={() => onDone(!done)}>
            {done ? "되돌리기" : "끝냈어요"}
          </Button>
        )}
      </div>
    </li>
  );
}

const GROUP: Record<Exclude<Level, "ok">, string> = { todo: "지금 할 일", watch: "지켜볼 것" };

export default function StoreCheckPage() {
  const toast = useToast();
  const [data, setData] = useState<StoreCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOk, setShowOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const load = useCallback((fresh = false) => {
    const id = ++seq.current;
    return send({}, fresh ? "?fresh=1" : "")
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as StoreCheck & { error?: string };
        if (!res.ok) throw new Error(body.error ?? "점검 결과를 불러오지 못했어요.");
        if (id !== seq.current) return;
        setData(body);
        setError(null);
      })
      .catch((e: Error) => id === seq.current && setError(e.message))
      .finally(() => id === seq.current && setLoading(false));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const markDone = async (id: string, done: boolean) => {
    setBusy(true);
    const res = await send({ method: "PATCH", body: JSON.stringify({ id, done }) }).catch(() => null);
    if (!res?.ok) toast("저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    else await load();
    setBusy(false);
  };

  const of = (level: Level) => data?.checks.filter((c) => c.level === level) ?? [];
  const todo = of("todo").length;
  const ok = of("ok");

  return (
    <ScrollPage>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="스토어 점검"
          description={!data ? "두 스토어의 경고와 기한을 한곳에서 봐요." : todo ? `지금 할 일이 ${todo}개 있어요.` : "지금 할 일이 없어요."}
          actions={
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                void load(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sd-gray-200 px-3 text-[13px] font-semibold text-sd-fg-muted transition hover:bg-sd-gray-300 disabled:opacity-60"
            >
              <RefreshIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              다시 확인
            </button>
          }
        />
        {error && !data ? (
          <ErrorBlock message={error} onRetry={() => void load(true)} />
        ) : !data ? (
          <div aria-busy className="animate-pulse space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-sd-fill" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {data.readOnlyReason && <Callout variant="neutral">{data.readOnlyReason}</Callout>}
            {(["todo", "watch"] as const).map(
              (level) =>
                of(level).length > 0 && (
                  <section key={level} aria-label={GROUP[level]}>
                    <h2 className="mb-2 text-[14px] font-bold text-sd-fg">
                      {GROUP[level]} <span className="tabular-nums text-sd-fg-subtle">{of(level).length}</span>
                    </h2>
                    <ul className={`divide-y divide-sd-hairline ${SURFACE}`}>
                      {of(level).map((c) => (
                        <Row key={c.id} c={c} disabled={busy || !data.writable} onDone={(d) => void markDone(c.id, d)} />
                      ))}
                    </ul>
                  </section>
                ),
            )}
            <section aria-label="문제없는 것">
              <button type="button" aria-expanded={showOk} onClick={() => setShowOk((v) => !v)} className="mb-2 inline-flex items-center gap-1 text-[14px] font-bold text-sd-fg">
                문제없는 것 <span className="tabular-nums text-sd-fg-subtle">{ok.length}</span>
                <ChevronDownIcon className={`size-4 text-sd-fg-subtle transition ${showOk ? "rotate-180" : ""}`} />
              </button>
              {showOk && (
                <ul className={`divide-y divide-sd-hairline ${SURFACE}`}>
                  {ok.map((c) => (
                    <Row key={c.id} c={c} disabled={busy || !data.writable} onDone={(d) => void markDone(c.id, d)} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </ScrollPage>
  );
}
