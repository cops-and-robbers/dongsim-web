/**
 * 내 개요 구성 (docs/admin-ui.md "내 개요 구성"). 순수 함수만 둔다.
 * 직접 고친 구성이 있으면 그것을, 없으면 맡은 역할의 기본 카드를 본다.
 */
import type { Member, Role } from "../team.ts";
import { cellsOf, isCardKey, MAX_CELLS, presetCards, type CardKey } from "./cards.ts";

/** 아는 카드만, 한 번씩, 8칸까지 */
export function fitCards(keys: string[]): CardKey[] {
  const out: CardKey[] = [];
  for (const k of keys) if (isCardKey(k) && !out.includes(k) && cellsOf([...out, k]) <= MAX_CELLS) out.push(k);
  return out;
}

export function myCards(me: Pick<Member, "roleKeys" | "overviewCards">, roles: Pick<Role, "key" | "cards">[]): { keys: CardKey[]; custom: boolean } {
  if (me.overviewCards) return { keys: fitCards(me.overviewCards), custom: true };
  return { keys: presetCards(roles.filter((r) => me.roleKeys.includes(r.key)).map((r) => r.cards)), custom: false };
}

/** 구성을 고친 뒤에 새로 맡은 역할과, 그 역할 카드 중 아직 없는 것. 물어볼 게 없으면 null */
export function newRoleOffer<R extends Pick<Role, "key" | "name" | "cards">>(me: Pick<Member, "roleKeys" | "overviewCards" | "overviewRoles">, roles: R[]): { roles: R[]; cards: CardKey[] } | null {
  if (!me.overviewCards || !me.overviewRoles) return null;
  const seen = me.overviewRoles;
  const added = roles.filter((r) => me.roleKeys.includes(r.key) && !seen.includes(r.key));
  const current = fitCards(me.overviewCards);
  const cards = [...new Set(added.flatMap((r) => r.cards).filter(isCardKey))].filter((k) => !current.includes(k));
  return added.length && cards.length ? { roles: added, cards } : null;
}

/** 지금 구성 뒤에 들어가는 만큼 더한다. 자리가 없어 못 넣은 수도 돌려준다 */
export function addCards(current: CardKey[], extra: CardKey[]): { keys: CardKey[]; skipped: number } {
  const keys = [...current];
  let skipped = 0;
  for (const k of extra) {
    if (keys.includes(k)) continue;
    if (cellsOf([...keys, k]) <= MAX_CELLS) keys.push(k);
    else skipped++;
  }
  return { keys, skipped };
}
