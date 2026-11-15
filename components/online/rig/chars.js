/* eslint-disable */ // 게임 저장소 코드를 그대로 옮긴 파일이라 사이트 규칙으로 고치지 않는다
// 게임 저장소 client/game.js 의 캐릭터 부분(addTail, makeChar, ensureMotion, goView, desiredFacing, locomotion, startAction, drawChar)을 옮겼다.
// 바꾼 것: 전역(G, world, online) 대신 인자로 받고, CFG.RUN 은 RUN 상수로 둔다. 움직임 계산은 한 줄도 바꾸지 않았다.
// 좀비 모드(fb59b29): 생김새(a.look)가 편과 따로이고, a.zombie 면 client/zombie.js 의 좀비 그림(SKIN, MARKS, mountZ)으로 붙인다.
import { CharRig } from "./engine";
import { SVGS } from "./svgs";

const { mount, MOTIONS, DEFS, piv, Spring, clamp } = CharRig;
export const CS = 0.5; // 캐릭터 크기
const RUN = 230; // CFG.RUN

// client/zombie.js 그대로: 피부색만 바꾸고 붕대와 꿰맨 자국을 한 겹 덧댄다. 모자, 털모자, 코는 그대로라 누구였는지 알아본다
const SKIN = { "#57BFFF": "#86AE8F", "#9FD6FF": "#AECBB2", "#B3DCFF": "#C3DAC3", "#0B4692": "#433C5E", "#0B4690": "#433C5E", "#FFB600": "#A99A68", "#FFE500": "#C6B984", "#FDB403": "#A99A68", "#DD7C00": "#7E7150",
  "#007ECA": "#5F8A6B", "#6CBFFF": "#93B79A", "#85CFFF": "#A2C3A7", "#A5AAB7": "#A6BDA6", "#7D828E": "#7F9A84", "#1D232B": "#2B2536", "#9196A3": "#93AE96", "#A3A8B5": "#A3BBA4", "#7D808C": "#7E9882", "#000A12": "#241F2E" };
const MARKS = {
  "police-front": '<g transform="rotate(28 140 62)"><rect x="118" y="55" width="46" height="13" rx="4" fill="#F4EFE4" stroke="#CFC6B4" stroke-width="1.2"/><path d="M126 58v7M134 58v7M142 58v7M150 58v7M158 58v7" stroke="#CFC6B4" stroke-width="1.2"/></g><g stroke="#5D4A86" stroke-width="2.2" stroke-linecap="round"><path d="M78 158l24 6"/><path d="M83 154l-2 9M91 156l-2 9M99 158l-2 9"/></g>',
  "robber-front": '<g transform="rotate(-30 28 40)"><rect x="12" y="34" width="34" height="11" rx="4" fill="#F4EFE4" stroke="#CFC6B4" stroke-width="1.1"/><path d="M19 37v5M26 37v5M33 37v5M40 37v5" stroke="#CFC6B4" stroke-width="1.1"/></g><g stroke="#5D4A86" stroke-width="2" stroke-linecap="round"><path d="M106 92l14 8"/><path d="M109 89l-3 7M115 92l-3 7"/></g>',
};
const recolor = s => { for (const [a, b] of Object.entries(SKIN)) s = s.split(a).join(b); return s; };
const zCache = new Map();
export function zombieSvg(name) {
  if (!zCache.has(name)) zCache.set(name, recolor(SVGS[name]).replace(/<\/svg>\s*$/, (MARKS[name] || "") + "</svg>"));
  return zCache.get(name);
}
// 엔진은 팔다리 막대를 그림 정보(DEFS)의 색으로 그린다. 좀비로 붙일 때만 잠깐 바꿔 끼운다
function mountZ(name) {
  const def = DEFS[name], saved = def?.limbs?.map(l => l.color);
  if (saved) def.limbs.forEach(l => l.color = recolor(l.color));
  try { return mount(zombieSvg(name), name); } finally { if (saved) def.limbs.forEach((l, i) => l.color = saved[i]); }
}

// 뒷모습은 얼굴을 숨긴 그림이라 몸만 남는다. 꼬리를 달아 등을 보고 있다는 걸 바로 알게 한다
function addTail(rig) {
  const name = rig.def.name; if (!name.endsWith("-back")) return;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const police = name.startsWith("police");
  path.setAttribute("d", police ? "M92 172 C118 178 138 168 136 146 C135 136 124 134 122 142" : "M82 118 C104 128 122 122 124 104 C125 96 116 94 113 100");
  path.setAttribute("fill", "none"); path.setAttribute("stroke", police ? "#7FC4F5" : "#6F7480"); path.setAttribute("stroke-width", police ? "13" : "6"); path.setAttribute("stroke-linecap", "round");
  rig.all.append(path);
}

/** a: { team, x, y, vx, vy, ix, iy, state, inBush, action }. tag 가 있으면 머리 위 이름표(나는 편 색) */
export function makeChar(world, a, tag, me) {
  const kind = a.look || a.team, zombie = !!a.zombie;
  const el = document.createElement("div"); el.className = "char"; world.append(el);
  const sh = document.createElement("div"); sh.className = "shadow"; el.append(sh);
  const base = kind === "police" ? 0.95 : 1.12; // 두 캐릭터 몸집이 비슷해 보이게
  const views = {};
  const names = kind === "police" ? ["police-front", "police-side", "police-back"] : ["robber-front", "robber-side", "robber-back", "robber-jailed"];
  for (const n of names) {
    const rig = zombie ? mountZ(n) : mount(SVGS[n], n); const d = rig.def; addTail(rig);
    const scale = base * (n === "robber-jailed" ? 1.45 : 1);
    rig.svg.setAttribute("viewBox", `0 0 ${d.w} ${d.h}`);
    rig.svg.style.width = d.w * scale + "px"; rig.svg.style.height = d.h * scale + "px";
    rig.svg.style.left = (-(d.cx) * scale) + "px"; rig.svg.style.bottom = (-(d.h - d.ground) * scale) + "px";
    if (rig.parts.shadow) rig.parts.shadow.forEach(g => g.style.display = "none");
    el.append(rig.svg); views[n] = rig;
  }
  const headTop = -(kind === "police" ? 200 : 145) * base;
  let tagEl = null;
  if (tag) {
    tagEl = document.createElement("div"); tagEl.className = "tag " + kind + (me ? " me" : "") + (zombie ? " zz" : ""); tagEl.textContent = tag; tagEl.style.top = (headTop - 66) + "px"; el.append(tagEl);
  }
  const c = { a, kind, zombie, el, views, tag: tagEl, face: 1, faceS: new Spring(420, 34), pop: new Spring(300, 14), view: null, prev: null, tr: 1, trMode: "fade", mot: {}, mkey: {}, phase: 0, facing: "front", want: null, wantT: 0, stillT: 0, action: null, hopY: 0, input: { x: 0, y: 0 }, hide: 0 };
  c.faceS.x = 1;
  goView(c, `${kind}-front`, true); ensureMotion(c, `${kind}-front`, "idleFront");
  return c;
}
function ensureMotion(c, view, motionName, opts) {
  const key = motionName + JSON.stringify(opts || {});
  if (c.mkey[view] !== key) { const rig = c.views[view]; rig.reset(); c.mot[view] = MOTIONS[motionName](rig, opts || {}); c.mkey[view] = key; }
}
function goView(c, view, instant) {
  if (c.view === view) return;
  if (!c.view || instant) { c.prev = null; c.tr = 1; }
  else {
    const a = c.view.split("-")[1], b = view.split("-")[1];
    c.trMode = (a === "front" && b === "back") || (a === "back" && b === "front") ? "spin" : "swap";
    c.prev = c.view; c.tr = 0;
  }
  c.view = view;
}
const hideOpts = { crouch: 1, period: 0.8, bob: 3 };
function desiredFacing(c, mx, my) {
  const mag = Math.hypot(mx, my); const ax = Math.abs(mx) / mag;
  if (c.facing === "side") return ax > 0.42 ? "side" : (my > 0 ? "front" : "back");
  if (ax > 0.82) return "side";
  if (c.facing === "front" && my < -0.3 * mag) return "back";
  if (c.facing === "back" && my > 0.3 * mag) return "front";
  return c.facing;
}
function locomotion(c, dt) {
  const k = c.kind, mx = c.input.x, my = c.input.y, mag = Math.hypot(mx, my);
  if (mag < 0.05) {
    c.stillT += dt;
    if (c.stillT > 0.08) c.facing = c.facing === "back" ? "back" : "front";
    const v = `${k}-${c.facing === "back" ? "back" : (c.stillT > 0.08 ? "front" : c.facing)}`;
    ensureMotion(c, v, c.facing === "side" ? (c.zombie ? "shambleSide" : "runSide") : "idleFront", c.facing === "side" && c.hide && !c.zombie ? hideOpts : {});
    goView(c, v); return;
  }
  c.stillT = 0;
  if (Math.abs(mx) > 0.05) c.face = Math.sign(mx);
  const want = desiredFacing(c, mx, my);
  if (want !== c.facing) { if (c.want !== want) { c.want = want; c.wantT = 0; } c.wantT += dt; if (c.wantT > 0.06) { c.facing = want; c.want = null; } } else c.want = null;
  const v = `${k}-${c.facing}`;
  // 좀비는 팔을 뻗고 발을 끄는 걸음(playground.html shambleSide, shambleFront)
  if (c.facing === "side") ensureMotion(c, v, c.zombie ? "shambleSide" : "runSide", c.hide && !c.zombie ? hideOpts : {});
  else if (c.zombie && c.facing === "front") ensureMotion(c, v, "shambleFront", {});
  else ensureMotion(c, v, "runFront", {});
  goView(c, v);
}
export function startAction(c, name, dx) {
  // 좀비 물기: 옆모습으로 돌아 앞으로 덮친다
  if (name === "catch" && c.zombie) { c.face = dx < 0 ? -1 : 1; c.facing = "side"; const v = `${c.kind}-side`; goView(c, v, c.view === v); ensureMotion(c, v, "shambleSide"); c.action = { name: "bite", until: 0.5, dx: dx < 0 ? -1 : 1, t: 0 }; return; }
  if (name === "catch") { c.face = dx < 0 ? -1 : 1; c.facing = "side"; goView(c, "police-side", c.view === "police-side"); c.mkey["police-side"] = null; ensureMotion(c, "police-side", "catchSide"); c.action = { name, until: 0.6 }; }
  if (name === "jail") { c.facing = "side"; goView(c, "robber-side", true); ensureMotion(c, "robber-side", "runSide"); c.action = { name: "caught", until: 0.32 }; c.pop.x = -0.15; }
  if (name === "escape") {
    c.facing = "front"; c.mkey["robber-jailed"] = null; ensureMotion(c, "robber-jailed", "breakout"); goView(c, "robber-front", true); ensureMotion(c, "robber-front", "idleFront");
    c.prev = "robber-jailed"; c.tr = 0; c.trMode = "keep"; // 창살은 남아서 튕겨 나가고, 도둥이는 정면으로 뛰어나온다
    c.action = { name: "escape", until: 0.5 }; c.pop.x = -0.15;
  }
  // 장면 처음부터 갇혀 있는 도둑(게임의 caught 가 끝난 뒤와 같은 상태)
  if (name === "jailed") { goView(c, "robber-jailed", true); c.mkey["robber-jailed"] = null; ensureMotion(c, "robber-jailed", "jailed"); c.action = { name: "jailed", until: Infinity }; }
  if (c.action) c.action.t = 0;
}
export function drawChar(c, dt) {
  const a = c.a;
  c.input = (a.state === "jailed" || a.state === "caught" || a.state === "waiting" || a.state === "turning" || a.state === "escaped" || a.action) ? { x: 0, y: 0 } : { x: a.ix, y: a.iy };
  c.lungeX = 0;
  c.hide = a.inBush ? 5 : 0;
  if (c.action) {
    c.action.t += dt;
    if (c.action.name === "caught") { const k = c.action.t / 0.32; c.views["robber-side"].all.setAttribute("transform", piv(93, 141, 6 * Math.sin(k * 30), 1, 1, 4 * Math.sin(k * 40) * (1 - k), -18 * Math.sin(Math.PI * Math.min(1, k)))); }
    if (c.action.name === "escape") { const k = c.action.t / 0.5; c.hopY = -40 * Math.sin(Math.PI * Math.min(1, k)); }
    if (c.action.name === "bite") { const k = Math.min(1, c.action.t / 0.5); c.lungeX = c.action.dx * 44 * Math.sin(Math.PI * k); c.hopY = -10 * Math.sin(Math.PI * k); }
    if (c.action.until !== Infinity && c.action.t >= c.action.until) {
      const n = c.action.name; c.action = null; c.hopY = 0;
      if (n === "caught") { goView(c, "robber-jailed"); c.trMode = "swap"; c.mkey["robber-jailed"] = null; ensureMotion(c, "robber-jailed", "jailed"); c.action = { name: "jailed", until: Infinity, t: 0 }; c.pop.x = -0.1; }
    }
  } else locomotion(c, dt);
  const sp = Math.hypot(a.vx, a.vy) / RUN, spd = clamp(Math.max(0.35, sp), 0.35, 1.35);
  if (sp > 0.05) c.phase = (c.phase + dt / ((c.hide ? 0.8 : 0.44) / (0.55 + 0.45 * spd))) % 1;
  const ctx = { speed: spd, phase: c.phase };
  c.mot[c.view] && c.mot[c.view].update(dt, ctx); c.views[c.view].updateLimbs();
  if (c.prev && c.tr < 1) { c.mot[c.prev] && c.mot[c.prev].update(dt, ctx); c.views[c.prev].updateLimbs(); }
  c.tr = Math.min(1, c.tr + dt / (c.trMode === "spin" ? 0.2 : c.trMode === "keep" ? 0.42 : 0.14));
  if (c.tr >= 1) c.prev = null;
  const fs = c.faceS.step(c.face, dt), pop = c.pop.step(0, dt);
  for (const [n, rig] of Object.entries(c.views)) {
    const isCur = n === c.view, isPrev = n === c.prev;
    rig.svg.classList.toggle("on", isCur || isPrev);
    if (!isCur && !isPrev) continue;
    const d = rig.def; const side = n.endsWith("side");
    let sx = 1, op = 1;
    if (c.prev) {
      const k = c.tr, e = k * k * (3 - 2 * k);
      if (c.trMode === "spin") { if (isPrev) { sx = Math.max(0.06, 1 - 2 * e); op = k < 0.5 ? 1 : 0; } else { sx = Math.max(0.06, 2 * e - 1); op = k < 0.5 ? 0 : 1; } }
      else if (c.trMode === "keep") { sx = 1; op = 1; }
      else { if (isPrev) { sx = 1 - 0.45 * Math.min(1, 2 * e); op = k < 0.5 ? 1 : 0; } else { sx = 0.55 + 0.45 * Math.max(0, 2 * e - 1); op = k < 0.5 ? 0 : 1; } }
    }
    const flipX = side ? (Math.abs(fs) < 0.08 ? 0.08 * Math.sign(fs || 1) : clamp(fs, -1, 1)) : 1;
    rig.svg.style.opacity = op;
    rig.flip.setAttribute("transform", piv(d.cx, d.ground, 0, flipX * sx * (1 - pop * 0.5), 1 + pop));
  }
  c.el.style.opacity = a.inBush ? 0.6 : 1;
  // 물린 사람: 2초 동안 좌우로 비틀거리며 색이 빠진다. 끝나면 장면이 좀비 그림으로 다시 만든다(GameStage turn)
  if (a.state === "turning") {
    c.turnT = (c.turnT || 0) + dt;
    const k = Math.min(1, c.turnT / 2);
    c.lungeX = Math.sin(c.turnT * 1000 / 70) * 6 * (1 - k * 0.5);
    c.el.style.filter = `saturate(${1 - k * 0.7}) hue-rotate(${k * 70}deg) brightness(${1 - k * 0.1})`;
  } else if (c.el.style.filter) c.el.style.filter = "";
  c.el.style.transform = `translate(${a.x + (c.lungeX || 0) * CS}px, ${a.y + (c.hopY || 0) * CS}px) scale(${CS})`;
  // 내 캐릭터는 덤불에 들어가도 비쳐 보여야 어디 있는지 안다
  c.el.style.zIndex = Math.round(a.y) + (a.isPlayer && a.inBush ? 400 : 0);
}
