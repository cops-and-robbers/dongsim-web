// 어드민 앱 설정 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareVersions,
  describeForHistory,
  diffAppConfig,
  formatMaintenanceEnd,
  appVersionOutcome,
  BANNER_SAFE,
  BANNER_SIZE,
  bannerImageUrl,
  checkBannerSize,
  versionSamples,
  isFutureEnd,
  isOurBannerUrl,
  kstToday,
  sniffImageType,
  storeWarning,
  mergeTemplate,
  parseMaintenanceEnd,
  presetMaintenanceEnd,
  readAppConfig,
  validateAppConfig,
  validateChanges,
  warningsFor,
} from "./appConfig.ts";

const VALUES = {
  maintenance: "false",
  maintenance_message: "",
  latest_version: "3.2.6",
  minimum_version: "3.2.1",
  force_update: "true",
  ads_enabled: "true",
  community_ads_enabled: "true",
  game_end_ads_enabled: "true",
  banner_enabled: "true",
  banner_image_url: "https://example.com/a.png",
  banner_link_url: "https://example.com",
};

test("템플릿에서 값을 읽고, 없는 값은 앱의 기본값으로 채운다", () => {
  const { values, conditioned } = readAppConfig({ parameters: { latest_version: { defaultValue: { value: "3.2.6" } } } });
  assert.equal(values.latest_version, "3.2.6");
  assert.equal(values.ads_enabled, "false");
  assert.equal(values.community_ads_enabled, "true");
  assert.deepEqual(conditioned, []);
});

test("불리언은 앱의 Flutter SDK 와 똑같이 읽는다", () => {
  const read = (v) => readAppConfig({ parameters: { maintenance: { defaultValue: { value: v } } } }).values.maintenance;
  for (const on of ["true", "TRUE", "True", "1"]) assert.equal(read(on), "true", on);
  for (const off of ["false", "0", "", "yes", "on", "ture", " true"]) assert.equal(read(off), "false", off);
});

test("불리언은 true, false 말고는 저장하지 않는다", () => {
  for (const bad of ["ture", "TRUE", "1", "yes", ""]) {
    assert.ok(validateChanges(VALUES, { ads_enabled: bad }).ads_enabled, bad);
  }
});

test("조건이 걸린 값을 알려 준다", () => {
  const { conditioned } = readAppConfig({ parameters: { ads_enabled: { defaultValue: { value: "true" }, conditionalValues: { iOS: { value: "false" } } } } });
  assert.deepEqual(conditioned, ["ads_enabled"]);
});

test("버전은 글자가 아니라 숫자로 비교한다", () => {
  assert.ok(compareVersions("3.10.0", "3.9.9") > 0);
  assert.ok(compareVersions("3.2.1", "3.2.6") < 0);
  assert.equal(compareVersions("3.2.1", "3.2.1"), 0);
});

test("지금 값은 오류가 없다", () => {
  assert.deepEqual(validateAppConfig(VALUES), {});
});

test("앱이 조용히 넘기는 틀린 버전을 막는다", () => {
  for (const v of ["3.2", "3.2.x", "v3.2.1", "3.2.1.0", " 3.2.1"]) {
    assert.ok(validateAppConfig({ ...VALUES, minimum_version: v }).minimum_version, v);
  }
});

test("최소 버전이 최신 버전보다 높으면 막는다", () => {
  assert.ok(validateAppConfig({ ...VALUES, minimum_version: "3.2.7" }).minimum_version);
  assert.deepEqual(validateAppConfig({ ...VALUES, minimum_version: "3.2.6" }), {});
});

test("배너는 이미지 없이 켤 수 없고 주소는 https 만 받는다", () => {
  assert.ok(validateAppConfig({ ...VALUES, banner_image_url: "" }).banner_image_url);
  assert.deepEqual(validateAppConfig({ ...VALUES, banner_image_url: "", banner_enabled: "false" }), {});
  assert.ok(validateAppConfig({ ...VALUES, banner_image_url: "http://example.com/a.png" }).banner_image_url);
  assert.ok(validateAppConfig({ ...VALUES, banner_link_url: "javascript:alert(1)" }).banner_link_url);
  assert.deepEqual(validateAppConfig({ ...VALUES, banner_link_url: "" }), {});
});

test("고친 묶음의 오류만 본다", () => {
  const broken = { ...VALUES, minimum_version: "옛날 값" };
  assert.deepEqual(validateChanges(broken, { ads_enabled: "false" }), {});
  assert.ok(validateChanges(broken, { latest_version: "3.2.7" }).minimum_version);
});

test("달라진 값만 남긴다", () => {
  assert.deepEqual(diffAppConfig(VALUES, { latest_version: "3.2.6", minimum_version: "3.2.2" }), { minimum_version: "3.2.2" });
});

test("강제 업데이트로 앱이 막히는 변경은 경고한다", () => {
  assert.equal(warningsFor(VALUES, { minimum_version: "3.2.2" }).length, 1);
  assert.equal(warningsFor(VALUES, { minimum_version: "3.2.0" }).length, 0);
  assert.equal(warningsFor(VALUES, { latest_version: "3.2.7" }).length, 0);
  const soft = { ...VALUES, force_update: "false" };
  assert.equal(warningsFor(soft, { minimum_version: "3.2.2" }).length, 0);
  assert.equal(warningsFor(soft, { force_update: "true" }).length, 1);
});

test("전체 광고를 끌 때만 경고한다", () => {
  assert.equal(warningsFor(VALUES, { ads_enabled: "false" }).length, 1);
  assert.equal(warningsFor({ ...VALUES, ads_enabled: "false" }, { ads_enabled: "true" }).length, 0);
});

test("합칠 때 고친 값만 바꾸고 나머지는 그대로 둔다", () => {
  const template = {
    conditions: [{ name: "iOS", expression: "device.os == 'ios'" }],
    parameters: {
      maintenance: { defaultValue: { value: "false" }, description: "서버 점검 모드", valueType: "BOOLEAN" },
      new_flag_from_console: { defaultValue: { value: "1" } },
    },
    version: { versionNumber: "92", updateUser: { email: "a@b.c" } },
  };
  const merged = mergeTemplate(template, { maintenance: "true" }, "찬빈: 점검");
  assert.deepEqual(merged.parameters.maintenance, { defaultValue: { value: "true" }, description: "서버 점검 모드", valueType: "BOOLEAN" });
  assert.deepEqual(merged.parameters.new_flag_from_console, { defaultValue: { value: "1" } });
  assert.deepEqual(merged.conditions, template.conditions);
  assert.deepEqual(merged.version, { description: "찬빈: 점검" });
  assert.equal(template.parameters.maintenance.defaultValue.value, "false");
});

test("템플릿에 없는 값은 종류를 정해 만든다", () => {
  const merged = mergeTemplate({}, { ads_enabled: "true", latest_version: "1.0.0" }, "");
  assert.equal(merged.parameters.ads_enabled.valueType, "BOOLEAN");
  assert.equal(merged.parameters.latest_version.valueType, "STRING");
});

test("끝나는 시각을 한 형식으로 적고 다시 읽는다", () => {
  const end = { date: "2026-11-03", time: "01:00" };
  assert.equal(formatMaintenanceEnd(end), "~ 2026-11-03 01:00 (KST)");
  assert.deepEqual(parseMaintenanceEnd(formatMaintenanceEnd(end)), end);
});

test("콘솔에서 적은 예전 형식도 읽고, 시각이 없으면 null 이다", () => {
  assert.deepEqual(parseMaintenanceEnd("2026-09-17 : 13:00"), { date: "2026-09-17", time: "13:00" });
  assert.equal(parseMaintenanceEnd(""), null);
  assert.equal(parseMaintenanceEnd("곧 끝나요"), null);
});

test("점검 문구는 고른 형식만 저장한다", () => {
  assert.deepEqual(validateAppConfig({ ...VALUES, maintenance_message: "~ 2026-11-03 01:00 (KST)" }), {});
  assert.ok(validateAppConfig({ ...VALUES, maintenance_message: "곧 끝나요" }).maintenance_message);
  assert.ok(validateChanges({ ...VALUES, maintenance_message: "옛날 글" }, { maintenance: "true" }).maintenance_message);
  assert.deepEqual(validateChanges({ ...VALUES, maintenance_message: "옛날 글" }, { maintenance: "true", maintenance_message: "" }), {});
});

test("시간대와 상관없이 한국 시간으로 계산한다", () => {
  const now = Date.parse("2026-11-01T15:10:00Z"); // 한국 시간 11월 2일 00:10
  assert.equal(kstToday(now), "2026-11-02");
  assert.ok(isFutureEnd({ date: "2026-11-02", time: "00:30" }, now));
  assert.ok(!isFutureEnd({ date: "2026-11-02", time: "00:00" }, now));
});

test("빠른 선택은 30분 단위로 올리고 날짜를 넘긴다", () => {
  const now = Date.parse("2026-11-01T14:37:00Z"); // 한국 시간 23:37
  assert.deepEqual(presetMaintenanceEnd(now, 60), { date: "2026-11-02", time: "01:00" });
  assert.deepEqual(presetMaintenanceEnd(Date.parse("2026-11-01T14:30:00Z"), 60), { date: "2026-11-02", time: "00:30" });
});

test("앱스토어에 없는 버전을 고르면 경고하고, 바꾸지 않은 값은 보지 않는다", () => {
  const after = { ...VALUES, latest_version: "3.2.7" };
  assert.ok(storeWarning(after, { latest_version: "3.2.7" }, "3.2.6"));
  assert.equal(storeWarning(VALUES, { latest_version: "3.2.6" }, "3.2.6"), null);
  assert.equal(storeWarning(after, { force_update: "false" }, "3.2.6"), null);
  assert.equal(storeWarning(after, { latest_version: "3.2.7" }, null), null);
});

test("배너 주소는 콘솔이 만드는 형식과 같고, 우리 폴더만 통과한다", () => {
  const url = bannerImageUrl("b.firebasestorage.app", "banners/a.png", "tok");
  assert.equal(url, "https://firebasestorage.googleapis.com/v0/b/b.firebasestorage.app/o/banners%2Fa.png?alt=media&token=tok");
  assert.ok(isOurBannerUrl(url, "b.firebasestorage.app"));
  assert.ok(!isOurBannerUrl(url, "other.firebasestorage.app"));
  assert.ok(!isOurBannerUrl(bannerImageUrl("b.firebasestorage.app", "private/a.png", "tok"), "b.firebasestorage.app"));
  assert.ok(!isOurBannerUrl("https://evil.example.com/a.png", "b.firebasestorage.app"));
});

test("파일 앞부분으로 이미지 종류를 가린다", () => {
  const bytes = (...v) => new Uint8Array(v);
  const text = (s) => [...s].map((c) => c.charCodeAt(0));
  assert.equal(sniffImageType(bytes(0x89, ...text("PNG"), 13, 10)), "image/png");
  assert.equal(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(sniffImageType(bytes(...text("RIFF"), 0, 0, 0, 0, ...text("WEBP"))), "image/webp");
  assert.equal(sniffImageType(bytes(...text("<svg xmlns"))), null);
  assert.equal(sniffImageType(bytes()), null);
});

test("주소는 https 이고 도메인이 있어야 한다", () => {
  assert.ok(validateAppConfig({ ...VALUES, banner_link_url: "https://localhost" }).banner_link_url);
  assert.ok(validateAppConfig({ ...VALUES, banner_link_url: "https://" }).banner_link_url);
  assert.deepEqual(validateAppConfig({ ...VALUES, banner_link_url: "https://www.instagram.com/dongsim_protector" }), {});
});

test("앱을 열었을 때 결과는 앱의 순서와 같다", () => {
  assert.equal(appVersionOutcome(VALUES, "3.2.0"), "forceUpdate");
  assert.equal(appVersionOutcome({ ...VALUES, force_update: "false" }, "3.2.0"), "optionalUpdate");
  assert.equal(appVersionOutcome(VALUES, "3.2.1"), "recommendUpdate");
  assert.equal(appVersionOutcome(VALUES, "3.2.6"), "upToDate");
  assert.equal(appVersionOutcome(VALUES, "3.2.7"), "upToDate");
  assert.equal(appVersionOutcome({ ...VALUES, maintenance: "true" }, "3.2.0"), "maintenance");
});

test("예시 버전은 경우마다 하나씩 고른다", () => {
  assert.deepEqual(versionSamples(VALUES).map((s) => s.version), ["3.2.0", "3.2.1", "3.2.6"]);
  assert.deepEqual(versionSamples({ ...VALUES, minimum_version: "3.2.6" }).map((s) => s.version), ["3.2.5", "3.2.6"]);
  assert.deepEqual(versionSamples({ ...VALUES, minimum_version: "3.0.0" }).map((s) => s.version), ["2.0.0", "3.0.0", "3.2.6"]);
  assert.deepEqual(versionSamples({ ...VALUES, minimum_version: "0.0.0", latest_version: "1.0.0" }).map((s) => s.version), ["0.0.0", "1.0.0"]);
  assert.deepEqual(versionSamples({ ...VALUES, latest_version: "3.2." }), []);
});

test("권장 크기와 비슷하면 경고하지 않는다", () => {
  assert.equal(checkBannerSize(1444, 272), null);
  assert.equal(checkBannerSize(1083, 204), null);
  assert.equal(checkBannerSize(2888, 544), null);
});

test("비율이 다르면 어느 쪽이 잘리는지 알려 준다", () => {
  assert.match(checkBannerSize(1200, 400), /위아래가 많이 잘려요/);
  assert.match(checkBannerSize(2000, 200), /좌우가 많이 잘려요/);
});

test("너무 작으면 흐려 보인다고 알려 준다", () => {
  assert.match(checkBannerSize(722, 136), /흐려 보일 수 있어요/);
});

test("안 잘리는 영역은 어느 기기에서도 보이는 범위 안에 있다", () => {
  const banner = (w, h) => ((w * 361) / 393) / ((68 * h) / 852);
  const ratio = BANNER_SIZE.width / BANNER_SIZE.height;
  for (const [w, h] of [[375, 667], [375, 812], [393, 852], [430, 932], [360, 780], [412, 915], [384, 854], [768, 1024]]) {
    const device = banner(w, h);
    const visibleWidth = device < ratio ? BANNER_SIZE.height * device : BANNER_SIZE.width;
    const visibleHeight = device > ratio ? BANNER_SIZE.width / device : BANNER_SIZE.height;
    assert.ok(BANNER_SAFE.width <= visibleWidth, `${w}x${h} 폭`);
    assert.ok(BANNER_SAFE.height <= visibleHeight, `${w}x${h} 높이`);
  }
});

test("변경 이력 한 줄에 누가 무엇을 바꿨는지 남긴다", () => {
  assert.equal(describeForHistory("찬빈", VALUES, { maintenance: "true" }), "찬빈: 점검 꺼짐→켜짐");
  assert.equal(describeForHistory("찬빈", VALUES, { banner_image_url: "https://example.com/very/long.png" }), "찬빈: 배너 이미지 변경");
});
