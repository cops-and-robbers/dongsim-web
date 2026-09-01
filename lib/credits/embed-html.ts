// 앱 웹뷰가 여는 크레딧 화면 HTML(#82).
//
// legal 문서(embed-html.ts#47)와 같은 이유로 React 가 아니라 문자열이다:
// Route Handler 로 내보내 루트 레이아웃의 GTM·헤더·푸터·JS 청크를 앱 안까지
// 끌고 들어가지 않는다. 앱 웹뷰는 JS off 라 연출은 전부 CSS 애니메이션이다.
//
// 화면은 게임의 문법으로 조립한다: 밤의 지도 타일 위에 멤버들이 역할색
// 핑 카드(카드 + 핀 꼬리 + 지면의 점)로 꽂혀 있고, 발자국이 카드 사이를
// 걸어 내려가며 스크롤을 유도한다. 도와준 분들은 인게임 채팅 시트 모양의
// 바닥판에 기여 티어 색으로 흐른다. 색·캐릭터·아이콘은 기존 자산만 쓴다.

import {
  CREDITS,
  type ContributionTier,
  type CreditMember,
  type CreditRole,
} from "./data";

/** 역할색 - 앱 팔레트에서 경찰 파랑·도둑 초록에 노랑·로즈까지 대등하게 */
const ROLE_COLOR: Record<CreditRole, string> = {
  Frontend: "#0088FF",
  Backend: "#38F55B",
  Design: "#FFCC00",
  Marketing: "#FF6B6E",
};

/** 기여 티어 색 - 앱 ContributionTierColor 그대로 */
const TIER_COLOR: Record<ContributionTier, string> = {
  tier1: "#93A2B3",
  tier2: "#38F55B",
  tier3: "#7AF391",
  tier4: "#FFCC00",
  tier5: "#F7F260",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 밤 지도 타일 - 앱 다크 지도 팔레트(google_map_view 다크 스타일 계열)로
// 그린 배경. data URI 로 넣어 스크롤을 따라 세로로 무한히 이어진다.
function mapTile(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="393" height="420" viewBox="0 0 393 420">` +
    `<rect width="393" height="420" fill="#22262B"/>` +
    `<rect x="22" y="26" width="112" height="84" rx="8" fill="#2C3138"/>` +
    `<rect x="168" y="-12" width="150" height="122" rx="8" fill="#2C3138"/>` +
    `<rect x="24" y="150" width="88" height="112" rx="8" fill="#2C3138"/>` +
    `<rect x="140" y="152" width="126" height="122" rx="10" fill="#24352B"/>` +
    `<rect x="60" y="312" width="172" height="100" rx="10" fill="#2C3138"/>` +
    `<rect x="284" y="322" width="120" height="98" rx="10" fill="#2C3138"/>` +
    `<path d="M0 132 H393" stroke="#3A4048" stroke-width="12"/>` +
    `<path d="M156 0 V420" stroke="#3A4048" stroke-width="10"/>` +
    `<path d="M276 120 V420" stroke="#3A4048" stroke-width="8"/>` +
    `<path d="M0 294 H393" stroke="#3A4048" stroke-width="10"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// 사진 n장 교차 페이드. 장수별 keyframes 를 데이터에서 만들어 두므로
// 정본에 사진을 몇 장을 넣든 화면이 저절로 따라온다.
function crossfadeCss(counts: Set<number>): string {
  let css = "";
  for (const n of counts) {
    if (n < 2) continue;
    const seg = 100 / n;
    const fade = Math.min(6, seg * 0.25);
    for (let i = 0; i < n; i += 1) {
      const from = seg * i;
      const to = seg * (i + 1);
      // 자기 구간에서만 보이고 구간 경계에서 서서히 넘어간다
      const frames =
        i === 0
          ? `0%,${(to - fade).toFixed(1)}%{opacity:1}${to.toFixed(1)}%,${(100 - fade).toFixed(1)}%{opacity:0}100%{opacity:1}`
          : `0%,${from.toFixed(1)}%{opacity:0}${(from + fade).toFixed(1)}%,${(to - fade).toFixed(1)}%{opacity:1}${Math.min(to + fade, 100).toFixed(1)}%,100%{opacity:0}`;
      css += `@keyframes fade-${n}-${i}{${frames}}`;
      css += `.fade-${n} .ph${i}{animation:fade-${n}-${i} ${n * 3.5}s linear infinite}`;
    }
    css += `.fade-${n} .photo{opacity:0}`;
  }
  return css;
}

function memberCard(member: CreditMember, index: number, total: number): string {
  const color = ROLE_COLOR[member.role];
  const photos = member.photos
    .map((src, i) => `<img class="photo ph${i}" src="${src}" alt="">`)
    .join("");
  const links = member.links
    .map(
      (link) =>
        `<a class="social" href="${link.url}"><img class="s-icon" src="/credits/icon-${link.type}.svg" alt="${link.type}"></a>`,
    )
    .join("");
  const side = index % 2 === 0 ? "left" : "right";
  // 다음 카드가 있는 쪽으로 꺾이는 발자국 세 걸음
  const toNext = index % 2 === 0 ? 1 : -1;
  const trail =
    index < total - 1
      ? `<div class="trail" aria-hidden="true">` +
        [0, 1, 2]
          .map(
            (step) =>
              `<img src="/app-icons/shoeprint_green.svg" alt="" style="transform:translateX(calc(${toNext * (step - 1) * 26} * var(--u))) rotate(${170 + toNext * step * 9}deg)">`,
          )
          .join("") +
        `</div>`
      : "";
  return `<div class="spot ${side} rise" style="--role:${color};animation-delay:${(0.2 + index * 0.07).toFixed(2)}s">
  <article class="ping">
    <div class="orbit${member.photos.length > 1 ? ` fade-${member.photos.length}` : ""}">${photos}</div>
    <div class="who">
      <p class="name">${escapeHtml(member.name)}</p>
      <p class="role">${escapeHtml(member.role)}</p>
      ${links ? `<div class="socials">${links}</div>` : ""}
    </div>
  </article>
  <span class="pin" aria-hidden="true"></span>
  <span class="dot" aria-hidden="true"></span>
</div>
${trail}`;
}

// 이어붙인 두 벌을 -50% 이동시키는 표준 CSS 마퀴 - 이음새 없이 무한히 흐른다
function thanksRow(): string {
  const items = CREDITS.helpers
    .map(
      (helper) =>
        `<span class="thank" style="color:${TIER_COLOR[helper.tier]};${helper.tier === "tier5" ? "font-weight:600" : ""}">${escapeHtml(helper.name)} <span class="thank-role">(${escapeHtml(helper.role)})</span></span>`,
    )
    .join("");
  return `<div class="marquee-inner">${items}${items}</div>`;
}

/*
 * --u 는 "앱 논리픽셀 1개"다. legal embed 와 같은 방식으로, 앱 디자인 기준
 * Size(393, 852)의 비례를 재현해 앱 수치를 환산 없이 그대로 곱한다.
 * 상한 480은 태블릿·데스크톱에서 열렸을 때를 위한 것이다.
 */
const CSS = `
:root{
  --u:calc(min(100vw, 480px) / 393);
  --card:#1E232A; --line:#333D48;
  --white:#FFFFFF; --dim:#93A2B3; --faint:#5D6F83;
}
*{margin:0;padding:0;box-sizing:border-box}
html{
  background:#22262B;
  scroll-behavior:smooth;
  scroll-snap-type:y proximity;
}
body{
  font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",
    "Noto Sans KR",system-ui,Roboto,sans-serif;
  color:var(--white);
  -webkit-font-smoothing:antialiased;
  word-break:keep-all;
  overflow-x:hidden;
  min-height:100dvh;
  display:flex;flex-direction:column;
  background:${mapTile()};
  background-size:calc(393 * var(--u)) calc(420 * var(--u));
  background-position:top center;
}
/* 지도 위에 밤을 한 겹 - 콘텐츠가 또렷하게 뜨도록 */
body::before{
  content:"";position:fixed;inset:0;pointer-events:none;
  background:rgba(8,10,12,.42);
}
body>*{position:relative}

.rise{animation:rise .8s cubic-bezier(.22,1,.36,1) both}
@keyframes rise{from{opacity:0;transform:translateY(calc(20 * var(--u)))}to{opacity:1;transform:none}}

.hud{
  text-align:center;
  padding:calc(44 * var(--u)) calc(20 * var(--u)) calc(6 * var(--u));
}
.hud img{height:calc(34 * var(--u));width:auto}
.hud p{margin-top:calc(14 * var(--u));font-size:calc(13 * var(--u));color:var(--dim)}

.map{
  width:100%;max-width:calc(393 * var(--u));
  margin:calc(10 * var(--u)) auto 0;
  padding:calc(8 * var(--u)) calc(20 * var(--u)) calc(20 * var(--u));
}
.spot{
  width:calc(272 * var(--u));display:flex;flex-direction:column;align-items:center;
  scroll-snap-align:center;
}
.spot.left{margin-right:auto}
.spot.right{margin-left:auto}
.ping{
  width:100%;
  display:flex;align-items:center;gap:calc(14 * var(--u));
  background:var(--card);
  border:1px solid var(--line);
  border-radius:calc(14 * var(--u));
  padding:calc(14 * var(--u));
  box-shadow:0 calc(10 * var(--u)) calc(24 * var(--u)) rgba(0,0,0,.45);
}
/* 핑 카드의 핀 꼬리와 지면의 점 (인게임 핑 마커 문법) */
.pin{
  width:0;height:0;
  border-left:calc(7 * var(--u)) solid transparent;
  border-right:calc(7 * var(--u)) solid transparent;
  border-top:calc(10 * var(--u)) solid var(--line);
}
.dot{
  width:calc(8 * var(--u));height:calc(8 * var(--u));
  margin-top:calc(2 * var(--u));
  border-radius:50%;
  background:var(--role);
  box-shadow:0 0 0 calc(3 * var(--u)) rgba(255,255,255,.12);
}
.orbit{
  position:relative;flex:0 0 calc(76 * var(--u));
  width:calc(76 * var(--u));height:calc(76 * var(--u));
  border-radius:50%;
  overflow:hidden;
  border:calc(2.5 * var(--u)) solid var(--role);
}
.orbit .photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
${crossfadeCss(new Set(CREDITS.members.map((m) => m.photos.length)))}
.who{min-width:0}
.name{font-size:calc(17 * var(--u));font-weight:700}
.role{
  margin-top:calc(3 * var(--u));
  font-size:calc(10.5 * var(--u));font-weight:600;
  letter-spacing:calc(1.2 * var(--u));text-transform:uppercase;
  color:var(--role);
}
.socials{margin-top:calc(8 * var(--u));display:flex;gap:calc(6 * var(--u))}
.social{display:block;padding:calc(2 * var(--u))}
.s-icon{display:block;width:calc(18 * var(--u));height:calc(18 * var(--u))}
.social:active .s-icon{opacity:.6}

/* 카드 사이 발자국 세 걸음 - 걷듯이 차례로 밝아지며 아래로 시선을 끈다 */
.trail{
  display:flex;flex-direction:column;align-items:center;
  gap:calc(8 * var(--u));
  padding:calc(12 * var(--u)) 0;
}
.trail img{
  width:calc(20 * var(--u));height:auto;
  animation:step 1.9s ease-in-out infinite;
}
.trail img:nth-child(2){animation-delay:.32s}
.trail img:nth-child(3){animation-delay:.64s}
@keyframes step{0%,60%,100%{opacity:.25}25%{opacity:.85}}

/* 도와준 분들 - 인게임 채팅 시트 모양의 바닥판 */
.sheet{
  margin-top:calc(18 * var(--u));
  background:var(--card);
  border-radius:calc(20 * var(--u)) calc(20 * var(--u)) 0 0;
  box-shadow:0 calc(-8 * var(--u)) calc(24 * var(--u)) rgba(0,0,0,.4);
  padding-bottom:calc(6 * var(--u));
}
.handle{
  width:calc(48 * var(--u));height:calc(4 * var(--u));
  margin:calc(12 * var(--u)) auto 0;
  border-radius:calc(2 * var(--u));
  background:var(--line);
}
.sheet h2{
  margin-top:calc(14 * var(--u));
  text-align:center;
  font-size:calc(12 * var(--u));font-weight:600;color:var(--faint);
  letter-spacing:calc(2.5 * var(--u));text-indent:calc(2.5 * var(--u));
}
.marquee{overflow:hidden;margin-top:calc(12 * var(--u));padding-bottom:calc(16 * var(--u))}
.marquee-inner{
  display:inline-flex;white-space:nowrap;
  animation:marquee 38s linear infinite;
}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.thank{font-size:calc(14 * var(--u));padding:0 calc(16 * var(--u))}
.thank-role{font-size:calc(12 * var(--u));opacity:.7}

/* 밤 순찰 - 도둥이가 치즈를 들고 튀고 냥파가 쫓는다 */
.chase{position:relative;height:calc(88 * var(--u));overflow:hidden;background:var(--card)}
.chase .runners{
  position:absolute;bottom:calc(8 * var(--u));left:0;
  display:flex;align-items:flex-end;gap:calc(26 * var(--u));
  animation:chase-run 13s linear infinite;
}
@keyframes chase-run{
  from{transform:translateX(calc(-320 * var(--u)))}
  to{transform:translateX(min(100vw, 480px))}
}
/* 한 박자 늦게 도둥이 한 마리 더 - 스트립이 비는 순간을 줄인다 */
.chase .runners.late{animation-delay:-6.5s}
.chase .cheese{
  font-size:calc(17 * var(--u));
  transform:translateY(calc(-6 * var(--u)));
  margin-left:calc(-12 * var(--u));
}
.chase img.runner{height:calc(52 * var(--u));width:auto}
.chase .bob-a{animation:bob .5s ease-in-out infinite alternate}
.chase .bob-b{animation:bob .5s ease-in-out .25s infinite alternate}
@keyframes bob{from{transform:translateY(0)}to{transform:translateY(calc(-4 * var(--u)))}}

.footer{
  background:var(--card);
  margin-top:auto;
  padding:calc(10 * var(--u)) calc(24 * var(--u)) calc(36 * var(--u));
  text-align:center;
}
.footer .copy{font-size:calc(11 * var(--u));color:var(--faint)}

@media (prefers-reduced-motion: reduce){
  *{animation:none !important}
  .rise{opacity:1}
}
`;

export function renderCreditsEmbedHtml(): string {
  const members = CREDITS.members;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>만든 사람들</title>
<style>${CSS}</style>
</head>
<body>
<header class="hud rise">
  <img src="/brand/i18n/logo-ko-dark.svg" alt="경찰과 도둑">
  <p>만든 사람들</p>
</header>

<main class="map">
  ${members.map((member, i) => memberCard(member, i, members.length)).join("\n")}
</main>

<section class="sheet rise" style="animation-delay:.4s">
  <div class="handle" aria-hidden="true"></div>
  <h2>SPECIAL THANKS</h2>
  <div class="marquee">${thanksRow()}</div>
</section>

<div class="chase" aria-hidden="true">
  <div class="runners">
    <img class="runner bob-b" src="/characters/police-chase.svg" alt="">
    <img class="runner bob-a" src="/characters/robber-flee.svg" alt="">
    <span class="cheese">&#129472;</span>
  </div>
  <div class="runners late">
    <img class="runner bob-a" src="/characters/robber-flee.svg" alt="">
    <span class="cheese">&#129472;</span>
  </div>
</div>

<footer class="footer">
  <p class="copy">&copy; 2026 팀 동심지키미</p>
</footer>
</body>
</html>`;
}
