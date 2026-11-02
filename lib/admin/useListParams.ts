"use client";

import { useCallback, useDeferredValue, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { patchListParams, readListParams, type ListSchema, type ListValues } from "@/lib/admin/listParams";

const LIST_KEY = "admin-list:";
const SCROLL_KEY = "admin-list-scroll:";

// 저장소가 막힌 창에서도 목록은 그대로 동작해야 한다. 잃는 건 돌아올 때의 편의뿐이다
function save(key: string, value: string) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {}
}
function load(key: string) {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * 목록의 필터와 페이지를 주소에 두고 읽는다. 상세에 갔다가 돌아와도, 주소를 공유해도 같은 목록이 열린다.
 *
 * 값을 주소 하나에만 둔다. useState 에 따로 들면 메뉴를 눌러 주소가 비었을 때 화면만 필터가 걸린 채로 남는다.
 * window.location 대신 useSearchParams 를 읽는 까닭: 다른 화면에서 넘어올 때 Next 는 화면을 그린 뒤에 주소를 바꿔,
 * 그리는 동안의 window.location 은 아직 이전 화면의 주소다.
 *
 * - current: 지금 고른 값. 필터 버튼에 쓴다(누르면 바로 바뀐다)
 * - shown: 목록에 보여 줄 값. 조회에 쓴다. 새 목록이 올 때까지 이전 목록을 흐리게 두려고 한 박자 늦다
 * - dim: 새 목록을 기다리는 중
 *
 * 쓸 때는 replaceState 다. 필터를 누를 때마다 방문 기록이 쌓이면 뒤로 가기로 목록을 벗어나지 못한다.
 */
export function useListParams<const S extends ListSchema>(schema: S) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const shownSearch = useDeferredValue(search);

  useEffect(() => save(LIST_KEY + pathname, search), [pathname, search]);

  const set = useCallback(
    (patch: Partial<ListValues<S>>) => {
      // 연달아 눌러도 앞선 변경을 잃지 않게 렌더 시점 값이 아니라 지금 주소에서 고친다
      const next = patchListParams(window.location.search, schema, patch);
      if (next === window.location.search.slice(1)) return;
      window.history.replaceState(null, "", next ? `?${next}` : window.location.pathname);
    },
    [schema]
  );

  return {
    current: readListParams(search, schema),
    shown: readListParams(shownSearch, schema),
    dim: search !== shownSearch,
    set,
  };
}

/** 상세의 "목록으로" 링크가 쓴다. 마지막으로 보던 필터와 페이지가 붙은 목록 주소를 돌려준다. */
export function rememberedListHref(href: string) {
  const search = load(LIST_KEY + href);
  return search ? `${href}?${search}` : href;
}

/**
 * 표 상자의 스크롤 위치를 목록 주소별로 기억해 돌아왔을 때 되살린다.
 * 표는 페이지가 아니라 안쪽 상자가 스크롤해서 브라우저가 대신 복원해 주지 않는다.
 */
export function useListScroll() {
  return useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const key = () => SCROLL_KEY + window.location.pathname + window.location.search;
    el.scrollTop = Number(load(key())) || 0;
    const onScroll = () => save(key(), el.scrollTop ? String(Math.round(el.scrollTop)) : "");
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
}

/**
 * 없는 페이지를 보고 있으면 마지막 페이지로 옮긴다. 마지막 줄을 처리해 페이지가 사라졌거나, 주소가 오래됐을 때다.
 * 그대로 두면 "아직 없어요" 빈 화면이 떠서 데이터가 없는 것처럼 보인다. 옮기는 중이면 true 를 돌려준다.
 */
export function useClampPage(
  { page, totalPages }: { page: number; totalPages: number },
  onPage: (p: number) => void
) {
  const over = page > 0 && page >= totalPages;
  useEffect(() => {
    if (over) onPage(Math.max(totalPages - 1, 0));
  }, [over, totalPages, onPage]);
  return over;
}
