// 展柜和建筑细部使用米制截面，开口的中心是装裱件的原点，+z 为参观面。
import * as THREE from 'three';
import { box, tex, textCanvas } from './util.js';
import { finish, surface } from './finishes.js';

export const bronze = finish(0x897154, 0.42, 0.62);
const graphite = finish(0x34383a, 0.54, 0.48);
const mount = finish(0xd2c6ad, 0.93);
const backing = finish(0x262527, 0.88);
const profiles = new Map();

// 四边在转角斜接。内唇比外沿低，可从斜侧看到衬纸和相框的厚度。
function moulding(w, h, rail, depth) {
  const key = [w, h, rail, depth].join('/');
  if (profiles.has(key)) return profiles.get(key);
  const positions = [], uvs = [], indices = [];
  for (const [offset, z] of [[rail, 0], [rail, depth * 0.76], [rail * 0.78, depth], [rail * 0.28, depth], [0, depth * 0.46], [0, 0]]) {
    for (const [sx, sy] of [[-1,-1], [1,-1], [1,1], [-1,1]]) {
      const x = sx * (w / 2 + offset), y = sy * (h / 2 + offset);
      positions.push(x, y, z); uvs.push(x / 2.6, y / 0.7);
    }
  }
  for (let ring = 0; ring < 5; ring++) for (let side = 0; side < 4; side++) {
    const a = ring * 4 + side, b = ring * 4 + (side + 1) % 4;
    indices.push(a, b, b + 4, a, b + 4, a + 4);
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  indexed.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); indexed.setIndex(indices);
  const geo = indexed.toNonIndexed(); geo.computeVertexNormals();
  profiles.set(key, geo); return geo;
}

export function frame(parent, w, h, rail, depth, mat) {
  const mesh = new THREE.Mesh(moulding(w, h, rail, depth), mat);
  parent.add(mesh); return mesh;
}

export function mountPrint(parent, w, h, kind, floor) {
  const photo = kind === 'photo' || kind === 'archframe';
  const matBorder = photo ? 0.064 : 0.012, rail = photo ? 0.030 : 0.016;
  const apertureW = w + 2 * matBorder, apertureH = h + 2 * matBorder;
  box(parent, apertureW + rail, apertureH + rail, 0.024, photo ? mount : backing, 0, 0, 0.029);
  const edge = photo && floor === 0 ? surface('timber') : photo && floor === 1 ? bronze : graphite;
  frame(parent, apertureW, apertureH, rail, photo ? 0.073 : 0.048, edge);
}

let acoustic;
export function ceilingType(r) {
  if (['earth', 'loess', 'planks'].includes(r.theme.style?.wall.t) || r.id === 'H4') return 'timber';
  if (['concrete', 'brick'].includes(r.theme.style?.wall.t) || r.id === 'H9') return 'steel';
  return 'acoustic';
}

export function acousticCeiling() {
  if (acoustic) return acoustic;
  const t = tex(textCanvas(256, 128, (c, w, h) => {
    c.fillStyle = '#86827b'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#494641'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h);
    c.fillStyle = '#6c6963';
    for (let y = 5; y < h; y += 6) for (let x = 5; x < w; x += 6) c.fillRect(x, y, 1.6, 1.6);
  }));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  acoustic = finish(0xa19d94, 0.96); acoustic.map = t; acoustic.userData.tile = [2.4, 1.2];
  return acoustic;
}

// 厚墙门套让人从一个厅内看到下一厅的进深。所有收口均在洞口净宽以外。
export function portal(parent, w, h, depth, floor) {
  const trim = floor === 0 ? surface('timber') : floor === 1 ? graphite : bronze;
  for (const side of [-1, 1]) {
    box(parent, 0.16, h + 0.2, depth, trim, side * (w / 2 + 0.08), (h + 0.2) / 2, 0);
    box(parent, 0.047, h, depth + 0.08, bronze, side * (w / 2 + 0.027), h / 2, 0);
  }
  box(parent, w + 0.32, 0.17, depth, trim, 0, h + 0.085, 0);
  box(parent, w, 0.04, depth + 0.08, graphite, 0, h + 0.023, 0);
  for (const z of [-depth / 2, depth / 2]) box(parent, w, 0.008, 0.025, bronze, 0, 0.017, z);
}

export function railPost(parent, x, y, z, alongX) {
  box(parent, 0.115, 0.08, 0.115, graphite, x, y + 0.04, z);
  box(parent, alongX ? 0.042 : 0.065, 1.01, alongX ? 0.065 : 0.042, bronze, x, y + 0.565, z);
}

// 同一块低分辨率遮蔽图覆盖一厅所有切开的楼板。门口空开，墙脚与隔墙下缘自然压暗。
export function floorWithContact(r, source, doors) {
  const scale = 6, w = Math.ceil((r.x1 - r.x0) * scale), h = Math.ceil((r.z1 - r.z0) * scale);
  const cv = textCanvas(w, h, c => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    const stroke = new Path2D();
    const line = (x0, z0, x1, z1) => {
      stroke.moveTo((x0 - r.x0) * scale, (z0 - r.z0) * scale);
      stroke.lineTo((x1 - r.x0) * scale, (z1 - r.z0) * scale);
    };
    for (const wall of r.walls) line(...wall.slice(0, 4));
    for (const [axis, at, lo, hi] of [['z',r.z0,r.x0,r.x1], ['z',r.z1,r.x0,r.x1], ['x',r.x0,r.z0,r.z1], ['x',r.x1,r.z0,r.z1]]) {
      const segment = (a, b) => axis === 'z' ? line(a, at, b, at) : line(at, a, at, b);
      let start = lo;
      for (const d of doors.filter(d => d.axis === axis && d.c === at).sort((a,b) => a.u-b.u)) {
        segment(start, d.u - d.w / 2); start = d.u + d.w / 2;
      }
      segment(start, hi);
    }
    for (const [width, blur, shade] of [[9, 5, '#aaa'], [3, 1.5, '#737373']]) {
      c.filter = 'blur(' + blur + 'px)'; c.lineWidth = width;
      c.strokeStyle = shade; c.stroke(stroke);
    }
  });
  const m = source.clone();
  m.aoMap = new THREE.CanvasTexture(cv); m.aoMap.channel = 1; m.aoMapIntensity = 0.80;
  m.userData.aoBounds = [r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0];
  return m;
}
