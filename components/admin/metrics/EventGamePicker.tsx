"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/admin/Button";
import { CheckIcon } from "@/components/admin/icons";
import { PlacePinsMap } from "@/components/admin/maps";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { DayGame, DayPlace } from "@/lib/metrics/eventReport";
import type { MetricsEvent } from "@/lib/metrics/events";

/**
 * 행사 게임 고르기 (#165). 일정 달력에서 행사 날을 누르면 그 행사 아래에 열린다.
 *
 * 처음엔 장소 좌표와 반경으로 행사 게임을 찾았는데 근처의 남의 게임이 잡히는 짐작이었다. 어느 게임이 우리 것인지는 팀이 안다.
 * - 한 줄에 시작 시각, 인원, 장소만 둔다. 고르는 데 그 이상은 필요 없다
 * - 장소는 지도 핀 글자(A, B)와 같다. 같은 시간 두 곳에서 한 날(9/19 반포, 어린이대공원)도 지도로 바로 가른다
 * - 아직 고르지 않았으면 행사 시간 안에 시작한 게임을 미리 체크해 둔다. 맞는지 보고 저장만 하면 된다
 * - 고른 게임이 있는 장소 핀은 진하게 그린다
 */

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

type Loaded = { status: "upcoming" } | { status: "ok"; places: DayPlace[]; games: DayGame[]; picked: string[] | null };

export function EventGamePicker({ event, showLabel, onSaved }: { event: MetricsEvent; showLabel: boolean; onSaved: () => void }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    call(`/api/admin/metrics/event-games?id=${event.id}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as (Loaded & { error?: string }) | null;
        if (!alive) return;
        if (!res.ok || !body || body.error) return setError(body?.error ?? "그날 게임을 못 불러왔어요.");
        setData(body);
        if (body.status === "ok") {
          const picked = new Set(body.picked ?? []);
          setSaved(picked);
          // 아직 고른 게 없으면 행사 시간 안에 시작한 게임을 미리 체크한다(저장 전이라 고른 것으로 치지 않는다)
          setChosen(picked.size ? picked : new Set(body.games.filter((g) => g.suggested).map((g) => g.id)));
        }
      })
      .catch(() => alive && setError("그날 게임을 못 불러왔어요."));
    return () => {
      alive = false;
    };
  }, [event.id]);

  const toggle = (id: string) =>
    setChosen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const dirty = chosen.size !== saved.size || [...chosen].some((id) => !saved.has(id));
  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await call(`/api/admin/metrics/event-games?id=${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameIds: [...chosen] }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const b = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      return setError(b?.error ?? "저장하지 못했어요. 잠시 뒤 다시 해 주세요.");
    }
    setSaved(new Set(chosen));
    onSaved();
  };

  const title = (
    <p className="text-[13px] font-semibold text-sd-fg">
      {showLabel ? `${event.label} 게임` : "행사 게임 고르기"}
      {data?.status === "ok" && data.games.length > 0 && <span className="ml-1.5 font-normal text-sd-fg-subtle">{chosen.size}판 고름</span>}
    </p>
  );

  if (error)
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-sd-line p-3">
        {title}
        <p className="text-[12px] text-sd-critical">{error}</p>
      </div>
    );
  if (!data) return <div className="h-24 animate-pulse rounded-xl bg-sd-gray-200" />;
  if (data.status === "upcoming")
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-sd-line p-3">
        {title}
        <p className="text-[12px] text-sd-fg-subtle">행사 날이 되면 그날 게임 중에서 고를 수 있어요.</p>
      </div>
    );

  const pins = data.places.map((p) => ({ ...p, active: data.games.some((g) => g.place === p.letter && chosen.has(g.id)) }));
  const unsaved = saved.size === 0 && chosen.size > 0;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-sd-line p-3">
      {title}
      {data.picked === null ? (
        <p className="text-[12px] text-sd-fg-subtle">0008 마이그레이션을 실행하면 고를 수 있어요.</p>
      ) : data.games.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-sd-fg-subtle">
          {data.picked.length > 0
            ? `골라 둔 게임 ${data.picked.length}판을 지금 연결된 게임 서버에서 찾지 못했어요. 로컬 dev 서버는 개발용 게임 서버를 봐서 운영 게임이 없어요.`
            : "이날 끝난 게임이 없어요."}
        </p>
      ) : (
        <>
          {unsaved && <p className="text-[12px] leading-relaxed text-sd-fg-muted">행사 시간에 시작한 게임을 미리 체크해 뒀어요. 맞는지 보고 저장해 주세요.</p>}
          {pins.length > 0 && <PlacePinsMap pins={pins} />}
          <ul className="flex max-h-64 flex-col overflow-y-auto" role="group" aria-label={`${event.label} 행사 게임`}>
            {data.games.map((g) => {
              const on = chosen.has(g.id);
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(g.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-1.5 py-1.5 text-left text-[13px] tabular-nums transition-colors hover:bg-sd-gray-200"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${on ? "border-accent bg-accent" : "border-sd-gray-400"}`}
                      aria-hidden
                    >
                      {on && <CheckIcon className="h-3 w-3 text-accent-fg" />}
                    </span>
                    <span className="w-11 shrink-0 text-sd-fg">{g.start}</span>
                    <span className="w-10 shrink-0 text-sd-fg">{g.people}명</span>
                    <span className="text-sd-fg-muted">{g.place ? `장소 ${g.place}` : "장소 모름"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Button size="sm" type="button" disabled={busy || !dirty} onClick={() => void save()} className="h-9">
            저장
          </Button>
        </>
      )}
    </div>
  );
}
