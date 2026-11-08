// 출시 보드가 실제 스토어에서 읽는 값을 그대로 찍는다(읽기만 한다). 화면이 콘솔과 같은 말을 하는지 대조할 때 쓴다.
// 실행: node --env-file=.env.local scripts/release-check.mjs   (ASC_ISSUER_ID, ASC_RELEASE_*, PLAY_RELEASE_SERVICE_ACCOUNT_JSON 필요)
//       --raw 를 붙이면 판단 전 값도 찍는다
import { buildBoard } from "../lib/release/board.ts";
import { readAndroid, readIos, readLookup } from "../lib/release/stores.ts";

const err = (e) => ({ error: e.message });
const now = new Date();
const [ios, android, lookup] = await Promise.all([readIos(now).catch(err), readAndroid().catch(err), readLookup()]);
if (process.argv.includes("--raw")) console.log(JSON.stringify({ ios, android, lookup }, null, 2));
const b = buildBoard({ now: now.toISOString(), ios, android, lookup, history: [] });

function print(t) {
  if (!t.ok) return console.log(`${t.platform}: 못 읽음 - ${t.error}`);
  const next = t.inflight ? t.inflight.version || `빌드 ${t.inflight.build}` : "없음";
  console.log(`${t.platform}: [${t.status.label}] 나가 있음 ${t.live?.version ?? "-"} (${t.live?.build ?? "-"}) · 진행 ${next}`);
  const a = t.action;
  console.log(`  할 수 있는 일: ${a ? `${a.title}${a.reason ? ` / ${a.reason}` : ""}${a.action ? ` → ${a.action.label}` : ""}` : "없음"}`);
  t.steps.forEach((s, i) => console.log(`  ${i === t.current ? "▶" : " "}${s.label}(${s.who}) = ${s.state ?? `(${s.hint ?? ""})`} [${s.tone}]`));
  if (t.queue) console.log(`  게시 대기열: ${[t.queue.release, ...t.queue.listing].filter(Boolean).join(", ") || "비어 있음"}`);
}

print(b.ios);
print(b.android);
console.log(`가장 먼저 [${b.next.tone}] ${b.next.title}`);
for (const n of b.notes) console.log(`  · ${n.title}`);
console.log(`나라별: ${b.reach ? b.reach.countries.map((c) => `${c.label} ${c.version ?? "없음"}`).join(", ") + (b.reach.euBlocked ? " · EU 판매 막힘" : "") : "조회 실패"}`);
