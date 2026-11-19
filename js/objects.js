// 展柜中的实物（依原物形制制作的数字复制品）。每个构造函数返回以底面中心为原点的 Group。
import * as THREE from 'three';
import { FONT, SANS, lam, basic, box, hdCanvas, tex, lazyTex, rng } from './util.js';

import { finish, surface } from './finishes.js';

const paperPlane = (w, h, cv, tilt = -1.1) => {
  const geo = new THREE.PlaneGeometry(w, h, 12, 6), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / w, v = pos.getY(i) / h;
    pos.setZ(i, h * (0.010 * Math.cos(u * Math.PI * 2) + 0.022 * (u + 0.5) ** 3 * (v + 0.5)));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xfffcf6, map: lazyTex(typeof cv === 'function' ? cv : () => cv), roughness: 0.95, side: THREE.DoubleSide }));
  m.rotation.x = tilt; return m;
};

const BUILD = {
  wok(g) {
    const iron = finish(0x35322f, 0.64, 0.55); iron.side = THREE.DoubleSide;
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), iron);
    w.scale.y = 0.55; w.position.y = 0.27; w.rotation.z = 0.12; g.add(w);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.006, 6, 48), iron);
    lip.rotation.set(Math.PI / 2, 0, 0.12, 'ZXY'); lip.position.copy(w.position); g.add(lip);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 12, Math.PI), iron); h.position.set(s * 0.42, 0.28, 0); h.rotation.y = Math.PI / 2; g.add(h); }
    for (let i = 0; i < 5; i++) box(g, 0.1 + i * 0.02, 0.05, 0.08, lam(0x3a2a22), -0.3 + i * 0.13, 0.03, 0.34 - (i % 2) * 0.1).rotation.y = i;
  },
  paper1958(g) {
    const cv = () => hdCanvas(720, 1000, (c, w, h) => {
      c.fillStyle = '#d9cfb4'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#a3261c'; c.font = `bold 92px ${FONT}`; c.textBaseline = 'top'; c.fillText('人民日报', 36, 28);
      c.fillStyle = '#2a2622'; c.font = `22px ${SANS}`; c.fillText('1958年8月13日　星期三', 430, 70);
      c.fillRect(30, 140, w - 60, 3);
      c.font = `bold 46px ${FONT}`; c.fillText('麻城建国一社出现天下第一田', 40, 164);
      c.font = `bold 56px ${FONT}`; c.fillText('早稻亩产三万六千九百多斤', 30, 226);
      c.fillRect(30, 304, w - 60, 2);
      const R = rng(5);
      for (let col = 0; col < 6; col++) for (let y = 324; y < h - 30; y += 15) { if (R() < 0.06) continue; c.fillStyle = `rgba(42,38,34,${0.55 + R() * 0.3})`; c.fillRect(34 + col * 112, y, 100 * (0.7 + R() * 0.3), 7); }
      c.fillStyle = '#b9ae90'; c.fillRect(258, 420, 212, 150); c.strokeStyle = '#2a2622'; c.strokeRect(258, 420, 212, 150);
    });
    const p = paperPlane(0.72, 1.0, cv, -1.25); p.position.set(0, 0.18, 0); g.add(p);
  },
  coupons(g) {
    const mk = (title, val, col) => hdCanvas(360, 200, (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a3226'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#3a2a1a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold 34px ${FONT}`; c.fillText(title, w / 2, 48); c.font = `bold 62px ${FONT}`; c.fillText(val, w / 2, 112);
      c.font = `20px ${SANS}`; c.fillText('中华人民共和国粮食部　1966', w / 2, 168);
    });
    [['全国通用粮票', '伍市斤', '#c9b98a', -0.28, 0.18, 0.2], ['全国通用粮票', '壹市斤', '#b7c2a0', 0.2, 0.22, -0.3], ['全国通用粮票', '半市斤', '#c7a9a0', 0.3, -0.12, 0.25], ['地方粮票', '贰市两', '#a9b8c4', -0.2, -0.2, -0.15]].forEach(([t, v, col, x, z, r]) => {
      const p = paperPlane(0.34, 0.19, () => mk(t, v, col), -Math.PI / 2 + 0.02); p.position.set(x, 0.03, z); p.rotation.z = r; g.add(p);
    });
    const book = box(g, 0.3, 0.02, 0.42, lam(0x6a2a22), 0.02, 0.012, 0.0); book.rotation.y = 0.15;
  },
  redbook(g) {
    const cover = lazyTex(() => hdCanvas(256, 360, (c, w, h) => {
      c.fillStyle = '#b01818'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c860'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 14 : 34; c.lineTo(w / 2 + Math.cos(a) * r, 92 + Math.sin(a) * r); } c.fill();
      c.font = `bold 44px ${FONT}`; c.fillText('毛主席语录', w / 2, 210);
    }));
    const red = lam(0xb01818), page = lam(0xe8e0cc), top = basic(0xffffff, { map: cover });
    [[-0.25, 0.1, 0.2], [0.12, -0.05, -0.25], [0.3, 0.22, 0.5]].forEach(([x, z, r]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.28), [page, red, top, red, page, page]);
      m.position.set(x, 0.02, z); m.rotation.y = r; g.add(m);
    });
  },
  armband(g) {
    const cv = () => hdCanvas(1024, 256, (c, w, h) => {
      c.fillStyle = '#b3161a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f0d24a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 150px ${FONT}`;
      c.fillText('红卫兵', w / 4, h / 2 + 8); c.fillText('红卫兵', w * 3 / 4, h / 2 + 8);
    });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 32, 1, true), lam(0xffffff, { map: lazyTex(cv), side: THREE.DoubleSide }));
    m.position.y = 0.22; m.rotation.z = 0.25; m.scale.z = 0.5; g.add(m);
    const pin = box(g, 0.5, 0.02, 0.3, lam(0x2a2a2c), 0, 0.01, 0);
  },
  badges(g) {
    const R = rng(3), rim = finish(0xcaa23a, 0.35, 0.70), red = finish(0xb01818, 0.25), goldc = finish(0xe2c060, 0.32, 0.56);
    for (let i = 0; i < 14; i++) {
      const r = 0.035 + R() * 0.04, x = (i % 5 - 2) * 0.17 + (R() - 0.5) * 0.04, z = (Math.floor(i / 5) - 1) * 0.2 + (R() - 0.5) * 0.04;
      const a = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 20), rim); a.position.set(x, 0.02, z); g.add(a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, 0.014, 20), red); b.position.set(x, 0.022, z); g.add(b);
      const cdot = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 10, 6), goldc); cdot.scale.y = 0.25; cdot.position.set(x, 0.03, z); g.add(cdot);
    }
    box(g, 1.0, 0.012, 0.72, lam(0x3a0c0c), 0, 0.006, 0);
  },
  burntbooks(g) {
    const R = rng(11);
    for (let i = 0; i < 46; i++) {
      const burnt = R() < 0.6, m = box(g, 0.16 + R() * 0.1, 0.03 + R() * 0.04, 0.22 + R() * 0.08, lam(burnt ? 0x141210 : [0x5a4630, 0x6a5a48, 0x3c4a5a][i % 3]), (R() - 0.5) * 0.9, 0.03 + R() * 0.26, (R() - 0.5) * 0.9);
      m.rotation.set((R() - 0.5) * 0.9, R() * 3, (R() - 0.5) * 0.9);
    }
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.04, 20), lam(0x1a1918)); ash.position.y = 0.02; g.add(ash);
  },
  dunce(g) {
    const paper = lam(0xe9e4d6), wood = lam(0x3b3026);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.1, 20), paper); hat.position.set(-0.28, 0.55, 0); g.add(hat);
    const board = lazyTex(() => hdCanvas(360, 440, (c, w, h) => {
      c.fillStyle = '#d8cfb8'; c.fillRect(0, 0, w, h); c.fillStyle = '#141414'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold 46px ${FONT}`; c.fillText('反动学术', w / 2, 70); c.fillText('权　　威', w / 2, 130);
      c.font = `bold 84px ${FONT}`; c.fillText('× × ×', w / 2, 290);
      c.strokeStyle = '#b01010'; c.lineWidth = 14; c.beginPath(); c.moveTo(50, 210); c.lineTo(310, 380); c.moveTo(310, 210); c.lineTo(50, 380); c.stroke();
    }));
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.03), [wood, wood, wood, wood, basic(0xffffff, { map: board }), wood]);
    b.position.set(0.28, 0.42, 0); b.rotation.x = -0.25; g.add(b);
    const wire = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 6, 24, Math.PI), lam(0x555555)); wire.position.set(0.28, 0.72, -0.06); g.add(wire);
  },
  slogans(g) {
    const cv = () => hdCanvas(1024, 512, (c, w, h) => {
      c.fillStyle = '#8a5a44'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 40 - 40; x < w; x += 80) { c.fillStyle = `rgb(${130 + (x * 7 + y) % 30},${82 + (x + y * 3) % 20},${62 + (x * 3 + y) % 16})`; c.fillRect(x + 2, y + 2, 76, 28); }
      c.fillStyle = 'rgba(232,226,210,.92)'; c.fillRect(40, 70, w - 80, 380);
      c.fillStyle = '#b01818'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold 78px ${FONT}`; c.fillText('宁可血流成河', w / 2, 150); c.fillText('不准超生一个', w / 2, 250);
      c.font = `bold 52px ${FONT}`; c.fillText('该扎不扎　房倒屋塌', w / 2, 350); c.font = `26px ${SANS}`; c.fillStyle = '#7a3a30'; c.fillText('× × 乡计划生育办公室　宣', w / 2, 414);
    });
    const brick = lam(0x8a5a44), face = lam(0xffffff, { map: lazyTex(cv) });
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 0.3), [brick, brick, brick, brick, face, face]); m.position.y = 0.9; g.add(m);
  },
  poppies(g) {   // 边区的“特货”：一畦罂粟（花、划过刀口的蒴果）与木盘里成块的烟土（示意）
    const soil = lam(0x4a3524); box(g, 4.0, 0.08, 1.0, soil, 0, 0.04, 0);
    const R = rng(1942), N = 64, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.009, 1, 5), lam(0x6f8a4a), N);
    const leaf = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), lam(0x7d9a58), N * 2);
    const pod = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 10, 8), lam(0x8fa66a), N);
    const petal = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xffffff), N);
    const cols = [0xc81e1e, 0xd8342a, 0xf0ece4, 0xb0306a, 0xc81e1e];
    for (let i = 0; i < N; i++) {
      const x = -1.9 + (i % 16) * 0.25 + (R() - 0.5) * 0.12, z = -0.36 + Math.floor(i / 16) * 0.24 + (R() - 0.5) * 0.1, h = 0.55 + R() * 0.35, lean = (R() - 0.5) * 0.18;
      e.set(lean, 0, (R() - 0.5) * 0.18); q.setFromEuler(e); m4.compose(v.set(x, 0.08 + h / 2, z), q, sc.set(1, h, 1)); stem.setMatrixAt(i, m4);
      for (let k = 0; k < 2; k++) { e.set(0.3, R() * 6, 1.1); q.setFromEuler(e); m4.compose(v.set(x + (R() - 0.5) * 0.05, 0.14 + R() * 0.2, z), q, sc.set(1.6, 0.25, 0.7)); leaf.setMatrixAt(i * 2 + k, m4); }
      const top = new THREE.Vector3(x + lean * h * 0.5, 0.08 + h, z);
      m4.compose(top, q.identity(), sc.set(1, 1.25, 1)); pod.setMatrixAt(i, m4);
      const flower = R() < 0.55;   // 一半开花，一半只剩蒴果
      m4.compose(v.copy(top).add(new THREE.Vector3(0, -0.005, 0)), q.identity(), flower ? sc.set(1.25, 0.9, 1.25) : sc.set(0.001, 0.001, 0.001)); petal.setMatrixAt(i, m4);
      petal.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    }
    for (const im of [stem, leaf, pod, petal]) { im.instanceMatrix.needsUpdate = true; g.add(im); }
    // 木盘里的烟土块
    const tray = lam(0x6a4a2a); box(g, 0.5, 0.04, 0.34, tray, 1.65, 0.12, 0.62);
    for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lam(0x2a1a10)); b.scale.set(1.2, 0.6, 1); b.position.set(1.5 + (k % 3) * 0.14, 0.17, 0.56 + Math.floor(k / 3) * 0.12); g.add(b); }
  },
  placard(g) {
    const cv = () => hdCanvas(420, 560, (c, w, h) => {
      c.fillStyle = '#c9b58a'; c.fillRect(0, 0, w, h); c.fillStyle = '#141414'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold 84px ${FONT}`; c.fillText('流氓犯', w / 2, 120); c.font = `bold 110px ${FONT}`; c.fillText('× × ×', w / 2, 360);
      c.strokeStyle = '#b01010'; c.lineWidth = 18; c.beginPath(); c.moveTo(60, 250); c.lineTo(360, 480); c.moveTo(360, 250); c.lineTo(60, 480); c.stroke();
    });
    const p = paperPlane(0.6, 0.8, cv, -0.3); p.position.set(0, 0.45, 0); g.add(p);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.008, 6, 24, Math.PI), lam(0x8a7a5a)); rope.position.set(0, 0.82, -0.12); rope.rotation.x = -0.3; g.add(rope);
  },
  chair(g) {
    const wood = surface('timber'), seat = finish(0x27354b, 0.88);
    box(g, 0.5, 0.06, 0.5, seat, 0, 0.48, 0); box(g, 0.5, 0.6, 0.05, seat, 0, 0.82, -0.23);
    for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) box(g, 0.05, z < 0 ? 1.12 : 0.46, 0.05, wood, x, z < 0 ? 0.56 : 0.23, z);
    for (const side of [-1, 1]) {
      box(g, 0.035, 0.045, 0.42, wood, side * 0.22, 0.19, 0);
      box(g, 0.43, 0.075, 0.035, wood, 0, 0.414, side * 0.21);
    }
    const medal = box(g, 0.2, 0.03, 0.2, lam(0x3a0c0c), -0.06, 0.525, 0.04);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 20), finish(0xd8b548, 0.36, 0.68)); disc.position.set(-0.06, 0.546, 0.04); g.add(disc);
    const dip = box(g, 0.26, 0.012, 0.18, lam(0xe9e4d6), 0.1, 0.517, -0.08); dip.rotation.y = 0.2;
  },
  admonition(g) {
    const cv = () => hdCanvas(720, 1000, (c, w, h) => {
      c.fillStyle = '#f3f1ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#1c1c1c'; c.textBaseline = 'top';
      c.textAlign = 'center'; c.font = `24px ${FONT}`; c.fillText('武汉市公安局武昌分局中南路派出所', w / 2, 50);
      c.font = `bold 62px ${FONT}`; c.fillText('训　诫　书', w / 2, 96);
      c.textAlign = 'left'; c.font = `24px ${FONT}`;
      ['被训诫人：李文亮　性别：男', '工作单位：武汉市中心医院', '违法行为：2019年12月30日在微信群发表有关华南', '水果海鲜市场确诊7例SARS的不属实的言论。', '', '现在依法对你在互联网上发表不属实的言论的违法', '问题提出警示和训诫。你的行为严重扰乱了社会秩', '序……公安机关希望你积极配合工作，听从民警的', '规劝，至此中止违法行为。你能做到吗？'].forEach((l, i) => c.fillText(l, 60, 210 + i * 44));
      c.font = `bold 40px ${FONT}`; c.fillStyle = '#1a2a6a'; c.fillText('答：能', 60, 630);
      c.fillStyle = '#1c1c1c'; c.font = `24px ${FONT}`; c.fillText('我们希望你冷静下来好好反思……你听明白了吗？', 60, 710);
      c.font = `bold 40px ${FONT}`; c.fillStyle = '#1a2a6a'; c.fillText('答：明白', 60, 760);
      c.fillStyle = 'rgba(190,30,30,.75)'; for (const [x, y] of [[250, 648], [300, 778], [470, 900]]) { c.beginPath(); c.ellipse(x, y, 26, 34, 0.2, 0, 7); c.fill(); }
      c.fillStyle = '#1c1c1c'; c.font = `24px ${FONT}`; c.fillText('被训诫人：　　　　　　　2020年1月3日', 60, 890);
    });
    const p = paperPlane(0.72, 1.0, cv, -1.25); p.position.set(0, 0.18, 0); g.add(p);
  },
  landdeed(g) {   // 土地房产所有证（示意，姓名地亩均以×代替）
    const cv = () => hdCanvas(900, 640, (c, w, h) => {
      c.fillStyle = '#e8dcbc'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9a2a1a'; c.lineWidth = 10; c.strokeRect(24, 24, w - 48, h - 48); c.lineWidth = 2; c.strokeRect(40, 40, w - 80, h - 80);
      c.fillStyle = '#9a2a1a'; c.textAlign = 'center'; c.textBaseline = 'top'; c.font = `bold 58px ${FONT}`; c.fillText('土地房产所有证', w / 2, 66);
      c.fillStyle = '#2a2018'; c.font = `26px ${FONT}`; c.textAlign = 'left';
      ['××省××县第×区××乡　户主：×××', '依据《中华人民共和国土地改革法》第三十条之规定，', '确定本户全家所有土地共计×块××亩×分，房屋×间，', '地基×处，均作为本户全家私有产业，', '有耕种、居住、典卖、转让、赠与、出租等完全自由，', '任何人不得侵犯。特给此证。'].forEach((l, i) => c.fillText(l, 80, 170 + i * 46));
      c.textAlign = 'right'; c.fillText('县长　×××　　公元一九五一年　月　日', w - 80, 480);
      c.fillStyle = 'rgba(180,30,30,.7)'; c.beginPath(); c.arc(w - 210, 470, 62, 0, 7); c.fill();
      c.fillStyle = '#e8dcbc'; c.font = `bold 20px ${FONT}`; c.textAlign = 'center'; c.fillText('××县人民政府', w - 210, 462);
    });
    const p = paperPlane(0.95, 0.68, cv, -1.25); p.position.set(0, 0.16, 0); g.add(p);
  },
  deathnotice(g) {   // 镇反时期的判决布告（示意）：名字上打着红勾
    const cv = () => hdCanvas(700, 1000, (c, w, h) => {
      c.fillStyle = '#efe9d8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; c.textAlign = 'center'; c.textBaseline = 'top';
      c.font = `bold 46px ${FONT}`; c.fillText('××市军事管制委员会', w / 2, 46); c.font = `bold 92px ${FONT}`; c.fillText('布　告', w / 2, 110);
      c.textAlign = 'left'; c.font = `26px ${FONT}`;
      for (let i = 0; i < 7; i++) { const y = 260 + i * 92; c.fillText(`反革命犯 ×××，男，××岁，××县人。`, 70, y); c.fillText('　　……经人民审判，判处死刑，立即执行。', 70, y + 38);
        c.strokeStyle = '#c01414'; c.lineWidth = 9; c.beginPath(); c.moveTo(40, y + 20); c.lineTo(56, y + 46); c.lineTo(92, y - 6); c.stroke(); }
      c.textAlign = 'right'; c.fillText('一九五一年　月　日', w - 60, 930);
    });
    const p = paperPlane(0.7, 1.0, cv, -1.25); p.position.set(0, 0.18, 0); g.add(p);
  },
  belt(g) {   // 铜头皮带：军用宽皮带，铜扣
    const leather = finish(0x5a3a22, 0.64), brass = finish(0xc8a040, 0.34, 0.68);
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.16 - i * 0.035, 0.012, 4, 40), leather); t.rotation.x = Math.PI / 2; t.scale.set(1, 1, 3.2); t.position.set(-0.08, 0.02 + i * 0.012, 0); g.add(t); }
    box(g, 0.5, 0.012, 0.05, leather, 0.22, 0.016, 0.12).rotation.y = 0.15;
    box(g, 0.1, 0.02, 0.08, brass, 0.45, 0.02, 0.16); box(g, 0.03, 0.022, 0.05, lam(0x8a6a20), 0.45, 0.031, 0.16);
  },
  pvacap(g) {   // 志愿军的棉帽与胶鞋
    const cotton = lam(0x6a6a48), rubber = lam(0x2a2a26), canvas = lam(0x5e5e44);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), cotton); cap.scale.set(1, 0.9, 1.05); cap.position.set(-0.16, 0.02, 0); g.add(cap);
    for (const s of [-1, 1]) { const f = box(g, 0.05, 0.16, 0.12, cotton, -0.16 + s * 0.14, 0.03, 0.02); f.rotation.z = s * 0.4; }
    box(g, 0.2, 0.025, 0.07, cotton, -0.16, 0.03, 0.15);
    for (const s of [0, 1]) { box(g, 0.1, 0.03, 0.27, rubber, 0.12 + s * 0.13, 0.015, 0.02 - s * 0.03); box(g, 0.09, 0.07, 0.17, canvas, 0.12 + s * 0.13, 0.06, -0.02 - s * 0.03); }
  },
  mango(g) {   // 玻璃罩里的蜡制芒果：底座、托盘、芒果和玻璃罩
    box(g, 0.34, 0.05, 0.34, lam(0x5a2a1a), 0, 0.025, 0);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 24), lam(0xe8e2d0)); plate.position.y = 0.06; g.add(plate);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), finish(0xe0a020, 0.42)); m.scale.set(1.35, 0.8, 0.95); m.rotation.z = 0.35; m.position.set(0, 0.12, 0); g.add(m);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), finish(0xc8781a, 0.48)); tip.position.set(0.085, 0.1, 0); g.add(tip);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdfeef4, roughness: 0.11, metalness: 0.24, transparent: true, opacity: 0.14, depthWrite: false }));
    dome.scale.y = 1.6; dome.position.y = 0.05; g.add(dome);
    const cv = () => hdCanvas(256, 64, (c, w, h) => { c.fillStyle = '#b01c14'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2d890'; c.font = `bold 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('无限忠于', w / 2, h / 2); });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.055), basic(0xffffff, { map: lazyTex(cv) })); lab.position.set(0, 0.03, 0.171); g.add(lab);
  },
  healthcode(g) {
    [['#2aa24a', '绿码', -0.3, 0.1], ['#d9a514', '黄码', 0, -0.1], ['#c8281e', '红码', 0.3, 0.14]].forEach(([col, label, x, r], k) => {
      const cv = () => hdCanvas(256, 512, (c, w, h) => {
        c.fillStyle = '#f4f4f4'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.fillRect(0, 0, w, 96);
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 44px ${SANS}`; c.fillText(label, w / 2, 50);
        const R = rng(31 + k * 7); c.fillStyle = col;
        for (let i = 0; i < 21; i++) for (let j = 0; j < 21; j++) if (R() > 0.5 || (i < 6 && j < 6) || (i > 14 && j < 6) || (i < 6 && j > 14)) c.fillRect(34 + i * 9, 140 + j * 9, 9, 9);
        c.fillStyle = '#f4f4f4'; for (const [a, b] of [[1, 1], [16, 1], [1, 16]]) c.fillRect(34 + a * 9, 140 + b * 9, 36, 36);
        c.fillStyle = col; for (const [a, b] of [[2, 2], [17, 2], [2, 17]]) c.fillRect(34 + a * 9, 140 + b * 9, 18, 18);
        c.fillStyle = '#333'; c.font = `22px ${SANS}`; c.fillText(['核酸　24小时　阴性', '请于24小时内核酸检测', '请立即向社区报告'][k], w / 2, 380);
        c.fillStyle = '#888'; c.font = `18px ${SANS}`; c.fillText('**文 　**************', w / 2, 430);
      });
      const body = lam(0x111113);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.016), [body, body, body, body, basic(0xffffff, { map: lazyTex(cv) }), body]);
      m.position.set(x, 0.26, 0); m.rotation.set(-0.5, r, 0); g.add(m);
    });
  },
  hazmat(g) {
    const white = lam(0xf2f2f0), blue = lam(0x3c6fb0);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.62, 6, 14), white); body.position.y = 1.08; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), white); head.position.y = 1.72; g.add(head);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 8, -0.9, 1.8, 1.1, 0.7), new THREE.MeshBasicMaterial({ color: 0x8fb4d8, transparent: true, opacity: 0.55 })); visor.position.y = 1.72; visor.rotation.y = -Math.PI / 2; g.add(visor);
    const mask = box(g, 0.16, 0.09, 0.05, blue, 0, 1.66, 0.15);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.62, 4, 10), white); leg.position.set(s * 0.13, 0.42, 0); g.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.55, 4, 10), white); arm.position.set(s * 0.33, 1.08, 0); arm.rotation.z = s * 0.14; g.add(arm);
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), blue); glove.position.set(s * 0.38, 0.72, 0); g.add(glove);
      const boot = box(g, 0.14, 0.1, 0.26, blue, s * 0.13, 0.05, 0.04);
    }
    box(g, 0.02, 0.9, 0.02, blue, 0, 1.1, 0.245);
  },
  a4(g) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.594), basic(0xffffff, { side: THREE.DoubleSide }));
    sheet.position.y = 1.25; g.add(sheet);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.95, 6), lam(0x555555)); rod.position.set(0, 0.475, -0.01); g.add(rod);
    box(g, 0.2, 0.02, 0.2, lam(0x222222), 0, 0.01, 0);
  }
};

export const TALL = new Set(['hazmat', 'a4', 'chair']);
export const BARE = new Set(['slogans', 'poppies']);   // 不进展柜、直接落地

export function buildObject(kind) {
  const g = new THREE.Group();
  (BUILD[kind] || ((gr) => box(gr, 0.3, 0.3, 0.3, lam(0x888888), 0, 0.15, 0)))(g);
  return g;
}
