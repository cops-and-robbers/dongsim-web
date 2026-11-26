/* eslint-disable */ // 게임 저장소 코드를 그대로 옮긴 파일이라 사이트 규칙으로 고치지 않는다
// 게임 저장소 client/game.js 의 캐릭터 부분(addTail, makeChar, ensureMotion, goView, desiredFacing, locomotion, startAction, drawChar)을 옮겼다.
// 바꾼 것: 전역(G, world, online) 대신 인자로 받고, CFG.RUN 은 RUN 상수로 둔다. 움직임 계산은 한 줄도 바꾸지 않았다.
// 좀비 모드: 좀비는 늘 좀비 냥파(zcat), 생존자는 늘 생존자 도둥이(zsurv)다(게임 docs/zombie.md "편과 생김새"). a.zmode 인 장면에서 a.zombie 로 고른다.
// 물린 사람이 도둥이에서 냥파로 변하는 연출(turning, popIn)은 게임 client/zombie.js 그대로다.
import { CharRig } from "./engine";
import { SVGS } from "./svgs";

const { mount, MOTIONS, DEFS, piv, Spring, clamp } = CharRig;
export const CS = 0.5; // 캐릭터 크기
const RUN = 230; // CFG.RUN

CharRig.addZombieArt(SVGS); // 좀비 냥파와 생존자 도둥이의 옆모습, 뒷모습을 만들어 SVGS 에 넣는다
export const zombieSvg = name => SVGS[name];
const VIEWS = { police: ["police-front", "police-side", "police-back"], robber: ["robber-front", "robber-side", "robber-back", "robber-jailed"], zcat: ["zcat-front", "zcat-side", "zcat-back"], zsurv: ["zsurv-front", "zsurv-side", "zsurv-back"] };
const kindOf = a => a.zmode ? (a.zombie ? "zcat" : "zsurv") : a.look || a.team;

// 뒷모습은 얼굴을 숨긴 그림이라 몸만 남는다. 꼬리를 달아 등을 보고 있다는 걸 바로 알게 한다
function addTail(rig) {
  const name = rig.def.name; if (!name.endsWith("-back")) return;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const police = name.startsWith("police"), tl = rig.def.tail;
  path.setAttribute("d", tl ? tl.d : police ? "M92 172 C118 178 138 168 136 146 C135 136 124 134 122 142" : "M82 118 C104 128 122 122 124 104 C125 96 116 94 113 100");
  path.setAttribute("fill", "none"); path.setAttribute("stroke", tl ? tl.color : police ? "#7FC4F5" : "#6F7480"); path.setAttribute("stroke-width", tl ? tl.w : police ? "13" : "6"); path.setAttribute("stroke-linecap", "round");
  rig.all.append(path);
}

/** a: { team, x, y, vx, vy, ix, iy, state, inBush, action }. tag 가 있으면 머리 위 이름표(나는 편 색) */
export function makeChar(world, a, tag, me) {
  const kind = kindOf(a), zombie = !!a.zombie;
  const el = document.createElement("div"); el.className = "char"; world.append(el);
  const sh = document.createElement("div"); sh.className = "shadow"; el.append(sh);
  const base = kind === "police" || kind === "zcat" ? 0.95 : 1.12; // 두 캐릭터 몸집이 비슷해 보이게
  const views = {};
  let headTop = 0;
  for (const n of VIEWS[kind]) {
    const rig = mount(SVGS[n], n); const d = rig.def; addTail(rig);
    // 좀비 냥파 정면은 디자이너 그림이라 원래 냥파와 크기가 달라 def.scale 로 맞춘다
    const scale = base * (n === "robber-jailed" ? 1.45 : 1) * (d.scale || 1);
    if (n.endsWith("-front")) headTop = -d.ground * scale;
    rig.svg.setAttribute("viewBox", `0 0 ${d.w} ${d.h}`);
    rig.svg.style.width = d.w * scale + "px"; rig.svg.style.height = d.h * scale + "px";
    rig.svg.style.left = (-(d.cx) * scale) + "px"; rig.svg.style.bottom = (-(d.h - d.ground) * scale) + "px";
    rig.svg.style.transformOrigin = `${d.cx * scale}px ${d.ground * scale}px`; // 변신할 때 발을 기준으로 눌리고 튀어 오른다
    if (rig.parts.shadow) rig.parts.shadow.forEach(g => g.style.display = "none");
    el.append(rig.svg); views[n] = rig;
  }
  let tagEl = null;
  if (tag) {
    tagEl = document.createElement("div"); tagEl.className = "tag " + (kind === "zcat" ? "police" : kind === "zsurv" ? "robber" : kind) + (me ? " me" : "") + (zombie ? " zz" : ""); tagEl.textContent = tag; tagEl.style.top = (headTop - 66) + "px"; el.append(tagEl);
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
  // 물린 사람: 도둥이가 냥파로 변해 간다(turning). 장면이 좀비 냥파로 바꿔 끼우면(GameStage turn) popIn 으로 튀어 오른다
  let ms = { sx: 1, sy: 1 };
  if (a.state === "turning") { c.turnT = (c.turnT || 0) + dt; ms = turning(c); }
  else { if (c.tinted) { c.tinted = false; for (const r of Object.values(c.views)) r.svg.style.filter = ""; } if (c.popT !== undefined) { c.popT += dt; ms = popIn(c); } }
  c.el.style.transform = `translate(${a.x + (c.lungeX || 0) * CS}px, ${a.y + (c.hopY || 0) * CS}px) scale(${CS})`;
  // 눌리고 튀어 오르는 건 캐릭터 그림만. 이름표까지 늘이면 글자가 찌그러진다
  const sq = ms.sx !== 1 || ms.sy !== 1 ? `scale(${ms.sx.toFixed(3)},${ms.sy.toFixed(3)})` : "";
  for (const rig of Object.values(c.views)) if (rig.svg.style.transform !== sq) rig.svg.style.transform = sq;
  // 내 캐릭터는 덤불에 들어가도 비쳐 보여야 어디 있는지 안다
  c.el.style.zIndex = Math.round(a.y) + (a.isPlayer && a.inBush ? 400 : 0);
}

// ───── 도둥이가 냥파로 (게임 client/zombie.js turning, popIn) ─────
// 비틀거리며 민트빛으로 물들고, 냄비가 튕겨 나가 굴러떨어지고, 나뭇가지를 놓친 뒤 납작하게 눌린다. 장면 시간(c.turnT)으로 센다
const ease = x => x * x * (3 - 2 * x);
function turning(c) {
  const k = Math.min(1, c.turnT / 2);
  c.lungeX = Math.sin(c.turnT * 1000 / 70) * 6 * (1 - k * 0.5);
  const tint = `sepia(${k * 0.7}) hue-rotate(${k * 95}deg) saturate(${1 + k * 0.8}) brightness(${1 - k * 0.05})`;
  for (const r of Object.values(c.views)) r.svg.style.filter = tint; // 이름표는 물들이지 않는다
  c.tinted = true;
  const rig = c.views[c.view], d = rig.def, dir = c.face < 0 ? -1 : 1;
  const pot = clamp((k - 0.12) / 0.5, 0, 1);
  if (pot > 0) for (const g of rig.parts.beanie || []) {
    g.setAttribute("transform", piv(d.cx, 40, dir * 210 * ease(pot), 1, 1, dir * 80 * pot, -60 * Math.sin(Math.PI * Math.min(1, pot * 1.25)) + 70 * pot * pot));
    g.style.opacity = String(1 - clamp((pot - 0.7) / 0.3, 0, 1));
  }
  const drop = clamp((k - 0.28) / 0.32, 0, 1), stick = rig.parts.handL?.[2];
  if (stick && drop > 0) { stick.setAttribute("transform", piv(33, 98, -70 * ease(drop), 1, 1, -6 * drop, 40 * drop * drop)); stick.style.opacity = String(1 - clamp((drop - 0.6) / 0.4, 0, 1)); }
  const sq = ease(clamp((k - 0.78) / 0.22, 0, 1));
  return { sx: 1 + 0.3 * sq, sy: 1 - 0.45 * sq };
}
// 방금 좀비 냥파가 된 캐릭터: 눌린 모습에서 튀어 올랐다가 자리를 잡는다(0.6초). 만든 쪽이 c.popT = 0 으로 시작한다
function popIn(c) {
  const t = c.popT / 0.6;
  if (t >= 1) { c.popT = undefined; return { sx: 1, sy: 1 }; }
  const sy = 1 - 0.45 * Math.cos(t * Math.PI * 2.5) * (1 - t) ** 2;
  return { sx: 1 + (1 - sy) * 0.6, sy };
}
