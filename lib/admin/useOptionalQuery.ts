"use client";

import { useEffect, useRef, useState } from "react";
import { fetchQuery, useRelayEnvironment } from "react-relay";
import type { GraphQLTaggedNode, OperationType } from "relay-runtime";
import { isFieldNotDeployed } from "@/lib/admin/notDeployed";

export type OptionalStatus = "loading" | "ready" | "not-deployed" | "error";

// 받은 값이 아직 덜 찼을 때 다시 묻는 간격과 횟수. 동네 이름은 백엔드가 3초 안에 못 찾으면 비워 보내고 뒤에서 마저 찾는다
const RETRY_MS = 8_000;
const MAX_RETRIES = 3;

/**
 * 운영 서버에 아직 없을 수 있는 필드를 본 쿼리와 따로 읽는다 (#315, 유저 상세의 게임 기록과 같은 방식).
 *
 * 한 쿼리에 넣으면 필드 하나가 없어도 스키마 검사에서 쿼리 전체가 거절돼 화면이 통째로 안 열린다.
 * 따로 읽으면 백엔드가 나가기 전에도 화면은 그대로 열리고, 나간 뒤에는 다음 refreshKey 차례에 값이 채워진다.
 *
 * - 배포 전(field 가 없다는 스키마 오류)이면 "not-deployed", 다른 실패면 "error". 둘 다 화면을 깨지 않는다
 * - 다시 읽는 동안과 실패한 뒤에도 마지막으로 받은 값을 그대로 둔다(깜빡이지 않게)
 * - retryWhile 이 참이면 조금 뒤 몇 번 더 묻는다(아직 찾는 중인 값)
 */
export function useOptionalQuery<Q extends OperationType>(
  query: GraphQLTaggedNode,
  variables: Q["variables"],
  field: string,
  refreshKey = 0,
  options: { retryWhile?: (data: Q["response"]) => boolean } = {},
): { data: Q["response"] | null; status: OptionalStatus } {
  const environment = useRelayEnvironment();
  const [state, setState] = useState<{ data: Q["response"] | null; status: OptionalStatus }>({ data: null, status: "loading" });
  const [retry, setRetry] = useState({ key: "", count: 0 });
  // 부르는 쪽이 매번 새 객체와 함수를 넘겨도 값이 같으면 다시 읽지 않는다
  const varsKey = JSON.stringify(variables);
  const retryWhile = useRef(options.retryWhile);
  useEffect(() => {
    retryWhile.current = options.retryWhile;
  });

  // 다른 대상이나 새 차례로 바뀌면 다시 묻기 횟수를 처음부터 센다
  const turn = `${varsKey}|${refreshKey}`;
  const retries = retry.key === turn ? retry.count : 0;

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    fetchQuery<Q>(environment, query, JSON.parse(varsKey), { fetchPolicy: "network-only" })
      .toPromise()
      .then((data) => {
        if (!active) return;
        setState({ data: data ?? null, status: "ready" });
        if (data && retries < MAX_RETRIES && retryWhile.current?.(data)) {
          timer = window.setTimeout(() => setRetry({ key: turn, count: retries + 1 }), RETRY_MS);
        }
      })
      .catch((error: Error) => {
        if (!active) return;
        const status: OptionalStatus = isFieldNotDeployed(error.message, field) ? "not-deployed" : "error";
        setState((prev) => ({ data: prev.data, status: prev.data ? prev.status : status }));
      });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [environment, query, varsKey, field, turn, retries]);

  return state;
}
