"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LIST_VIEW, effectiveListView, parseListView, TABLE_MIN_WIDTH, type ListView } from "@/lib/admin/listView";
import { fetchListView, saveListView } from "@/lib/admin/teamClient";

// 유저, 게임 목록을 두 칸으로 볼지 표로 볼지 (docs/admin-ui.md "목록 보기 고르기").
// 계정에 저장해 어느 컴퓨터에서 열어도 같다. 이 브라우저에도 남겨 두어 처음 그릴 때 깜빡이지 않는다.
// 계정에 못 남기는 곳(미리보기, 로컬, 0029 SQL 전)에서는 이 브라우저 값만 쓴다.

const LOCAL = "cnr_admin_list_view";
const WIDE = `(min-width: ${TABLE_MIN_WIDTH}px)`;

type Value = {
  /** 실제로 그리는 보기. 좁은 화면은 늘 두 칸 */
  view: ListView;
  /** 고른 보기 */
  chosen: ListView;
  /** 표를 그릴 수 있는 폭인지. 아니면 고르는 단추를 숨긴다 */
  wide: boolean;
  setView: (v: ListView) => void;
};

const Ctx = createContext<Value | null>(null);

export function useListView(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useListView 는 ListViewProvider 안에서만 써요");
  return v;
}

function readLocal(): ListView | null {
  try {
    return parseListView(localStorage.getItem(LOCAL));
  } catch {
    return null;
  }
}

function writeLocal(v: ListView) {
  try {
    localStorage.setItem(LOCAL, v);
  } catch {}
}

// 어드민은 로그인을 확인한 뒤 브라우저에서만 그려서(AdminProviders) 첫 값부터 브라우저 저장소와 화면 폭을 읽어도 된다
export function ListViewProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<ListView>(() => readLocal() ?? DEFAULT_LIST_VIEW);
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);

  useEffect(() => {
    const q = window.matchMedia(WIDE);
    const on = () => setWide(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);

  // 계정에 저장된 값이 있으면 그걸 따른다(다른 컴퓨터에서 바꿨을 수 있다)
  useEffect(() => {
    let alive = true;
    fetchListView()
      .then((r) => {
        if (!alive || !r.view) return;
        setChosen(r.view);
        writeLocal(r.view);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setView = useCallback((v: ListView) => {
    setChosen(v);
    writeLocal(v);
    // 계정에 못 남겨도(미리보기, 로컬) 이 브라우저에서는 그대로 쓴다. 고르는 일을 막지 않는다
    saveListView(v).catch(() => {});
  }, []);

  return <Ctx.Provider value={{ view: effectiveListView(chosen, wide), chosen, wide, setView }}>{children}</Ctx.Provider>;
}
