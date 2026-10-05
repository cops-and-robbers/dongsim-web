// 인스타 수집을 손으로 한 번 돌린다 (#140). 라우트와 같은 함수를 쓴다.
//
//   node --env-file=.env.local scripts/instagram-report.mjs          미리보기 (디스코드로 보내지 않음)
//   node --env-file=.env.local scripts/instagram-report.mjs --send   실제로 보냄
//
// Node 22.18 이상이 필요하다 (.ts 파일을 그대로 실행하는 타입 지우기). 저장소의
// .nvmrc 는 20 이라 nvm 을 쓰면 이 스크립트를 돌릴 때만 22 로 바꾼다.
//
// 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// INSTAGRAM_ACCESS_TOKEN(처음 한 번), --send 일 때 DISCORD_INSTAGRAM_WEBHOOK_URL.
// 미리보기도 숫자는 Supabase 에 저장한다 (같은 날 다시 돌면 덮어쓴다).
import { runInstagramReport } from "../lib/metrics/instagram/run.ts";

const send = process.argv.includes("--send");
const result = await runInstagramReport({ dry: !send });

for (const n of result.notifications) {
  console.log(`\n===== ${n.kind} ${n.key} (${n.status}) =====\n${n.content}`);
  if (n.error) console.log(`오류: ${n.error}`);
}
const { notifications, ...summary } = result;
console.log(`\n${JSON.stringify({ ...summary, notifications: notifications.length }, null, 2)}`);
process.exitCode = result.ok ? 0 : 1;
