// 지표 수집을 손으로 한 번 돌린다 (#142, #143, #147). 라우트와 같은 함수를 쓴다.
//
//   node --env-file=.env.local scripts/metrics-collect.mjs appstore            최근 7일
//   node --env-file=.env.local scripts/metrics-collect.mjs ga4 --from all      처음부터 전부
//   node --env-file=.env.local scripts/metrics-collect.mjs admob --dry         저장하지 않고 세기만
//   node --env-file=.env.local scripts/metrics-collect.mjs appstore --from 2026-04-01
//   node --env-file=.env.local scripts/metrics-collect.mjs play --from all       Play 파일 2026-03 부터
//
// 처음 채울 때(--from)는 Vercel 300초 한도에 걸리지 않게 이 스크립트로 돌린다.
// Node 22.18 이상이 필요하다 (.ts 파일을 그대로 실행하는 타입 지우기).
// 필요한 환경변수는 docs/metrics-collection.md 에 있다.
import { runAdmob } from "../lib/metrics/admob/run.ts";
import { runAppStore } from "../lib/metrics/appstore/run.ts";
import { runGa4 } from "../lib/metrics/ga4/run.ts";
import { runPlay } from "../lib/metrics/play/run.ts";

const [source, ...args] = process.argv.slice(2);
const dry = args.includes("--dry");
const fromIndex = args.indexOf("--from");
const from = fromIndex >= 0 ? args[fromIndex + 1] : undefined;

const runners = {
  appstore: () => runAppStore({ dry, from: from === "all" ? "2026-04-01" : from }),
  ga4: () => runGa4({ dry, from }),
  admob: () => runAdmob({ dry, from }),
  // Play 는 달마다 파일이라 --from 은 그 달부터, all 은 2026-03 부터
  play: () => runPlay({ dry, from }),
};
if (!(source in runners)) {
  console.error(`사용법: metrics-collect.mjs <${Object.keys(runners).join(" | ")}> [--from YYYY-MM-DD | all] [--dry]`);
  process.exit(2);
}
const result = await runners[source]();
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ok ? 0 : 1;
