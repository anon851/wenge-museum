// 展陈媒介只改变展项的位置与读法。条目、全文、图注与导览继续使用原有数据。
import * as THREE from 'three';
import { box, basic, tex, hdCanvas, SANS } from './util.js';
import { finish, surface } from './finishes.js';
import { bronze } from './interiors.js';

const graphite = finish(0x303336, 0.54, 0.45);
const paper = finish(0xe5d7b7, 0.89);
const ink = finish(0x3e302b, 0.76);
const opal = basic(0xfff1d7);
const timelineRooms = new Set([1, 3, 5, 6, 9, 11, 14, 16, 17, 19, 21, 23, 24]);
const photoRooms = new Set([1, 2, 3, 4, 7, 9, 11, 12, 13, 14, 15, 17, 20, 21, 22, 24]);

export function planDisplays(s) {
  const plan = new Map(),
    items = s.items;
  const anchors = new Set(items.map(it => it.anchor).filter(Boolean));
  const take = (kind, list, n) =>
    list
      .filter(it => !plan.has(it))
      .slice(0, n)
      .forEach(it => plan.set(it, kind));
  if (s.room === 'A')
    take(
      'timeline',
      items.filter(it => it.k === 'panel' && it.d?.startsWith('展厅 ')),
      5
    );
  if (s.room === 'B')
    take(
      'folio',
      items.filter(it => it.k === 'evidence'),
      4
    );
  if (s.room === 'MEM')
    take(
      'folio',
      items.filter(it => it.k === 'names'),
      4
    );
  if (!/^H\d+$/.test(s.room)) return plan;
  const unpaired = items.filter(it => !anchors.has(it));
  if (timelineRooms.has(s.no)) {
    const dated = unpaired.filter(it => it.k === 'panel' && !it.bars && /(?:18|19|20)\d{2}/.test(it.d));
    take('timeline', dated, 3);
  }
  if (photoRooms.has(s.no))
    take(
      'suspension',
      items.filter(it => it.k === 'photo'),
      3
    );
  take(
    'measure',
    unpaired.filter(it => it.bars?.length && it.bars.every(b => b.v >= 0 && Number.isFinite(b.v))),
    1
  );
  const portraits = unpaired.filter(it => it.k === 'bio');
  if (portraits.length >= 3) take('portrait', portraits, 3);
  if ([1, 2, 3, 4, 6, 7, 9, 11, 12, 15, 17, 18, 19, 20, 21, 22, 23, 24].includes(s.no)) {
    take(
      'drawer',
      unpaired.filter(it => it.k === 'case'),
      4
    );
  }
  const book = unpaired.filter(it => ['dossier', 'story', 'resist', 'bridge', 'label'].includes(it.k));
  take('folio', book, portraits.length >= 3 ? 4 : 6);
  return plan;
}

function group(parent, x, y, z, yaw = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
  return g;
}
function cylinder(g, top, bottom, h, m, y, segments = 48) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, segments), m);
  mesh.position.y = y;
  g.add(mesh);
  return mesh;
}
// 将可点选面移到房间坐标系，使拾取、距离清晰度和卸载沿用已有展项机制。
function plate(room, parent, w, h, x, y, z, tilt = 0) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(0xe6dfcf));
  p.position.set(x, y, z);
  p.rotation.x = tilt;
  parent.add(p);
  room.attach(p);
  return p;
}

export function suspendedPhoto(g, it, face, am, y0, ceiling, offset) {
  const x = face.axis === 'x' ? am : face.c + face.nrm * offset;
  const z = face.axis === 'x' ? face.c + face.nrm * offset : am;
  const yaw = face.axis === 'x' ? (face.nrm > 0 ? 0 : Math.PI) : (face.nrm * Math.PI) / 2;
  const stand = group(g, x, y0, z, yaw),
    ratio = (it.w || 4) / (it.h || 3);
  const h = Math.min(1.64, 2.25 / ratio),
    w = h * ratio,
    base = 2.6,
    cy = base + h / 2;
  const capW = Math.min(w, 1.72),
    capH = (capW * 132) / 512;
  box(stand, w + 0.1, h + 0.1, 0.075, graphite, 0, cy, 0);
  box(stand, w + 0.025, h + 0.025, 0.015, opal, 0, cy, 0.044);
  for (const side of [-1, 1]) {
    const xx = side * w * 0.37,
      top = base + h + 0.05,
      length = ceiling - top;
    box(stand, 0.015, length, 0.015, bronze, xx, top + length / 2, 0);
    box(stand, 0.095, 0.055, 0.095, graphite, xx, ceiling - 0.03, 0);
  }
  box(stand, capW + 0.025, capH + 0.025, 0.044, paper, 0, base - capH / 2 - 0.047, 0);
  it.capMesh = plate(g, stand, capW, capH, 0, base - capH / 2 - 0.047, 0.026);
  const front = plate(g, stand, w, h, 0, cy, 0.055);
  const rear = group(stand, 0, 0, 0, Math.PI);
  const back = plate(g, rear, w, h, 0, cy, 0.042);
  const caption = plate(g, rear, capW, capH, 0, base - capH / 2 - 0.047, 0.026);
  back.material.dispose();
  back.material = front.material;
  caption.material.dispose();
  caption.material = it.capMesh.material;
  it.reverseFaces = [back, caption];
  return front;
}

export function timeline(g, items, spot, y0) {
  const stand = group(g, spot.x, y0, spot.z, spot.yaw),
    pitch = 1.65,
    width = pitch * items.length;
  box(stand, width + 0.12, 0.016, 0.91, graphite, 0, 0.026, 0);
  box(stand, width + 0.12, 0.008, 0.025, bronze, 0, 0.039, -0.41);
  return items.map((it, i) => {
    const x = (i - (items.length - 1) / 2) * pitch;
    box(stand, 0.023, 0.009, 0.13, bronze, x - pitch / 2 + 0.055, 0.04, -0.32);
    return plate(g, stand, 1.56, 0.68, x, 0.043, 0.035, -Math.PI / 2);
  });
}

export const displaySizes = { folio: [1.86, 1.38], portrait: [2.22, 2.22], measure: [2.36, 1.42], drawer: [2.0, 1.55] };
// 每种状态只启用对应展面的渲染/拾取层。异步载入高清图不会把隐藏页重新显示。
function selectSpread(items, index, perSpread) {
  items.forEach((it, i) => it.mesh.layers.set(Math.floor(i / perSpread) === index ? 0 : 1));
}

function selector(g, parent, label, x, y, z, width, height, tilt, activate) {
  const tab = plate(g, parent, width, height, x, y, z, tilt);
  tab.material.map = tex(
    hdCanvas(512, 96, (c, W, H) => {
      c.fillStyle = '#504338';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#f3e4be';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold 48px ${SANS}`;
      c.fillText(label, W / 2, H / 2, W - 32);
    })
  );
  tab.material.color.set(0xffffff);
  tab.userData = { displayAction: activate, actionLabel: label };
  return tab;
}

export function island(g, kind, items, spot, y0, controls) {
  const stand = group(g, spot.x, y0, spot.z, spot.yaw),
    wood = surface('timber');
  if (kind === 'folio') {
    // 两张独立的页绕真实书脊折起，并整体向读者倾斜。
    box(stand, 1.38, 0.08, 0.82, graphite, 0, 0.04, 0);
    for (const side of [-1, 1]) box(stand, 0.075, 0.85, 0.59, wood, side * 0.53, 0.49, 0);
    const desk = group(stand, 0, 0.98, 0);
    desk.rotation.x = 0.27;
    box(desk, 1.82, 0.06, 1.13, wood, 0, 0, 0);
    for (const side of [-1, 1]) {
      const leaf = group(desk, side * 0.431, 0.116, 0);
      leaf.rotation.z = -side * 0.13;
      box(leaf, 0.85, 0.077, 1.015, paper, 0, 0, 0);
      box(leaf, 0.865, 0.017, 1.04, ink, 0, -0.046, 0);
      for (const z of [-0.506, 0.506]) box(leaf, 0.844, 0.004, 0.008, bronze, 0, -0.009, z);
      for (let i = side < 0 ? 0 : 1; i < items.length; i += 2)
        items[i].mesh = plate(g, leaf, 0.816, 0.98, 0, 0.041, 0, -Math.PI / 2);
    }
    box(desk, 0.024, 0.012, 0.99, bronze, 0, 0.205, 0);
    const spreads = Math.ceil(items.length / 2);
    if (spreads > 1) {
      let current = 0;
      const next = () => {
        current = (current + 1) % spreads;
        selectSpread(items, current, 2);
      };
      box(desk, 0.54, 0.045, 0.19, bronze, 0.59, 0.053, 0.578);
      const tab = selector(g, desk, '翻页 →', 0.59, 0.078, 0.578, 0.47, 0.15, -Math.PI / 2, next);
      controls.push(tab);
      selectSpread(items, 0, 2);
    }
  } else if (kind === 'drawer') {
    // 抽屉前沿伸出台面，观看者从自己所选的拉手向上读同一抽屉中的影像。
    box(stand, 1.72, 0.13, 0.95, graphite, 0, 0.065, 0);
    box(stand, 1.92, 0.91, 1.1, wood, 0, 0.585, -0.04);
    const ledge = group(stand, 0, 1.12, -0.02);
    ledge.rotation.x = -1.13;
    box(ledge, 1.9, 0.86, 0.062, graphite, 0, 0, 0);
    box(ledge, 1.84, 0.026, 0.075, bronze, 0, 0.41, 0);
    for (const it of items) it.mesh = plate(g, ledge, 1.8, 0.79, 0, 0, 0.035);
    const knobs = [];
    const open = i => {
      selectSpread(items, i, 1);
      knobs.forEach((f, j) => {
        f.position.z = j === i ? 0.625 : 0.54;
        f.updateMatrix();
      });
    };
    for (let i = 0; i < items.length; i++) {
      const yy = 0.82 - i * 0.176,
        fascia = group(stand, 0, yy, 0.54);
      // 动态拉手和嵌入抽面的题签共用变换，不参加静态几何合并。
      fascia.userData.noMerge = true;
      knobs.push(fascia);
      box(fascia, 1.76, 0.163, 0.13, wood, 0, 0, 0);
      for (const side of [-1, 1]) box(fascia, 0.025, 0.026, 0.07, bronze, side * 0.75, 0, 0.084);
      box(fascia, 1.52, 0.028, 0.025, bronze, 0, 0, 0.123);
      const label = '抽屉 ' + (i + 1) + '　' + items[i].t;
      const tab = selector(g, fascia, label, 0, 0.012, 0.139, 1.31, 0.14, -0.08, () => open(i));
      fascia.attach(tab);
      controls.push(tab);
    }
    open(0);
  } else if (kind === 'portrait') {
    cylinder(stand, 0.91, 1.03, 0.13, graphite, 0.065);
    cylinder(stand, 0.4, 0.66, 0.67, wood, 0.45);
    cylinder(stand, 0.69, 0.42, 0.26, bronze, 0.91);
    for (let i = 0; i < 3; i++) {
      const face = group(stand, 0, 0, 0, (i * 2 * Math.PI) / 3),
        holder = group(face, 0, 1.45, 0.41);
      holder.rotation.x = -0.16;
      box(holder, 1.34, 1.33, 0.072, graphite, 0, 0, 0);
      box(holder, 1.29, 0.023, 0.082, bronze, 0, 0.641, 0);
      items[i].mesh = plate(g, holder, 1.265, 1.235, 0, 0, 0.04);
    }
    cylinder(stand, 0.45, 0.48, 0.042, bronze, 2.14);
  } else {
    const it = items[0],
      bars = it.bars,
      max = Math.max(...bars.map(b => b.v));
    box(stand, 1.95, 0.12, 0.96, graphite, 0, 0.06, 0);
    box(stand, 2.25, 0.65, 1.23, wood, 0, 0.435, 0);
    box(stand, 2.32, 0.055, 1.31, graphite, 0, 0.79, 0);
    const pitch = 2.02 / bars.length;
    bars.forEach((b, i) => {
      const height = max ? (b.v / max) * 0.9 : 0,
        x = (i - (bars.length - 1) / 2) * pitch;
      if (height > 0) box(stand, pitch * 0.61, height, 0.31, bronze, x, 0.82 + height / 2, -0.23);
    });
    const legend = group(stand, 0, 0.89, 0.35);
    legend.rotation.x = -1.17;
    box(legend, 2.26, 0.56, 0.035, graphite, 0, 0, 0);
    it.mesh = plate(g, legend, 2.22, 0.54, 0, 0, 0.021);
  }
}
