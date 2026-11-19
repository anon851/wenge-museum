// 建筑饰面共用本地纹理；tile 以米计，切开的墙面和地面保持同一铺装尺度。
import * as THREE from 'three';
import { textCanvas, tex } from './util.js';

const loader = new THREE.TextureLoader();
const maps = new Map();
const surfaces = new Map();
let anisotropy = 1;

export function initFinishes(renderer) {
  anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
}

function imageMap(name, color = true) {
  if (!maps.has(name)) {
    const t = loader.load('assets/surfaces/' + name + '.jpg');
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
    maps.set(name, t);
  }
  return maps.get(name);
}

export const finish = (color, roughness, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const recipes = {
  limestone: ['ashlar', 0xfff6e2, 0.68, 6, 3, 0.28],
  plinth: ['ashlar', 0x935854, 0.46, 5, 2.5, 0.32],
  plaza: ['paving', 0xfffcf5, 0.83, 5.6, 5.6, 0.42],
  timber: ['walnut', 0xe0c9af, 0.46, 2.6, 0.7, 0],
};

export function surface(name) {
  if (!surfaces.has(name)) {
    const [image, color, roughness, w, h, relief] = recipes[name];
    const mat = finish(color, roughness);
    mat.map = imageMap(image);
    if (relief) {
      mat.normalMap = imageMap(image + '-normal', false);
      mat.normalScale.setScalar(relief);
    }
    mat.userData.tile = [w, h];
    surfaces.set(name, mat);
  }
  return surfaces.get(name);
}

export function galleryReflection() {
  // 展厅上部的漫射顶光和两排条灯，仅在金属与玻璃上形成随视角变化的反射。
  const texture = tex(textCanvas(256, 128, (c, w, h) => {
    const gradient = c.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#aea594'); gradient.addColorStop(0.45, '#67625c');
    gradient.addColorStop(0.54, '#3e3832'); gradient.addColorStop(1, '#252322');
    c.fillStyle = gradient; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff5df';
    for (let x = 12; x < w; x += 64) c.fillRect(x, 33, 31, 4);
  }));
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

// 扫描纹理先转为中性灰度，再由原有策展配色着色。贴图跨楼层共享。
const interiorScans = {
  plaster: ['plaster', 3.2, 3.2, 0.16, 0.95],
  lime: ['plaster', 2.6, 2.6, 0.32, 0.97],
  brick: ['masonry', 3.2, 2.0, 0.55, 0.89],
  concrete: ['boardform', 3.6, 3.0, 0.32, 0.81],
  cement: ['boardform', 4.4, 4.4, 0.11, 0.66],
  terrazzo: ['aggregate', 1.8, 1.8, 0.10, 0.39],
  wood: ['boards', 2.4, 3.2, 0.18, 0.49],
  planks: ['boards', 1.8, 2.8, 0.34, 0.80],
  dirt: ['soil', 2.4, 2.4, 0.53, 0.98],
  cracked: ['fissures', 1.8, 1.8, 0.67, 0.98],
};
export function scannedInterior(spec) {
  const scan = interiorScans[spec.t];
  if (!scan) return null;
  const [name, width, height, relief, roughness] = scan;
  const m = finish(spec.c, roughness);
  m.map = imageMap(name); m.normalMap = imageMap(name + '-normal', false);
  m.normalScale.setScalar(relief); m.userData.tile = [width, height];
  return m;
}
