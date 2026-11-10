"use client";

import { useState } from "react";
import { Avatar } from "@/components/admin/Avatar";
import { Callout } from "@/components/admin/Callout";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorBlock, PageHeader, ScrollPage } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { useToast } from "@/components/admin/Toast";
import { ICON_LABEL, RoleArt } from "@/components/admin/team/RoleArt";
import { RoleTile } from "@/components/admin/team/RolePicker";
import { useTeam, withMember } from "@/components/admin/team/TeamProvider";
import { DESC_MAX, isBuiltin, NAME_MAX, ROLE_ICONS, roleProblem, seenLabel, type Member, type Role, type RoleInput, type Team } from "@/lib/admin/team";
import { archiveRole, createRole, saveRoles, updateRole } from "@/lib/admin/teamClient";

// 운영진 (docs/admin-ui.md "운영진"). 누가 무슨 일을 맡는지 보고, 역할 목록을 고친다.

type Tab = "members" | "roles";
const FIELD = "h-10 w-full rounded-xl border border-sd-line bg-sd-surface px-3.5 text-[14px] text-sd-fg outline-none transition-colors placeholder:text-sd-placeholder focus:border-accent";

function MemberRow({ m, team, now, onSaved }: { m: Member; team: Team; now: number; onSaved: (m: Member) => void }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const mine = m.userId === team.me.userId;
  const editable = team.writable && (mine || team.canManage);

  const toggle = (key: string) => {
    const next = m.roleKeys.includes(key) ? m.roleKeys.filter((k) => k !== key) : [...m.roleKeys, key];
    setPending(true);
    saveRoles(m, next)
      .then(onSaved)
      .catch((e: Error) => toast(e.message))
      .finally(() => setPending(false));
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3.5 sm:px-5">
      <Avatar name={m.nickname} size={36} />
      <div className="min-w-0 flex-1 basis-36">
        <p className="flex items-center gap-1.5 truncate text-[14.5px] font-semibold text-sd-fg">
          {m.nickname}
          {mine && <span className="rounded-md bg-accent-weak px-1.5 py-px text-[11.5px] font-bold text-accent">나</span>}
        </p>
        <p className="mt-0.5 text-[12.5px] text-sd-fg-subtle">{seenLabel(m.lastSeenAt, now)}</p>
      </div>
      {editable ? (
        <div role="group" aria-label={`${m.nickname}님의 역할`} aria-busy={pending} className="flex flex-wrap gap-1.5">
          {team.roles.map((r) => {
            const on = m.roleKeys.includes(r.key);
            return (
              <button key={r.key} type="button" aria-pressed={on} disabled={pending} onClick={() => toggle(r.key)} className={`h-8 rounded-lg px-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${on ? "bg-accent-weak text-accent" : "bg-sd-fill text-sd-fg-subtle hover:text-sd-fg-muted"}`}>
                {r.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="flex flex-wrap gap-1.5 text-[13px] font-semibold">
          {m.roleKeys.length ? (
            team.roles
              .filter((r) => m.roleKeys.includes(r.key))
              .map((r) => (
                <span key={r.key} className="rounded-lg bg-accent-weak px-2.5 py-1 text-accent">
                  {r.name}
                </span>
              ))
          ) : (
            <span className="font-medium text-sd-fg-subtle">아직 고르지 않았어요</span>
          )}
        </p>
      )}
    </li>
  );
}

function RoleEditor({ role, team, onClose, onSaved }: { role: Role | null; team: Team; onClose: () => void; onSaved: (next: Team) => void }) {
  const toast = useToast();
  const builtin = !!role && isBuiltin(role.key);
  const [draft, setDraft] = useState<RoleInput>(role ? { name: role.name, description: role.description, icon: role.icon } : { name: "", description: "", icon: "sparkles" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [removing, setRemoving] = useState(false);
  const problem = roleProblem(draft, team.roles.filter((r) => r.key !== role?.key), builtin);
  const dirty = !role || draft.name !== role.name || draft.description !== role.description || draft.icon !== role.icon;
  const holders = role ? team.members.filter((m) => m.roleKeys.includes(role.key)).length : 0;

  const save = () => {
    setPending(true);
    setError(undefined);
    (role ? updateRole(role, draft) : createRole(draft))
      .then((saved) => {
        onSaved({ ...team, roles: role ? team.roles.map((r) => (r.key === saved.key ? saved : r)) : [...team.roles, saved] });
        toast(`${saved.name} 역할을 저장했어요.`);
        onClose();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setPending(false));
  };

  const remove = () => {
    if (!role) return;
    setPending(true);
    archiveRole(role)
      .then(() => {
        onSaved({ ...team, roles: team.roles.filter((r) => r.key !== role.key), members: team.members.map((m) => ({ ...m, roleKeys: m.roleKeys.filter((k) => k !== role.key) })), me: { ...team.me, roleKeys: team.me.roleKeys.filter((k) => k !== role.key) } });
        toast(`${role.name} 역할을 지웠어요.`);
        onClose();
      })
      .catch((e: Error) => {
        setError(e.message);
        setRemoving(false);
      })
      .finally(() => setPending(false));
  };

  const preview: Role = { key: role?.key ?? "new", name: draft.name.trim() || "역할 이름", description: draft.description.trim() || "이 역할이 주로 하는 일", icon: draft.icon, cards: [], position: 0, updatedBy: "", updatedAt: "" };

  return (
    <>
      <ChangeDialog title={role ? `${role.name} 역할 고치기` : "새 역할"} size="lg" confirmText="저장" pendingText="저장하는 중..." pending={pending} confirmDisabled={!!problem || !dirty} error={error ?? (dirty && draft.name.trim() ? (problem ?? undefined) : undefined)} onConfirm={save} onClose={onClose}>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-sd-fg">역할 이름</span>
            <input value={draft.name} maxLength={NAME_MAX} autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="커뮤니티" className={FIELD} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-sd-fg">한 줄 설명</span>
            <input value={draft.description} maxLength={DESC_MAX} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="디스코드와 오픈채팅 응대" className={FIELD} />
          </label>
          {!builtin && (
            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-sd-fg">아이콘</span>
              <div role="group" aria-label="아이콘" className="grid grid-cols-6 gap-1.5">
                {ROLE_ICONS.map((i) => (
                  <button key={i} type="button" aria-pressed={draft.icon === i} aria-label={ICON_LABEL[i]} onClick={() => setDraft({ ...draft, icon: i })} className={`grid h-11 place-items-center rounded-xl transition-colors ${draft.icon === i ? "bg-accent text-accent-fg" : "bg-sd-fill text-sd-fg-muted hover:text-sd-fg"}`}>
                    <RoleArt icon={i} className="size-6 [stroke-width:1.8]" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-sd-fg">처음 고르는 화면에서는 이렇게 보여요</span>
            <div aria-hidden className="pointer-events-none max-w-[300px]">
              <RoleTile role={preview} on={false} onToggle={() => undefined} />
            </div>
          </div>
          {role && !builtin && (
            <button type="button" onClick={() => setRemoving(true)} className="text-[13px] font-semibold text-sd-critical hover:underline">
              이 역할 지우기
            </button>
          )}
        </div>
      </ChangeDialog>
      <ConfirmDialog open={removing} danger pending={pending} title={`${role?.name ?? ""} 역할을 지울까요?`} message={holders ? `맡고 있는 ${holders}명의 역할에서도 빠져요.` : "맡고 있는 분은 없어요."} confirmText="지우기" onConfirm={remove} onClose={() => setRemoving(false)} />
    </>
  );
}

function Members({ team, onSaved }: { team: Team; onSaved: (m: Member) => void }) {
  // 나를 맨 위에 두고 나머지는 최근에 들어온 순서다
  const list = [team.me, ...team.members.filter((m) => m.userId !== team.me.userId)];
  // 접속 시각은 화면을 연 때를 기준으로 센다
  const [now] = useState(() => Date.now());
  return (
    <ul className="divide-y divide-sd-hairline overflow-hidden rounded-2xl border border-sd-line bg-sd-surface">
      {list.map((m) => (
        <MemberRow key={m.userId} m={m} team={team} now={now} onSaved={onSaved} />
      ))}
    </ul>
  );
}

function Roles({ team, onSaved }: { team: Team; onSaved: (t: Team) => void }) {
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const can = team.writable && team.canManage;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {team.roles.map((r) => {
          const count = team.members.filter((m) => m.roleKeys.includes(r.key)).length;
          const body = (
            <>
              <RoleArt icon={r.icon} className="absolute right-4 top-4 size-14 text-accent" />
              <b className="block pr-16 text-[17px] font-bold tracking-tight text-sd-fg">{r.name}</b>
              <span className="mt-0.5 block pr-16 text-[13.5px] text-sd-fg-muted">{r.description}</span>
              <span className="mt-4 block text-[12.5px] text-sd-fg-subtle">{count ? `${count}명이 맡고 있어요` : "맡은 분이 없어요"}</span>
            </>
          );
          const box = "relative block min-h-[124px] w-full rounded-2xl border border-sd-line bg-sd-surface p-5 text-left";
          return can ? (
            <button key={r.key} type="button" onClick={() => setEditing(r)} className={`${box} transition hover:-translate-y-0.5 hover:border-accent`}>
              {body}
            </button>
          ) : (
            <div key={r.key} className={box}>
              {body}
            </div>
          );
        })}
        {can && (
          <button type="button" onClick={() => setEditing("new")} className="grid min-h-[124px] place-items-center rounded-2xl border border-dashed border-sd-line text-[14px] font-semibold text-sd-fg-muted transition-colors hover:border-accent hover:text-accent">
            역할 추가
          </button>
        )}
      </div>
      {editing && <RoleEditor role={editing === "new" ? null : editing} team={team} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </>
  );
}

export default function TeamPage() {
  const { team, error, reload, changeMember, setTeam } = useTeam();
  const [tab, setTab] = useState<Tab>("members");

  return (
    <ScrollPage>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="운영진"
          description="누가 어떤 일을 맡는지 보고 고칠 수 있어요. 역할은 볼 수 있는 화면을 줄이지 않아요."
          actions={
            team && (
              <SegmentedControl<Tab>
                value={tab}
                onChange={setTab}
                options={[
                  { value: "members", label: `구성원 ${team.members.length}` },
                  { value: "roles", label: `역할 ${team.roles.length}` },
                ]}
              />
            )
          }
        />
        {!team ? (
          error ? (
            <ErrorBlock message={error} onRetry={reload} />
          ) : (
            <div aria-busy className="h-64 animate-pulse rounded-2xl bg-sd-fill" />
          )
        ) : (
          <div className="space-y-3">
            {team.readOnlyReason && <Callout variant="neutral">{team.readOnlyReason}</Callout>}
            {team.writable && !team.canManage && <p className="text-[13px] leading-relaxed text-sd-fg-muted">내 역할은 언제든 바꿀 수 있어요. 다른 분의 역할과 역할 목록은 운영 역할을 맡은 분이 고쳐요.</p>}
            {tab === "members" ? <Members team={team} onSaved={changeMember} /> : <Roles team={team} onSaved={(t) => setTeam(withMember(t, t.me))} />}
          </div>
        )}
      </div>
    </ScrollPage>
  );
}
