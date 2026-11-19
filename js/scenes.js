// 入口冲击区的地面装置与场景复原。坐标为墙前的局部坐标：u 沿墙（面向墙时向右为正），n 从墙面向厅内（米）。
// 装置贴着墙放，高度一般不超过 1.3 米，以免挡住墙上的大字；高的部分放在两侧。
import * as THREE from 'three';
import { lam, basic, textCanvas, rng, SANS, FONT } from './util.js';

import { finish, surface } from './finishes.js';

const M = {};
const mat = (k, f) => M[k] ||= f();
const wood = () => surface('timber');
const darkWood = () => mat('dwood', () => { const m = wood().clone(); m.color.set(0x987d66); m.roughness = 0.72; return m; });
const steel = () => mat('steel', () => finish(0x65686a, 0.55, 0.56));

export function makeCtx(THREEg, g, y, toW, rotY, W, D, obst) {
  const e = new THREE.Euler(0, 0, 0, 'YXZ'), q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const place = (o, u, yy, n, ry = 0, rx = 0, rz = 0) => { const [x, z] = toW(u, n); o.position.set(x, y + yy, z); o.rotation.set(rx, rotY + ry, rz, 'YXZ'); g.add(o); return o; };
  return {
    g, y, W, D, rotY, toW,
    box(w, h, d, m, u, yy, n, ry = 0, rx = 0, rz = 0) { return place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), u, yy, n, ry, rx, rz); },
    mesh(geo, m, u, yy, n, ry = 0, rx = 0, rz = 0) { return place(new THREE.Mesh(geo, m), u, yy, n, ry, rx, rz); },
    inst(geo, m, list) {   // list: [u, y, n, ry, rx, rz, sx, sy, sz, color?]
      const im = new THREE.InstancedMesh(geo, m, list.length);
      list.forEach((p, i) => {
        const [x, z] = toW(p[0], p[2]); e.set(p[4] || 0, rotY + (p[3] || 0), p[5] || 0, 'YXZ'); q.setFromEuler(e);
        m4.compose(v.set(x, y + p[1], z), q, s.set(p[6] || 1, p[7] || 1, p[8] || 1)); im.setMatrixAt(i, m4);
        if (p[9] !== undefined) im.setColorAt(i, new THREE.Color(p[9]));
      });
      g.add(im); return im;
    },
    label(text, u, n, w = 3, color = '#cfc7b4') {   // 地面上的说明字
      const cv = textCanvas(1024, 96, (c, W2, H2) => { c.fillStyle = color; c.font = `34px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W2 / 2, H2 / 2); });
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 1024), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      const [x, z] = toW(u, n); m.position.set(x, y + 0.02, z); m.rotation.set(-Math.PI / 2, rotY, 0, 'YXZ'); m.renderOrder = 2; g.add(m); return m;
    },
    obst
  };
}

const R0 = (seed) => rng(seed);
const canvasMat = (key, w, h, draw, extra = {}) => mat(key, () => { const t = new THREE.CanvasTexture(textCanvas(w, h, draw)); t.colorSpace = THREE.SRGBColorSpace; return lam(0xffffff, { map: t, ...extra }); });

// 每个部件共用同一组摆放变换，倒下的凳子也保留横档与四条腿。
function woodenStools(c, placements, material) {
  c.inst(new THREE.BoxGeometry(0.32, 0.034, 0.26).translate(0, 0.203, 0), material, placements);
  for (const side of [-1, 1]) {
    const legs = new THREE.BoxGeometry(0.034, 0.41, 0.034).rotateZ(side * 0.07);
    for (const end of [-1, 1]) c.inst(legs.clone().translate(side * 0.122, -0.014, end * 0.091), material, placements);
    c.inst(new THREE.BoxGeometry(0.25, 0.03, 0.022).translate(0, -0.084, side * 0.091), material, placements);
  }
}

export const SCENES = {
  none() {},
  // 第6厅：步枪架
  rifles(c) {   // 韩战：步枪架
    const W = Math.min(4.2, c.W - 1), n = 0.45;
    c.box(W, 0.06, 0.08, darkWood(), 0, 0.32, n); c.box(W, 0.06, 0.08, darkWood(), 0, 0.92, n + 0.16);
    for (const u of [-W / 2, W / 2]) c.box(0.08, 1.0, 0.5, darkWood(), u, 0.5, n + 0.1);
    const list = [], stock = [];
    for (let i = 0; i < 14; i++) { const u = -W / 2 + 0.25 + i * (W - 0.5) / 13; list.push([u, 0.62, n + 0.12, 0, -0.18, 0]); stock.push([u, 0.14, n + 0.02, 0, -0.18, 0]); }
    c.inst(new THREE.BoxGeometry(0.035, 1.05, 0.035), mat('gun', () => lam(0x1e1e1e)), list);
    c.inst(new THREE.BoxGeometry(0.07, 0.34, 0.13), darkWood(), stock);
    c.label('志愿军的步枪架（示意）', 0, n + 1.0, 2.4);
    c.obst(-W / 2 - 0.2, W / 2 + 0.2, 0, n + 0.6);
  },
  // 第1厅：一千根木桩，每根代表一百人
  stakes(c) {
    const R = R0(2), list = [], tags = [], W = c.W - 0.8, D = Math.min(c.D, 2.4), n0 = 0.35;
    const cols = 50, rows = 20, du = W / cols, dn = (D - 0.15) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const u = -W / 2 + (i + 0.5) * du + (R() - 0.5) * du * 0.4, n = n0 + (j + 0.5) * dn + (R() - 0.5) * dn * 0.4, h = 0.32 + R() * 0.14;
      list.push([u, h / 2, n, R() * 3, (R() - 0.5) * 0.12, (R() - 0.5) * 0.12, 1, h / 0.4, 1]); tags.push([u, h - 0.05, n + 0.022, 0, 0, 0]);
    }
    c.inst(new THREE.BoxGeometry(0.035, 0.4, 0.035), mat('stake', () => lam(0x7a6248)), list);
    c.inst(new THREE.PlaneGeometry(0.03, 0.05), mat('tag', () => basic(0xd8d0bc, { side: THREE.DoubleSide })), tags);
    c.obst(-W / 2, W / 2, 0, n0 + D);
  },
  // 第2厅：一排排凳子，每两个里倒下一个
  stools(c) {
    const up = [], down = [], W = Math.min(c.W - 0.6, 6), D = Math.min(c.D, 2.6), cols = 10, rows = 3;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const u = -W / 2 + (i + 0.5) * W / cols, n = 0.5 + j * (D - 0.6) / Math.max(1, rows - 1), k = (i + j) % 2;
      if (k) up.push([u, 0.22, n, (i * 7 + j) % 3 * 0.1]); else down.push([u, 0.17, n, 0.4, Math.PI / 2, 0]);
    }
    woodenStools(c, up, wood()); woodenStools(c, down, darkWood());
    c.obst(-W / 2 - 0.2, W / 2 + 0.2, 0.2, D + 0.2);
  },
  // 第3厅：拒马与铁丝
  cheval(c) {
    const W = c.W - 1, n = Math.min(1.2, c.D * 0.5), list = [];
    for (let i = 0; i < 4; i++) { const u = -W / 2 + 0.6 + i * (W - 1.2) / 3; for (const a of [0.7, -0.7]) list.push([u, 0.55, n, 0, 0, a]); }
    c.inst(new THREE.BoxGeometry(0.1, 1.5, 0.1), darkWood(), list);
    c.box(W, 0.08, 0.08, darkWood(), 0, 0.55, n);
    for (let k = 0; k < 4; k++) c.box(W, 0.012, 0.012, steel(), 0, 0.3 + k * 0.25, n + (k % 2 ? 0.25 : -0.25));
    c.obst(-W / 2, W / 2, n - 0.7, n + 0.7);
  },
  // 第5厅：七十二块斩标，每块代表一万人
  placards(c) {
    const m = canvasMat('placard', 128, 640, (x, w, h) => {
      x.fillStyle = '#e8e0cc'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1714'; x.font = `bold 52px ${FONT}`; x.textAlign = 'center';
      ['反', '革', '命', '分', '子'].forEach((ch, i) => x.fillText(ch, w / 2, 70 + i * 62));
      x.fillStyle = 'rgba(30,26,22,.6)'; for (let i = 0; i < 3; i++) x.fillRect(w / 2 - 22, 400 + i * 48, 44, 30);
      x.strokeStyle = '#b01c14'; x.lineWidth = 14; x.beginPath(); x.moveTo(14, 380); x.lineTo(w - 14, 610); x.moveTo(w - 14, 380); x.lineTo(14, 610); x.stroke();
    });
    const R = R0(5), boards = [], sticks = [], W = c.W - 0.8, D = Math.min(c.D, 2.6), cols = 18, rows = 4;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const u = -W / 2 + (i + 0.5) * W / cols + (R() - 0.5) * 0.08, n = 0.45 + j * (D - 0.5) / (rows - 1), tilt = (R() - 0.5) * 0.12, h = 0.5 + j * 0.04;
      sticks.push([u, h / 2, n, 0, tilt, 0, 1, h, 1]); boards.push([u, h + 0.32, n + 0.02, 0, tilt, 0]);
    }
    c.inst(new THREE.BoxGeometry(0.03, 1, 0.03), wood(), sticks);
    c.inst(new THREE.BoxGeometry(0.15, 0.75, 0.012), m, boards);
    c.obst(-W / 2, W / 2, 0.2, D + 0.2);
  },
  // 第7厅：成堆的档案袋与铁皮档案柜
  // 第4厅：烧掉的地契与分地的木桩
  deeds(c) {
    const R = R0(31), list = [], ash = [], W = c.W - 1.4, D = Math.min(c.D, 2.4);
    for (let i = 0; i < 260; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 1.1, u = Math.cos(a) * r * 1.4, n = 0.3 + D / 2 + Math.sin(a) * r * Math.min(1, D / 2.4);
      const burnt = r < 0.55 ? R() < 0.8 : R() < 0.2;
      (burnt ? ash : list).push([u, 0.01 + R() * 0.12 * (1.2 - r), n, R() * 6, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3, 1, 1, 1, burnt ? (R() > 0.5 ? 0x2a2420 : 0x4a3a2a) : (R() > 0.5 ? 0xd9ccb0 : 0xc8b48e)]); }
    c.inst(new THREE.BoxGeometry(0.3, 0.004, 0.42), lam(0xffffff), list);
    c.inst(new THREE.BoxGeometry(0.26, 0.004, 0.36), lam(0xffffff), ash);
    const stake = mat('stake', () => lam(0x6a5236)), tag = mat('stag', () => lam(0xe8e0cc));
    for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) { const u = sg * (W / 2 - k * 0.5), n = 0.4 + k * 0.6; c.box(0.07, 0.9, 0.07, stake, u, 0.45, n); c.box(0.16, 0.22, 0.01, tag, u, 0.75, n + 0.045); }
    c.label('一九四七—一九五二：地契被当众烧掉，土地按人口重新丈量、分配', 0, D + 0.75, 3.6);
    c.obst(-W / 2 - 0.2, W / 2 + 0.2, 0.2, D + 0.4);
  },
  files(c) {
    const R = R0(6), list = [], W = c.W - 1.2;
    for (let s = 0; s < 22; s++) { const u = -W / 2 + (s + 0.5) * W / 22, n = 0.45 + (s % 3) * 0.34, k = 5 + Math.floor(R() * 14);
      for (let j = 0; j < k; j++) list.push([u + (R() - 0.5) * 0.04, 0.02 + j * 0.05, n + (R() - 0.5) * 0.04, (R() - 0.5) * 0.2, 0, 0, 1, 1, 1, R() > 0.5 ? 0xb08a58 : 0x9c7848]); }
    c.inst(new THREE.BoxGeometry(0.24, 0.045, 0.33), lam(0xffffff), list);
    const enamel = mat('fileEnamel', () => finish(0x667269, 0.52, 0.22));
    const card = mat('fileCard', () => finish(0xd8c9aa, 0.95));
    for (const u of [-c.W / 2 - 0.4, c.W / 2 + 0.4]) {
      c.box(0.9, 1.8, 0.55, darkWood(), u, 0.9, 0.35);
      for (let k = 0; k < 4; k++) {
        const y = 0.26 + k * 0.435;
        c.box(0.875, 0.419, 0.035, enamel, u, y, 0.635);
        c.box(0.22, 0.074, 0.012, steel(), u, y + 0.077, 0.658);
        c.box(0.19, 0.05, 0.008, card, u, y + 0.077, 0.668);
        for (const end of [-0.084, 0.084]) c.box(0.018, 0.025, 0.065, steel(), u + end, y - 0.025, 0.68);
        c.box(0.184, 0.024, 0.018, steel(), u, y - 0.025, 0.715);
      }
    }
    c.obst(-W / 2, W / 2, 0.2, 1.4); c.obst(-c.W / 2 - 0.9, -c.W / 2 + 0.1, 0, 0.7); c.obst(c.W / 2 - 0.1, c.W / 2 + 0.9, 0, 0.7);
  },
  // 第8厅：夹边沟的沙丘与木牌
  dunes(c) {
    const W = c.W - 0.6, D = Math.min(c.D, 2.6);
    const sand = mat('sand', () => lam(0x8a7656)), Rd = R0(70);
    for (let i = 0; i < 9; i++) { const m = c.mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), sand, -W / 2 + 0.4 + Rd() * (W - 0.8), 0, 0.3 + Rd() * (D - 0.4), Rd() * 3); m.scale.set(0.5 + Rd() * 0.9, 0.12 + Rd() * 0.14, 0.4 + Rd() * 0.5); }
    const R = R0(7), list = [];
    for (let i = 0; i < 26; i++) list.push([-W / 2 + 0.3 + R() * (W - 0.6), 0.3, 0.4 + R() * (D - 0.5), (R() - 0.5) * 0.5, (R() - 0.5) * 0.25, (R() - 0.5) * 0.2]);
    c.inst(new THREE.BoxGeometry(0.12, 0.42, 0.025), mat('grave', () => lam(0x8a7458)), list);
    c.obst(-W / 2, W / 2, 0, D + 0.2);
  },
  // 第9厅：回炉的铁锅与土高炉
  woks(c) {
    const R = R0(8), list = [], W = Math.min(c.W - 2, 4.4), D = Math.min(c.D, 2.2);
    for (let i = 0; i < 160; i++) { const a = R() * 6.28, r = Math.sqrt(R()), u = Math.cos(a) * r * W / 2, n = 0.3 + D / 2 + Math.sin(a) * r * (D / 2 - 0.2), h = (1 - r) * 0.7;
      list.push([u, h + 0.05, n, R() * 6, (R() - 0.5) * 1.4, (R() - 0.5) * 1.4]); }
    c.inst(new THREE.CylinderGeometry(0.28, 0.12, 0.09, 12, 1, true), mat('wok', () => lam(0x2a2826, { side: THREE.DoubleSide })), list);
    const fu = c.W / 2 + 0.2, fr = Math.min(0.75, Math.max(0.4, c.D / 2 - 0.05)), fn = fr + 0.05;
    c.mesh(new THREE.CylinderGeometry(fr * 0.6, fr, 1.6, 10), mat('brick2', () => lam(0x6a3a26)), fu, 0.8, fn);
    c.mesh(new THREE.CircleGeometry(fr * 0.4, 12), mat('glow', () => basic(0xff7a2a)), fu, 0.5, fn + fr * 0.85);
    c.obst(-W / 2 - 0.2, W / 2 + 0.2, 0.1, Math.min(D + 0.4, c.D)); c.obst(fu - fr - 0.05, fu + fr + 0.05, 0, fn + fr + 0.05);
  },
  // 第10厅：公共食堂的长桌，空碗
  canteen(c) {
    const W = Math.min(c.W - 1, 5), n = Math.min(1.1, c.D * 0.5);
    for (let k = 0; k < 4; k++) c.box(W, 0.055, 0.196, darkWood(), 0, 0.7625, n + (k - 1.5) * 0.2);
    for (const u of [-W / 2 + 0.25, W / 2 - 0.25]) {
      for (const dn of [-0.31, 0.31]) c.box(0.08, 0.74, 0.08, darkWood(), u, 0.37, n + dn);
      c.box(0.07, 0.09, 0.73, wood(), u, 0.28, n);
      for (const dn of [-0.65, 0.65]) c.box(0.085, 0.43, 0.22, wood(), u, 0.215, n + dn);
    }
    for (const dn of [-0.65, 0.65]) c.box(W, 0.05, 0.28, darkWood(), 0, 0.45, n + dn);
    const bowls = [], sticks = [];
    for (let i = 0; i < 12; i++) for (const side of [-1, 1]) {
      const u = -W / 2 + 0.3 + i * (W - 0.6) / 11;
      bowls.push([u, 0.79, n + side * 0.22]);
      for (const gap of [0, 0.014]) sticks.push([u + 0.12 + gap, 0.795, n + side * 0.22, 0.15]);
    }
    // 旋转剖面包含圈足、碗沿和内壁，俯看时可以看到空碗的底部。
    const profile = [[0, 0], [0.036, 0], [0.038, 0.012], [0.059, 0.031], [0.081, 0.067],
      [0.083, 0.073], [0.079, 0.075], [0.074, 0.066], [0.052, 0.035], [0.028, 0.020], [0, 0.018]];
    c.inst(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 28), mat('bowl', () => finish(0xe6dfc9, 0.27)), bowls);
    c.inst(new THREE.BoxGeometry(0.006, 0.007, 0.22), mat('chop', () => lam(0x8a6a40)), sticks);
    c.obst(-W / 2 - 0.1, W / 2 + 0.1, n - 0.85, n + 0.85);
  },
  // 第11厅：深圳湾的水面，篮球、猪尿泡和汽车内胎
  sea(c) {
    const W = c.W - 0.4, D = Math.min(c.D, 2.8);
    const water = c.mesh(new THREE.PlaneGeometry(W, D), mat('water', () => new THREE.MeshPhongMaterial({ color: 0x0c1a24, shininess: 90, specular: 0x6688aa })), 0, 0.04, D / 2 + 0.1, 0, -Math.PI / 2, 0);
    void water;
    c.box(W + 0.2, 0.12, 0.12, mat('rim', () => lam(0x1a1c1e)), 0, 0.06, D + 0.15);
    const R = R0(10), balls = [], tubes = [];
    for (let i = 0; i < 9; i++) balls.push([-W / 2 + 0.4 + R() * (W - 0.8), 0.12, 0.4 + R() * (D - 0.6), 0, 0, 0, 1, 1, 1, R() > 0.5 ? 0xc06a2a : 0xd8b8a0]);
    for (let i = 0; i < 4; i++) tubes.push([-W / 2 + 0.6 + R() * (W - 1.2), 0.08, 0.5 + R() * (D - 0.8), 0, Math.PI / 2, 0]);
    c.inst(new THREE.SphereGeometry(0.12, 12, 8), lam(0xffffff), balls);
    c.inst(new THREE.TorusGeometry(0.32, 0.09, 8, 18), mat('tube', () => lam(0x1a1a1a)), tubes);
    c.obst(-W / 2, W / 2, 0, D + 0.25);
  },
  // 第12厅：高音喇叭与满地传单
  speakers(c) {
    const pu = c.W / 2 + 0.4;
    c.box(0.1, 4.2, 0.1, steel(), pu, 2.1, 0.5);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.5; c.mesh(new THREE.ConeGeometry(0.22, 0.55, 12, 1, true), mat('horn', () => lam(0x8a8e88, { side: THREE.DoubleSide })), pu + Math.sin(a) * 0.25, 3.9, 0.5 + Math.cos(a) * 0.25, a, Math.PI / 2, 0); }
    const R = R0(11), list = [], W = c.W, D = Math.min(c.D, 3);
    for (let i = 0; i < 360; i++) list.push([-W / 2 + R() * W, 0.012 + R() * 0.01, 0.2 + R() * D, R() * 6, -Math.PI / 2, 0, 1, 1, 1, R() > 0.75 ? 0xd84a3a : R() > 0.5 ? 0xe8d8b0 : 0xf0ece0]);
    c.inst(new THREE.PlaneGeometry(0.21, 0.29), lam(0xffffff, { side: THREE.DoubleSide }), list);
    c.obst(pu - 0.2, pu + 0.2, 0.3, 0.7);
  },
  // 第13厅：翻倒的课桌，黑板
  classroom(c) {
    const R = R0(12), W = Math.min(c.W - 0.6, 6), D = Math.min(c.D, 2.6);
    const desk = (u, n, over) => {
      const ry = (R() - 0.5) * 0.8;
      if (over) { c.box(1.1, 0.04, 0.45, wood(), u, 0.24, n, ry, 0, Math.PI / 2 * (R() > 0.5 ? 1 : -1)); c.box(1.0, 0.45, 0.04, darkWood(), u, 0.03, n + 0.2, ry, Math.PI / 2, 0); }
      else { c.box(1.1, 0.04, 0.45, wood(), u, 0.74, n, ry); for (const du of [-0.5, 0.5]) c.box(0.04, 0.72, 0.4, darkWood(), u + du * Math.cos(ry), 0.36, n - du * Math.sin(ry), ry); }
    };
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) desk(-W / 2 + 0.7 + i * (W - 1.4) / 3, 0.6 + j * (D - 1.0), (i + j) % 3 !== 0);
    const chairs = []; for (let i = 0; i < 9; i++) chairs.push([-W / 2 + R() * W, 0.2, 0.3 + R() * (D - 0.4), R() * 6, R() > 0.5 ? Math.PI / 2 : 0, 0]);
    woodenStools(c, chairs, darkWood());
    const bu = c.W / 2 + 0.6, bb = canvasMat('board', 512, 320, (x, w, h) => {
      x.fillStyle = '#1e2a22'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(235,235,225,.85)'; x.font = `bold 58px ${SANS}`; x.fillText('打倒黑帮', 40, 110); x.font = `40px ${SANS}`; x.fillText('一九六六年八月', 40, 200);
      for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    });
    c.box(1.6, 1.0, 0.05, bb, bu, 1.5, 0.4, -0.2); c.box(0.05, 1.4, 0.05, darkWood(), bu - 0.7, 0.7, 0.45, -0.2); c.box(0.05, 1.4, 0.05, darkWood(), bu + 0.7, 0.7, 0.3, -0.2);
    c.obst(-W / 2 - 0.2, W / 2 + 0.2, 0.1, D + 0.2); c.obst(bu - 0.9, bu + 0.9, 0.1, 0.8);
  },
  // 第14厅：沙袋工事、钢盔与长矛
  sandbags(c) {
    const R = R0(13), list = [], W = Math.min(c.W - 0.8, 5.5), n = Math.min(1.0, c.D * 0.45);
    for (let r = 0; r < 5; r++) for (let i = 0; i < Math.floor(W / 0.52); i++) list.push([-W / 2 + 0.26 + i * 0.52 + (r % 2) * 0.26, 0.09 + r * 0.17, n + (R() - 0.5) * 0.06, (R() - 0.5) * 0.15]);
    c.inst(new THREE.SphereGeometry(1, 10, 6), mat('sandbag', () => lam(0x9a8a68)), list.map(p => [...p, 0, 0, 0.27, 0.1, 0.17]));
    const helm = []; for (let i = 0; i < 5; i++) helm.push([-W / 2 + R() * W, 0.95, n + 0.05, R() * 6]);
    c.inst(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('helm', () => lam(0x3e4a34)), helm);
    const spears = []; for (let i = 0; i < 6; i++) spears.push([-W / 2 + 0.4 + i * (W - 0.8) / 5, 1.1, n - 0.3, 0, -0.25, (R() - 0.5) * 0.2]);
    c.inst(new THREE.BoxGeometry(0.03, 2.2, 0.03), darkWood(), spears);
    c.obst(-W / 2 - 0.1, W / 2 + 0.1, n - 0.6, n + 0.4);
  },
  // 第15厅：牛棚：草铺、凳子、高帽与牌子
  cowshed(c) {
    const W = Math.min(c.W - 0.8, 4.4), D = Math.min(c.D, 2.2), R = R0(14);
    const straw = []; for (let i = 0; i < 600; i++) straw.push([-W / 2 + R() * W, 0.02, 0.3 + R() * (D - 0.4), R() * 6, -Math.PI / 2 + (R() - 0.5) * 0.2, 0]);
    c.inst(new THREE.BoxGeometry(0.008, 0.35, 0.006), mat('straw', () => lam(0xb09a5a)), straw);
    c.box(0.36, 0.42, 0.26, wood(), -0.6, 0.21, 0.9);
    c.mesh(new THREE.ConeGeometry(0.17, 0.9, 16, 1, true), mat('cap', () => lam(0xe8e0c8, { side: THREE.DoubleSide })), -0.6, 0.87, 0.9);
    const sign = canvasMat('sign', 512, 256, (x, w, h) => { x.fillStyle = '#e8e0c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1714'; x.font = `bold 96px ${FONT}`; x.textAlign = 'center'; x.fillText('牛鬼蛇神', w / 2, 160); x.strokeStyle = '#a01c14'; x.lineWidth = 10; x.strokeRect(10, 10, w - 20, h - 20); });
    c.box(0.8, 0.4, 0.02, sign, 0.4, 0.35, 0.95, -0.3, -0.45, 0);
    for (let i = 0; i < 9; i++) c.box(0.06, 0.8, 0.06, darkWood(), -W / 2 + i * W / 8, 0.4, D + 0.1);
    c.box(W, 0.06, 0.06, darkWood(), 0, 0.72, D + 0.1); c.box(W, 0.06, 0.06, darkWood(), 0, 0.25, D + 0.1);
    c.obst(-W / 2 - 0.1, W / 2 + 0.1, 0, D + 0.25);
  },
  // 第16厅：白色花圈与纸花
  wreaths(c) {
    const W = Math.min(c.W - 0.8, 5.5), n = 0.6, R = R0(15);
    for (let i = 0; i < 5; i++) {
      const u = -W / 2 + 0.55 + i * (W - 1.1) / 4;
      c.mesh(new THREE.TorusGeometry(0.42, 0.11, 8, 28), mat('wreath', () => lam(0xf2f0ea)), u, 0.92, n + (i % 2) * 0.15);
      for (const du of [-0.3, 0.3]) c.box(0.03, 1.0, 0.03, darkWood(), u + du, 0.48, n + 0.12 + (i % 2) * 0.15, 0, -0.15, du > 0 ? -0.2 : 0.2);
    }
    const fl = []; for (let i = 0; i < 260; i++) fl.push([-W / 2 + R() * W, 0.05 + R() * 0.12, 0.2 + R() * Math.min(1.0, c.D - 0.2), R() * 6, R(), R()]);
    c.inst(new THREE.IcosahedronGeometry(0.05, 0), mat('paperfl', () => lam(0xf4f2ec)), fl);
    c.obst(-W / 2, W / 2, 0, Math.min(n + 0.8, c.D));
  },
  // 第17厅：民主墙下卖民刊的小摊与自行车
  brickwall(c) {
    const W = Math.min(c.W - 1, 3.6), n = 0.9, R = R0(16);
    c.box(W, 0.05, 0.8, wood(), 0, 0.74, n); for (const du of [-W / 2 + 0.1, W / 2 - 0.1]) c.box(0.06, 0.72, 0.7, darkWood(), du, 0.36, n);
    const mags = []; for (let s = 0; s < 8; s++) for (let k = 0; k < 4 + Math.floor(R() * 6); k++) mags.push([-W / 2 + 0.3 + s * (W - 0.6) / 7, 0.78 + k * 0.012, n + (R() - 0.5) * 0.3, (R() - 0.5) * 0.3, 0, 0, 1, 1, 1, R() > 0.5 ? 0xe8e0cc : 0xd8cdb0]);
    c.inst(new THREE.BoxGeometry(0.19, 0.01, 0.26), lam(0xffffff), mags);
    const bu = W / 2 + 0.9, wh = mat('tyre', () => finish(0x272725, 0.91));
    const enamel = mat('cycle', () => finish(0x314342, 0.35, 0.45));
    const tube = (x1,y1,x2,y2,diam,m) => {
      const length = Math.hypot(x2 - x1, y2 - y1);
      c.mesh(new THREE.CylinderGeometry(diam / 2, diam / 2, length, 8), m,
        bu + (x1 + x2) / 2, (y1 + y2) / 2, 0.5, 0, 0, -Math.atan2(x2 - x1, y2 - y1));
    };
    for (const d of [-0.5, 0.5]) {
      c.mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 48), wh, bu + d, 0.355, 0.5);
      c.mesh(new THREE.TorusGeometry(0.305, 0.012, 6, 48), steel(), bu + d, 0.355, 0.5);
      for (let i = 0; i < 12; i++) c.box(0.006, 0.606, 0.006, steel(), bu + d, 0.355, 0.5, 0, 0, i * Math.PI / 12);
    }
    for (const [x1,y1,x2,y2] of [[-0.5,.355,-.14,.79],[-.5,.355,-.03,.33],[-.03,.33,-.14,.79],[-.14,.79,.35,.84],[-.03,.33,.32,.75],[.35,.84,.32,.75],[.32,.75,.5,.355]]) {
      tube(x1,y1,x2,y2,0.032,enamel);
    }
    tube(-.14,.79,-.185,.91,.025,steel()); tube(.35,.84,.31,.96,.025,steel());
    c.box(.18,.04,.115,darkWood(),bu-.18,.92,.5);
    c.box(.03,.03,.34,steel(),bu+.31,.97,.5);
    c.mesh(new THREE.TorusGeometry(.087,.011,6,20), steel(), bu-.03,.33,.555);
    c.obst(-W / 2 - 0.1, W / 2 + 0.1, n - 0.5, n + 0.5); c.obst(bu - 0.9, bu + 0.9, 0.3, 0.7);
  },
  // 第18厅：简陋的手术台与无影灯
  clinic(c) {
    const n = 1.0;
    c.box(1.9, 0.08, 0.6, mat('steel2', () => lam(0x9aa0a4)), 0, 0.82, n); c.box(1.8, 0.04, 0.55, mat('sheet', () => lam(0xdfe4e2)), 0, 0.88, n);
    const porcelain = mat('lampEnamel', () => finish(0xd0d4cc, 0.35, 0.19));
    for (const du of [-0.76, 0.76]) for (const dn of [-0.24, 0.24]) {
      c.box(0.04, 0.76, 0.04, steel(), du, 0.43, n + dn);
      c.mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.034, 12), darkWood(), du, 0.055, n + dn, 0, Math.PI / 2);
    }
    for (const side of [-1, 1]) c.box(1.54, 0.032, 0.032, steel(), 0, 0.31, n + side * 0.24);
    const lu = 1.6;
    c.mesh(new THREE.CylinderGeometry(.18, .22, .06, 24), porcelain, lu,.035,n-.4);
    c.box(.045,2.0,.045,steel(),lu,1.05,n-.4);
    c.box(.55,.035,.035,steel(),lu-.25,2.04,n-.4); c.box(.035,.035,.22,steel(),lu-.5,2.04,n-.3);
    c.mesh(new THREE.CylinderGeometry(.20,.30,.12,32), porcelain, lu-.5,1.98,n-.2);
    for (let i=0; i<5; i++) {
      const a=i*Math.PI*2/5;
      c.mesh(new THREE.CylinderGeometry(.059,.058,.014,16), mat('opal', () => basic(0xf2ead6)), lu-.5+.15*Math.cos(a),1.912,n-.2+.15*Math.sin(a));
    }
    c.box(0.5, 0.04, 0.35, steel(), -1.5, 0.9, n - 0.2); c.box(0.04, 0.88, 0.04, steel(), -1.5, 0.44, n - 0.2);
    c.box(.38,.04,.28,steel(),-1.5,.025,n-.2);
    c.obst(-1.8, 1.9, n - 0.7, n + 0.5);
  },
  // 第19厅：公判台与高音喇叭
  notices(c) {
    const W = Math.min(c.W - 0.8, 5), D = Math.min(1.6, c.D);
    c.box(W, 0.5, D, mat('stage', () => lam(0x4a3a2a)), 0, 0.25, D / 2 + 0.2);
    c.box(W, 0.04, 0.04, mat('redcloth', () => lam(0x9a1a14)), 0, 0.5, D + 0.2);
    c.box(0.04, 1.3, 0.04, steel(), 0, 1.15, 0.8); c.mesh(new THREE.SphereGeometry(0.06, 8, 6), steel(), 0, 1.82, 0.8);
    for (const u of [-c.W / 2 - 0.6, c.W / 2 + 0.6]) { c.box(0.08, 2.6, 0.08, steel(), u, 1.3, 0.5); c.mesh(new THREE.ConeGeometry(0.2, 0.5, 12, 1, true), mat('horn', () => lam(0x8a8e88, { side: THREE.DoubleSide })), u, 2.5, 0.7, 0, Math.PI / 2, 0); c.obst(u - 0.2, u + 0.2, 0.3, 0.7); }
    c.obst(-W / 2 - 0.1, W / 2 + 0.1, 0, D + 0.3);
  },
  // 第20厅：碾过路面的坦克履带印、被压扁的自行车
  tank(c) {
    const W = c.W, D = Math.min(c.D, 3.2), list = [];
    for (const off of [-1.0, 1.0]) for (let i = 0; i < Math.floor(W / 0.3); i++) list.push([-W / 2 + i * 0.3 + 0.15, 0.012, D / 2 + off * 0.75]);
    c.inst(new THREE.BoxGeometry(0.22, 0.012, 0.55), mat('track', () => lam(0x0a0a0b)), list);
    const wh = mat('tyre', () => lam(0x161616));
    c.mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 24), wh, 0.4, 0.03, D / 2 + 0.2, 0, -Math.PI / 2, 0).scale.set(1, 0.6, 1);
    c.mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 24), wh, 1.2, 0.03, D / 2 + 0.5, 0.6, -Math.PI / 2, 0).scale.set(1, 0.7, 1);
    c.box(1.1, 0.025, 0.03, steel(), 0.8, 0.03, D / 2 + 0.35, 0.3);
    c.label('长安街，1989年6月4日凌晨', 0, D + 0.25, 3.2);
    c.obst(-0.2, 1.8, D / 2 - 0.3, D / 2 + 1.0);
  },
  // 第21厅：堆在地上的书包
  schoolbags(c) {
    const R = R0(20), list = [], W = Math.min(c.W - 1, 4.5), D = Math.min(c.D, 2.2), cols = [0x2a4a8a, 0xb02a2a, 0x2a7a4a, 0xd8a020, 0x6a2a7a, 0x2a2a2a, 0xd86a2a];
    for (let i = 0; i < 140; i++) { const a = R() * 6.28, r = Math.sqrt(R()), u = Math.cos(a) * r * W / 2, n = 0.3 + D / 2 + Math.sin(a) * r * (D / 2 - 0.1), h = (1 - r) * 0.42;
      list.push([u, h + 0.1, n, R() * 6, (R() - 0.5) * 1.2, (R() - 0.5) * 1.2, 1, 1, 1, cols[Math.floor(R() * cols.length)]]); }
    const bag = new THREE.Shape();
    bag.moveTo(-.12,-.16); bag.lineTo(.12,-.16); bag.quadraticCurveTo(.15,-.16,.15,-.12);
    bag.lineTo(.14,.085); bag.quadraticCurveTo(.13,.17,.055,.17); bag.lineTo(-.055,.17);
    bag.quadraticCurveTo(-.13,.17,-.14,.085); bag.lineTo(-.15,-.12); bag.quadraticCurveTo(-.15,-.16,-.12,-.16);
    const shell = new THREE.ExtrudeGeometry(bag,{depth:.10,bevelEnabled:true,bevelThickness:.02,bevelSize:.014,bevelSegments:2,curveSegments:4});
    c.inst(shell.translate(0,0,-.06), finish(0xd9d4c9,.97), list);
    c.inst(new THREE.BoxGeometry(.22,.115,.036).translate(0,-.057,.071), finish(0xa9a39b,.91), list);
    c.inst(new THREE.TorusGeometry(.038,.007,5,12,Math.PI).translate(0,.181,0), finish(0x78726b,.9), list);
    c.obst(-W / 2 - 0.1, W / 2 + 0.1, 0.1, D + 0.5);
  },
  // 第22厅：铁丝网围栏与刀片刺网，大字在网后
  fence(c) {
    const W = c.W + 0.6, n = Math.min(1.4, c.D * 0.55), H = 2.5;
    const net = mat('chain', () => { const t = new THREE.CanvasTexture(textCanvas(64, 64, (x) => { x.strokeStyle = '#9aa0a4'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 32); x.lineTo(32, 0); x.lineTo(64, 32); x.lineTo(32, 64); x.closePath(); x.stroke(); }));
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 0.12, H / 0.12); return lam(0xffffff, { map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }); });
    c.mesh(new THREE.PlaneGeometry(W, H), net, 0, H / 2, n);
    for (let i = 0; i <= Math.ceil(W / 2.5); i++) c.box(0.08, H + 0.4, 0.08, steel(), -W / 2 + i * W / Math.ceil(W / 2.5), (H + 0.4) / 2, n);
    c.mesh(new THREE.CylinderGeometry(0.22, 0.22, W, 10, 1, true), mat('razor', () => lam(0xb0b4b8, { wireframe: true })), 0, H + 0.35, n, 0, 0, Math.PI / 2);
    c.obst(-W / 2, W / 2, n - 0.2, n + 0.2);
  },
  // 第23厅：墙上一圈监控摄像头，都对着你
  cameras(c) {
    const list = [], arms = [], W = c.W;
    for (let i = 0; i < 9; i++) { const u = -W / 2 + i * W / 8; list.push([u, 4.9, 0.32, (i - 4) * 0.08, 0.35, 0]); arms.push([u, 5.02, 0.12, 0]); }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const u = s * (W / 2 + 0.5), yy = 1.6 + k * 1.1; list.push([u, yy, 0.32, -s * 0.5, 0.15, 0]); arms.push([u, yy + 0.12, 0.12, 0]); }
    c.inst(new THREE.BoxGeometry(0.16, 0.14, 0.42), mat('cam', () => lam(0xe8e8e6)), list);
    c.inst(new THREE.BoxGeometry(0.05, 0.05, 0.25), steel(), arms);
    const leds = list.map(p => [p[0], p[1] - 0.02, p[2] + 0.22, p[3], p[4], 0]);
    c.inst(new THREE.SphereGeometry(0.018, 6, 4), mat('led', () => basic(0xff2a1a)), leds);
  },
  // 第24厅：散落一地的白纸
  papers(c) {
    const R = R0(23), list = [], W = c.W, D = Math.min(c.D, 3);
    for (let i = 0; i < 140; i++) list.push([-W / 2 + R() * W, 0.01 + R() * 0.006, 0.25 + R() * D, R() * 6, -Math.PI / 2, 0]);
    c.inst(new THREE.PlaneGeometry(0.21, 0.297), mat('a4', () => lam(0xf6f6f2, { side: THREE.DoubleSide })), list);
  }
};
