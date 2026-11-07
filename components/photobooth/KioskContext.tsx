"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_KIOSK, charactersOf, type CopyKey, type KioskConfig } from "@/lib/event/kiosk";
import { frameDefsOf, type FrameDef } from "./frames";
import { renderCopy } from "./copy";

// 부스 화면이 같이 쓰는 행사 설정(#221). 서버가 지금 행사의 값을 골라 Kiosk 에 넘기고, 화면들은 여기서 꺼내 쓴다.
// 설정이 없으면(예전 화면, 미리보기 전) 마지막으로 코드에 있던 값으로 돈다.

type Value = { kiosk: KioskConfig; name: string };
/** 행사 설정에서 꺼낸 프레임 목록과 캐릭터 그림 주소(#224) */
type Derived = Value & { frames: FrameDef[]; chars: { cop: string; thief: string } };
const derive = (v: Value): Derived => ({ ...v, frames: frameDefsOf(v.kiosk), chars: charactersOf(v.kiosk) });
const Ctx = createContext<Derived>(derive({ kiosk: DEFAULT_KIOSK, name: "" }));

export function KioskProvider({ kiosk, name, children }: Value & { children: ReactNode }) {
  const value = useMemo(() => derive({ kiosk, name }), [kiosk, name]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useKiosk = () => useContext(Ctx);

export function Copy({ k, cuts }: { k: CopyKey; cuts?: number }) {
  return renderCopy(useKiosk(), k, cuts);
}
