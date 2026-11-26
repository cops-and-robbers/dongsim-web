"use client";

import { useEffect, useState } from "react";
import { fetchQuery, useRelayEnvironment } from "react-relay";
import type { AdminPendingCounts } from "@/__generated__/AdminPendingCounts.graphql";
import { AdminPendingCountsQuery } from "@/lib/admin/gql/AdminPendingCounts";
import { fetchWaitingCount } from "@/lib/admin/reviewsClient";

const CHANGED_EVENT = "admin-pending-changed";
const VISIBLE_MS = 30_000;
const HIDDEN_MS = 5 * 60_000;

/** 신고나 버그, 리뷰를 처리한 뒤 불러 메뉴 숫자를 바로 맞춘다. */
export const refreshPendingCounts = () => window.dispatchEvent(new Event(CHANGED_EVENT));

type Counts = { reports: number; bugs: number; reviews: number };
type Environment = ReturnType<typeof useRelayEnvironment>;

/*
  메뉴(AdminShell)와 개요 화면이 같은 숫자를 쓴다. 예전에는 둘이 따로 30초마다 물어서 개요에 있으면
  같은 요청이 두 번씩 나갔다(#335). 그래서 화면에 몇 군데가 쓰든 한 곳에서만 묻고 숫자를 나눠 준다.
  쓰는 곳이 하나라도 있으면 돌고, 다 사라지면 멈춘다.
*/
let latest: { reports: number; bugs: number } | null = null;
let latestReviews: number | null = null;
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;
let startedWith: Environment | null = null;

const snapshot = (): Counts | null =>
  // 한쪽만 읽혀도 읽힌 숫자는 보여 준다
  latest === null && latestReviews === null ? null : { reports: latest?.reports ?? 0, bugs: latest?.bugs ?? 0, reviews: latestReviews ?? 0 };

const notify = () => listeners.forEach((l) => l());

function start(environment: Environment): () => void {
  let active = true;
  let readAt = 0;
  const read = () => {
    readAt = Date.now();
    fetchQuery<AdminPendingCounts>(environment, AdminPendingCountsQuery, {}, { fetchPolicy: "network-only" })
      .toPromise()
      .then((data) => {
        if (active && data) {
          latest = { reports: data.adminAllReports.totalElements, bugs: data.adminBugReports.totalElements };
          notify();
        }
      })
      .catch(() => {});
    // 리뷰는 우리 서버가 세어서 따로 읽는다. 실패하면 마지막 숫자를 그대로 둔다
    fetchWaitingCount()
      .then((n) => {
        if (active) {
          latestReviews = n;
          notify();
        }
      })
      .catch(() => {});
  };
  const tick = () => {
    if (document.visibilityState === "visible" || Date.now() - readAt >= HIDDEN_MS) read();
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") read();
  };

  read();
  const timer = window.setInterval(tick, VISIBLE_MS);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener(CHANGED_EVENT, read);
  return () => {
    active = false;
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener(CHANGED_EVENT, read);
  };
}

/**
 * 메뉴와 탭 제목에 띄울 미처리 건수. 처음 읽기 전에는 null 이다.
 *
 * 메뉴가 깨지면 안 되니 Suspense 를 쓰지 않고 뒤에서 읽고, 실패하면 마지막 숫자를 그대로 둔다.
 * 탭 제목은 다른 탭에 있을 때 보려고 넣은 것이라 숨어 있어도 멈추지 않고 드물게 읽는다.
 */
export function usePendingCounts(): Counts | null {
  const environment = useRelayEnvironment();
  const [counts, setCounts] = useState<Counts | null>(snapshot);

  useEffect(() => {
    const listener = () => setCounts(snapshot());
    listeners.add(listener);
    // 다시 로그인해 Relay 환경이 바뀌었으면 새 환경으로 다시 묻는다
    if (stop && startedWith !== environment) {
      stop();
      stop = null;
    }
    if (!stop) {
      stop = start(environment);
      startedWith = environment;
    }
    listener();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && stop) {
        stop();
        stop = null;
        startedWith = null;
      }
    };
  }, [environment]);

  return counts;
}
