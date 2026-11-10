"use client";

import { AnimatePresence } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { RolePicker } from "@/components/admin/team/RolePicker";
import { canManage, type Member, type Team } from "@/lib/admin/team";
import { fetchTeam } from "@/lib/admin/teamClient";

// 운영진을 한 번 읽어 어드민 어디서나 쓴다 (docs/admin-ui.md "운영진").
// 처음 들어온 사람에게는 맡은 일을 고르는 화면을 띄운다. 고르거나 건너뛰면 다시 뜨지 않는다.

type TeamValue = { team: Team | null; error: string | null; reload: () => void; changeMember: (m: Member) => void; setTeam: (t: Team) => void };

const Ctx = createContext<TeamValue | null>(null);

export function useTeam(): TeamValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTeam 은 TeamProvider 안에서만 써요");
  return v;
}

/** 구성원 한 명을 바꾼 뒤 내 권한까지 다시 계산한다 */
export function withMember(team: Team, m: Member): Team {
  const members = team.members.map((x) => (x.userId === m.userId ? m : x));
  const me = team.me.userId === m.userId ? m : team.me;
  return { ...team, me, members, canManage: canManage(me.roleKeys, members) };
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetchTeam()
      .then((t) => {
        setTeam(t);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => reload(), [reload]);

  const changeMember = useCallback((m: Member) => setTeam((t) => t && withMember(t, m)), []);
  // 저장할 수 없는 곳(로컬 밖의 미리보기 배포)에서는 고른 값이 남지 않으니 띄우지 않는다
  const asking = !!team && team.writable && !team.me.onboardedAt && !!team.me.updatedAt && team.roles.length > 0;

  return (
    <Ctx.Provider value={{ team, error, reload, changeMember, setTeam }}>
      {children}
      <AnimatePresence>{asking && <RolePicker key="picker" team={team} onDone={changeMember} />}</AnimatePresence>
    </Ctx.Provider>
  );
}
