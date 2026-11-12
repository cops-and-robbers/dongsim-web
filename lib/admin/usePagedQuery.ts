"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Page<T> = { content: readonly T[]; totalElements: number; totalPages: number };

/**
 * 쪽을 이어 붙이는 목록 (#315). 두 칸 화면의 목록은 쪽 번호 대신 끝에 닿으면 다음 쪽을 붙인다.
 *
 * - key 가 바뀌면(검색어, 정렬, 거르기) 처음부터 다시 읽는다. 그동안 있던 줄은 흐리게 그대로 둔다
 * - refreshKey 가 바뀌면 첫 쪽만 다시 읽어 앞에 새로 생긴 줄을 붙인다(게임 목록처럼 계속 늘어나는 목록)
 * - 같은 id 는 한 번만 담는다. 새 줄이 앞에 끼면 다음 쪽 첫 줄이 이미 본 줄일 수 있어서다
 * - 실패해도 있던 줄은 지우지 않는다
 */
export function usePagedQuery<T extends { readonly id: string }>(
  key: string,
  fetchPage: (page: number) => Promise<Page<T>>,
  refreshKey = 0,
) {
  const [state, setState] = useState<{ key: string; items: T[]; total: number; pages: number; loaded: number; loading: boolean; failed: boolean; first: boolean }>({
    key,
    items: [],
    total: 0,
    pages: 0,
    loaded: 0,
    loading: true,
    failed: false,
    first: true,
  });
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  // 조건이 바뀌면 처음부터
  useEffect(() => {
    let alive = true;
    // 읽는 동안은 state.key 가 옛 조건이라 stale 로 보인다(있던 줄을 흐리게)
    fetchRef.current(0).then(
      (p) => alive && setState({ key, items: [...p.content], total: p.totalElements, pages: p.totalPages, loaded: 1, loading: false, failed: false, first: false }),
      () => alive && setState((s) => ({ ...s, key, loading: false, failed: true, first: false, items: s.key === key ? s.items : [] })),
    );
    return () => {
      alive = false;
    };
  }, [key]);

  // 새로 고칠 때는 첫 쪽만. 앞에 새 줄이 생겼으면 붙이고, 있던 줄은 새 값으로 바꾼다
  useEffect(() => {
    if (refreshKey === 0) return;
    let alive = true;
    fetchRef.current(0).then(
      (p) =>
        alive &&
        setState((s) => {
          if (s.key !== key) return s;
          const fresh = new Map(p.content.map((x) => [x.id, x]));
          const rest = s.items.filter((x) => !fresh.has(x.id)).map((x) => x);
          return { ...s, items: [...p.content, ...rest], total: p.totalElements, pages: p.totalPages, failed: false };
        }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [refreshKey, key]);

  const busy = useRef(false);
  const more = useCallback(() => {
    if (busy.current) return;
    const s = state;
    if (s.key !== key || s.loaded >= s.pages) return;
    busy.current = true;
    setState((x) => ({ ...x, loading: true, failed: false }));
    fetchRef.current(s.loaded).then(
      (p) => {
        busy.current = false;
        setState((x) => {
          if (x.key !== key) return x;
          const seen = new Set(x.items.map((i) => i.id));
          return { ...x, items: [...x.items, ...p.content.filter((i) => !seen.has(i.id))], total: p.totalElements, pages: p.totalPages, loaded: x.loaded + 1, loading: false };
        });
      },
      () => {
        busy.current = false;
        setState((x) => ({ ...x, loading: false, failed: true }));
      },
    );
  }, [state, key]);

  const stale = state.key !== key;
  return {
    items: state.items,
    total: state.total,
    /** 처음 불러오는 중(보여 줄 줄이 아직 없음) */
    initial: state.first || (stale && state.items.length === 0),
    /** 조건을 바꿔 다시 읽는 중. 있던 줄을 흐리게 */
    stale: stale || (state.loading && state.loaded === 0 && !state.first),
    loadingMore: state.loading && state.loaded > 0 && !stale,
    failed: state.failed,
    hasMore: !stale && state.loaded < state.pages,
    more,
  };
}
