"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEMO_COPY, type DemoCopy } from "@/lib/demo/copy";
import type { Locale } from "@/lib/i18n/config";

// 데모 트리 전체에 로케일 문구를 내려보내는 컨텍스트.
// 장면 컴포넌트가 깊어서 prop으로 일일이 흘리는 대신 여기서 받는다.
const DemoCopyContext = createContext<DemoCopy>(DEMO_COPY.ko);

export function DemoCopyProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <DemoCopyContext.Provider value={DEMO_COPY[locale]}>
      {children}
    </DemoCopyContext.Provider>
  );
}

export function useDemoCopy() {
  return useContext(DemoCopyContext);
}
