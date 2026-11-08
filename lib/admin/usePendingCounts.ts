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

/**
 * 메뉴와 탭 제목에 띄울 미처리 건수. 처음 읽기 전에는 null 이다.
 *
 * 메뉴가 깨지면 안 되니 Suspense 를 쓰지 않고 뒤에서 읽고, 실패하면 마지막 숫자를 그대로 둔다.
 * 탭 제목은 다른 탭에 있을 때 보려고 넣은 것이라 숨어 있어도 멈추지 않고 드물게 읽는다.
 */
export function usePendingCounts() {
  const environment = useRelayEnvironment();
  const [counts, setCounts] = useState<{ reports: number; bugs: number } | null>(null);
  const [reviews, setReviews] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let readAt = 0;
    const read = () => {
      readAt = Date.now();
      fetchQuery<AdminPendingCounts>(environment, AdminPendingCountsQuery, {}, { fetchPolicy: "network-only" })
        .toPromise()
        .then((data) => {
          if (active && data) {
            setCounts({
              reports: data.adminAllReports.totalElements,
              bugs: data.adminBugReports.totalElements,
            });
          }
        })
        .catch(() => {});
      // 리뷰는 우리 서버가 세어서 따로 읽는다. 실패하면 마지막 숫자를 그대로 둔다
      fetchWaitingCount()
        .then((n) => active && setReviews(n))
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
  }, [environment]);

  // 한쪽만 읽혀도 읽힌 숫자는 보여 준다
  return counts === null && reviews === null ? null : { reports: counts?.reports ?? 0, bugs: counts?.bugs ?? 0, reviews: reviews ?? 0 };
}
