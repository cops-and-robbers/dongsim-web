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

const line = (t) => (t.ok ? `${t.platform}: 나가 있음 ${t.live?.version ?? "-"} (${t.live?.build ?? "-"}) · 진행 ${t.inflight ? t.inflight.version || `빌드 ${t.inflight.build}` : "없음"}\n  ${t.steps.map((s, i) => `${i === t.current ? "▶" : " "}${s.key}=${s.state}[${s.tone}]${s.detail ? ` (${s.detail})` : ""}`).join("\n  ")}` : `${t.platform}: 못 읽음 - ${t.error}`);
console.log(line(b.ios));
console.log(line(b.android));
console.log(`다음 할 일 [${b.next.tone}] ${b.next.title}${b.next.reason ? ` / ${b.next.reason}` : ""}${b.next.action ? ` → ${b.next.action.label}` : ""}`);
for (const n of b.notes) console.log(`  · [${n.tone}] ${n.title}${n.reason ? ` / ${n.reason}` : ""}`);
console.log(`나라별: ${b.reach ? b.reach.countries.map((c) => `${c.label} ${c.version ?? "없음"}`).join(", ") + (b.reach.euBlocked ? " · EU 판매 막힘" : "") : "조회 실패"}`);
