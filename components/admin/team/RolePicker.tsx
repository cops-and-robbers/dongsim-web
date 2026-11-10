"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ArrowRightIcon, CheckIcon } from "@/components/admin/icons";
import { RoleArt } from "@/components/admin/team/RoleArt";
import { pickedNote, type Member, type Team } from "@/lib/admin/team";
import { saveRoles } from "@/lib/admin/teamClient";

// 처음 들어온 사람이 맡은 일을 고르는 화면 (docs/admin-ui.md "운영진").
// 그림 카드를 눌러 여러 개 고른다. 고르지 않고 넘어가도 모든 화면을 볼 수 있다.

export function RoleTile({ role, on, onToggle }: { role: Team["roles"][number]; on: boolean; onToggle: () => void }) {
  return (
    <label
      className={`group relative flex h-[150px] cursor-pointer flex-col justify-end overflow-hidden rounded-[22px] p-4 transition-[background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(.2,1.4,.4,1)] active:scale-[.985] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent sm:h-[176px] sm:p-[22px] ${
        on
          ? "bg-accent text-accent-fg [--clip:var(--color-accent)] [--tf:color-mix(in_srgb,var(--color-accent-fg)_20%,transparent)]"
          : "bg-sd-surface text-sd-fg shadow-[0_0_0_1px_var(--color-sd-line)] hover:-translate-y-[3px] hover:shadow-[0_0_0_1px_var(--color-sd-line),0_12px_28px_-14px_rgba(0,0,0,0.25)]"
      }`}
    >
      <input type="checkbox" checked={on} onChange={onToggle} className="sr-only" />
      <RoleArt icon={role.icon} className={`absolute right-3 top-3 size-14 transition-transform duration-[380ms] ease-[cubic-bezier(.2,1.6,.4,1)] sm:right-5 sm:top-5 sm:size-[76px] ${on ? "-rotate-3 scale-[1.07] text-accent-fg" : "text-accent"}`} />
      <span aria-hidden className={`absolute left-3.5 top-3.5 grid size-[26px] place-items-center rounded-full bg-accent-fg text-accent transition-transform duration-[280ms] ease-[cubic-bezier(.2,1.7,.4,1)] sm:left-5 sm:top-5 ${on ? "scale-100" : "scale-0"}`}>
        <CheckIcon className="size-4 [stroke-width:3]" />
      </span>
      <b className="relative text-[20px] font-extrabold tracking-[-0.03em] sm:text-[24px]">{role.name}</b>
      <span className={`relative mt-0.5 text-[12.5px] leading-snug transition-colors sm:text-[14px] ${on ? "text-accent-fg/85" : "text-sd-fg-muted"}`}>{role.description}</span>
    </label>
  );
}

export function RolePicker({ team, onDone }: { team: Team; onDone: (m: Member) => void }) {
  const [picked, setPicked] = useState<string[]>(team.me.roleKeys);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string) => {
    setError(null);
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  };

  const finish = (keys: string[]) => {
    setPending(true);
    setError(null);
    saveRoles(team.me, keys, true)
      .then(onDone)
      .catch((e: Error) => {
        setError(e.message);
        setPending(false);
      });
  };

  const start = () => (picked.length ? finish(picked) : setError("맡은 일을 하나 이상 고르거나 나중에 고를게요를 눌러 주세요."));

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-picker-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement) && !pending) start();
      }}
      className="admin-shell fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-sd-fill text-sd-fg"
    >
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ type: "spring", stiffness: 380, damping: 32 }} className="w-full max-w-[760px]">
          <p className="text-[14px] font-semibold text-accent">{team.me.nickname}님, 반가워요</p>
          <h1 id="role-picker-title" className="mt-1.5 text-[28px] font-extrabold tracking-[-0.03em] sm:text-[32px]">
            어떤 일을 맡고 있어요?
          </h1>
          <p className="mt-1.5 text-[15px] text-sd-fg-muted">여러 개 골라도 돼요. 운영진 화면에서 언제든 바꿀 수 있어요.</p>

          <div role="group" aria-label="맡은 일" className="mt-7 grid grid-cols-2 gap-3 sm:gap-3.5">
            {team.roles.map((r) => (
              <RoleTile key={r.key} role={r} on={picked.includes(r.key)} onToggle={() => toggle(r.key)} />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3">
            <p role="status" className={`min-w-0 flex-1 basis-60 text-[14px] ${error ? "font-medium text-sd-critical" : "text-sd-fg-muted"}`}>
              {error ?? pickedNote(picked, team.roles)}
            </p>
            <span className="ml-auto flex gap-2">
              <Button variant="neutral" disabled={pending} onClick={() => finish([])}>
                나중에 고를게요
              </Button>
              <Button disabled={pending} onClick={start}>
                {pending ? "저장하는 중..." : "시작하기"}
                {!pending && <ArrowRightIcon className="size-4" />}
              </Button>
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
