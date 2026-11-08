// 출시 조작을 실제 스토어에 미리 확인한다. Play 는 구글 검사(validate)까지만 하고 커밋하지 않는다(스토어에 영향 없음).
// App Store 는 미리 확인하는 길이 없어, 버전 칸에 바꾸는 값 없는 저장을 보내 쓰기 권한만 본다.
// 실행: node --env-file=.env.local scripts/release-dryrun.mjs
import { ascToken } from "../lib/metrics/appstore/auth.ts";
import { runAction } from "../lib/release/actions.ts";
import { androidOptions, iosOptions } from "../lib/release/options.ts";
import { readAndroid, readIos, releaseAscKey } from "../lib/release/stores.ts";

const ios = await readIos();
const iosOpts = iosOptions(ios);
console.log("iOS 지금 할 수 있는 조작:", iosOpts.map((o) => `${o.id}(${o.label})`).join(", ") || "없음");
const v = ios.versions[0];
const token = ascToken(new Date(), releaseAscKey());
const res = await fetch(`https://api.appstoreconnect.apple.com/v1/appStoreVersions/${v.id}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ data: { type: "appStoreVersions", id: v.id, attributes: {} } }),
});
console.log(`iOS 버전 칸(${v.version}) 쓰기 권한(바꾸는 값 없음):`, res.status);
const open = await fetch(`https://api.appstoreconnect.apple.com/v1/reviewSubmissions?filter[app]=6756843948&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW&limit=1`, { headers: { Authorization: `Bearer ${token}` } });
console.log("iOS 열린 제출 묶음 찾기:", open.status, ((await open.json()).data ?? []).length, "개");

const android = await readAndroid();
const andOpts = androidOptions(android);
console.log("Android 지금 할 수 있는 조작:", andOpts.map((o) => `${o.id}(${o.label})`).join(", ") || "없음");
for (const o of andOpts) {
  for (const fraction of o.id === "android.createRelease" ? [1, 0.2] : [undefined]) {
    try {
      const r = await runAction(o, { fraction }, true);
      console.log(`  ${o.id}${fraction !== undefined ? ` (${fraction * 100}%)` : ""} 미리 확인:`, r.message);
    } catch (e) {
      console.log(`  ${o.id}${fraction !== undefined ? ` (${fraction * 100}%)` : ""} 미리 확인 실패:`, e.message);
    }
  }
}
