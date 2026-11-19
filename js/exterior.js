// 室外：天安门广场、纪念堂外观、天安门城楼、纪念碑、两侧建筑
import * as THREE from 'three';
import { FONT, lam, basic, box, textCanvas, tex, noiseTex, hipRoof } from './util.js';

import { finish, surface } from './finishes.js';

export function buildExterior(scene, { B, OUTER_H, collide }) {
  const g = new THREE.Group(); scene.add(g);

  // ── 天空 ──
  const sky = textCanvas(32, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#4c6a8c'); gr.addColorStop(0.3, '#8da6bd'); gr.addColorStop(0.47, '#c3c9c9'); gr.addColorStop(0.5, '#cdcdc6'); gr.addColorStop(1, '#cdcdc6');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const skyMaterial = basic(0xffffff, { map: tex(sky), side: THREE.BackSide, fog: false, depthWrite: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), skyMaterial);
  dome.rotation.y = 2.3; g.add(dome);
  new THREE.TextureLoader().load('assets/surfaces/courtyard-sky.jpg', panorama => {
    panorama.colorSpace = THREE.SRGBColorSpace;
    skyMaterial.map.dispose();
    skyMaterial.map = panorama;
    panorama.mapping = THREE.EquirectangularReflectionMapping;
    g.userData.daylight = panorama;
  });

  // ── 地面（城市地面） ──
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3400, 3400), lam(0xffffff, { map: noiseTex('#8f8b83', 18, 256, 29, [200, 200]) }));
  ground.rotation.x = -Math.PI / 2; ground.name = 'groundPlane'; g.add(ground);

  // ── 纪念堂（现为博物馆）外观 ──
  const mg = new THREE.Group(); mg.name = 'mausoleum'; g.add(mg);
  const mcollide = (x0, x1, z0, z1) => collide(x0, x1, z0, z1, 'm');
  const granite = surface('plinth'), stone = surface('limestone');
  const stoneFlat = finish(0xe0d8c6, 0.62), cream = finish(0xddd3bc, 0.64);
  // 琉璃檐口（照片中呈赭褐色）与浮雕饰带
  const gold = new THREE.MeshStandardMaterial({ roughness: 0.36, metalness: 0.08, map: tex(textCanvas(512, 64, (c, w, h) => {
    c.fillStyle = '#9a4a2c'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { c.fillStyle = 'rgba(60,20,8,.45)'; c.fillRect(x, 0, 2, h); }
    c.fillStyle = 'rgba(255,200,150,.18)'; c.fillRect(0, 0, w, 8); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, h - 10, w, 10);
  }), [24, 1]) });
  const frieze = surface('limestone');
  // 成排的檐下托块以真实几何形成明暗交替，两层檐口各自向外出挑。
  for (const [half, level, count] of [[56.8, B + OUTER_H + 0.28, 54], [52.3, B + OUTER_H + 7.77, 50]]) {
    const corbels = new THREE.InstancedMesh(new THREE.BoxGeometry(1.03, 0.76, 1.8), cream, count * 4);
    const matrix = new THREE.Matrix4(); let i = 0;
    for (const side of [-1, 1]) for (let k = 0; k < count; k++) {
      const at = (2 * (k + 0.5) / count - 1) * half;
      corbels.setMatrixAt(i++, matrix.makeTranslation(at, level, side * half));
      corbels.setMatrixAt(i++, matrix.makeRotationY(Math.PI / 2).setPosition(side * half, level, at));
    }
    mg.add(corbels);
  }
  box(mg, 130, 1, 130, granite, 0, 0.5, 0);
  box(mg, 116, 1, 116, granite, 0, 1.5, 0);
  // 汉白玉栏杆
  for (const [half, y] of [[64.6, 1], [57.6, B]]) {
    for (const s of [-1, 1]) {
      for (const [a0, a1] of [[-half, -15], [15, half]]) {
        box(mg, a1 - a0, 0.16, 0.34, stoneFlat, (a0 + a1) / 2, y + 1.0, s * half);
        box(mg, a1 - a0, 0.55, 0.14, stoneFlat, (a0 + a1) / 2, y + 0.45, s * half);
      }
      box(mg, 0.34, 0.16, half * 2, stoneFlat, s * half, y + 1.0, 0);
      box(mg, 0.14, 0.55, half * 2, stoneFlat, s * half, y + 0.45, 0);
    }
    const n = Math.floor(half * 2 / 2.4);
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 1.25, 0.3), stoneFlat, n * 4);
    const m4 = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i <= n; i++) {
      const t = -half + i * (half * 2 / n);
      for (const ss of [-1, 1]) {
        if (Math.abs(t) > 15) { m4.makeTranslation(t, y + 0.62, ss * half); posts.setMatrixAt(k++, m4); }
        if (i > 0 && i < n) { m4.makeTranslation(ss * half, y + 0.62, t); posts.setMatrixAt(k++, m4); }
      }
    }
    posts.count = k; mg.add(posts);
  }
  // 南北台阶
  for (const s of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const zOuter = 76 - i * 1.5, depth = zOuter - 58;
      box(mg, 28, 2 / 12, depth, stoneFlat, 0, (i + 0.5) * (2 / 12), s * (58 + depth / 2));
    }
    box(mg, 1, 3.1, 19, stoneFlat, -14.5, 1.55, s * 67); box(mg, 1, 3.1, 19, stoneFlat, 14.5, 1.55, s * 67);
    mcollide(-15, -14, s * 57.5, s * 76.5); mcollide(14, 15, s * 57.5, s * 76.5);
  }
  // 44 根花岗岩方柱
  const colGeo = new THREE.BoxGeometry(1.8, OUTER_H, 1.8);
  const columnUV = colGeo.attributes.uv;
  for (let i = 0; i < columnUV.count; i++) columnUV.setXY(i, columnUV.getX(i) * 0.50, columnUV.getY(i) * 5);

  const cols = new THREE.InstancedMesh(colGeo, stone, 44);
  const bases = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 0.8, 2.3), stoneFlat, 44);
  const m4 = new THREE.Matrix4(); let ci = 0;
  for (let i = 0; i < 12; i++) {
    const t = -53 + i * (106 / 11);
    const spots = [[t, -53], [t, 53]];
    if (i > 0 && i < 11) spots.push([-53, t], [53, t]);
    for (const [x, z] of spots) {
      m4.makeTranslation(x, B + OUTER_H / 2, z); cols.setMatrixAt(ci, m4);
      m4.makeTranslation(x, B + 0.4, z); bases.setMatrixAt(ci++, m4);
      mcollide(x - 1.1, x + 1.1, z - 1.1, z + 1.1);
    }
  }
  mg.add(cols, bases);
  // 方柱柱脚的叠涩与柱头承托，沿用方柱实例的位置。
  for (const [width, height, level] of [[2.55, 0.16, 0.08], [2.08, 0.22, 0.89], [2.14, 0.30, OUTER_H - 3.48], [2.55, 0.18, OUTER_H - 3.24]]) {
    const trim = new THREE.InstancedMesh(new THREE.BoxGeometry(width, height, width), stoneFlat, ci);
    for (let i = 0; i < ci; i++) {
      cols.getMatrixAt(i, m4); m4.elements[13] = B + level; trim.setMatrixAt(i, m4);
    }
    mg.add(trim);
  }
  // 双层琉璃檐口
  let y = B + OUTER_H;
  box(mg, 114, 0.8, 114, cream, 0, y + 0.4, 0); box(mg, 108, 3.2, 108, frieze, 0, y - 1.6, 0);
  box(mg, 119, 2.6, 119, gold, 0, y + 2.1, 0);
  box(mg, 120.4, 0.3, 120.4, lam(0xb7821e), 0, y + 3.55, 0); y += 3.7;
  box(mg, 102, 4.2, 102, frieze, 0, y + 2.1, 0); y += 4.2;
  box(mg, 112, 2.6, 112, gold, 0, y + 1.3, 0);
  box(mg, 113.4, 0.3, 113.4, lam(0xb7821e), 0, y + 2.75, 0); y += 2.9;
  box(mg, 100, 0.8, 100, cream, 0, y + 0.4, 0);
  // 匾额：汉白玉底金字
  const plaque = tex(textCanvas(1040, 320, (c, w, h) => {
    c.fillStyle = '#f2efe8'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#b8963c'; c.lineWidth = 8; c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = '#b3832a'; c.font = `bold 190px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('文革博物馆', w / 2, h / 2 + 6);
  }));
  for (const s of [-1, 1]) {
    // 匾额位于正门上方、中央两根柱子之间的门楣上（与实景一致）
    const py = B + 25.7;
    box(g, 8.2, 2.8, 0.2, lam(0xb8ad94), 0, py, s * 50.32);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 2.4), basic(0xffffff, { map: plaque }));
    p.position.set(0, py, s * 50.44); p.rotation.y = s < 0 ? Math.PI : 0; p.name = 'plaque'; g.add(p);
  }
  const stele = tex(textCanvas(1024, 300, (c, w, h) => {
    c.fillStyle = '#232325'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d9d2c2'; c.font = `bold 64px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('文革博物馆', w / 2, 70);
    c.font = `36px ${FONT}`; c.fillText('原毛主席纪念堂　一九七七年建成', w / 2, 150);
    c.fillStyle = '#9b9486'; c.font = `30px ${FONT}`; c.fillText('北门入口　·　参观全程单向　·　出口在南侧', w / 2, 230);
  }));
  { const sm = lam(0x232325), face = basic(0xffffff, { map: stele });
    const m = new THREE.Mesh(new THREE.BoxGeometry(6, 1.76, 0.4), [sm, sm, sm, sm, face, face]); m.rotation.x = -0.25;
    m.position.set(19, 1.1, -79); mg.add(m); mcollide(16, 22, -79.5, -78.5); }


  // ── 人民英雄纪念碑（广场中轴，纪念堂以北约二百三十米） ──
  const mz = -230, marble = lam(0xffffff, { map: noiseTex('#e3ddd0', 10, 128, 25, [4, 4]) });
  box(g, 61, 1.2, 50, marble, 0, 0.6, mz); box(g, 52, 1.0, 41, marble, 0, 1.7, mz);
  balustrade(g, 61, 50, 1.2, mz, stoneFlat); balustrade(g, 52, 41, 2.2, mz, stoneFlat);
  box(g, 17, 3.2, 13, stone, 0, 3.8, mz); box(g, 13.6, 1, 9.6, stoneFlat, 0, 5.9, mz);
  box(g, 7.4, 26, 4.2, stone, 0, 19.4, mz);
  const tablet = tex(textCanvas(256, 1024, (c, w, h) => {
    c.fillStyle = '#d8d1c0'; c.fillRect(0, 0, w, h); c.fillStyle = '#b08a3a'; c.font = `bold 150px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['人', '民', '英', '雄', '永', '垂', '不', '朽'].forEach((ch, i) => c.fillText(ch, w / 2, 70 + i * 125));
  }));
  const tb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 20), basic(0xffffff, { map: tablet })); tb.position.set(0, 19.6, mz + 2.12); g.add(tb);
  box(g, 8.6, 1.4, 5.4, stoneFlat, 0, 33.1, mz); hipRoof(g, 9.4, 6.2, 2.6, 0.45, stoneFlat, 0, 33.8, mz);
  collide(-31, 31, mz - 25, mz + 25);

  // ── 广场铺装与草坪 ──
  const plazaGeo = new THREE.PlaneGeometry(500, 720), paving = surface('plaza');
  const uv = plazaGeo.attributes.uv, [tw, th] = paving.userData.tile;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 500 / tw, uv.getY(i) * 720 / th);
  const plaza = new THREE.Mesh(plazaGeo, paving);
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.02, -200); plaza.name = 'plazaPlane'; g.add(plaza);
  const grass = lam(0xffffff, { map: noiseTex('#4f6a3e', 26, 128, 31, [10, 10]) }), hedge = lam(0x34492c);
  // 纪念堂东西两侧与南侧的草坪（无林木）
  const lawns = new THREE.Group(); lawns.name = 'lawns'; g.add(lawns);
  for (const [x0, x1, z0, z1] of [[-160, -75, -70, 120], [75, 160, -70, 120], [-60, -20, 90, 150], [20, 60, 90, 150]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), grass); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.05, (z0 + z1) / 2); lawns.add(m);
    for (const [a, b, c2, d2] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) {
      const alongX = b === d2; box(lawns, alongX ? x1 - x0 : 0.6, 0.55, alongX ? 0.6 : z1 - z0, hedge, (a + c2) / 2, 0.28, (b + d2) / 2);
    }
    collide(x0, x1, z0, z1);
  }

  // ── 长安街与周边道路 ──
  const asphalt = lam(0xffffff, { map: noiseTex('#3d3d3f', 16, 128, 33, [60, 2]) });
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(3000, 90), asphalt); avenue.rotation.x = -Math.PI / 2; avenue.position.set(0, 0.03, -605); g.add(avenue);
  for (const dz of [-40, -30, -20, -10, 10, 20, 30, 40]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(3000, 0.25), basic(0xd0d0c8)); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.05, -605 + dz); g.add(l); }
  { const l = new THREE.Mesh(new THREE.PlaneGeometry(3000, 0.5), basic(0xd8b84a)); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.05, -605); g.add(l); }
  for (const s of [-1, 1]) { const rd = new THREE.Mesh(new THREE.PlaneGeometry(40, 900), asphalt); rd.rotation.x = -Math.PI / 2; rd.position.set(s * 270, 0.03, -150); g.add(rd); }
  const southRd = new THREE.Mesh(new THREE.PlaneGeometry(600, 50), asphalt); southRd.rotation.x = -Math.PI / 2; southRd.position.set(0, 0.03, 185); g.add(southRd);

  // ── 国旗杆（广场北端） ──
  box(g, 14, 0.8, 14, marble, 0, 0.4, -545); balustrade(g, 14, 14, 0.8, -545, stoneFlat);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 32.6, 10), lam(0xe0e0e0)); pole.position.set(0, 17, -545); g.add(pole);
  collide(-7, 7, -552, -538);

  // ── 天安门城楼 ──
  const tz = -690, redFlat = lam(0x8e2a22), red = lam(0xffffff, { map: noiseTex('#8e2a22', 20, 256, 11, [8, 1]) }), tile = new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.38 });
  const face = tex(textCanvas(2048, 256, (c, w, h) => {
    c.fillStyle = '#8e2a22'; c.fillRect(0, 0, w, h);
    const img = c.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 18; d[i] += n; d[i + 1] += n * 0.5; d[i + 2] += n * 0.5; }
    c.putImageData(img, 0, 0);
    const arch = (cx, aw, ah) => { c.fillStyle = '#1a0d0b'; c.beginPath(); c.moveTo(cx - aw / 2, h); c.lineTo(cx - aw / 2, h - ah + aw / 2); c.arc(cx, h - ah + aw / 2, aw / 2, Math.PI, 0); c.lineTo(cx + aw / 2, h); c.fill(); };
    arch(w / 2, 96, 150); for (const s of [-1, 1]) { arch(w / 2 + s * 230, 80, 128); arch(w / 2 + s * 430, 72, 116); }
    c.fillStyle = '#c9a44a'; c.fillRect(w / 2 - 50, 16, 100, 74); c.fillStyle = '#7d241d'; c.fillRect(w / 2 - 44, 22, 88, 62);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 34px ${FONT}`;
    for (const [cx, t] of [[w / 2 - 330, '中华人民共和国万岁'], [w / 2 + 330, '世界人民大团结万岁']]) {
      c.fillStyle = '#a3261c'; c.fillRect(cx - 190, 30, 380, 50); c.strokeStyle = '#d8b04a'; c.lineWidth = 3; c.strokeRect(cx - 190, 30, 380, 50);
      c.fillStyle = '#f3ead6'; c.fillText(t, cx, 57);
    }
  }));
  const tbm = new THREE.Mesh(new THREE.BoxGeometry(120, 13, 40), [redFlat, redFlat, redFlat, redFlat, lam(0xffffff, { map: face }), redFlat]);
  tbm.position.set(0, 6.5, tz); g.add(tbm);
  box(g, 122, 0.5, 42, stoneFlat, 0, 13.25, tz); balustrade(g, 122, 42, 13.5, tz, stoneFlat);
  box(g, 64, 1.0, 34, stoneFlat, 0, 14, tz);
  box(g, 56, 8, 22, redFlat, 0, 18.5, tz);
  const tcol = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.55, 0.55, 8, 10), lam(0x9c2a20), 20), m4b = new THREE.Matrix4();
  for (let i = 0; i < 10; i++) for (const sgn of [-1, 1]) { m4b.makeTranslation(-29 + i * 6.44, 18.5, tz + sgn * 13.5); tcol.setMatrixAt(i * 2 + (sgn > 0 ? 1 : 0), m4b); }
  g.add(tcol);
  box(g, 62, 1.1, 29, lam(0x2f5a4a), 0, 23.05, tz);
  hipRoof(g, 70, 37, 3.4, 0.16, tile, 0, 23.6, tz);
  box(g, 52, 3.6, 19, redFlat, 0, 28.8, tz); box(g, 54, 0.8, 21, lam(0x2f5a4a), 0, 31, tz);
  hipRoof(g, 66, 33, 9, 0.66, tile, 0, 31.4, tz);
  box(g, 22, 1.2, 1.2, lam(0xb98424), 0, 40.6, tz);
  for (const s of [-1, 1]) {
    box(g, 600, 9, 7, red, s * 360, 4.5, tz + 8); box(g, 600, 1, 8, tile, s * 360, 9.4, tz + 8);
    box(g, 70, 4.5, 16, lam(0x9b9588), s * 110, 2.25, tz + 30);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 9.6, 8), marble); hb.position.set(s * 36, 5.6, tz + 45); g.add(hb);
    box(g, 3, 0.8, 3, stoneFlat, s * 36, 0.4, tz + 45); box(g, 3.6, 0.35, 0.7, stoneFlat, s * 36, 8.8, tz + 45);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 12), stoneFlat); cap.position.set(s * 36, 10.6, tz + 45); g.add(cap);
  }
  // 金水桥：横断面挤出拱洞，使近岸能看到桥腹、水面和石栏的剪影。
  const bridgeSection = new THREE.Shape();
  bridgeSection.moveTo(-7, 0); bridgeSection.lineTo(-7, 0.5);
  bridgeSection.quadraticCurveTo(0, 2.9, 7, 0.5);
  bridgeSection.lineTo(7, 0); bridgeSection.lineTo(4.15, 0);
  bridgeSection.quadraticCurveTo(0, 2.46, -4.15, 0); bridgeSection.closePath();
  for (const bx of [-20, -10, 0, 10, 20]) {
    const width = bx === 0 ? 9 : 6;
    const geo = new THREE.ExtrudeGeometry(bridgeSection, { depth: width, bevelEnabled: false, curveSegments: 12 });
    geo.rotateY(-Math.PI / 2);
    const bridge = new THREE.Mesh(geo, stoneFlat); bridge.position.set(bx + width / 2, 0.03, tz + 34); g.add(bridge);
    for (const side of [-1, 1]) {
      const px = bx + side * (width / 2 - 0.18);
      for (let k = -3; k <= 3; k++) {
        const dz = k * 2.2, crown = 1.70 - 1.20 * (dz / 7) ** 2;
        box(g, 0.30, 1.10, 0.30, stoneFlat, px, crown + 0.56, tz + 34 + dz);
        if (k === 3) continue;
        const next = 1.70 - 1.20 * ((dz + 2.2) / 7) ** 2;
        const rail = box(g, 0.17, 0.46, Math.hypot(2.2, next - crown), stoneFlat, px, (crown + next) / 2 + 0.62, tz + 35.1 + dz);
        rail.rotation.x = -Math.atan2(next - crown, 2.2);
      }
    }
  }
  const moat = new THREE.Mesh(new THREE.PlaneGeometry(300, 8), finish(0x607d79, 0.18, 0.36));
  moat.rotation.x = -Math.PI / 2; moat.position.set(0, 0.06, tz + 34); g.add(moat);
  collide(-700, 700, tz - 26, tz + 40);

  // ── 人民大会堂（西）与国家博物馆（东） ──
  publicBuilding(g, -1, -330, -260, 210, 336, 32, 12, stoneFlat);
  publicBuilding(g, 1, 330, -260, 150, 313, 33, 10, stoneFlat);
  collide(-440, -225, -430, -90); collide(225, 410, -420, -100);

  // ── 正阳门城楼与箭楼（南） ──
  const zz = 215, grey = lam(0xffffff, { map: noiseTex('#87867f', 22, 256, 23, [6, 2]) }), gtile = new THREE.MeshStandardMaterial({ map: tileTex('#536058'), roughness: 0.42 });
  const zface = tex(textCanvas(512, 128, (c, w, h) => {
    c.fillStyle = '#87867f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#17110f'; c.beginPath(); c.moveTo(w / 2 - 40, h); c.lineTo(w / 2 - 40, 60); c.arc(w / 2, 60, 40, Math.PI, 0); c.lineTo(w / 2 + 40, h); c.fill();
  }));
  const zb = new THREE.Mesh(new THREE.BoxGeometry(50, 14, 28), [grey, grey, grey, grey, lam(0xffffff, { map: zface }), lam(0xffffff, { map: zface })]);
  zb.position.set(0, 7, zz); g.add(zb);
  box(g, 41, 8, 17, redFlat, 0, 18, zz); hipRoof(g, 48, 25, 2.8, 0.15, gtile, 0, 22, zz);
  box(g, 36, 6, 14, redFlat, 0, 27.8, zz); hipRoof(g, 44, 22, 2.8, 0.15, gtile, 0, 30.8, zz);
  box(g, 32, 2.8, 11, redFlat, 0, 35, zz); hipRoof(g, 42, 21, 6.6, 0.62, gtile, 0, 36.4, zz);
  collide(-25, 25, zz - 14, zz + 14);
  const jz = 330, win = tex(textCanvas(512, 256, (c, w, h) => {
    c.fillStyle = '#8a8880'; c.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 13; k++) { c.fillStyle = '#7d1f18'; c.fillRect(18 + k * 37.5, 22 + r * 58, 18, 26); c.fillStyle = '#1a1210'; c.fillRect(21 + k * 37.5, 25 + r * 58, 12, 20); }
  }));
  box(g, 54, 12, 30, grey, 0, 6, jz);
  const jt = new THREE.Mesh(new THREE.BoxGeometry(56, 16, 26), [grey, grey, grey, grey, lam(0xffffff, { map: win }), lam(0xffffff, { map: win })]);
  jt.position.set(0, 20, jz); g.add(jt);
  hipRoof(g, 62, 32, 3, 0.15, gtile, 0, 28, jz); box(g, 46, 4, 18, grey, 0, 33, jz); hipRoof(g, 56, 26, 7, 0.6, gtile, 0, 35, jz);
  collide(-28, 28, jz - 16, jz + 16);

  // ── 华灯 ──
  const lampPts = [];
  for (let z = -540; z <= 140; z += 45) for (const s of [-1, 1]) lampPts.push([s * 245, z]);
  for (let x = -230; x <= 230; x += 46) lampPts.push([x, -565]);
  const lp = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.35, 11, 8), lam(0x4d5a52), lampPts.length);
  const glb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.75, 10, 8), basic(0xf4f1e6), lampPts.length * 5);
  const mm = new THREE.Matrix4(); let gi = 0;
  lampPts.forEach(([x, z], i) => {
    mm.makeTranslation(x, 5.5, z); lp.setMatrixAt(i, mm);
    mm.makeTranslation(x, 11.6, z); glb.setMatrixAt(gi++, mm);
    for (const [dx, dz] of [[1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.4]]) { mm.makeTranslation(x + dx, 10.4, z + dz); glb.setMatrixAt(gi++, mm); }
    collide(x - 0.6, x + 0.6, z - 0.6, z + 0.6);
  });
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.16, 1), lp.material, lampPts.length * 2);
  lampPts.forEach(([x, z], i) => {
    mm.makeScale(3.0, 1, 0.18).setPosition(x, 9.78, z); arms.setMatrixAt(2 * i, mm);
    mm.makeScale(0.18, 1, 3.0).setPosition(x, 9.78, z); arms.setMatrixAt(2 * i + 1, mm);
  });
  g.add(lp, glb, arms);

  // ── 远处城市轮廓 ──
  const R = (n) => (Math.sin(n * 91.7) * 43758.5) % 1;
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lam(0xb4b6b6), 120);
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2, rr = 1100 + Math.abs(R(i)) * 300, h = 8 + Math.abs(R(i + 7)) * 26;
    mm.makeScale(30 + Math.abs(R(i + 3)) * 40, h, 30 + Math.abs(R(i + 5)) * 40).setPosition(Math.sin(a) * rr, h / 2, Math.cos(a) * rr - 150); city.setMatrixAt(i, mm);
  }
  g.add(city);
  return g;
}

function tileTex(base = '#c8922a') {
  return tex(textCanvas(256, 128, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { c.fillStyle = 'rgba(90,50,10,.35)'; c.fillRect(x, 0, 2, h); }
    for (let y = 0; y < h; y += 16) { c.fillStyle = 'rgba(255,230,160,.15)'; c.fillRect(0, y, w, 3); }
  }), [24, 4]);
}

function balustrade(g, w, d, y, cz, mat) {
  for (const [x, z, lw, ld] of [[0, cz - d / 2, w, 0.3], [0, cz + d / 2, w, 0.3], [-w / 2, cz, 0.3, d], [w / 2, cz, 0.3, d]]) {
    box(g, lw, 0.14, ld, mat, x, y + 0.95, z); box(g, lw * (lw > 1 ? 1 : 0.5), 0.5, ld * (ld > 1 ? 1 : 0.5), mat, x, y + 0.45, z);
  }
}

// 大型公共建筑：中央柱廊 + 两翼，平顶黄绿琉璃檐
function publicBuilding(g, side, cx, cz, depth, length, h, ncol, stoneFlat) {
  const wallM = lam(0xffffff, { map: winTex(side < 0 ? '#d4c9a8' : '#cfc6aa') });
  const front = cx - side * depth / 2;
  box(g, depth, 3, length, lam(0x9b9588), cx, 1.5, cz);
  box(g, depth - 8, h, length - 8, wallM, cx, 3 + h / 2, cz);
  box(g, depth - 4, 2.4, length - 4, lam(0xc9a13a), cx, 3 + h + 1.2, cz); box(g, depth - 6, 1.6, length - 6, lam(0x4d6b4a), cx, 3 + h - 0.8, cz);
  box(g, depth * 0.45, 9, length * 0.38, wallM, cx + side * depth * 0.08, 3 + h + 4.5, cz); box(g, depth * 0.47, 1.6, length * 0.4, lam(0xc9a13a), cx + side * depth * 0.08, 3 + h + 9.6, cz);
  // 柱廊
  const portico = length * 0.36, colH = h - 2;
  const shaft = side < 0 ? new THREE.CylinderGeometry(1.5, 1.65, colH, 96) : new THREE.BoxGeometry(2.9, colH, 2.9);
  if (side < 0) {
    const positions = shaft.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      const flute = 0.97 + 0.03 * Math.cos(24 * Math.atan2(z, x));
      positions.setXYZ(i, x * flute, positions.getY(i), z * flute);
    }
    shaft.computeVertexNormals();
  }
  const cols = new THREE.InstancedMesh(shaft, finish(side < 0 ? 0xbfb6a3 : 0xd6ccb0, 0.66), ncol), m = new THREE.Matrix4();
  for (let i = 0; i < ncol; i++) { m.makeTranslation(front - side * 3.5, 3 + colH / 2, cz - portico / 2 + i * portico / (ncol - 1)); cols.setMatrixAt(i, m); }
  g.add(cols);
  box(g, 9, 3.2, portico + 8, stoneFlat, front - side * 3, 3 + colH + 1.6, cz);
  box(g, 10, 1.4, portico + 10, lam(0xc9a13a), front - side * 3, 3 + colH + 3.6, cz);
  const bronze = finish(0x4f483d, 0.36, 0.50);
  for (let i = 0; i < ncol; i++) {
    const z = cz - portico / 2 + i * portico / (ncol - 1);
    box(g, 3.8, 0.55, 3.8, stoneFlat, front - side * 3.5, 3.27, z);
    box(g, 3.7, 0.6, 3.7, stoneFlat, front - side * 3.5, 3 + colH - 0.3, z);
  }
  for (let i = 1; i < ncol; i++) {
    const z = cz - portico / 2 + (i - 0.5) * portico / (ncol - 1);
    box(g, 0.3, 5.8, 4.6, bronze, front + side * 3.92, 5.9, z);
  }
  // 从广场一直升至门廊，柱脚下方也由同一块台基承托。
  box(g, 9, 3, portico + 5, stoneFlat, front - side * 4, 1.5, cz);
  for (let k = 0; k < 15; k++) {
    const hgt = 3 - k * 0.2;
    box(g, 0.6, hgt, portico, stoneFlat, front - side * (8.8 + k * 0.6), hgt / 2, cz);
  }
}
function winTex(base) {
  return tex(textCanvas(256, 256, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let y = 18; y < h; y += 64) for (let x = 12; x < w; x += 32) { c.fillStyle = '#5b5446'; c.fillRect(x, y, 14, 34); c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(x + 2, y + 2, 4, 30); }
  }), [12, 1]);
}
