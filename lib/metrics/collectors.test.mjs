// App Store, GA4, AdMob 수집의 파싱 테스트 (#142, #143). 실행: pnpm test
// 머리줄과 응답 모양은 실제 API 응답(2026-10-06)을 옮겼고, 숫자는 만든 값이다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { dimsKey, mergeRows, parseAnalyticsTsv, shouldReplace } from "./appstore/analytics.ts";
import { fetchSalesDay, parseSalesTsv } from "./appstore/sales.ts";
import { toRows as admobRows } from "./admob/run.ts";
import { QUERIES, toRows as ga4Rows } from "./ga4/run.ts";
import { addDays, compactToYmd, usToYmd, ymdRange } from "./dates.ts";

const SALES_HEAD =
  "Provider\tProvider Country\tSKU\tDeveloper\tTitle\tVersion\tProduct Type Identifier\tUnits\tDeveloper Proceeds\tBegin Date\tEnd Date\tCustomer Currency\tCountry Code\tCurrency of Proceeds\tApple Identifier\tCustomer Price\tPromo Code\tParent Identifier\tSubscription\tPeriod\tCategory\tCMB\tDevice\tSupported Platforms\tProceeds Reason\tPreserved Pricing\tClient\tOrder Type";
function salesLine({ type, units, country, device = "iPhone", apple = "6756843948", day = "10/03/2026" }) {
  const c = SALES_HEAD.split("\t").map(() => "");
  const set = (name, v) => (c[SALES_HEAD.split("\t").indexOf(name)] = v);
  set("Product Type Identifier", type);
  set("Units", String(units));
  set("Begin Date", day);
  set("End Date", day);
  set("Country Code", country);
  set("Apple Identifier", apple);
  set("Device", device);
  return c.join("\t");
}

test("판매 리포트: 우리 앱만, 같은 칸은 더한다", () => {
  const text = [
    SALES_HEAD,
    salesLine({ type: "1F", units: 5, country: "JP" }),
    salesLine({ type: "1F", units: 3, country: "JP" }), // 같은 칸이 두 줄이면 더한다
    salesLine({ type: "7F", units: 2, country: "KR", device: "iPad" }),
    salesLine({ type: "1F", units: 9, country: "US", apple: "9999999999" }), // 다른 앱
  ].join("\r\n");
  assert.deepEqual(parseSalesTsv(text, "6756843948"), [
    { day: "2026-10-03", country: "JP", productType: "1F", device: "iPhone", units: 8 },
    { day: "2026-10-03", country: "KR", productType: "7F", device: "iPad", units: 2 },
  ]);
});

test("판매 리포트: 열이 바뀌면 조용히 틀리지 않고 멈춘다", () => {
  assert.throws(() => parseSalesTsv("Provider\tUnits\nAPPLE\t1", "6756843948"), /Apple Identifier/);
});

test("분석 리포트: 머리줄로 열을 읽고, 숫자 외의 열은 dims 로", () => {
  const text = [
    "Date\tApp Name\tApp Apple Identifier\tEvent\tPage Type\tSource Type\tTerritory\tCounts\tUnique Counts",
    "2026-10-05\t경찰과 도둑\t6756843948\tImpression\tProduct page\tApp Store search\tKR\t120\t80",
    "2026-10-05\t경찰과 도둑\t6756843948\tPage view\tProduct page\tApp Store search\tKR\t30\t25",
  ].join("\n");
  const rows = parseAnalyticsTsv(text);
  assert.deepEqual(rows[0], {
    day: "2026-10-05",
    dims: { Event: "Impression", "Page Type": "Product page", "Source Type": "App Store search", Territory: "KR" },
    counts: 120,
    uniqueCounts: 80,
  });
  assert.equal(rows.length, 2);
});

test("분석 리포트: 세그먼트가 나뉘어 같은 칸이 두 번 나오면 더한다, dims 순서는 키에 영향이 없다", () => {
  const a = { day: "2026-10-05", dims: { Event: "Impression", Territory: "KR" }, counts: 10, uniqueCounts: 7 };
  const b = { day: "2026-10-05", dims: { Territory: "KR", Event: "Impression" }, counts: 5, uniqueCounts: null };
  assert.equal(dimsKey(a.dims), dimsKey(b.dims));
  assert.deepEqual(mergeRows([a, b]), [{ ...a, counts: 15, uniqueCounts: 7 }]);
});

test("분석 리포트: Date 열이 없으면 멈춘다", () => {
  assert.throws(() => parseAnalyticsTsv("Day\tCounts\n2026-10-05\t1"), /Date 열/);
});

test("분석 리포트: 같은 날짜는 더 최근에 처리된 파일로만 바꾼다", () => {
  assert.equal(shouldReplace(null, "2026-10-06"), true);
  assert.equal(shouldReplace("2026-10-06", "2026-10-07"), true);
  assert.equal(shouldReplace("2026-10-07", "2026-10-06"), false);
  assert.equal(shouldReplace("2026-10-07", "2026-10-07"), false);
});

test("GA4: 첫 축 date 를 날짜로, 나머지 축을 key 로 펴고 0 은 버린다", () => {
  const q = QUERIES.web.find((x) => x.breakdown === "session_campaign");
  const rows = ga4Rows("web", q, {
    rows: [
      {
        dimensionValues: [{ value: "20261006" }, { value: "instagram" }, { value: "bio" }, { value: "always" }, { value: "download" }],
        metricValues: [{ value: "2" }, { value: "0" }],
      },
    ],
  });
  assert.deepEqual(rows, [
    { property: "web", day: "2026-10-06", breakdown: "session_campaign", key: "instagram|bio|always|download", metric: "sessions", value: 2 },
  ]);
});

test("GA4: 축 없는 total 은 key 가 빈 문자열", () => {
  const q = QUERIES.web.find((x) => x.breakdown === "total");
  const rows = ga4Rows("web", q, { rows: [{ dimensionValues: [{ value: "20260401" }], metricValues: [{ value: "12" }, { value: "10" }, { value: "20" }] }] });
  assert.deepEqual(rows.map((r) => [r.key, r.metric, r.value]), [["", "activeUsers", 12], ["", "newUsers", 10], ["", "sessions", 20]]);
});

test("AdMob: 머리와 꼬리를 빼고 줄만, 수익은 마이크로 단위 그대로", () => {
  const stream = [
    { header: { dateRange: {}, localizationSettings: { currencyCode: "USD" } } },
    {
      row: {
        dimensionValues: { DATE: { value: "20261003" }, PLATFORM: { value: "iOS" }, FORMAT: { value: "Interstitial" }, COUNTRY: { value: "KR" } },
        metricValues: {
          ESTIMATED_EARNINGS: { microsValue: "230000" },
          AD_REQUESTS: { integerValue: "61" },
          MATCHED_REQUESTS: { integerValue: "61" },
          IMPRESSIONS: { integerValue: "25" },
          CLICKS: { integerValue: "2" },
        },
      },
    },
    { footer: { matchingRowCount: "1" } },
  ];
  assert.deepEqual(admobRows(stream), [
    { day: "2026-10-03", platform: "iOS", format: "Interstitial", country: "KR", earningsMicros: 230000, adRequests: 61, matchedRequests: 61, impressions: 25, clicks: 2 },
  ]);
});

test("날짜 도우미", () => {
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.deepEqual(ymdRange("2026-09-29", "2026-10-01"), ["2026-09-29", "2026-09-30", "2026-10-01"]);
  assert.equal(compactToYmd("20261006"), "2026-10-06");
  assert.equal(usToYmd("9/3/2026"), "2026-09-03");
});

test("수집 모듈을 모두 node 로 불러올 수 있다", async () => {
  for (const p of ["./appstore/run.ts", "./ga4/run.ts", "./admob/run.ts", "./google.ts", "./db.ts", "./cron.ts", "./config.ts"]) {
    const mod = await import(p);
    assert.ok(Object.keys(mod).length > 0, p);
  }
});

test("판매 리포트 404 는 '판매 없음'일 때만 0건으로 본다", async () => {
  const real = globalThis.fetch;
  const reply = (detail) => async () => new Response(JSON.stringify({ errors: [{ status: "404", detail }] }), { status: 404 });
  try {
    globalThis.fetch = reply("There were no sales for the date specified.");
    assert.deepEqual(await fetchSalesDay("t", "1", "2026-10-01", "6756843948"), []);
    globalThis.fetch = reply("The report you requested is not available yet. Try again later.");
    await assert.rejects(fetchSalesDay("t", "1", "2026-10-05", "6756843948"), /아직 없어요/);
  } finally {
    globalThis.fetch = real;
  }
});
