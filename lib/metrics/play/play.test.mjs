// Google Play 수집의 파싱 테스트 (#147). 실행: pnpm test
// 머리줄과 파일 이름은 실제 버킷 파일(2026-10-07)을 옮겼고, 숫자는 만든 값이다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { decodePlayFile, monthBounds, parsePlayCsv, parsePlayName, splitCsvLine } from "./parse.ts";
import { bucketFromUri, monthsToFetch } from "./run.ts";

const PKG = "com.elipair.copsandrobbers";
const INSTALLS_HEAD =
  "Date,Package name,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,Daily User Installs,Daily User Uninstalls,Active Device Installs,Install events,Update events,Uninstall events";

/** 실제 파일처럼 UTF-16LE + BOM 으로 만든다 */
const utf16 = (text) => new Uint8Array([0xff, 0xfe, ...Buffer.from(text, "utf16le")]);

test("파일 글자: UTF-16 BOM 을 읽고 BOM 글자를 지운다", () => {
  assert.equal(decodePlayFile(utf16("Date,X\n")), "Date,X\n");
  assert.equal(decodePlayFile(new TextEncoder().encode("Date,X\n")), "Date,X\n");
});

test("설치 overview: 받는 지표만, 0 도 남겨 '받았는데 0'을 표시한다", () => {
  const text = [INSTALLS_HEAD, `2026-09-18,${PKG},20,0,3,0,19,2,121,21,5,2`, `2026-09-20,${PKG},0,0,0,0,0,0,121,0,0,0`].join("\r\n");
  const rows = parsePlayCsv(text, "installs", "overview");
  const of = (day, metric) => rows.find((r) => r.day === day && r.metric === metric)?.value;
  assert.equal(of("2026-09-18", "user_installs"), 19);
  assert.equal(of("2026-09-18", "install_events"), 21);
  assert.equal(of("2026-09-18", "user_uninstalls"), 2);
  assert.equal(of("2026-09-18", "active_devices"), 121);
  assert.equal(of("2026-09-20", "user_installs"), 0, "overview 는 0 도 남긴다");
  // 늘 0 인 옛 지표는 받지 않는다
  assert.ok(!rows.some((r) => r.metric === "Daily Device Uninstalls" || r.metric === "total_user_installs"));
  assert.ok(rows.every((r) => r.key === ""));
});

test("나라 축: 0 은 버리고 나라 코드가 key", () => {
  const head = INSTALLS_HEAD.replace("Package name,", "Package name,Country,");
  const text = [head, `2026-09-19,${PKG},KR,10,0,0,0,10,1,90,10,0,1`, `2026-09-19,${PKG},JP,0,0,0,0,0,0,3,0,0,0`].join("\n");
  const rows = parsePlayCsv(text, "installs", "country");
  assert.deepEqual(
    rows.filter((r) => r.metric === "user_installs").map((r) => [r.key, r.value]),
    [["KR", 10]],
  );
  assert.equal(rows.find((r) => r.key === "JP" && r.metric === "active_devices")?.value, 3);
});

test("스토어 유입 경로: 네 칸을 | 로 잇고, 따옴표 안 쉼표를 읽는다", () => {
  const head = "Date,Package name,Traffic source,Search term,UTM source,UTM campaign,Store listing acquisitions,Store listing visitors,Store listing conversion rate";
  const text = [head, `2026-08-03,${PKG},Google Play search,"경도, 게임",Other,Other,2,9,0.22`].join("\n");
  const rows = parsePlayCsv(text, "store", "traffic_source");
  assert.equal(rows.find((r) => r.metric === "visitors")?.key, "Google Play search|경도, 게임|Other|Other");
  assert.equal(rows.find((r) => r.metric === "acquisitions")?.value, 2);
  // 전환율 칸은 받지 않고 화면이 나눠 낸다(합칠 때 평균을 내면 틀린다)
  assert.ok(!rows.some((r) => r.metric.includes("conversion")));
  assert.deepEqual(splitCsvLine('a,"b ""c""",d'), ["a", 'b "c"', "d"]);
});

test("평점: 하루 평균 0.0 은 '그날 평점 없음'이라 버린다", () => {
  const text = ["Date,Package Name,Daily Average Rating,Total Average Rating", `2026-09-01,${PKG},0.0,5.0`, `2026-09-02,${PKG},4.0,4.9`].join("\n");
  const rows = parsePlayCsv(text, "ratings", "overview");
  assert.deepEqual(
    rows.map((r) => [r.day, r.metric, r.value]),
    [
      ["2026-09-01", "rating_total", 5],
      ["2026-09-02", "rating_daily", 4],
      ["2026-09-02", "rating_total", 4.9],
    ],
  );
});

test("Date 열이 없으면 조용히 넘기지 않고 오류", () => {
  assert.throws(() => parsePlayCsv("Day,X\n2026-09-01,1", "installs", "overview"), /Date 열/);
});

test("파일 이름: 우리 패키지와 받는 축만", () => {
  assert.deepEqual(parsePlayName(`stats/installs/installs_${PKG}_202609_overview.csv`, PKG), { report: "installs", month: "2026-09", dim: "overview" });
  assert.deepEqual(parsePlayName(`stats/store_performance/store_performance_${PKG}_202608_traffic_source.csv`, PKG), {
    report: "store",
    month: "2026-08",
    dim: "traffic_source",
  });
  // total_store_performance, 다른 앱, 받지 않는 축(기기, 버전)은 거른다
  assert.equal(parsePlayName(`stats/store_performance/total_store_performance_${PKG}_202608_country.csv`, PKG), null);
  assert.equal(parsePlayName("stats/installs/installs_com.elipair.rulebook_202609_overview.csv", PKG), null);
  assert.equal(parsePlayName(`stats/installs/installs_${PKG}_202609_device.csv`, PKG), null);
  assert.equal(parsePlayName(`stats/installs/installs_${PKG}_202609_app_version.csv`, PKG), null);
});

test("받을 달: 기본은 지난달과 이번 달, 해 넘김", () => {
  assert.deepEqual(monthsToFetch("2026-10-07"), ["2026-09", "2026-10"]);
  assert.deepEqual(monthsToFetch("2027-01-02"), ["2026-12", "2027-01"]);
  assert.deepEqual(monthsToFetch("2026-10-07", "2026-08-15"), ["2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(monthBounds("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
});

test("버킷 주소: 이름만 꺼내고 이상한 값은 막는다", () => {
  assert.equal(bucketFromUri("gs://pubsite_prod_rev_123/"), "pubsite_prod_rev_123");
  assert.throws(() => bucketFromUri("gs://other-bucket"), /형식/);
});

test("Android 출시: 프로덕션 트랙의 버전 이름과 코드, 단계적 출시면 큰 코드", async () => {
  const { productionRelease } = await import("./releases.ts");
  // 실제 응답 모양(2026-10-07)
  const opts = {
    tracks: [
      { displayName: "production", type: "Production", servingReleases: [{ displayName: "365 (3.1.24)", versionCodes: ["365"] }] },
      { displayName: "internal", type: "Internal", servingReleases: [{ displayName: " 72 (1.1.30)", versionCodes: ["72"] }] },
    ],
  };
  assert.deepEqual(productionRelease(opts), { code: "365", name: "3.1.24" });
  const staged = { tracks: [{ displayName: "production", servingReleases: [{ displayName: "365 (3.1.24)", versionCodes: ["365"] }, { displayName: "370 (3.1.25)", versionCodes: ["370"] }] }] };
  assert.deepEqual(productionRelease(staged), { code: "370", name: "3.1.25" });
  assert.equal(productionRelease({ tracks: [{ displayName: "production" }] }), null);
});

test("Android 출시: 처음 본 버전은 기록만, 그 뒤 바뀐 버전은 전날로 일정에", async () => {
  const { releaseToRecord } = await import("./releases.ts");
  const v = { code: "365", name: "3.1.24" };
  assert.deepEqual(releaseToRecord([], v, "2026-10-08"), { record: { ...v, day: "2026-10-07" }, event: null });
  assert.deepEqual(releaseToRecord(["365"], v, "2026-10-08"), { record: null, event: null });
  const next = { code: "370", name: "3.1.25" };
  assert.deepEqual(releaseToRecord(["365"], next, "2026-10-20"), { record: { ...next, day: "2026-10-19" }, event: { day: "2026-10-19", label: "Android 3.1.25 출시" } });
});
