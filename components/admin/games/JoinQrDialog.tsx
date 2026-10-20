"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/admin/Button";
import { Dropdown } from "@/components/admin/Dropdown";
import { CopyIcon, DownloadIcon, MaximizeIcon, XIcon } from "@/components/admin/icons";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { SITE_URL } from "@/lib/constants";
import { defaultLink, joinUrl } from "@/lib/admin/eventGame";
import type { MetricsLink } from "@/lib/download/links";
import { JoinHint } from "./JoinHint";

/**
 * 방 참가 QR (게임 상세 > 현장 운영 > QR 보기).
 *
 * 찍으면 /join/<초대코드> 가 열리고, 앱이 있으면 그 방으로, 없으면 스토어로 간다.
 * 행사 링크(#171)를 고르면 그 꼬리표를 붙여, 이 QR 로 온 방문과 설치가 그 링크 결과에 같이 잡힌다.
 *
 * QR 은 다크 모드에서도 흰 바탕에 검은 점, 둘레 여백 4칸(ISO/IEC 18004)으로 그린다.
 * 색을 뒤집거나 둘레를 어둡게 두면 못 읽는 카메라 앱이 있다. docs/admin-ui.md "게임 상세 현장 운영"
 */

const REMEMBER_KEY = "admin.joinQr.link";
const QR_OPTIONS = { margin: 4, errorCorrectionLevel: "M" as const, color: { dark: "#000000", light: "#ffffff" } };

async function call(url: string): Promise<Response> {
  const send = () => fetch(url, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

function readRemembered(): number | "none" | null {
  try {
    const v = window.localStorage.getItem(REMEMBER_KEY);
    if (v === "none") return "none";
    const n = Number(v);
    return v && Number.isInteger(n) ? n : null;
  } catch {
    return null;
  }
}

function remember(v: number | "none") {
  try {
    window.localStorage.setItem(REMEMBER_KEY, String(v));
  } catch {
    // 저장이 막힌 브라우저면 다음에 처음 값으로 돌아갈 뿐이다
  }
}

type Links = { state: "loading" } | { state: "ready"; links: MetricsLink[] } | { state: "failed" };

export function JoinQrDialog({
  inviteCode,
  status,
  isEventGame,
  onClose,
}: {
  inviteCode: string;
  status: string;
  isEventGame: boolean;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<Links>({ state: "loading" });
  const [choice, setChoice] = useState<number | "none" | null>(null);
  const [qr, setQr] = useState<{ url: string; image: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    let alive = true;
    call("/api/admin/metrics/links")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as MetricsLink[] | null;
        if (!alive) return;
        if (!res.ok || !Array.isArray(body)) return setLinks({ state: "failed" });
        setLinks({ state: "ready", links: body });
        const first = defaultLink(body, readRemembered());
        setChoice(first ? first.id : "none");
      })
      .catch(() => alive && setLinks({ state: "failed" }));
    return () => {
      alive = false;
    };
  }, []);

  const list = links.state === "ready" ? links.links : [];
  const chosen = typeof choice === "number" ? (list.find((l) => l.id === choice) ?? null) : null;
  const url = joinUrl(SITE_URL, inviteCode, chosen);

  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(url, { ...QR_OPTIONS, width: 640 }).then((image) => alive && setQr({ url, image }));
    return () => {
      alive = false;
    };
  }, [url]);

  // 크게 띄운 화면이 위에 있으면 Esc 는 그 화면만 닫는다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !presenting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, presenting]);

  const pick = (v: string) => {
    const next = v === "none" ? "none" : Number(v);
    setChoice(next);
    remember(next);
  };

  const save = async () => {
    const image = await QRCode.toDataURL(url, { ...QR_OPTIONS, width: 1024 });
    const a = document.createElement("a");
    a.href = image;
    a.download = `join-${inviteCode}.png`;
    a.click();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const ready = qr?.url === url;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center overscroll-none sm:items-center sm:p-4">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 hidden bg-black/50 sm:block" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-qr-title"
        className="relative flex h-full w-full flex-col bg-sd-surface sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-sd-line"
      >
        <div className="flex items-center justify-between border-b border-sd-hairline px-5 py-4">
          <h2 id="join-qr-title" className="text-[15px] font-bold text-sd-fg">
            참가 QR
          </h2>
          <button type="button" onClick={onClose} className="text-[13px] font-semibold text-sd-fg-subtle transition hover:text-sd-fg">
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
          {/* 테마와 상관없이 흰 바탕. 다크 모드에서도 둘레가 밝아야 카메라가 QR 을 찾는다 */}
          <div className="mx-auto flex w-full max-w-[280px] flex-col items-center rounded-2xl bg-white pb-4 ring-1 ring-black/5">
            <div className="aspect-square w-full">
              {ready ? (
                // eslint-disable-next-line @next/next/no-img-element -- 화면에서 만든 data URL 이라 최적화할 것이 없다
                <img src={qr.image} alt={`초대 코드 ${inviteCode} 참가 QR`} className="h-full w-full" />
              ) : (
                <div className="m-[12%] h-[76%] animate-pulse rounded-lg bg-black/5" />
              )}
            </div>
            <p className="font-mono text-[20px] font-bold tracking-[0.18em] text-black">{inviteCode}</p>
          </div>

          <JoinHint status={status} isEventGame={isEventGame} />

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">유입 꼬리표</p>
            {links.state === "loading" && <div className="h-10 w-full animate-pulse rounded-xl bg-sd-gray-200" />}
            {links.state === "ready" && list.length > 0 && (
              <>
                <Dropdown
                  value={choice === null ? "none" : String(choice)}
                  onChange={pick}
                  options={[...list.map((l) => ({ label: l.label, value: String(l.id) })), { label: "꼬리표 없이", value: "none" }]}
                />
                <p className="mt-1.5 text-[13px] leading-relaxed text-sd-fg-muted">
                  {chosen
                    ? `이 QR로 들어온 방문과 설치도 '${chosen.label}' 링크 결과에 함께 집계돼요.`
                    : "꼬리표 없이 만들면 이 QR로 몇 명이 들어왔는지 따로 셀 수 없어요."}
                </p>
              </>
            )}
            {links.state === "ready" && list.length === 0 && (
              <p className="text-[13px] leading-relaxed text-sd-fg-muted">
                아직 만든 행사 링크가 없어요.{" "}
                <Link href="/admin/metrics?tab=traffic" className="font-semibold text-accent hover:underline">
                  지표의 링크와 QR
                </Link>
                에서 만들면 이 QR에도 붙일 수 있어요.
              </p>
            )}
            {links.state === "failed" && (
              <p className="text-[13px] leading-relaxed text-sd-fg-muted">행사 링크를 불러오지 못해 꼬리표 없이 만들었어요.</p>
            )}
          </div>

          <p className="text-[12px] leading-relaxed text-sd-fg-subtle">화면으로 보여 줄 땐 QR이 잘 찍히도록 밝기를 최대로 높여 주세요.</p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-sd-hairline px-5 py-3.5">
          <Button variant="brand" onClick={() => setPresenting(true)} disabled={!ready} className="flex-1">
            <MaximizeIcon className="h-4 w-4" />
            크게 띄우기
          </Button>
          <Button variant="neutral" onClick={() => void save()}>
            <DownloadIcon className="h-4 w-4" />
            QR 저장하기
          </Button>
          <Button variant="neutral" onClick={() => void copy()}>
            <CopyIcon className="h-4 w-4" />
            {copied ? "복사했어요" : "주소 복사하기"}
          </Button>
        </div>
      </div>

      {presenting && ready && <QrPresenter image={qr.image} inviteCode={inviteCode} onClose={() => setPresenting(false)} />}
    </div>
  );
}

/**
 * 부스 노트북이나 폰 화면을 그대로 내밀 때 쓰는 화면. 흰 바탕에 QR 만 크게.
 * 화면이 꺼지면 다시 깨워야 해서 켜져 있는 동안 화면 꺼짐을 막는다(Screen Wake Lock, 안 되는 브라우저는 그냥 둔다).
 * 방문객이 화면을 만져도 닫히지 않게 바탕 누르기로는 닫지 않고, 닫기 버튼과 Esc 로만 닫는다
 */
function QrPresenter({ image, inviteCode, onClose }: { image: string; inviteCode: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const keepAwake = useCallback(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    return nav.wakeLock?.request("screen").catch(() => null) ?? Promise.resolve(null);
  }, []);

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    let alive = true;
    const acquire = () => void keepAwake().then((l) => (alive ? (lock = l) : void l?.release()));
    acquire();
    // 탭을 다녀오면 브라우저가 잠금을 풀어서 돌아올 때 다시 건다
    const onVisible = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVisible);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      void lock?.release();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("keydown", onKey);
    };
  }, [keepAwake, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="참가 QR 크게 보기" className="fixed inset-0 z-[80] flex touch-none select-none flex-col items-center justify-center overscroll-none bg-white px-4 text-black">
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="크게 보기 닫기"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full text-black/60 transition hover:bg-black/5 hover:text-black"
      >
        <XIcon className="h-6 w-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- 화면에서 만든 data URL */}
      <img src={image} alt={`초대 코드 ${inviteCode} 참가 QR`} className="aspect-square w-[min(72vh,92vw)]" />
      <p className="mt-2 font-mono text-[clamp(28px,6vh,56px)] font-bold tracking-[0.18em]">{inviteCode}</p>
      <p className="mt-2 max-w-[36ch] text-center text-[clamp(15px,2.4vh,20px)] font-semibold leading-snug text-black/60">휴대폰 카메라로 QR을 찍어 주세요. 앱에서 이 방이 열려요. 앱이 없으면 스토어로 가요.</p>
    </div>
  );
}
