"use client";

import { useEffect, useState } from "react";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { CheckIcon } from "@/components/admin/icons";
import { sendStoreDrafts } from "@/lib/admin/storePageClient";
import { LANGS, type Platform } from "@/lib/store-page/fields";
import { CONFIRM_WORD, needsConfirm, signature, type Change } from "@/lib/store-page/send";

// 초안을 스토어로 보내기 전 확인창 (docs/admin-ui.md "스토어 페이지").
// 무엇이 어떻게 바뀌고 언제 사용자에게 보이는지 보여 준다. 사용자에게 닿는 변경은 입력까지 받는다.

const NAME: Record<Platform, string> = { ios: "App Store", android: "Google Play" };

export function SendDialog({ platform, changes, version, onClose, onDone }: { platform: Platform; changes: Change[]; version: string | null; onClose: () => void; onDone: (message: string) => void }) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [check, setCheck] = useState<"checking" | "ok" | string>("checking");
  const expect = signature(changes);
  const lock = needsConfirm(platform, changes);
  const promo = changes.some((c) => c.field === "promotionalText");

  useEffect(() => {
    let live = true;
    sendStoreDrafts({ platform, expect, dryRun: true })
      .then(() => live && setCheck("ok"))
      .catch((e: Error) => live && setCheck(e.message));
    return () => {
      live = false;
    };
  }, [platform, expect]);

  const facts =
    platform === "ios"
      ? [version ? `${version}에 저장돼요. 심사에 내기 전까지 사용자에게 보이지 않아요.` : "다음 버전에 저장돼요.", ...(promo ? ["프로모션 문구는 심사 없이 바로 사용자에게 보여요."] : [])]
      : ["구글 심사를 받은 뒤, 게시 개요에서 게시해야 사용자에게 보여요.", "심사 중인 변경이 있으면 보내지 않아요."];

  const send = () => {
    setPending(true);
    setError(undefined);
    sendStoreDrafts({ platform, expect, confirm: typed.trim() })
      .then((r) => onDone(r.failed ? `${r.message} ${r.failed}` : r.message))
      .catch((e: Error) => setError(e.message))
      .finally(() => setPending(false));
  };

  return (
    <ChangeDialog title={`${NAME[platform]}로 보내기`} size="lg" confirmText="보내기" pendingText="보내는 중..." confirmDisabled={check !== "ok" || (lock && typed.trim() !== CONFIRM_WORD)} pending={pending} error={error} onConfirm={send} onClose={onClose}>
      <div className="max-h-[40vh] space-y-4 overflow-y-auto">
        {LANGS.filter((l) => changes.some((c) => c.lang === l.id)).map((l) => (
          <section key={l.id} aria-label={l.label}>
            <h3 className="text-[13px] font-bold text-sd-fg">{l.label}</h3>
            <ul className="mt-1.5 space-y-2">
              {changes
                .filter((c) => c.lang === l.id)
                .map((c) => (
                  <li key={c.field} className="rounded-[10px] bg-sd-fill px-3 py-2">
                    <p className="text-[12.5px] font-semibold text-sd-fg-muted">
                      {c.label} <span className="font-normal text-sd-fg-subtle">· {c.when}</span>
                    </p>
                    <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-[13px] leading-relaxed text-sd-fg-subtle line-through">{c.before || "비어 있어요"}</p>
                    <p className="mt-0.5 line-clamp-4 whitespace-pre-line break-words text-[13px] font-medium leading-relaxed text-sd-fg">{c.after || "비워요"}</p>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <ul className="mt-4 space-y-1">
        {facts.map((f) => (
          <li key={f} className="text-[13px] leading-relaxed text-sd-fg-muted">
            {f}
          </li>
        ))}
      </ul>
      <p className={`mt-3 flex items-center gap-1.5 text-[13px] ${check === "checking" || check === "ok" ? "text-sd-fg-muted" : "text-sd-critical"}`}>
        {check === "ok" && <CheckIcon className="size-4 text-sd-positive" />}
        {check === "checking" ? "스토어에 보낼 수 있는지 확인하는 중이에요" : check === "ok" ? (platform === "android" ? "구글 검사를 통과했어요" : "보낼 수 있어요") : check}
      </p>
      {lock && (
        <label className="mt-3 block text-[13px] font-semibold text-sd-fg">
          확인을 위해 {CONFIRM_WORD}를 입력해 주세요
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus className="mt-1.5 block w-full rounded-xl border border-sd-line bg-sd-surface px-3.5 py-2.5 text-[14px] font-normal text-sd-fg outline-none focus:border-accent" />
        </label>
      )}
    </ChangeDialog>
  );
}
