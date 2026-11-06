/* eslint-disable */ // 게임 저장소 코드를 그대로 옮긴 파일이라 사이트 규칙으로 고치지 않는다
// 게임 저장소(cops-and-robbers-web-game) client/playground.html 의 캐릭터 엔진(CharRig)을 그대로 옮겼다(65d010c).
// 사이트 장면의 캐릭터가 게임과 같은 걸음걸이와 동작으로 움직이게 하려고 쓴다. 고칠 때는 게임 쪽을 먼저 고치고 다시 옮긴다.
// 바꾼 것은 두 줄뿐이다: 맨 앞 export, 맨 끝 window.CharRig 대신 return.
// 경찰과 도둑 캐릭터 관절 엔진
// 원본 SVG 조각을 그대로 쓰고, 부위마다 g 로 감싸 변환만 준다. 새로 그리는 도형은 없다.
// 몸통에 붙은 발·팔은 잘라 내서(clipPath) 따로 움직인다. 잘린 면은 몸 뒤에 숨는다.
export const CharRig = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = x => x * x * (3 - 2 * x);
  const piv = (x, y, r = 0, sx = 1, sy = 1, tx = 0, ty = 0) =>
    `translate(${tx.toFixed(2)},${ty.toFixed(2)}) translate(${x},${y}) rotate(${r.toFixed(2)}) scale(${sx.toFixed(4)},${sy.toFixed(4)}) translate(${-x},${-y})`;

  // 부위 정의: 숫자는 원본 SVG 최상위 조각의 순서(마스크, defs 제외)
  const DEFS = {
    "police-side": {
      // 몸과 발(손)을 잇는 팔다리: 엉덩이(어깨)에서 발(손)까지 둥근 막대. 서 있을 땐 몸 뒤에 숨는다
      limbs: [{ from: ["body", 64, 178], to: ["backFoot", 59, 184], w: 10, color: "#9FD6FF", before: "backFoot" }, { from: ["body", 104, 174], to: ["frontFoot", 110, 180], w: 10, color: "#9FD6FF", before: "frontFoot" }],
      w: 158, h: 202, ground: 188, cx: 80,
      groups: { shadow: [0], hat: [1, 2, 3], frontArm: [4], head: [5, 6, 16, 17, 18, 19, 20, 21, 22, 25], body: [7, 10], earR: [8, 11], earL: [9, 15], baton: [12, 13, 14, 23, 24], badge: [26] },
      // 발 덩어리의 뿌리선(앞 두 점) 아래만 잘라 낸다. 사각형으로 자르면 몸 가장자리까지 떨어져 나와 틈이 보인다
      splits: [{ from: [7], cuts: { backFoot: [[52.5, 177], [67, 184.4], [67, 192], [52.5, 192]], frontFoot: [[105.6, 177.8], [117.5, 175.5], [117.5, 192], [105.6, 192]] } }],
    },
    "police-front": {
      limbs: [{ from: ["body", 58, 186], to: ["footL", 53, 195], w: 13, color: "#9FD6FF", before: "footL" }, { from: ["body", 122, 186], to: ["footR", 127, 195], w: 13, color: "#9FD6FF", before: "footR" }],
      w: 180, h: 200, ground: 200, cx: 90,
      groups: { body: [0, 1, 2, 3, 4, 9], earIn: [5, 6], cheeks: [7, 8], hat: [10, 19, 20, 21, 22], face: [11, 12, 13, 16, 17, 18], eyes: [14, 15] },
      splits: [{ from: [0, 4], pieceFrom: [4], cuts: { footL: [[46.7, 185.7], [63.4, 192.3], [63.4, 203], [42, 203]], footR: [[116.6, 192.3], [132.4, 185.7], [137, 203], [116.6, 203]] },
        // 떼어 낸 발 조각은 바깥 모서리를 몸 안쪽으로 살짝 들인다. 발이 기울 때 윗부분이 몸 밖으로 삐져나오지 않게
        pieces: { footL: [[47.8, 185.2], [63.4, 190.9], [63.4, 203], [42, 203]], footR: [[116.6, 190.9], [131.3, 185.2], [137, 203], [116.6, 203]] } }],
    },
    // 뒷모습: 정면 그림에서 등 뒤로 가면 안 보이는 부위(얼굴, 볼, 배, 귀 안쪽, 배지)를 뺀다
    "police-back": {
      limbs: [{ from: ["body", 58, 186], to: ["footL", 53, 195], w: 13, color: "#9FD6FF", before: "footL" }, { from: ["body", 122, 186], to: ["footR", 127, 195], w: 13, color: "#9FD6FF", before: "footR" }],
      src: "police-front", w: 180, h: 200, ground: 200, cx: 90,
      groups: { body: [0, 1, 2, 3, 4, 7, 8], hat: [10, 19, 20, 21] },
      // 원본은 볼이 몸 윤곽 밖으로 튀어나와 있다. 빼면 옆구리가 움푹 패니 몸 색으로 칠해 남긴다
      recolor: { 7: "#9FD6FF", 8: "#9FD6FF" },
      hide: [5, 6, 9, 11, 12, 13, 14, 15, 16, 17, 18, 22],
      splits: [{ from: [0, 4], pieceFrom: [4], cuts: { footL: [[46.7, 185.7], [63.4, 192.3], [63.4, 203], [42, 203]], footR: [[116.6, 192.3], [132.4, 185.7], [137, 203], [116.6, 203]] },
        // 떼어 낸 발 조각은 바깥 모서리를 몸 안쪽으로 살짝 들인다. 발이 기울 때 윗부분이 몸 밖으로 삐져나오지 않게
        pieces: { footL: [[47.8, 185.2], [63.4, 190.9], [63.4, 203], [42, 203]], footR: [[116.6, 190.9], [131.3, 185.2], [137, 203], [116.6, 203]] } }],
    },
    "robber-back": {
      limbs: [{ from: ["body", 64, 128], to: ["footL", 61, 139], w: 8, color: "#7D828E", before: "footL" }, { from: ["body", 96, 128], to: ["footR", 99, 139], w: 8, color: "#7D828E", before: "footR" },
              { from: ["body", 48, 106], to: ["handL", 41, 113], w: 13, color: "#A5AAB7", before: "handL" }, { from: ["body", 112, 106], to: ["handR", 119, 113], w: 13, color: "#A5AAB7", before: "handR" }],
      src: "robber-front", w: 160, h: 145, ground: 145, cx: 80,
      groups: { footR: [0], footL: [1], body: [2, 3, 5, 6], handR: [4, 18], handL: [7, 17], beanie: [19, 20] },
      // 원본 몸통은 귀 안쪽과 배 무늬 자리가 뚫려 있다. 빼면 구멍이 보이니 몸 색으로 칠해 메운다
      recolor: { 3: "#A5AAB7", 5: "#A5AAB7", 6: "#A5AAB7" },
      hide: [8, 9, 10, 11, 12, 13, 14, 15, 16],
    },
    "robber-side": {
      limbs: [{ from: ["body", 80, 128], to: ["backFoot", 71, 136], w: 8, color: "#7D808C", before: "backFoot" }, { from: ["body", 108, 126], to: ["frontFoot", 117, 132], w: 8, color: "#7D808C", before: "frontFoot" },
              { from: ["body", 110, 108], to: ["frontHand", 124, 104], w: 7, color: "#A3A8B5", before: "frontHand" }],
      w: 144, h: 164, ground: 141, cx: 93,
      groups: { shadow: [0], sack: [1], backFoot: [2], frontHand: [3, 4], head: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18], earR: [15, 16], body: [19, 26, 27], backArm: [20, 21, 22], frontFoot: [23], earL: [24, 25] },
      moveBefore: [["frontFoot", "body"]],
    },
    "robber-front": {
      limbs: [{ from: ["body", 64, 128], to: ["footL", 61, 139], w: 8, color: "#7D828E", before: "footL" }, { from: ["body", 96, 128], to: ["footR", 99, 139], w: 8, color: "#7D828E", before: "footR" },
              { from: ["body", 48, 106], to: ["handL", 41, 113], w: 13, color: "#A5AAB7", before: "handL" }, { from: ["body", 112, 106], to: ["handR", 119, 113], w: 13, color: "#A5AAB7", before: "handR" }],
      w: 160, h: 145, ground: 145, cx: 80,
      groups: { footR: [0], footL: [1], body: [2, 3, 5, 6, 8], handR: [4, 18], handL: [7, 17], face: [9, 10, 11, 12], eyes: [13, 14, 15, 16], beanie: [19, 20] },
    },
    "robber-jailed": {
      w: 140, h: 116, ground: 107, cx: 70,
      groups: { feet: [0, 1], body: [2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16], tearR: [6], tearL: [7], drop: [17, 18], barsR: [19, 20, 21, 22], barsL: [23, 24, 25, 26], barsT: [27, 28, 29, 30], handL: [31, 32], handR: [33, 34] },
    },
  };

  let uid = 0;
  function mount(svgText, name) {
    const def = { ...DEFS[name], name };
    const holder = document.createElement("div");
    holder.innerHTML = svgText.trim();
    const svg = holder.firstElementChild;
    svg.removeAttribute("width"); svg.removeAttribute("height");
    svg.setAttribute("overflow", "visible");
    // 마스크 id 가 그림끼리 겹치지 않게 바꾼다
    const tag = "r" + (uid++);
    svg.querySelectorAll("[id]").forEach(n => { const old = n.id; n.id = old + tag; svg.querySelectorAll(`[mask="url(#${old})"]`).forEach(m => m.setAttribute("mask", `url(#${old + tag})`)); svg.querySelectorAll(`[clip-path="url(#${old})"]`).forEach(m => m.setAttribute("clip-path", `url(#${old + tag})`)); });
    let defs = svg.querySelector("defs"); if (!defs) { defs = document.createElementNS(NS, "defs"); svg.prepend(defs); }
    const kids = [...svg.children].filter(n => !["defs", "mask", "clipPath", "style"].includes(n.tagName));
    const parts = {};
    const wrap = (n, part) => { const g = document.createElementNS(NS, "g"); n.replaceWith(g); g.append(n); (parts[part] ||= []).push(g); return g; };
    const owner = {};
    for (const [part, idx] of Object.entries(def.groups)) for (const i of idx) owner[i] = part;
    const wrappers = kids.map((n, i) => wrap(n, owner[i] || "rest"));
    for (const i of def.hide || []) wrappers[i].style.display = "none";
    // 같은 색 테두리를 살짝 둘러 메운 자리의 가는 경계선까지 지운다
    for (const [i, col] of Object.entries(def.recolor || {})) wrappers[i].querySelectorAll("[fill]").forEach(n => { if (n.getAttribute("fill") !== "none") { n.setAttribute("fill", col); n.setAttribute("stroke", col); n.setAttribute("stroke-width", "1.4"); } });
    // 몸통에서 발·팔 잘라 내기
    for (const sp of def.splits || []) {
      const rects = Object.entries(sp.cuts);
      for (const i of sp.from) {
        const src = wrappers[i];
        // 몸통 쪽: 잘라 낼 사각형을 뺀 나머지만 보이게
        const cpBody = document.createElementNS(NS, "clipPath"); cpBody.id = `cb${tag}_${i}_${Math.random().toString(36).slice(2, 6)}`;
        const pb = document.createElementNS(NS, "path"); pb.setAttribute("clip-rule", "evenodd");
        const poly = (pts, grow = 0) => "M" + pts.map(([x, y], k) => `${x} ${k < 2 ? y - grow : y}`).join("L") + "Z";
        pb.setAttribute("d", `M-500 -500H900V900H-500Z ` + rects.map(([, pts]) => poly(pts)).join(" "));
        cpBody.append(pb); defs.append(cpBody);
        const inner = document.createElementNS(NS, "g"); inner.setAttribute("clip-path", `url(#${cpBody.id})`);
        while (src.firstChild) inner.append(src.firstChild); src.append(inner);
        // 밑에 깔린 밝은 층에서는 조각을 떼지 않는다(발에 밝은 선이 생긴다). 잘라 내기만 한다
        if (sp.pieceFrom && !sp.pieceFrom.includes(i)) continue;
        for (const [part, pts] of rects) {
          const cp = document.createElementNS(NS, "clipPath"); cp.id = `cp${tag}_${part}_${i}`;
          // 조각은 뿌리선보다 1.5 위까지 잡아 몸 뒤로 겹친다. 그래야 잘린 선이 보이지 않는다
          const r = document.createElementNS(NS, "path"); r.setAttribute("d", sp.pieces && sp.pieces[part] ? poly(sp.pieces[part]) : poly(pts, 1.5));
          cp.append(r); defs.append(cp);
          const g = document.createElementNS(NS, "g"); const ig = document.createElementNS(NS, "g"); ig.setAttribute("clip-path", `url(#${cp.id})`);
          ig.append(inner.firstChild.cloneNode(true)); g.append(ig);
          src.parentNode.insertBefore(g, src); // 잘린 조각은 몸 뒤에
          (parts[part] ||= []).push(g);
        }
      }
    }
    for (const [a, b] of def.moveBefore || []) { const A = parts[a][0], B = parts[b][0]; B.parentNode.insertBefore(A, B); }
    const limbs = (def.limbs || []).map(L => {
      const ln = document.createElementNS(NS, "line");
      ln.setAttribute("stroke", L.color); ln.setAttribute("stroke-width", L.w); ln.setAttribute("stroke-linecap", "round");
      const ref = parts[L.before][0]; ref.parentNode.insertBefore(ln, ref);   // 발(손) 바로 뒤, 몸보다 뒤
      return { ...L, el: ln };
    });
    // 부위 g 의 변환을 점에 적용해, 움직인 뒤의 위치를 구한다
    const at = (part, x, y) => { const g = parts[part] && parts[part][0]; const t = g && g.transform.baseVal.consolidate(); if (!t) return [x, y]; const m = t.matrix; return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
    const updateLimbs = () => { for (const L of limbs) { const a = at(...L.from), b = at(...L.to); L.el.setAttribute("x1", a[0]); L.el.setAttribute("y1", a[1]); L.el.setAttribute("x2", b[0]); L.el.setAttribute("y2", b[1]); } };
    // 전체를 감싸는 g (기울기·찌그러짐·뒤집기)
    const all = document.createElementNS(NS, "g");
    [...svg.children].filter(n => !["defs", "mask", "clipPath", "style"].includes(n.tagName)).forEach(n => all.append(n));
    svg.append(all);
    const flip = document.createElementNS(NS, "g"); svg.append(flip); flip.append(all);
    updateLimbs(); // 처음부터 제자리에 둔다. 안 그러면 첫 장면에 왼쪽 위 모서리에 점이 찍힌다
    return {
      svg, def, parts, all, flip,
      set(part, tf) { (parts[part] || []).forEach(g => g.setAttribute("transform", tf)); },
      updateLimbs,
      reset() { Object.values(parts).flat().forEach(g => { g.removeAttribute("transform"); g.style.opacity = ""; }); all.removeAttribute("transform"); updateLimbs(); },
    };
  }

  // 용수철: 목표를 조금 늦게, 살짝 넘치게 따라간다
  class Spring { constructor(k, c) { this.k = k; this.c = c; this.x = 0; this.v = 0; }
    step(target, dt) { const n = Math.max(1, Math.ceil(dt / 0.002)); const h = dt / n; for (let i = 0; i < n; i++) { const a = this.k * (target - this.x) - this.c * this.v; this.v += a * h; this.x += this.v * h; } return this.x; } }

  // 걸음 주기 안의 발 위치: 땅에 닿은 동안 뒤로 밀고, 나머지 동안 들려서 앞으로
  function footCycle(u, stride = 11, lift = 6, stance = 0.55) {
    u = ((u % 1) + 1) % 1;
    if (u < stance) { const k = u / stance; return { x: stride - 2 * stride * k, y: 0, r: -6 + 16 * k }; }
    const k = (u - stance) / (1 - stance); const e = smooth(k);
    return { x: -stride + 2 * stride * e, y: -lift * Math.sin(Math.PI * k), r: 10 - 16 * e };
  }

  // 몸 움직임 계산기: 몸 높이와 가속도를 내고, 부위 용수철을 돌린다
  function makeBody() {
    return { y: 0, v: 0, a: 0, last: null,
      update(y, dt) { if (this.last === null) { this.last = y; } const v = (y - this.last) / Math.max(dt, 1e-4); this.a = (v - this.v) / Math.max(dt, 1e-4); this.v = v; this.last = y; this.y = y; } };
  }

  // ───────── 모션 ─────────
  // 각 모션은 make(rig) → { update(dt, ctx) } 형태. ctx.speed(0..1) 로 걸음 빠르기를 바꾼다
  const MOTIONS = {};

  // 정면 대기: 숨쉬기, 깜빡임, 모자·얼굴이 반 박자 늦게
  MOTIONS.idleFront = (rig) => {
    const d = rig.def, B = makeBody(); let t = 0;
    const face = new Spring(320, 16), hat = new Spring(140, 9), hatR = new Spring(90, 6), arm = new Spring(60, 6);
    return { update(dt) {
      t += dt; const br = 0.5 - 0.5 * Math.cos(TAU * t / 1.8);
      const y = 2.2 * br; B.update(y, dt);
      const sy = 1 - 0.022 * br, sx = 1 + 0.012 * br;
      rig.set("body", piv(d.cx, d.ground, 0, sx, sy, 0, 0));
      const fy = face.step(y * 0.9, dt);
      ["face", "cheeks", "earIn"].forEach(p => rig.set(p, piv(d.cx, d.ground, 0, 1, 1, 0, fy)));
      const hy = hat.step(y, dt), hr = hatR.step(-B.v * 0.25, dt);
      // 모자는 머리 위로 들뜨지 않게, 눌리는 쪽으로만 늦게 따라온다. 들뜨면 모자 밑에 틈이 보인다
      const hyc = y + clamp(hy - y, -0.2, 2.2), hrc = clamp(hr, -2.5, 2.5);
      rig.set("hat", piv(d.cx, 40, hrc, 1, 1, 0, hyc)); rig.set("beanie", piv(d.cx, 45, hrc, 1, 1, 0, hyc));
      const blinkT = t % 3.2; const bl = blinkT > 2.9 && blinkT < 3.05 ? 0.12 : 1;
      rig.set("eyes", piv(d.cx, d.name.startsWith("robber") ? 71 : 84, 0, 1, bl, 0, fy));
      const ar = arm.step(Math.sin(TAU * t / 1.8) * 4, dt);
      rig.set("armL", piv(42, 170, ar, 1, 1, 0, y * 0.6)); rig.set("armR", piv(138, 170, -ar, 1, 1, 0, y * 0.6));
      rig.set("handL", piv(46, 108, ar * 1.0, 1, 1, 0, y * 0.8)); rig.set("handR", piv(114, 108, -ar * 1.0, 1, 1, 0, y * 0.8));
    } };
  };

  // 옆으로 달리기: 두 걸음에 한 바퀴. 몸 들썩임, 발 굴리기, 머리·귀·자루·팔 용수철
  MOTIONS.runSide = (rig, opts = {}) => {
    const d = rig.def, B = makeBody(); let ph = 0;
    const head = new Spring(900, 38), earA = new Spring(260, 9), earB = new Spring(220, 8), sack = new Spring(160, 9), sackR = new Spring(120, 7), hand = new Spring(500, 26), hatR = new Spring(200, 10);
    const crouch = opts.crouch || 0;
    return { update(dt, ctx = {}) {
      const speed = ctx.speed ?? 1, T = (opts.period || 0.44) / (0.55 + 0.45 * speed);
      ph = ctx.phase !== undefined ? ctx.phase : (ph + dt / T) % 1;
      const s = (ph * 2) % 1; const amp = (opts.bob ?? 7) * (0.6 + 0.4 * speed);
      const y = -amp * (0.5 - 0.5 * Math.cos(TAU * (s - 0.12))) + crouch * 10;
      B.update(y, dt);
      const sq = clamp(-B.a * 0.00003, -0.045, 0.035), sy = (1 + sq) * (1 - crouch * 0.12), sx = 1 / Math.sqrt(1 + sq) * (1 + crouch * 0.06);
      rig.all.setAttribute("transform", piv(d.cx, d.ground, 4 * speed + crouch * 4 + 1.2 * Math.sin(ph * TAU * 2), 1, 1));
      const hy = head.step(y, dt), ea = earA.step(-B.a * 0.0016, dt), eb = earB.step(-B.a * 0.0013, dt);
      const ff = footCycle(ph, 14 * (0.7 + 0.3 * speed), 9 * (1 - crouch * 0.6)), bf = footCycle(ph + 0.5, 14 * (0.7 + 0.3 * speed), 9 * (1 - crouch * 0.6));
      if (d.name === "robber-side") {
        rig.set("body", piv(93, 141, 0, sx, sy, 0, y));
        rig.set("head", piv(95, 112, 1.5 * Math.sin(ph * TAU * 2 - 1.2), sx, sy, 0, hy));
        rig.set("earL", piv(58, 74, ea, 1, 1, 0, hy)); rig.set("earR", piv(106, 42, -eb * 0.9, 1, 1, 0, hy));
        rig.set("sack", piv(62, 70, sackR.step(B.a * 0.0011, dt), 1, 1, 0, sack.step(y, dt)));
        rig.set("backArm", piv(72, 106, 10 * Math.sin(ph * TAU + 1.0), 1, 1, 0, y));
        rig.set("frontHand", piv(121, 104, -6 * Math.sin(ph * TAU + 1.0), 1, 1, -3 * Math.cos(ph * TAU), hand.step(y, dt)));
        rig.set("frontFoot", piv(117, 132, ff.r, 1, 1, ff.x * 0.8, ff.y));
        rig.set("backFoot", piv(71, 136, bf.r, 1, 1, bf.x * 0.8, bf.y));
        const lift = -y / 7; rig.set("shadow", piv(76, 150, 0, 1 - 0.12 * lift, 1 - 0.12 * lift));
      } else { // police-side
        rig.set("body", piv(80, 188, 0, sx, sy, 0, y));
        rig.set("head", piv(85, 140, 1.5 * Math.sin(ph * TAU * 2 - 1.2), sx, sy, 0, hy));
        rig.set("earL", piv(48, 78, ea * 0.9, 1, 1, 0, hy)); rig.set("earR", piv(112, 50, -eb * 0.8, 1, 1, 0, hy));
        const hr = hatR.step(B.a * 0.0012, dt);
        rig.set("hat", piv(52, 52, hr, 1, 1, 0, hy)); rig.set("badge", piv(52, 52, hr, 1, 1, 0, hy));
        rig.set("baton", piv(50, 150, (opts.batonSwing ?? 12) * Math.sin(ph * TAU + 1.0), 1, 1, 0, hand.step(y, dt)));
        rig.set("frontArm", piv(120, 145, -8 * Math.sin(ph * TAU + 1.0), 1, 1, 0, y));
        rig.set("frontFoot", piv(110, 180, ff.r, 1, 1, ff.x * 0.7, ff.y * 0.8));
        rig.set("backFoot", piv(59, 184, bf.r, 1, 1, bf.x * 0.7, bf.y * 0.8));
        const lift = -y / 7; rig.set("shadow", piv(80, 185, 0, 1 - 0.12 * lift, 1 - 0.12 * lift));
      }
    } };
  };

  // 앞으로(화면 아래, 카메라 쪽으로) 달리기: 제자리에서 발을 번갈아 들고, 몸이 좌우로 살짝 흔들린다
  MOTIONS.runFront = (rig) => {
    const d = rig.def, B = makeBody(); let ph = 0;
    const face = new Spring(700, 30), hat = new Spring(260, 11), hatR = new Spring(160, 8);
    return { update(dt, ctx = {}) {
      const speed = ctx.speed ?? 1, T = 0.44 / (0.55 + 0.45 * speed);
      ph = ctx.phase !== undefined ? ctx.phase : (ph + dt / T) % 1;
      const s = (ph * 2) % 1;
      const y = -6 * (0.5 - 0.5 * Math.cos(TAU * (s - 0.12)));
      B.update(y, dt);
      const sq = clamp(-B.a * 0.00003, -0.045, 0.035), sy = 1 + sq, sx = 1 / Math.sqrt(sy);
      const sway = 2.2 * Math.sin(ph * TAU);
      rig.all.setAttribute("transform", piv(d.cx, d.ground, sway, sx, sy, 0, y));
      const fy = face.step(0, dt) * 0, hy = hat.step(y, dt) - y, hr = hatR.step(-sway * 1.2, dt) + sway * 0.0;
      ["face", "cheeks", "earIn", "eyes"].forEach(p => rig.set(p, piv(d.cx, d.ground, 0, 1, 1, sway * 0.6, 0)));
      const hyc = clamp(hy, -0.2, 2.2), hrc = clamp(hr - sway, -2.5, 2.5);
      rig.set("hat", piv(d.cx, 40, hrc, 1, 1, sway * 0.3, hyc)); rig.set("beanie", piv(d.cx, 45, hrc, 1, 1, sway * 0.3, hyc));
      // 발: 한쪽이 들리면 다른 쪽은 땅에. 들린 발은 살짝 안쪽·위로
      const L = Math.max(0, Math.sin(ph * TAU)), R = Math.max(0, -Math.sin(ph * TAU));
      const fl = d.name.startsWith("robber") ? [[61, 140], [99, 140]] : [[52, 196], [126, 196]];
      const tilt = d.name.startsWith("robber") ? 8 : 3;
      rig.set("footL", piv(fl[0][0], fl[0][1], -tilt * L, 1, 1, 2 * L, -10 * L - y));
      rig.set("footR", piv(fl[1][0], fl[1][1], tilt * R, 1, 1, -2 * R, -10 * R - y));
      // 팔: 발과 반대로
      const a = Math.sin(ph * TAU);
      rig.set("armL", piv(42, 170, 10 * a, 1, 1, 0, 0)); rig.set("armR", piv(138, 170, 10 * a, 1, 1, 0, 0));
      rig.set("handL", piv(46, 108, 7 * a, 1, 1, 0, -2 * a)); rig.set("handR", piv(114, 108, 7 * a, 1, 1, 0, 2 * a));
    } };
  };

  // 냥파 잡기 (옆모습): 움츠렸다가 앞으로 뛰어들며 곤봉을 휘두른다. 0.6초
  MOTIONS.catchSide = (rig) => {
    const d = rig.def; let t = 0; const head = new Spring(600, 24), earA = new Spring(260, 9), hatR = new Spring(200, 10); const B = makeBody();
    // t, 앞뒤 이동, 기울기(+ 앞으로), 세로 찌그러짐, 높이, 곤봉 회전(+ 앞으로 내리침)
    const key = [[0, 0, 0, 1, 0, 0], [0.14, -8, -6, 0.92, 2, -35], [0.27, 30, 10, 1.06, -8, 95], [0.4, 28, 6, 0.98, -2, 80], [0.6, 0, 0, 1, 0, 0]];
    const at = (tt) => { for (let i = 1; i < key.length; i++) if (tt <= key[i][0]) { const a = key[i - 1], b = key[i], k = smooth((tt - a[0]) / (b[0] - a[0])); return a.map((v, j) => v + (b[j] - v) * k); } return key[key.length - 1]; };
    return { done: false, update(dt) {
      t += dt; const [, x, r, sy, y, bat] = at(Math.min(t, 0.6)); B.update(y, dt);
      rig.all.setAttribute("transform", piv(80, 188, r, 1 / Math.sqrt(sy), sy, x, y));
      const hy = head.step(0, dt); rig.set("head", piv(85, 140, 0, 1, 1, 0, hy));
      const ea = earA.step(-B.a * 0.002, dt); rig.set("earL", piv(48, 78, ea, 1, 1, 0, 0)); rig.set("earR", piv(112, 50, -ea, 1, 1, 0, 0));
      const hr = hatR.step(B.a * 0.0015, dt); rig.set("hat", piv(52, 52, hr)); rig.set("badge", piv(52, 52, hr));
      rig.set("baton", piv(50, 150, bat));
      this.done = t >= 0.6; this.t = t;
    } };
  };

  // 도둥이 수감: 훌쩍이며 두 번 들썩이고, 눈물이 길어졌다 줄었다, 창살을 쥔 손이 꼼지락
  MOTIONS.jailed = (rig) => {
    let t = 0; const B = makeBody(); const tear = new Spring(120, 8);
    return { update(dt) {
      t += dt; const c = t % 1.6; const sob = c < 0.5 ? Math.max(0, Math.sin(c / 0.25 * Math.PI)) : 0;
      const y = -3 * sob; B.update(y, dt);
      rig.set("body", piv(70, 107, 0, 1 - 0.015 * sob, 1 + 0.03 * sob, 0, y));
      const ts = 1 + 0.25 * tear.step(sob, dt);
      rig.set("tearL", piv(56, 58, 0, 1, ts, 0, y)); rig.set("tearR", piv(84, 58, 0, 1, ts, 0, y));
      rig.set("drop", piv(74, 56, 0, 1, 1, 0, y));
      rig.set("handL", piv(47, 81, 0, 1, 1, 0, -1.5 * sob)); rig.set("handR", piv(93, 81, 0, 1, 1, 0, -1.5 * sob));
      rig.set("feet", piv(70, 107, 0, 1, 1, 0, 0));
    } };
  };

  // 탈옥: 창살이 양옆으로 튕겨 나가며 사라진다. 도둥이 몸은 정면 그림이 대신 뛰어나온다
  MOTIONS.breakout = (rig) => {
    let t = 0;
    return { update(dt) {
      t += dt; const k = Math.min(1, t / 0.4), e = 1 - (1 - k) * (1 - k);
      ["body", "feet", "tearL", "tearR", "drop", "handL", "handR"].forEach(p => (rig.parts[p] || []).forEach(g => g.style.opacity = 0));
      rig.set("barsL", piv(26, 60, -18 * e, 1, 1, -34 * e, 10 * e * e)); rig.set("barsR", piv(110, 60, 18 * e, 1, 1, 34 * e, 10 * e * e));
      rig.set("barsT", piv(70, 58, 0, 1 + 0.15 * e, 1, 0, -6 * e));
      ["barsL", "barsR", "barsT"].forEach(p => (rig.parts[p] || []).forEach(g => g.style.opacity = 1 - e));
    } };
  };

  // 냥파 킁킁 (정면): 고개를 갸웃하며 코를 실룩, 얼굴이 냄새 쪽으로
  MOTIONS.sniff = (rig) => {
    const d = rig.def; let t = 0; const face = new Spring(400, 18), hatR = new Spring(140, 8);
    return { update(dt) {
      t += dt; const c = t % 1.4; const dir = c < 0.7 ? -1 : 1; const k = (c % 0.7) / 0.7;
      const tilt = dir * 5 * smooth(Math.min(1, k * 3)) * (k > 0.85 ? (1 - (k - 0.85) / 0.15) : 1);
      const twitch = Math.sin(t * TAU * 7) * 0.5 + 0.5;
      rig.all.setAttribute("transform", piv(d.cx, d.ground, tilt * 0.6, 1, 1, 0, 0));
      const fx = face.step(dir * 6 * smooth(Math.min(1, k * 3)), dt);
      ["face", "cheeks", "earIn"].forEach(p => rig.set(p, piv(d.cx, 95, 0, 1, 1, fx, -1.5 * twitch * (k > 0.2 && k < 0.8 ? 1 : 0))));
      rig.set("eyes", piv(d.cx, 84, 0, 1, 1, fx * 1.1, 0));
      rig.set("hat", piv(d.cx, 40, hatR.step(-tilt * 1.4, dt), 1, 1, 0, 0));
      rig.set("armL", piv(42, 170, -6 * twitch, 1, 1, 0, 0)); rig.set("armR", piv(138, 170, 6 * twitch, 1, 1, 0, 0));
    } };
  };

  return { mount, MOTIONS, DEFS, piv, Spring, smooth, clamp, footCycle };
})();
