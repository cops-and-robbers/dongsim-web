// Relay Environment. 네트워크 계층은 오퍼레이션별로 목/실서버를 골라 POST 한다.
// - BE 스펙에 있는 유저·게임 쿼리는 dev 실서버(/graphql)로.
// - 아직 BE에 없는 대시보드·신고·버그는 MSW 목(/graphql 상대경로)으로.
// accessToken이 있으면 Bearer로 실어 보내고, 401이면 한 번 재발급 후 재시도한다.
import {
  Environment,
  Network,
  RecordSource,
  Store,
  type FetchFunction,
} from "relay-runtime";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const USE_DEV =
  process.env.NEXT_PUBLIC_USE_DEV_GRAPHQL === "true" && API_BASE !== "";
const REAL_GRAPHQL = `${API_BASE}/graphql`;
const MOCK_ENDPOINT = "/graphql"; // MSW가 가로채는 상대경로

// 아직 실서버(dev)에 배포되지 않은 오퍼레이션만 목으로 강제한다.
// (대시보드·신고·버그는 BE PR #141 dev 배포로 실데이터에 붙어 현재 비어 있음.
//  아직 안 붙은 오퍼레이션이 생기면 여기에 이름을 추가하면 그 쿼리만 목으로 간다.)
const MOCK_ONLY = new Set<string>([
  // BE PR #151(adminGameHistories) 배포되면 이 줄만 빼면 실데이터로 붙는다.
  "AdminGameHistories",
]);

function endpointFor(operationName?: string | null): string {
  if (USE_DEV && operationName && !MOCK_ONLY.has(operationName)) {
    return REAL_GRAPHQL;
  }
  return MOCK_ENDPOINT;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const fetchFn: FetchFunction = async (request, variables) => {
  const endpoint = endpointFor(request.name);
  const body = JSON.stringify({
    query: request.text,
    variables,
    operationName: request.name,
  });
  const send = () =>
    fetch(endpoint, { method: "POST", headers: authHeaders(), body });

  let response = await send();
  // accessToken 만료(401)면 한 번 재발급 후 재시도. (목 서버는 401을 내지 않아 무해)
  if (response.status === 401 && (await reissue())) {
    response = await send();
  }
  return response.json();
};

export function createEnvironment(): Environment {
  return new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  });
}
