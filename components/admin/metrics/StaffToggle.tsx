"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/Parts";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";

/**
 * 어드민 유저 상세의 "운영진 계정" 스위치 (#165).
 *
 * 지표는 운영진끼리만 한 판(팀 테스트)과 운영진 사람을 빼고 센다(lib/metrics/gameServer.ts).
 * 관리자 권한 계정은 자동으로 운영진이고, 권한 없는 팀원 계정과 테스트 계정만 여기서 켠다.
 * 지인이나 QA 에 초대한 사람은 실제로 앱을 깔고 한 사용자라 켜지 않는다
 */

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

export function StaffToggle({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) return;
    let alive = true;
    call("/api/admin/metrics/staff")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { userId: string }[] | null;
        if (alive) setOn(res.ok && Array.isArray(body) ? body.some((a) => a.userId === userId) : null);
      })
      .catch(() => alive && setOn(null));
    return () => {
      alive = false;
    };
  }, [userId, isAdmin]);

  const toggle = async () => {
    if (on === null) return;
    setBusy(true);
    setError(null);
    const res = await call(`/api/admin/metrics/staff?userId=${encodeURIComponent(userId)}`, {
      method: on ? "DELETE" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: on ? undefined : JSON.stringify({ note: "어드민에서 지정" }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const b = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      return setError(b?.error ?? "바꾸지 못했어요. 잠시 뒤 다시 해 주세요.");
    }
    setOn(!on);
  };

  return (
    <SectionCard title="지표 집계">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-sd-fg">운영진 계정</p>
          <p className="mt-1 text-[13px] leading-relaxed text-sd-fg-muted">
            {isAdmin
              ? "관리자 권한이 있어 자동으로 운영진이에요. 지표에서 이 계정은 사람 수에서 빠지고, 운영진끼리만 한 판도 빠져요."
              : "팀원이나 테스트 계정이면 켜 주세요. 지표에서 이 계정은 사람 수에서 빠지고, 운영진끼리만 한 판도 빠져요. 지인이나 QA에 초대한 사람은 사용자라 켜지 않아요."}
          </p>
          {error && <p className="mt-2 text-[13px] text-sd-critical">{error}</p>}
        </div>
        {isAdmin ? (
          <span className="shrink-0 rounded-md bg-sd-fill px-2 py-0.5 text-[12px] font-bold text-sd-fg-muted">자동</span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={on === true}
            aria-label="운영진 계정"
            disabled={on === null || busy}
            onClick={() => void toggle()}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-accent" : "bg-sd-gray-400"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-sd-surface shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
          </button>
        )}
      </div>
    </SectionCard>
  );
}
