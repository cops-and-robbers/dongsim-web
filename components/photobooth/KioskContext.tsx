"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_KIOSK, type CopyKey, type KioskConfig } from "@/lib/event/kiosk";
import { renderCopy } from "./copy";

// 부스 화면이 같이 쓰는 행사 설정(#221). 서버가 지금 행사의 값을 골라 Kiosk 에 넘기고, 화면들은 여기서 꺼내 쓴다.
// 설정이 없으면(예전 화면, 미리보기 전) 마지막으로 코드에 있던 값으로 돈다.

type Value = { kiosk: KioskConfig; name: string };
const Ctx = createContext<Value>({ kiosk: DEFAULT_KIOSK, name: "" });

export function KioskProvider({ kiosk, name, children }: Value & { children: ReactNode }) {
  return <Ctx.Provider value={{ kiosk, name }}>{children}</Ctx.Provider>;
}

export const useKiosk = () => useContext(Ctx);

export function Copy({ k, cuts }: { k: CopyKey; cuts?: number }) {
  return renderCopy(useKiosk(), k, cuts);
}
