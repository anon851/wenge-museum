import * as THREE from 'three';
import { FONT, SANS, NO_HEAD, textCanvas, hdCanvas, layout, fit } from './textutil.js';
export { FONT, SANS, NO_HEAD, textCanvas, hdCanvas, layout, fit };


export const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
export const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

export function box(parent, w, h, d, mat, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const tile = mat.userData?.tile;
  if (tile) {
    const { position, normal, uv } = geo.attributes;
    for (let i = 0; i < uv.count; i++) {
      const px = position.getX(i) + x, py = position.getY(i) + y, pz = position.getZ(i) + z;
      const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i);
      uv.setXY(i, (nx ? -nx * pz : ny ? px : nz * px) / tile[0], (ny ? -ny * pz : py) / tile[1]);
    }
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}


let maxAniso = 4;
export const setAniso = (n) => { maxAniso = Math.min(8, n); };
// 低内存设备：建造展厅时画的固定贴图（墙字、标牌、标签），上传显卡后就把画布本身缩成 1×1，内存里只留显卡那一份
let releaseStatic = false;
export const setReleaseStatic = (v) => { releaseStatic = v; };
function releaseCanvas() { const im = this.image; if (im && im.width > 64 && typeof im.getContext === 'function') { im.width = 1; im.height = 1; } this.onUpdate = null; }
export function tex(cv, repeat) {
  const t = new THREE.CanvasTexture(cv);
  if (releaseStatic) t.onUpdate = releaseCanvas;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// 按需绘制的贴图（内存紧的设备）：展厅里较大的固定贴图（年代标、专题题名牌、展签、门楣导向、字带……）不在载入时就画，
// 先挂一张 1×1 的空贴图；参观者走到这个展厅附近时才画、上传显卡，随即释放画布；离开足够远后连显卡里那份也释放，回来时再画。
// 清晰度与电脑上完全一样，只是同一时间只有附近几个展厅的贴图占内存。其他设备上 lazyTex 等同于 tex(draw())。
let lazyOn = false, lazyOwner = null;
export const LAZY = new Map();   // 展厅 key -> [{ t, draw, drawn }]
export const setLazyTex = (on, owner = null) => { lazyOn = on; lazyOwner = owner; };
const blank = () => { const c = document.createElement('canvas'); c.width = c.height = 1; return c; };
function dropImage() { this.image = blank(); this.onUpdate = null; }
export function lazyTex(draw, repeat) {
  if (!lazyOn || lazyOwner == null) return tex(draw(), repeat);
  const t = tex(blank(), repeat); t.onUpdate = null;
  const e = { t, draw, drawn: false, owners: new Set([lazyOwner]) }; t.userData.lazy = e;
  if (!LAZY.has(lazyOwner)) LAZY.set(lazyOwner, []);
  LAZY.get(lazyOwner).push(e);
  return t;
}
// 几个展厅共用的按需贴图（如同一条标语）：登记当前展厅也在用；所有用它的展厅都离开后才释放
export function lazyShare(t) {
  const e = t && t.userData.lazy; if (!e || !lazyOn || lazyOwner == null || e.owners.has(lazyOwner)) return;
  e.owners.add(lazyOwner); if (!LAZY.has(lazyOwner)) LAZY.set(lazyOwner, []); LAZY.get(lazyOwner).push(e);
}
// 画好并（可选）立即上传；上传后只留显卡里的那份
export function lazyDraw(e, upload) {
  if (e.drawn) return; e.drawn = true;
  e.t.dispose(); e.t.image = e.draw(); e.px = e.t.image.width * e.t.image.height; e.t.onUpdate = dropImage; e.t.needsUpdate = true;
  if (upload) upload(e.t);
}
export function lazyFree(e) {
  if (!e.drawn) return; e.drawn = false;
  e.t.dispose(); e.t.image = blank(); e.t.onUpdate = null; e.t.needsUpdate = true;
}

// 可重复的伪随机
export function rng(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// 带噪点的材质贴图：石材、抹灰、混凝土
export function noiseTex(base, amp, size = 256, seed = 7, repeat, grid) {
  const R = rng(seed);
  const cv = textCanvas(size, size, (c) => {
    c.fillStyle = base; c.fillRect(0, 0, size, size);
    const img = c.getImageData(0, 0, size, size), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (R() - 0.5) * amp + (R() - 0.5) * amp * 0.5;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    c.putImageData(img, 0, 0);
    // 大尺度的斑驳
    for (let i = 0; i < 0; i++) {
      const v = R() > 0.5 ? 255 : 0; c.fillStyle = `rgba(${v},${v},${v},${0.012 + R() * 0.022})`;
      c.beginPath(); c.ellipse(R() * size, R() * size, 20 + R() * 70, 10 + R() * 40, R() * 3, 0, 7); c.fill();
    }
    if (grid) {
      c.strokeStyle = grid.color; c.lineWidth = grid.w || 2;
      for (let i = 0; i <= grid.n; i++) {
        const p = i * size / grid.n;
        c.beginPath(); c.moveTo(p, 0); c.lineTo(p, size); c.moveTo(0, p); c.lineTo(size, p); c.stroke();
      }
    }
  });
  return tex(cv, repeat || [1, 1]);
}

// 四面分别展开 UV；从檐口到脊部逐渐变陡，靠近翼角时檐线略向上起翘。
export function hipRoof(parent, w, d, h, inset, mat, x, y, z) {
  const vertices = [], uv = [], indices = [];
  const halfW = w / 2, halfD = d / 2, runX = halfW * inset, runZ = inset > 0.4 ? halfD - 0.35 : halfD * inset;
  const corners = [[-halfW, halfD], [halfW, halfD], [halfW, -halfD], [-halfW, -halfD]];
  const across = 16, rows = 5;
  for (let side = 0; side < 4; side++) {
    const a = corners[side], b = corners[(side + 1) % 4], start = vertices.length / 3;
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      for (let col = 0; col <= across; col++) {
        const u = col / across, px = a[0] + (b[0] - a[0]) * u, pz = a[1] + (b[1] - a[1]) * u;
        const lift = Math.min(h * 0.25, 0.95) * Math.pow(Math.abs(2 * u - 1), 5) * (1 - t) ** 2;
        vertices.push(px * (1 - t * runX / halfW), h * (0.68 * t + 0.32 * t * t) + lift, pz * (1 - t * runZ / halfD));
        uv.push(u * Math.hypot(b[0] - a[0], b[1] - a[1]) / w, t);
        if (col < across && row < rows) {
          const i = start + row * (across + 1) + col;
          indices.push(i, i + 1, i + across + 1, i + 1, i + across + 2, i + across + 1);
        }
      }
    }
  }
  // 檐底沿同一条曲线封口，从桥头或城楼近处抬头也看得到檐底。
  const center = vertices.length / 3;
  vertices.push(0, 0, 0); uv.push(0.5, 0.5);
  for (let side = 0; side < 4; side++) {
    const rim = vertices.length / 3;
    for (let col = 0; col <= across; col++) {
      const i = (side * (rows + 1) * (across + 1) + col) * 3;
      vertices.push(vertices[i], vertices[i + 1], vertices[i + 2]);
      uv.push(vertices[i] / w + 0.5, vertices[i + 2] / d + 0.5);
      if (col) indices.push(center, rim + col, rim + col - 1);
    }
  }
  // 收顶面封闭，低坡檐上方通常另有一层楼身。
  const cap = vertices.length / 3;
  for (const [a, b] of corners) {
    vertices.push(a - Math.sign(a) * runX, h, b - Math.sign(b) * runZ);
    uv.push((a / w) + 0.5, (b / d) + 0.5);
  }
  indices.push(cap, cap + 1, cap + 2, cap, cap + 2, cap + 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, mat);
  roof.position.set(x, y, z); parent.add(roof);
  return roof;
}
