import * as THREE from 'three';
import { SECTIONS } from './content/index.js';
import { PEOPLE_WIKI, wikiUrl } from './content/links.js';
import { ROOMS, DOORS, STAIRS, ELEVATOR, FLOOR_H, CEIL, GALLERY } from './plan.js';
import { FONT, SANS, lam, basic, box, textCanvas, hdCanvas, tex, noiseTex, setAniso, rng, setReleaseStatic, lazyTex, lazyShare, setLazyTex, LAZY, lazyDraw, lazyFree } from './util.js';
import { setCanvasBudget } from './textutil.js';
import { PACKS, SMALL } from './content/packs.js';
import { STYLE, IMPACT, styleTexture, sloganCanvas, drawImpact } from './design.js';
import { SCENES, makeCtx } from './scenes.js';
import { VICTIMS, VICTIMS_SRC } from './content/victims.js';
import { HIRES as HIRES_LIST } from './content/hires.js';
import { initChat, toggleChat, chatHasFocus } from './chat.js';
import { initExtras, extrasFocusKey, extrasKey, extrasTap, extrasOpenItem, extrasHint, extrasTick, extrasStart, extrasDebug } from './extras.js';   // 扩展接口（本版本全部为空操作）
// 展板字体：随站点带一份只含本馆用字的 Noto Serif SC（正文 Medium、标题 Bold，tools/font_subset.py 生成），不依赖访客电脑上的字体（Windows 上默认的宋体在贴图里又细又糊）
// index.html 已预先请求这两个文件；载入后同一份数据也转给绘制线程
const FONT_BUFS = [], fontReady = Promise.all(['400', '700'].map(w => fetch(new URL(`assets/font/serif-${w}.woff2`, document.baseURI)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
  .then(b => { FONT_BUFS.push([w, b]); const f = new FontFace('MuseumSerif', b.slice(0), { weight: w }); document.fonts.add(f); return f.load(); })))
  .catch((e) => console.warn('展板字体载入失败，改用系统字体', e));
const HIRES = new Set(HIRES_LIST), hiSrc = (src) => src.replace('assets/img/', 'assets/img/hi/');
import { drawPanel, drawPanelWide, drawWallText, drawBioCase, drawQuote, drawTitle, drawCaption, drawLabel, drawWayfinding, drawCase, drawBookshelf, drawArchive, drawArchFrame, drawNames, drawTableCase, drawEvidence, drawStory, drawDossier } from './draw.js';
import * as DRAW from './draw.js';
import { caseSlots, tcaseSlots, archSlot, featureSlots, archiveSlots, fitRect } from './draw.js';
import { finish, surface, galleryReflection, initFinishes, scannedInterior } from './finishes.js';
import { planDisplays, suspendedPhoto, displaySizes, island, timeline } from './display-media.js';
import { acousticCeiling, bronze, ceilingType, floorWithContact, frame as pictureFrame, mountPrint, portal, railPost } from './interiors.js';
import { buildExterior } from './exterior.js';
import { buildObject, TALL, BARE } from './objects.js';

// ───────────────────────── 基本参数 ─────────────────────────
const B = 2;              // 台基顶面（一层地面）
const OUTER_H = 30;
const HALF = 48;
const EYE = 1.7;
const WALL_T = 0.6;       // 墙厚：房间墙面从轴线内缩 WALL_T/2
const FLOOR_NAMES = ['一层', '二层', '三层'];
// 上次加载没能完成时，等参观者点“进入 3D 展馆”再开始建造（见 index.html 的防崩溃循环）
if (window.__bootGate) { window.__bootWaiting = true; await window.__bootGate; window.__bootWaiting = false; }
const FLOOR_TITLES = ['革命的暗面与建政　1921—1958', '乌托邦与浩劫　1958—1976', '未完成的告别　1976—2022'];
const floorY = (f) => B + f * FLOOR_H;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
// 内存紧的设备：iOS（iPhone、iPad）给每个网页的内存比电脑和多数安卓手机少得多，超了会直接结束页面并重载
// （Safari 显示“A problem repeatedly occurred”）。这些设备（TIGHT）只改内存的管理方式，看到的内容和清晰度不变：
// 走到哪个展厅才把那里的贴图传给显卡、上传后释放画布、缓存与预载的范围小一些。
// 真正降低清晰度（LOW_MEM）只在上一次加载没能完成（多半是崩溃了，index.html 的启动脚本把 window.__safeMode 设为 2）或网址带 ?lowmem 时使用。
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const SAFE = window.__safeMode || 0;
const LOW_MEM = SAFE > 1 || /[?&]lowmem\b/.test(location.search);   // ?lowmem：在电脑上测试降清晰度的设置
const TIGHT = LOW_MEM || isIOS || SAFE > 0 || /[?&]tight\b/.test(location.search) || (navigator.deviceMemory && navigator.deviceMemory <= 4);   // ?tight：在电脑上测试 iOS 的内存管理
if (LOW_MEM) setCanvasBudget(SAFE > 1 ? 0.4 : 0.5, SAFE > 1 ? 1024 : 2048);
else if (TIGHT) setCanvasBudget(1, 3072);   // 内存紧的设备：清晰度不变，只把特别大的画布（如序厅题名墙）单边限在 3072 像素（比手机屏幕宽得多）
// 展项贴图分级：近处（约 12 米内）重绘为高清，远处用普通清晰度，省显存。
// 贴图越大，绘制越慢、上传显卡时越容易卡一下：高清档取每米约八九百像素，配合取样偏清晰（SHARP_MAP），文字依然锐利
const K_LO = SAFE > 1 ? 0.9 : LOW_MEM ? 0.8 : TIGHT ? 0.8 : isTouch ? 1.2 : 1.35, K_HI = SAFE > 1 ? 1.4 : LOW_MEM ? 2.0 : 3.0, K_HI_IMG = SAFE > 1 ? 1.2 : LOW_MEM ? 1.6 : 2.4;   // 普通／高清两档贴图的像素密度；以图片为主的展柜、档案框等高清档用 2.4（画布单边超过 3072 像素时自动收小）
const IMG_KINDS = new Set(['case', 'tcase', 'archframe', 'feature', 'bio', 'drawer']);

// ───────────────────────── 主题 ─────────────────────────
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k))));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}
// 各厅主题取自 design.js 的风格表
const lumOf = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function themeOf(id) {
  const st = STYLE[id] || STYLE.H20;
  const o = { wall: st.wall.c, floor: st.floor.c, accent: st.accent, part: st.part.c, accentLight: st.accentLight || st.accent, style: st,
    wallText: '#e8e2d2', wallSub: '#a39d90', partText: st.partText ?? lumOf(st.part.c) > 0.55 };
  if (st.light) Object.assign(o, { wallText: '#1d1a17', wallSub: '#55524b', light: true });
  if (st.darkPanel) o.darkPanel = true;
  return o;
}
function themeFor(no) {
  const T = (wall, floor, accent, o = {}) => ({ wall, floor, accent, part: shade(wall, -0.3), wallText: '#e8e2d2', wallSub: '#a39d90', accentLight: '#c9a961', ...o });
  if (no === 0) return T('#d7d0c0', '#5a5650', '#7a1f1f', { wallText: '#1d1a17', wallSub: '#5b564c', accentLight: '#7a1f1f', light: true, part: '#262428' });
  if (no === 25) return T('#121214', '#0d0d0f', '#7a1f1f', { accentLight: '#b89a55' });
  if (no <= 4) return T('#2a313a', '#23252a', '#2f4660', { wood: no === 3 });
  if (no <= 7) return T('#3a342b', '#2a2620', '#6b4a1e', { part: '#d9d2c2', partText: true });
  if (no === 8) return T('#4c3321', '#2b241e', '#9a4a12');
  if (no === 9) return T('#161617', '#101011', '#666', { darkPanel: true, accentLight: '#9a9486' });
  if (no === 10) return T('#3d3324', '#27231d', '#7a5a1e', { wood: true });
  if (no === 11) return T('#561818', '#2a1d1d', '#a01818');
  if (no <= 14) return T('#331010', '#1d1616', '#8a1414', { part: '#1a1414' });
  if (no === 15) return T('#30262a', '#201c1e', '#7a1f1f');
  if (no === 16) return T('#cfcac0', '#4b4a48', '#3a4a5a', { wallText: '#1d1a17', wallSub: '#55524b', accentLight: '#3a4a5a', light: true, part: '#2a2d31' });
  if (no === 19) return T('#121213', '#0c0c0d', '#666', { darkPanel: true, accentLight: '#9a9486' });
  if (no === 23) return T('#1b1c1e', '#121314', '#3c6fb0', { accentLight: '#8fb4d8', part: '#d8dadc', partText: true });
  return T('#262a2e', '#191b1d', '#3a4a5a', { wood: no === 18 });
}

// ───────────────────────── 章节与房间 ─────────────────────────
const sectionByRoom = Object.fromEntries(SECTIONS.map(s => [s.room, s]));
const area = (r) => (r.rect[1] - r.rect[0]) * (r.rect[3] - r.rect[2]);
const roomsOn = [0, 1, 2].map(f => ROOMS.filter(r => r.floor === f).sort((a, b) => area(a) - area(b)));
for (const r of ROOMS) {
  const [x0, x1, z0, z1] = r.rect;
  Object.assign(r, { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, key: `${r.floor}:${r.id}` });
  r.walls ||= []; r.blocks ||= []; r.install ||= []; r.obst = []; r.faces = []; r.path ||= [];
  r.sec = r.section ? sectionByRoom[r.section] : null;
  r.theme = r.sec ? themeOf(r.sec.room) : r.kind === 'stair' ? { ...themeOf('H17'), wall: '#bdb7ab', floor: '#55524d', style: { ...STYLE.H17, wall: { t: 'plaster', c: '#bdb7ab' }, floor: { t: 'stone', c: '#55524d' } } } : themeOf('A');
  r.ceilH = r.ceil || (r.kind === 'stair' || r.kind === 'exit' ? CEIL : GALLERY);
}
SECTIONS.forEach((s, i) => {
  const r = ROOMS.find(q => q.section === s.room);
  s.theme = themeOf(s.room); s.idx = i; s.roomObj = r; s.floor = r.floor;
  s.label = s.label || (s.no === 0 ? '序厅' : s.no === 25 ? '纪念厅' : `第 ${s.no} 展厅`);
  { const src = [...(s.noTitle ? [] : [{ k: 'title' }]), ...s.items], copy = new Map();
    s.items = src.map((it, idx) => { const c = { k: 'panel', ...it, idx }; copy.set(it, c); return c; });
    for (const it of s.items) if (it.anchor) it.anchor = copy.get(it.anchor) || null; }
});
const itemTitle = (it, s) => it.k === 'feature' ? `专题：${it.t}` : it.k === 'resist' ? `反抗：${it.t}` : it.k === 'story' ? `故事：${it.t}` : it.k === 'dossier' ? `个案：${it.t.split('：')[0]}` : it.k === 'bridge' ? `串联：${it.t}` : it.term ? `名词：${it.t}` : it.k === 'label' ? `展签：${it.t}` : it.k === 'impact' ? (it.sp.big || it.sp.line).slice(0, 20) : it.k === 'tcase' ? `平柜：${it.t.slice(0, 16)}` : it.k === 'evidence' ? `证词：${it.date}` : it.k === 'names' ? it.t : it.k === 'archframe' ? `档案：${it.t.slice(0, 18)}` : it.k === 'sculpt' ? `立体展品：${it.t}` : it.k === 'title' ? `导言：${s.title}` : it.k === 'bio' ? `人物：${it.name}` : it.k === 'quote' ? '引文' : it.k === 'photo' ? `照片：${it.cap.slice(0, 16)}…` : it.k === 'case' ? `展柜：${it.t}` : it.k === 'books' ? '禁书阅读' : it.k === 'arch' ? `档案柜 · ${it.objs.length} 件` : it.t;

// ───────────────────────── 渲染器 ─────────────────────────
const canvas = document.getElementById('scene');
// 高分屏（像素比 ≥ 1.5）上锯齿本来就看不出，不再开多重采样抗锯齿，省下大量填充开销
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !TIGHT || (window.devicePixelRatio || 1) < 2, powerPreference: TIGHT ? 'default' : 'high-performance' }); }
catch (e) { window.__loadFail?.('这个浏览器无法启用 WebGL，三维展馆打不开。可以改用文字导览，或换用新版 Chrome、Edge、Safari、Firefox。'); throw e; }   // 始终开多重采样抗锯齿（手机 GPU 做 MSAA 代价不大，否则展板边缘一圈锯齿）
// 渲染分辨率：按屏幕原生像素比（最高 3 倍）渲染；电脑上至少按 2 倍超采样（1 倍、1.5 倍屏也是），文字和边缘更细
const DPR_NATIVE = window.devicePixelRatio || 1, DPR_MAX = SAFE > 1 ? Math.min(DPR_NATIVE, 1.25) : LOW_MEM ? Math.min(DPR_NATIVE, 2) : Math.min(3, Math.max(DPR_NATIVE, isTouch ? 1 : 2));   // 低内存设备最多 2 倍
// 帧率不够时：电脑最多降回屏幕原生分辨率（不低于原生）；手机最多降到原生的 85%
const DPR_FLOOR = LOW_MEM ? Math.min(DPR_MAX, 1) : isTouch ? Math.max(1, Math.round(DPR_NATIVE * 0.85 * 4) / 4) : Math.min(DPR_MAX, Math.max(1, DPR_NATIVE));
renderer.setPixelRatio(DPR_MAX);
// 图形内存不够、画面被系统收回时：不黑屏卡住，提示重新载入（下次自动用省内存设置）或改读文字导览
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  try { localStorage.setItem('museum-boot', '1'); } catch {}
  const box = document.createElement('div'); box.id = 'gl-lost';
  box.innerHTML = '<p>3D 画面中断了（手机的图形内存不够）。重新载入会改用省内存的设置。</p><button type="button" onclick="location.reload()">重新载入</button><a href="guide.html" class="guide-link">改读文字导览</a>';
  document.body.append(box);
}, false);
// 帧率太低时自动降低渲染分辨率，流畅后再恢复
let dprNow = DPR_MAX, frAcc = 0, frN = 0, dprDownT = -1e9;
const FIXED_DPR = new URLSearchParams(location.search).has('fixeddpr');   // 测试用：固定渲染分辨率
function adaptDPR(dt) {
  if (FIXED_DPR) return;
  frAcc += dt; frN++; if (frAcc < 2.5) return;
  const avg = frAcc / frN; frAcc = 0; frN = 0;
  const t = performance.now();
  // 以每秒 38 帧左右为底线：持续偏慢才降一档，最多降到原生分辨率的 85%；很宽裕且 30 秒内没降过才升回
  const next = avg > 0.026 ? Math.max(DPR_FLOOR, dprNow - 0.25) : avg < 0.0125 && t - dprDownT > 30000 ? Math.min(DPR_MAX, dprNow + 0.25) : dprNow;
  if (Math.abs(next - dprNow) > 0.01) { if (next < dprNow) dprDownT = t; dprNow = next; renderer.setPixelRatio(dprNow); renderer.setSize(innerWidth, innerHeight, false); }
}
setAniso(renderer.capabilities.getMaxAnisotropy());
// 文字与照片贴图取样时把多级纹理的层级往清晰一侧偏 0.75 级：高清贴图比屏幕上显示的大好几倍，
// 默认的三线性过滤会混入低一两级的模糊版本，小字发虚。墙面地面这类平铺材质不偏，免得远处闪烁
THREE.ShaderChunk.map_fragment = THREE.ShaderChunk.map_fragment.replace('\tvec4 sampledDiffuseColor = texture2D( map, vMapUv );',
  '\t#ifdef SHARP_MAP\n\tvec4 sampledDiffuseColor = texture2D( map, vMapUv, SHARP_MAP );\n\t#else\n\tvec4 sampledDiffuseColor = texture2D( map, vMapUv );\n\t#endif\n\t#ifdef GRAY_MAP\n\tsampledDiffuseColor.rgb = vec3( dot( sampledDiffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) ) );\n\t#endif');   // GRAY_MAP：人物肖像按黑白显示
// 展项材质一开始就挂一张 1×1 的占位贴图：启动时预编译的着色器已经带贴图，真正的贴图到了不必再编译（以前第一次贴上时会卡一下）
const MCTX = document.createElement('canvas').getContext('2d');   // 主线程量文字用（算展柜版式）
const DUMMY_MAP = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); DUMMY_MAP.needsUpdate = true;
function sharpen(m) { if (!m || (m.defines && m.defines.SHARP_MAP)) return; m.defines = { ...(m.defines || {}), SHARP_MAP: '-0.75' }; m.needsUpdate = true; }
initFinishes(renderer);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const interiorEnvironment = galleryReflection();
scene.environment = interiorEnvironment;
scene.environmentIntensity = 0.52;
window.__scene = scene; window.__renderer = renderer;
const FOG_OUT = new THREE.Fog(0xc9ccc8, 380, 1700), FOG_IN = new THREE.Fog(0x09090a, 30, 120);
scene.fog = FOG_OUT;
const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 2600);
camera.rotation.order = 'YXZ';
const ambient = new THREE.AmbientLight(0xffffff, 1.0); scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffedce, 2.0);
const sunOffset = new THREE.Vector3(-162, 148, -36);
sun.position.copy(sunOffset);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(Math.min(LOW_MEM ? 1024 : isTouch ? 2048 : 4096, renderer.capabilities.maxTextureSize));
Object.assign(sun.shadow.camera, { left: -148, right: 148, top: 148, bottom: -148, near: 1, far: 520 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.00018;
sun.shadow.normalBias = 0.055;
sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true;
scene.add(sun, sun.target);

// 静态建筑在同一片广场只生成一次日影。远行时分段移动投影区域。
function updateDaylight() {
  if (!sun.visible) return;
  if (extGroup?.userData.daylight) scene.environment = extGroup.userData.daylight;
  const x = Math.round(player.x / 60) * 60, z = Math.round(player.z / 60) * 60;
  if (x === sun.target.position.x && z === sun.target.position.z) return;
  sun.target.position.set(x, 0, z);
  sun.position.copy(sun.target.position).add(sunOffset);
  sun.shadow.needsUpdate = true;
}
// 固定数量的灯光池：场景中可见灯的数量始终不变，走过门洞时不会触发着色器重新编译
const POOL_S = 2, POOL_P = 2;   // 点光源只留给烛火、炉火、楼梯灯
const poolS = Array.from({ length: POOL_S }, () => { const l = new THREE.SpotLight(0xffffff, 0, 24, 0.5, 0.6, 1.2); scene.add(l, l.target); return l; });
const poolP = Array.from({ length: POOL_P }, () => { const l = new THREE.PointLight(0xffffff, 0, 20, 1.3); scene.add(l); return l; });
const VLIGHTS = new Map();   // 组 → 该组登记的虚拟灯
const vlight = (g, spec) => { if (!VLIGHTS.has(g)) VLIGHTS.set(g, []); VLIGHTS.get(g).push(spec); return spec; };
const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
function assignLights() {
  const sp = [], pt = [], active = player.room && groupOf(player.room);
  for (const [g, list] of VLIGHTS) if (shown(g)) for (const v of list) {
    if (!v.spot) pt.push(v);
    else if (g === active && v.focal) sp.unshift(v);
    else if (g === active) sp.push(v);
  }
  const d = (v) => Math.hypot(v.p[0] - player.x, (v.p[1] - player.y) * 2, v.p[2] - player.z);
  pt.sort((a, b) => d(a) - d(b));
  flickers.length = 0;
  poolS.forEach((l, i) => { const v = sp[i]; if (!v) { l.intensity = 0; return; }
    l.color.set(v.color); l.intensity = v.power; l.distance = v.dist; l.angle = v.angle; l.penumbra = v.pen; l.decay = v.decay;
    l.position.set(...v.p); l.target.position.set(...v.t); l.target.updateMatrixWorld(); });
  const anyP = pt.length > 0; poolP.forEach(l => { l.visible = anyP; });   // 三种灯光组合都在启动时编译好，切换不卡
  poolP.forEach((l, i) => { const v = pt[i]; if (!v) { l.intensity = 0; return; }
    l.color.set(v.color); l.intensity = v.power; l.distance = v.dist; l.decay = v.decay; l.position.set(...v.p);
    if (v.flicker) flickers.push({ light: l, base: v.power, seed: v.flicker, flame: v.flame }); });
}
const roomLight = new THREE.PointLight(0xffe2b8, 0, 40, 1.2); scene.add(roomLight);
const roomLight2 = new THREE.PointLight(0xffe2b8, 0, 40, 1.2); scene.add(roomLight2);

const floors = [0, 1, 2].map(() => { const g = new THREE.Group(); scene.add(g); return g; });
const G12 = new THREE.Group(), G23 = new THREE.Group(); scene.add(G12, G23);
// 每个展厅一个组：只绘制当前展厅及其相邻展厅（其余被墙挡住，看不见）
const roomGroups = {};
const groupOf = (r) => r.id === 'S12' ? G12 : r.id === 'S23' ? G23 : (roomGroups[r.key] ||= (() => { const g = new THREE.Group(); floors[r.floor].add(g); return g; })());
const interactive = {};   // room key → meshes
// 点选时用的遮挡体：墙、隔墙、展墙的简化盒子（不渲染）。射线先碰到它们，就说明展项在墙的另一面
const occluders = {}, occMat = new THREE.MeshBasicMaterial();
function occluder(key, cx, cy, cz, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.02, w), h, Math.max(0.02, d)), occMat);
  m.position.set(cx, cy, cz); m.updateMatrixWorld(true); m.userData.occ = true; (occluders[key] ||= []).push(m);
}
const lazy = {};          // room key → items
const flickers = [];
const outsideColliders = [];
const extCollide = (x0, x1, z0, z1, tag) => outsideColliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), tag });

// ───────────────────────── 共享材质 ─────────────────────────
const glowTex = tex(textCanvas(128, 256, (c, w) => {
  c.scale(1, 2);
  const g = c.createRadialGradient(w / 2, 46, 2, w / 2, 64, 63);
  g.addColorStop(0, 'rgba(255,236,200,.6)'); g.addColorStop(0.4, 'rgba(255,230,190,.22)'); g.addColorStop(1, 'rgba(255,230,190,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, 128);
}));
const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 });
const poolTex = tex(textCanvas(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,236,200,.5)'); g.addColorStop(1, 'rgba(255,236,200,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
}));
const contactMat = basic(0x16120e, { map: tex(textCanvas(128, 128, (c, w, h) => {
  const grad = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grad.addColorStop(0, '#fff'); grad.addColorStop(0.54, 'rgba(255,255,255,.82)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grad; c.fillRect(0, 0, w, h);
})), transparent: true, opacity: 0.45, depthWrite: false });
function contactShadow(g, x, y, z, w, d) {
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w, d), contactMat);
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(x, y + 0.022, z); shadow.renderOrder = 1; g.add(shadow);
}
const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.32 });
const frameMat = lam(0x0b0b0c), metal = finish(0x38383a, 0.48, 0.54), brass = finish(0xb39763, 0.32, 0.65), ceilMat = lam(0x1a1a1c), lightPanel = basic(0xf3ead6);
const glassMat = new THREE.MeshStandardMaterial({ color: 0xd9e9e5, roughness: 0.09, metalness: 0.25, envMapIntensity: 1.2,
  transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
const caseGlass = glassMat.clone();
caseGlass.opacity = 0.085; caseGlass.side = THREE.FrontSide;
const recessedBase = finish(0x282624, 0.78);
const brassEdge = finish(0x98794e, 0.42, 0.58);
const mats = {};
// 按风格生成的材质：贴图按真实尺寸平铺（userData.tile，单位米），见 tileUV
function styleMat(spec) {
  return mats['s' + spec.t + spec.c] ||= (() => {
    const scanned = scannedInterior(spec);
    if (scanned) return scanned;
    if (spec.t === 'stone') {
      const stone = surface('limestone').clone();
      stone.color.set(spec.c); stone.roughness = 0.45; stone.userData.tile = [4, 2];
      return stone;
    }
    const { cv, tile } = styleTexture(spec), t = tex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const gloss = { tile: 0.27, granite: 0.36, terrazzo: 0.39, wood: 0.50, redtile: 0.55, hoarding: 0.49 };
    const relief = { brick: 0.015, concrete: 0.009, cracked: 0.018, stone: 0.008, tile: 0.004 };
    const m = finish(0xffffff, gloss[spec.t] ?? 0.89, spec.t === 'hoarding' ? 0.23 : 0);
    m.map = t;
    if (relief[spec.t]) { m.bumpMap = t; m.bumpScale = relief[spec.t]; }
    m.userData.tile = tile; return m;
  })();
}
function tileUV(geo, mat, w, h, ou = 0, ov = 0) {
  const tl = (Array.isArray(mat) ? mat.find(m => m.userData && m.userData.tile) : mat)?.userData?.tile; if (!tl) return;
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (ou + uv.getX(i) * w) / tl[0], (ov + uv.getY(i) * h) / tl[1]);
  uv.needsUpdate = true;
}
const wallMat = (hex) => mats['w' + hex] ||= lam(0xffffff, { map: noiseTex(hex, 9, 256, 41, [6, 2]) });
const partMat = (hex) => mats['p' + hex] ||= lam(0xffffff, { map: noiseTex(hex, 6, 128, 47, [3, 1]) });
const floorMat = (hex, wood) => mats['f' + hex + !!wood] ||= wood
  ? lam(0xffffff, { map: woodTex(hex) })
  : lam(0xffffff, { map: noiseTex(hex, 12, 256, 43, [8, 8], { n: 2, color: 'rgba(0,0,0,.35)', w: 2 }) });
function woodTex(hex) {
  const R = rng(9);
  return tex(textCanvas(256, 256, (c) => {
    c.fillStyle = shade(hex, 0.25); c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) for (let x = -((y / 16) % 4) * 16; x < 256; x += 64) {
      const v = (R() - 0.5) * 30; c.fillStyle = v > 0 ? `rgba(255,220,180,${v / 300})` : `rgba(0,0,0,${-v / 250})`; c.fillRect(x, y, 63, 15);
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, y + 15, 64, 1); c.fillRect(x + 63, y, 1, 16);
    }
  }), [12, 12]);
}

// ───────────────────────── 几何工具 ─────────────────────────
// axis 'x'：面沿 x 方向延伸、位于 z=c；nrm 为面朝向（+1 朝 +z）。axis 'z' 同理
function facePlane(g, axis, c, nrm, a0, a1, y0, y1, mat) {
  if (a1 - a0 < 0.01 || y1 - y0 < 0.01) return null;
  const geo = new THREE.PlaneGeometry(a1 - a0, y1 - y0); tileUV(geo, mat, a1 - a0, y1 - y0, (axis === 'x' ? nrm > 0 : nrm < 0) ? a0 : -a1, y0);
  const m = new THREE.Mesh(geo, mat);
  const am = (a0 + a1) / 2, ym = (y0 + y1) / 2;
  if (axis === 'x') { m.position.set(am, ym, c); m.rotation.y = nrm > 0 ? 0 : Math.PI; }
  else { m.position.set(c, ym, am); m.rotation.y = nrm > 0 ? Math.PI / 2 : -Math.PI / 2; }
  g.add(m); return m;
}
function faceWithHoles(g, axis, c, nrm, a0, a1, y0, y1, mat, holes) {
  const hs = holes.filter(h => h.a1 > a0 && h.a0 < a1).sort((p, q) => p.a0 - q.a0);
  let cur = a0;
  for (const h of hs) {
    facePlane(g, axis, c, nrm, cur, Math.max(cur, h.a0), y0, y1, mat);
    const ha0 = Math.max(a0, h.a0), ha1 = Math.min(a1, h.a1);
    facePlane(g, axis, c, nrm, ha0, ha1, y0, Math.max(y0, h.y0), mat);
    facePlane(g, axis, c, nrm, ha0, ha1, Math.min(y1, h.y1), y1, mat);
    cur = Math.max(cur, h.a1);
  }
  facePlane(g, axis, c, nrm, cur, a1, y0, y1, mat);
}
function flat(g, x0, x1, z0, z1, y, mat, up = true) {
  if (x1 - x0 < 0.01 || z1 - z0 < 0.01) return;
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0); tileUV(geo, mat, x1 - x0, z1 - z0, x0, up ? -z1 : z0);
  if (mat.userData.aoBounds) {
    const [left, near, width, depth] = mat.userData.aoBounds, coords = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = (x0 + x1) / 2 + pos.getX(i), z = (z0 + z1) / 2 - pos.getY(i);
      coords.push((x - left) / width, 1 - (z - near) / depth);
    }
    geo.setAttribute('uv1', new THREE.Float32BufferAttribute(coords, 2));
  }
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.add(m);
}
function flatHoles(g, r, holes, y, mat, up) {
  const xs = [...new Set([r[0], r[1], ...holes.flatMap(h => [Math.max(r[0], Math.min(r[1], h[0])), Math.max(r[0], Math.min(r[1], h[1]))])])].sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    const xa = xs[i], xb = xs[i + 1], xm = (xa + xb) / 2;
    const cut = holes.filter(h => xm > h[0] && xm < h[1]).map(h => [h[2], h[3]]).sort((p, q) => p[0] - q[0]);
    let cz = r[2];
    for (const [za, zb] of cut) { flat(g, xa, xb, cz, Math.max(cz, za), y, mat, up); cz = Math.max(cz, zb); }
    flat(g, xa, xb, cz, r[3], y, mat, up);
  }
}
const inR = (r, x, z, m = 0) => x >= r[0] + m && x <= r[1] - m && z >= r[2] + m && z <= r[3] - m;
const facePos = (f, am, d) => f.axis === 'x' ? [am, f.c + f.nrm * d] : [f.c + f.nrm * d, am];
const faceRot = (f) => f.axis === 'x' ? (f.nrm > 0 ? 0 : Math.PI) : (f.nrm > 0 ? Math.PI / 2 : -Math.PI / 2);

// ───────────────────────── 外壳（三层通高外墙） ─────────────────────────
const shellGroup = new THREE.Group(); shellGroup.name = 'shell';
// 柱间开间：柱距 106/11 米，第 1–9 开间设高窗（转角开间为实墙）
const WIN_BAYS = Array.from({ length: 9 }, (_, i) => { const cx = -53 + (i + 1.5) * 106 / 11; return [cx - 2.8, cx + 2.8]; });
const WIN_Y0 = 1.2, WIN_Y1 = 24;
function buildShell() {
  const scene = shellGroup; window.__scene.add(shellGroup);
  // 外墙：石材与柱间高窗（参照纪念堂实景）
  const granite = surface('limestone'), pierMat = granite;
  const windowMetal = finish(0x554838, 0.42, 0.60), glazing = finish(0x45525a, 0.15, 0.65);
  const out = DOORS.filter(d => d.a === 'OUT' || d.b === 'OUT');
  for (const c of [-HALF, HALF]) {
    const ds = out.filter(d => d.c === c);
    const holes = ds.map(d => ({ a0: d.u - d.w / 2, a1: d.u + d.w / 2, y0: B, y1: B + d.h }));
    faceWithHoles(scene, 'x', c + Math.sign(c), Math.sign(c), -HALF - 1, HALF + 1, B, B + OUTER_H, granite, holes);
    facePlane(scene, 'z', c + Math.sign(c), Math.sign(c), -HALF - 1, HALF + 1, B, B + OUTER_H, granite);
    for (const d of ds) {
      const cc = c + Math.sign(c) * 0.5, bronze = lam(0x2a2420);
      box(scene, 0.5, d.h + 0.5, 1.1, bronze, d.u - d.w / 2 - 0.25, B + (d.h + 0.5) / 2, cc);
      box(scene, 0.5, d.h + 0.5, 1.1, bronze, d.u + d.w / 2 + 0.25, B + (d.h + 0.5) / 2, cc);
      box(scene, d.w + 1, 0.5, 1.1, bronze, d.u, B + d.h + 0.25, cc);
      // 门洞侧壁
      for (const sg of [-1, 1]) box(scene, 0.05, d.h, 1.0, lam(0x3a3633), d.u + sg * d.w / 2, B + d.h / 2, cc);
    }
  }
  // 墙垛：窗洞之间的墙面向外凸出 1.2 米，使高窗成为真正的凹窗（立面有体积感，也让深度图带出窗洞）
  const T = 1.2, E0 = -HALF - 1 - T, E1 = HALF + 1 + T;
  for (const side of [-1, 1]) for (const axis of ['x', 'z']) {
    const c = side * (HALF + 1 + T / 2);
    const ds = out.filter(d => d.c === side * HALF && (axis === 'x' ? d.axis === 'z' : d.axis === 'x'));
    const rec = WIN_BAYS.map(([a0, a1]) => { let lo = a0, hi = a1, y0 = WIN_Y0;
      for (const d of ds) if (d.u + d.w / 2 > a0 - 3 && d.u - d.w / 2 < a1 + 3) { lo = Math.min(lo, d.u - d.w / 2 - 0.6); hi = Math.max(hi, d.u + d.w / 2 + 0.6); y0 = 0; }
      return [lo, hi, y0]; });
    // 玻璃退在墙垛之后。门上方单独做亮窗，整面格栅都避开通行净空。
    const panel = (u, yy, w, h, depth, offset, mat) => {
      const plane = side * (HALF + 1 + offset);
      if (axis === 'x') box(scene, w, h, depth, mat, u, B + yy, plane);
      else box(scene, depth, h, w, mat, plane, B + yy, u);
    };
    for (const [lo, hi, sill] of rec) {
      const door = ds.find(d => d.u + d.w / 2 > lo && d.u - d.w / 2 < hi);
      const bottom = door ? door.h + 0.50 : sill, height = WIN_Y1 - bottom, mid = (lo + hi) / 2;
      panel(mid, bottom + height / 2, hi - lo, height, 0.06, 0.06, glazing);
      for (let k = 0; k <= 4; k++) panel(lo + (hi - lo) * k / 4, bottom + height / 2, 0.105, height, 0.17, 0.16, windowMetal);
      for (let yy = bottom; yy <= WIN_Y1; yy += 2.45) panel(mid, yy, hi - lo, 0.12, 0.17, 0.17, windowMetal);
      panel(mid, bottom, hi - lo + 0.16, 0.16, 0.82, 0.44, pierMat);
    }
    const seg = (a0, a1, y0, y1) => { if (a1 - a0 < 0.01 || y1 - y0 < 0.01) return;
      const am = (a0 + a1) / 2, ym = B + (y0 + y1) / 2;
      if (axis === 'x') box(scene, a1 - a0, y1 - y0, T, pierMat, am, ym, c); else box(scene, T, y1 - y0, a1 - a0, pierMat, c, ym, am); };
    let prev = E0;
    for (const [lo, hi, y0] of rec) { seg(prev, lo, 0, OUTER_H); seg(lo, hi, WIN_Y1, OUTER_H); seg(lo, hi, 0, y0); prev = hi; }
    seg(prev, E1, 0, OUTER_H);
  }
}

// ───────────────────────── 房间 ─────────────────────────
function buildRoom(r) {
  const g = groupOf(r), th = r.theme, y0 = floorY(r.floor), key = r.key;
  interactive[key] ||= []; lazy[key] ||= [];
  const stair = r.kind === 'stair' ? STAIRS.find(s => s.room === r.id) : null;
  const upper = stair && stair.k !== r.floor;
  const wm = r.kind === 'lobby' ? surface('limestone') : th.style ? styleMat(th.style.wall) : wallMat(th.wall), I = WALL_T / 2;
  const fx0 = r.x0 + I, fx1 = r.x1 - I, fz0 = r.z0 + I, fz1 = r.z1 - I;
  if (upper) {
    for (const w of r.walk) flat(g, w[0], w[1], w[2], w[3], y0 + 0.01, floorMat(th.floor), true);
  } else {
    const solid = r.blocks.filter(b => b[0] <= r.x0 + 0.01 || b[1] >= r.x1 - 0.01 || b[2] <= r.z0 + 0.01 || b[3] >= r.z1 - 0.01);   // 贴边的井道/门厅
    const roomDoors = DOORS.filter(d => d.floor === r.floor && (d.a === r.id || d.b === r.id));
    const flooring = th.style ? styleMat(th.style.floor) : floorMat(th.floor, th.wood);
    flatHoles(g, r.rect, [...(r.void ? [r.void] : []), ...solid], y0 + 0.01, floorWithContact(r, flooring, roomDoors), true);
    if (r.floor > 0) flatHoles(g, [r.x0, r.x1, r.z0, r.z1], [...(r.void ? [r.void] : []), ...solid], y0 - 0.03, ceilMat, false);   // 楼板底面：从下一层的楼梯口往上看，不再看穿地板
    if (r.id !== 'S23') {
      const cy = y0 + r.ceilH;
      const skylight = r.install?.find(o => o.type === 'memorialPlinth');
      const ceilingCuts = skylight ? [...solid, [skylight.x - 3.5, skylight.x + 3.5, skylight.z - 3.5, skylight.z + 3.5]] : solid;
      const ceiling = !r.kind && ceilingType(r) === 'acoustic' ? acousticCeiling() : ceilMat;
      flatHoles(g, r.rect, ceilingCuts, cy, ceiling, false);
      if (r.kind !== 'memorial') ceilingGrid(g, r, cy);
    }
    const wallH = r.id === 'S23' ? FLOOR_H : r.ceilH;
    const ds = DOORS.filter(d => (d.a === r.id || d.b === r.id) && (d.floor === r.floor || (r.ceilH > FLOOR_H && d.floor === r.floor + 1)));
    const sides = [['x', fz0, +1, fx0, fx1, r.z0], ['x', fz1, -1, fx0, fx1, r.z1], ['z', fx0, +1, fz0, fz1, r.x0], ['z', fx1, -1, fz0, fz1, r.x1]];
    for (const [axis, c, nrm, a0, a1, line] of sides) {
      const holes = ds.filter(d => (axis === 'x' ? d.axis === 'z' : d.axis === 'x') && d.c === line)
        .map(d => ({ a0: d.u - d.w / 2, a1: d.u + d.w / 2, y0: floorY(d.floor), y1: floorY(d.floor) + d.h }));
      const cut = solid.filter(b => axis === 'x' ? (Math.abs(b[2] - line) < 0.01 || Math.abs(b[3] - line) < 0.01) : (Math.abs(b[0] - line) < 0.01 || Math.abs(b[1] - line) < 0.01))
        .map(b => axis === 'x' ? { a0: b[0] - 0.1, a1: b[1] + 0.1, y0: y0 - 1, y1: y0 + wallH + 1, solid: true } : { a0: b[2] - 0.1, a1: b[3] + 0.1, y0: y0 - 1, y1: y0 + wallH + 1, solid: true });
      faceWithHoles(g, axis, c, nrm, a0, a1, y0, y0 + wallH, wm, [...holes, ...cut]);
      { let cur = a0 - 0.6; const T = WALL_T - 0.1;
        for (const h of [...holes, ...cut].filter(h => h.y0 < y0 + 1).sort((p, q) => p.a0 - q.a0)) { if (h.a0 > cur) occluder(key, axis === 'x' ? (cur + h.a0) / 2 : line, y0 + wallH / 2, axis === 'x' ? line : (cur + h.a0) / 2, axis === 'x' ? h.a0 - cur : T, wallH, axis === 'x' ? T : h.a0 - cur); cur = Math.max(cur, h.a1); }
        if (a1 + 0.6 > cur) occluder(key, axis === 'x' ? (cur + a1 + 0.6) / 2 : line, y0 + wallH / 2, axis === 'x' ? line : (cur + a1 + 0.6) / 2, axis === 'x' ? a1 + 0.6 - cur : T, wallH, axis === 'x' ? T : a1 + 0.6 - cur); }
      faceWithHoles(g, axis, c + nrm * 0.012, nrm, a0, a1, y0, y0 + 0.16, frameMat, [...holes, ...cut]);
      const segs = []; let cur = a0 + 0.3;
      for (const h of [...holes, ...cut].filter(h => h.y0 < y0 + 1).sort((p, q) => p.a0 - q.a0)) { segs.push([cur, h.a0 - 0.7]); cur = h.a1 + 0.7; }
      segs.push([cur, a1 - 0.3]);
      const sideName = axis === 'x' ? (nrm > 0 ? 'n' : 's') : (nrm > 0 ? 'w' : 'e');
      if (!(r.noHang || []).includes(sideName)) for (const [sa, sb] of segs) if (sb - sa > 1.6) r.faces.push({ axis, c, nrm, a0: sa, a1: sb, h: wallH });
    }
  }
  for (const w of r.walls) partition(r, g, w);
  for (const d of DOORS.filter(q => q.floor === r.floor && (q.a === r.id || q.b === r.id))) doorTrim(r, g, d);
  for (const b of r.blocks) { r.obst.push(b); occluder(key, (b[0] + b[1]) / 2, y0 + r.ceilH / 2, (b[2] + b[3]) / 2, b[1] - b[0] - 0.08, r.ceilH, b[3] - b[2] - 0.08); }
  if (stair && !upper) buildStair(r, g, stair);
  if (r.void) voidEdge(r, g);
}

function ceilingGrid(g, r, cy) {
  const system = r.kind ? 'grid' : ceilingType(r);
  const step = system === 'timber' ? 3.4 : r.kind === 'lobby' ? 4 : 5, beams = [], lights = [];
  for (let x = r.x0 + step; x < r.x1 - 0.5; x += step) beams.push([x, r.cz, 0.22, r.z1 - r.z0]);
  if (system !== 'timber') for (let z = r.z0 + step; z < r.z1 - 0.5; z += step) beams.push([r.cx, z, r.x1 - r.x0, 0.22]);
  for (let x = r.x0 + step / 2; x < r.x1; x += step * 2) for (let z = r.z0 + step / 2; z < r.z1; z += step * 2) {
    if (r.void && inR(r.void, x, z, -1)) continue;
    lights.push([x, z]);
  }
  const m4 = new THREE.Matrix4();
  const beamH = system === 'acoustic' ? 0.10 : 0.32;
  const beamMat = system === 'timber' ? surface('timber') : metal;
  // 木梁从一端横跨展厅；钢梁的下翼缘在梁腹下形成一层阴影。
  for (const [x, z, w, d] of beams) {
    box(g, w, beamH, d, beamMat, x, cy - beamH / 2, z);
    if (system === 'steel') box(g, w + 0.13, 0.045, d + 0.13, metal, x, cy - beamH, z);
  }
  if (r.kind === 'lobby') {
    // 序厅的深色吸声条板退在梁后；四边留一道连续的洗顶灯槽。
    const span = r.x1 - r.x0 - 1.0, depth = r.z1 - r.z0 - 1.0;
    const count = Math.floor(span / 0.24);
    const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.11, depth), finish(0x78573e, 0.72), count);
    for (let i = 0; i < count; i++) {
      m4.makeTranslation(r.cx + (i - (count - 1) / 2) * 0.24, cy - 0.062, r.cz);
      fins.setMatrixAt(i, m4);
    }
    g.add(fins);
    for (const side of [-1, 1]) {
      box(g, span, 0.10, 0.12, brassEdge, r.cx, cy - 0.48, r.cz + side * (depth / 2 - 0.04));
      box(g, span, 0.035, 0.08, lightPanel, r.cx, cy - 0.54, r.cz + side * (depth / 2 - 0.04));
      box(g, 0.12, 0.10, depth, brassEdge, r.cx + side * (span / 2 - 0.04), cy - 0.48, r.cz);
      box(g, 0.08, 0.035, depth, lightPanel, r.cx + side * (span / 2 - 0.04), cy - 0.54, r.cz);
    }
  }
  if (lights.length) {
    const lobby = r.kind === 'lobby', width = lobby ? 1.65 : 0.24, length = lobby ? 1.65 : 2.2;
    const housing = new THREE.InstancedMesh(new THREE.BoxGeometry(width + 0.14, 0.12, length + 0.14), metal, lights.length);
    const diffuser = new THREE.InstancedMesh(new THREE.BoxGeometry(width, 0.025, length), lightPanel, lights.length);
    lights.forEach(([x, z], i) => {
      m4.makeTranslation(x, cy - 0.08, z); housing.setMatrixAt(i, m4);
      m4.makeTranslation(x, cy - 0.145, z); diffuser.setMatrixAt(i, m4);
    });
    g.add(housing, diffuser);
  }
}

// 大字报墙：1966—1967 年北京大字报的真实照片（公有领域，见 CREDITS.md），按隔墙比例横向重复
function posterMat(len, h) {
  const m = lam(0x8a8072);
  loadImage('assets/img/dazibao_wall.jpg').then(im => {
    if (!im) return;
    const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.repeat.set(Math.max(1, (len / h) / (im.width / im.height)), 1); t.needsUpdate = true;
    m.map = t; m.color.set(0xffffff); m.needsUpdate = true;
  });
  return m;
}

function partition(r, g, w) {
  const [x0, z0, x1, z1, h0] = w, y0 = floorY(r.floor), t = 0.3, h = Math.min(h0, r.ceilH);
  const alongX = Math.abs(z1 - z0) < 1e-6, len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, low = h < r.ceilH - 0.1;
  const sideM = r.theme.style ? styleMat(r.theme.style.part) : partMat(r.theme.part), pm = r.posters ? posterMat(len, h) : sideM;
  const L = len + t;   // 两端各伸出半个墙厚，转角处两道隔墙相接时不留缝
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(alongX ? L : t, h, alongX ? t : L), alongX ? [sideM, sideM, sideM, sideM, pm, pm] : [pm, pm, sideM, sideM, sideM, sideM]);
  if (!r.posters) tileUV(mesh.geometry, sideM, L, h);
  mesh.position.set(cx, y0 + h / 2, cz); g.add(mesh);
  occluder(r.key, cx, y0 + h / 2, cz, alongX ? L : t - 0.08, h, alongX ? t - 0.08 : L);
  if (low) box(g, alongX ? L + 0.06 : t + 0.06, 0.06, alongX ? t + 0.06 : L + 0.06, metal, cx, y0 + h + 0.03, cz);
  box(g, alongX ? L : t + 0.02, 0.15, alongX ? t + 0.02 : L, frameMat, cx, y0 + 0.075, cz);
  r.obst.push([Math.min(x0, x1) - (alongX ? 0 : t / 2), Math.max(x0, x1) + (alongX ? 0 : t / 2), Math.min(z0, z1) - (alongX ? t / 2 : 0), Math.max(z0, z1) + (alongX ? t / 2 : 0)]);
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  for (const nrm of [-1, 1]) r.faces.push({ axis: alongX ? 'x' : 'z', c: (alongX ? cz : cx) + nrm * (t / 2 + 0.005), nrm, a0: a0 + 0.3, a1: a1 - 0.3, h, part: true, light: r.theme.partText, posters: !!r.posters });
}

const sideNormal = (r, d) => d.axis === 'z' ? (Math.abs(d.c - r.z0) < 1e-6 ? 1 : -1) : (Math.abs(d.c - r.x0) < 1e-6 ? 1 : -1);
function doorTrim(r, g, d) {
  if (d.a === 'OUT' || d.b === 'OUT') return;
  if (d.a !== r.id) return;
  const y0 = floorY(d.floor), alongX = d.axis === 'z', T = WALL_T + 0.10;
  const surround = new THREE.Group(); surround.position.set(alongX ? d.u : d.c, y0, alongX ? d.c : d.u);
  if (!alongX) surround.rotation.y = Math.PI / 2;
  portal(surround, d.w, d.h, T, r.floor); g.add(surround);
  const nr = ROOMS.find(q => q.id === d.b && q.floor === d.floor), ns = nr && nr.sec;
  let t, sub;
  if (ns) { t = ns.no > 0 && ns.no < 25 ? `${String(ns.no).padStart(2, '0')}　${ns.title}` : ns.title; sub = `下一展厅 →　${ns.years}`; }
  else if (d.b === 'S12') { t = '前往二层'; sub = '楼梯 ↑　乌托邦与浩劫　1958—1976'; }
  else if (d.b === 'S23') { t = '前往三层'; sub = '中庭楼梯 ↑　未完成的告别　1976—2022'; }
  else return;
  const th = r.theme, nrm = sideNormal(r, d);
  // 门楣标识按剩余净高缩放，避免五米高门洞的导向被吊顶截掉。
  const h = Math.min(0.82, r.ceilH - d.h - 0.23);
  if (h > 0.22) {
    const w = Math.min(d.w + 0.22, h * 640 / 120), signH = w * 120 / 640;
    const plaque = new THREE.Group();
    plaque.rotation.y = alongX ? (nrm > 0 ? 0 : Math.PI) : nrm * Math.PI / 2;
    const off = WALL_T / 2 + 0.055;
    plaque.position.set(alongX ? d.u : d.c + nrm * off, y0 + d.h + 0.20 + signH / 2, alongX ? d.c + nrm * off : d.u);
    box(plaque, w + 0.06, signH + 0.06, 0.065, metal, 0, 0, 0);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, signH), basic(0xffffff, { map: lazyTex(() => drawWayfinding(t, sub, '#f5edda', '#d1b68a', LOW_MEM ? 1.2 : 2.4)), transparent: true }));
    sign.position.z = 0.034; plaque.add(sign); g.add(plaque);
  }
  // 地面引导箭头
  const ar = textCanvas(128, 128, (c) => { c.fillStyle = th.accentLight; c.globalAlpha = 0.55; c.beginPath(); c.moveTo(64, 10); c.lineTo(110, 70); c.lineTo(80, 70); c.lineTo(80, 118); c.lineTo(48, 118); c.lineTo(48, 70); c.lineTo(18, 70); c.closePath(); c.fill(); });
  const am = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex(ar), transparent: true, depthWrite: false }));
  const ax = alongX ? d.u : d.c + nrm * 2.2, az = alongX ? d.c + nrm * 2.2 : d.u;
  am.rotation.order = 'YXZ'; am.rotation.set(-Math.PI / 2, alongX ? (nrm > 0 ? 0 : Math.PI) : (nrm > 0 ? Math.PI / 2 : -Math.PI / 2), 0);   // 箭头指向门、通往下一展厅
  am.position.set(ax, y0 + 0.03, az); am.renderOrder = 2; g.add(am);
}

// ───────────────────────── 楼梯 ─────────────────────────
const rampT = (s, x, z) => {
  const [along, across] = s.axis === 'z' ? [z, x] : [x, z];
  if (across < s.lo || across > s.hi) return -1;
  const t = (along - s.from) / (s.to - s.from);
  return t >= 0 && t <= 1 ? t : -1;
};
function buildStair(r, g, s) {
  const y0 = floorY(s.k), n = 46, run = (s.to - s.from) / n, width = s.hi - s.lo, mid = (s.lo + s.hi) / 2;
  const stone = surface('limestone'), nose = metal, sideM = surface('limestone');
  for (let i = 0; i < n; i++) {
    const hgt = (i + 1) * FLOOR_H / n, a = s.from + (i + 0.5) * run;
    if (s.axis === 'z') { box(g, width, hgt, Math.abs(run), stone, mid, y0 + hgt / 2, a); box(g, width, 0.03, 0.06, nose, mid, y0 + hgt + 0.01, a - run / 2 + Math.sign(run) * 0.03); }
    else { box(g, Math.abs(run), hgt, width, stone, a, y0 + hgt / 2, mid); box(g, 0.06, 0.03, width, nose, a - run / 2 + Math.sign(run) * 0.03, y0 + hgt + 0.01, mid); }
  }
  // 侧面石材挡板与玻璃栏板
  const L = Math.abs(s.to - s.from), slope = Math.atan2(FLOOR_H, L), hyp = Math.hypot(L, FLOOR_H), cA = (s.from + s.to) / 2, cy = y0 + FLOOR_H / 2;
  for (const side of [s.lo - 0.15, s.hi + 0.15]) {
    const sg = Math.sign(s.to - s.from);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, a = s.from + t * (s.to - s.from);
      railPost(g, s.axis === 'x' ? a : side, y0 + t * FLOOR_H, s.axis === 'x' ? side : a, s.axis === 'x');
    }
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, hyp), sideM);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, hyp), brass);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(hyp, 1.0), glassMat);
    if (s.axis === 'z') {
      for (const [o, yy] of [[strip, 0.15], [rail, 1.1]]) { o.position.set(side, cy + yy, cA); o.rotation.x = -sg * slope; g.add(o); }
      pane.position.set(side, cy + 0.6, cA); pane.rotation.order = 'YXZ'; pane.rotation.set(0, Math.PI / 2, -sg * slope); g.add(pane);
    } else {
      for (const [o, yy] of [[strip, 0.15], [rail, 1.1]]) { o.rotation.order = 'YXZ'; o.rotation.set(-sg * slope, Math.PI / 2, 0); o.position.set(cA, cy + yy, side); g.add(o); }
      pane.position.set(cA, cy + 0.6, side); pane.rotation.z = sg * slope; g.add(pane);
    }
  }
  const up = s.k === 0 ? ['二层 ↑', '乌托邦与浩劫　1958—1976'] : ['三层 ↑', '未完成的告别　1976—2022'];
  const dark = s.k === 0;
  const cv = () => hdCanvas(1024, 512, (c, W) => {
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillStyle = '#1d1a17'; c.font = `bold 210px ${FONT}`; c.fillText(up[0], W / 2, 30);
    c.fillStyle = '#7a1f1f'; c.fillRect(W / 2 - 60, 290, 120, 8);
    c.fillStyle = '#3b3833'; c.font = `52px ${FONT}`; c.fillText(up[1], W / 2, 330);
  });
  void dark;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshBasicMaterial({ map: lazyTex(cv), transparent: true, depthWrite: false }));
  if (s.k === 0) { sign.position.set(-47.68, floorY(0) + 4.2, -44); sign.rotation.y = Math.PI / 2; }
  else { sign.position.set(-15.68, floorY(1) + 6.2, -9); sign.rotation.y = Math.PI / 2; }
  sign.renderOrder = 2; g.add(sign);
  // 楼梯底部的灯光
  if (s.axis === 'z') plight(g, 0xfff0dc, 40, 30, 1.2, mid, y0 + 7, s.from + 4); else plight(g, 0xfff0dc, 40, 30, 1.2, s.from + 4, y0 + 7, mid);
  if (s.k === 0) {
    for (const [a, b] of [[-48, -46], [-38, -36]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 1.05), glassMat); p.position.set((a + b) / 2, floorY(1) + 0.53, -22); g.add(p);
      box(g, b - a, 0.07, 0.07, brass, (a + b) / 2, floorY(1) + 1.06, -22);
    }
    box(g, 12, 0.6, 0.3, sideM, -42, floorY(1) - 0.3, -22.15);
  }
}
function voidEdge(r, g) {
  const [x0, x1, z0, z1] = r.void, y = floorY(r.floor), fascia = lam(0xc9c3b6);
  const s = STAIRS.find(q => q.k === r.floor - 1);
  // 上层开口内三组悬吊灯框。下部格栅挡住侧向眩光，沿楼梯上行时能看到发光面。
  const fixtureWidth = 2.8, fixtureLength = (z1 - z0) * 0.65, cy = y + r.ceilH;
  for (const fraction of [0.22, 0.50, 0.78]) {
    const x = x0 + (x1 - x0) * fraction, z = (z0 + z1) / 2;
    const drop = 0.85 + (1 - fraction) * 0.8, level = cy - drop;
    for (const side of [-1, 1]) {
      const xx = x + side * fixtureWidth / 2, zz = z + side * fixtureLength / 2;
      box(g, 0.12, 0.18, fixtureLength, bronze, xx, level, z);
      box(g, 0.068, 0.022, fixtureLength - 0.1, lightPanel, xx, level - 0.093, z);
      box(g, fixtureWidth - 0.12, 0.18, 0.12, bronze, x, level, zz);
      for (const end of [-1, 1]) box(g, 0.024, drop, 0.024, metal, xx, cy - drop / 2, z + end * fixtureLength * 0.44);
    }
    for (let i = 1; i <= 11; i++) {
      box(g, fixtureWidth - 0.12, 0.11, 0.035, metal, x, level + 0.018, z - fixtureLength / 2 + fixtureLength * i / 12);
    }
  }
  for (const [a, b, c, d] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) {
    const alongX = b === d, len = alongX ? c - a : d - b, cx = (a + c) / 2, cz = (b + d) / 2;
    box(g, alongX ? len + 0.3 : 0.3, 1.2, alongX ? 0.3 : len + 0.3, fascia, cx, y - 0.6, cz);
    const segs = (!alongX && Math.abs(a - s.to) < 0.01) ? [[z0, s.lo], [s.hi, z1]] : [[alongX ? a : b, alongX ? c : d]];
    for (const [p, q] of segs) {
      const l = q - p; if (l < 0.1) continue;
      const m = (p + q) / 2, pane = new THREE.Mesh(new THREE.PlaneGeometry(l, 1.05), glassMat);
      if (alongX) { pane.position.set(m, y + 0.53, cz); box(g, l, 0.07, 0.07, brass, m, y + 1.06, cz); }
      else { pane.position.set(cx, y + 0.53, m); pane.rotation.y = Math.PI / 2; box(g, 0.07, 0.07, l, brass, cx, y + 1.06, m); }
      g.add(pane);
      const n = Math.ceil(l / 1.6);
      for (let i = 0; i <= n; i++) {
        const at = p + (q - p) * i / n;
        railPost(g, alongX ? at : cx, y, alongX ? cz : at, alongX);
      }
      box(g, alongX ? l : 0.11, 0.1, alongX ? 0.11 : l, metal, alongX ? m : cx, y + 0.06, alongX ? cz : m);
    }
  }
}

// ───────────────────────── 展项尺寸与样式 ─────────────────────────
function styleOf(it, s) {
  if (it.k === 'title') return { w: 5.0, h: 3.42, y: 2.45, kind: 'title' };
  if (it.k === 'feature') return { w: 2.25, h: 2.75, y: 1.4, kind: 'feature' };   // 专题阅读台：靠墙立在一个墙位前，读者面对墙；墙上方挂红色题名牌
  if (it.k === 'story' || it.k === 'bridge' || it.k === 'label' || it.k === 'resist') return { w: 1.9, h: 2.34, y: 1.85, kind: 'story' };
  if (it.k === 'dossier') return { w: 2.6, h: 2.9, y: 2.0, kind: 'dossier' };
  if (it.k === 'quote') return { w: 4.6, h: 1.62, y: 2.7, kind: 'quote' };
  if (it.k === 'bio') return { w: 3.4, h: 3.0, y: 2.0, kind: 'bio' };
  if (it.k === 'books') { it.wall = true; return { w: 2.8, h: 2.7, y: 2.05, kind: 'books' }; }
  if (it.k === 'evidence') return { w: 2.7, h: 2.5, y: 2.15, kind: 'evidence' };
  if (it.k === 'names') return { w: 4.4, h: 3.4, y: 2.5, kind: 'names' };
  if (it.k === 'arch') { it.wall = true; return { w: 3.6, h: 3.0, y: 2.05, kind: 'arch' }; }
  if (it.k === 'case') { const n = it.objs.length; return it.hero ? { w: 3.8, h: 3.0, y: 2.05, kind: 'case' } : { w: [3.2, 3.2, 3.2, 3.9, 4.4, 4.6, 4.6][n], h: 3.0, y: 2.05, kind: 'case' }; }
  if (it.k === 'photo') {
    const ar = (it.w || 4) / (it.h || 3), hero = it === s.items.find(i => i.k === 'photo') && s.no > 0;
    let w = hero ? 4.4 : 3.0, h = w / ar; const maxH = hero ? 3.0 : 2.3;
    if (h > maxH) { h = maxH; w = h * ar; }
    return { w: Math.max(w, 1.4), h, y: hero ? 2.45 : 2.3, kind: 'photo', hero };
  }
  if (it.bars || (it.b || '').length > 380) return { w: 3.8, h: 2.6, y: 1.9, kind: 'wide' };
  const n = s.items.filter(i => i.k === 'panel').indexOf(it);
  if (n % 4 === 2 && !s.theme.darkPanel) return { w: 3.2, h: 3.0, y: 2.1, kind: 'wall' };
  return { w: 2.3, h: 2.9, y: 1.95, kind: 'panel' };
}

// 离 (x, z) 最近的路线段的单位方向
function pathDir(path, x, z) {
  let best = Infinity, dir = [1, 0];
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1e-6;
    let u = ((x - ax) * dx + (z - az) * dz) / (L * L); u = Math.max(0, Math.min(1, u));
    const d = Math.hypot(x - (ax + u * dx), z - (az + u * dz));
    if (d < best - 1e-6) { best = d; dir = [dx / L, dz / L]; }
  }
  return dir;
}
function pathT(path, x, z) {
  let best = Infinity, bestT = 0, acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1e-6;
    let u = ((x - ax) * dx + (z - az) * dz) / (L * L); u = Math.max(0, Math.min(1, u));
    const d = Math.hypot(x - (ax + u * dx), z - (az + u * dz));
    if (d < best - 1e-6) { best = d; bestT = acc + u * L; }
    acc += L;
  }
  return bestT;
}

// 墙面减去前方被隔墙、实体块、装置挡住的部分（各留 0.35 米），展项不再挂到交接处
function clipFaces(r) {
  r.fullFaces = r.faces; const out = [];
  for (const f of r.faces) {
    let segs = [[f.a0, f.a1]];
    const c0 = Math.min(f.c, f.c + f.nrm * 0.7), c1 = Math.max(f.c, f.c + f.nrm * 0.7);
    for (const o of r.obst) {
      const [u0, u1, v0, v1] = f.axis === 'x' ? o : [o[2], o[3], o[0], o[1]];
      if (Math.min(c1, v1) - Math.max(c0, v0) <= 0.02) continue;
      const b0 = u0 - 0.35, b1 = u1 + 0.35;
      segs = segs.flatMap(([s0, s1]) => (b1 <= s0 || b0 >= s1) ? [[s0, s1]] : [[s0, Math.min(s1, b0)], [Math.max(s0, b1), s1]].filter(([a, b]) => b - a > 0.05));
    }
    for (const [s0, s1] of segs) if (s1 - s0 > 1.6) out.push({ ...f, a0: s0, a1: s1 });
  }
  r.faces = out;
}

// ───────────────────────── 入口冲击区 ─────────────────────────
// 从入口门洞沿进门方向看过去，第一面正对的墙就是“焦点墙”：上面印大字，墙前放装置，其他展项避开这一段
const SCENE_MIN = { rifles: 1.0, stakes: 1.2, stools: 1.4, cheval: 1.6, placards: 1.4, files: 1.5, dunes: 1.4, woks: 1.0, canteen: 2.0, sea: 1.5, speakers: 1.0, classroom: 2.0,
  sandbags: 1.6, cowshed: 1.6, wreaths: 1.0, brickwall: 1.6, clinic: 1.8, notices: 1.6, tank: 2.0, schoolbags: 1.6, fence: 1.7, cameras: 0, papers: 0.6, none: 0 };
function focalOf(r) {
  const sp = IMPACT[r.id]; if (!sp || !r.sec) return null;
  let px, pz, dx = 0, dz = 0;
  const d = DOORS.find(q => q.b === r.id && q.floor === r.floor);
  if (d) { if (d.axis === 'x') { px = d.c; pz = d.u; dx = Math.sign(r.cx - d.c); } else { px = d.u; pz = d.c; dz = Math.sign(r.cz - d.c); } }
  else { [px, pz] = r.path[0]; const [bx, bz] = r.path[1]; if (Math.abs(bx - px) > Math.abs(bz - pz)) dx = Math.sign(bx - px); else dz = Math.sign(bz - pz); }
  const hits = [];
  for (const f of r.faces) {
    if (f.stand || f.a1 - f.a0 < 4.6) continue;
    const along = f.axis === 'x' ? dz : dx; if (!along || f.nrm * along >= 0) continue;
    const t = f.axis === 'x' ? (f.c - pz) / dz : (f.c - px) / dx, a = f.axis === 'x' ? px + dx * t : pz + dz * t;
    if (t < 1.5 || a < f.a0 - 1 || a > f.a1 + 1) continue;
    hits.push({ f, a, t });
  }
  hits.sort((p, q) => p.t - q.t); const h = hits[0]; if (!h) return null;
  const f = h.f, W = Math.min(sp.w || 6.0, f.a1 - f.a0 - 0.6), am = Math.max(f.a0 + W / 2 + 0.3, Math.min(f.a1 - W / 2 - 0.3, h.a));
  const top = Math.min(f.h, r.ceilH) - (f.h >= 5 ? 0.55 : 0.35), frame = sp.mode === 'frame';
  const yb = frame ? 0.5 : 1.45, yt = frame ? 2.05 : Math.min(top, yb + 3.5);
  // 墙前可用的进深：留出 1.6 米走道
  let D = 3.2;
  for (const p of samplePath(r, 0.5)) {
    const al = f.axis === 'x' ? p.x : p.z, n = (f.axis === 'x' ? p.z - f.c : p.x - f.c) * f.nrm;
    if (n > 0 && Math.abs(al - am) < W / 2 + 1.2) D = Math.min(D, n - 1.6);
  }
  const toW = (u, n) => f.axis === 'x' ? [am + u * f.nrm, f.c + f.nrm * n] : [f.c + f.nrm * n, am - u * f.nrm];
  const obst = (u0, u1, n0, n1) => { const [xa, za] = toW(u0, n0), [xb, zb] = toW(u1, n1); r.obst.push([Math.min(xa, xb), Math.max(xa, xb), Math.min(za, zb), Math.max(za, zb)]); };
  obst(-W / 2 - 0.2, W / 2 + 0.2, 0, 0.4);   // 这一段墙不再挂其他展项
  const foc = { f, am, W, yb, yt, D, sp, toW };
  const g = groupOf(r), y0 = floorY(r.floor);
  if (frame) {   // 原瞻仰厅：天安门城楼画像大小的空画框
    const fw = 4.6, fh = 6.0, fy = 2.25, t = 0.28, fm = lam(0x2a2018);
    const sideBox = (w, hh, u, yy) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.22), fm); const [x, z] = toW(u, 0.12); m.position.set(x, y0 + yy, z); m.rotation.y = faceRot(f); g.add(m); };
    sideBox(fw + 2 * t, t, 0, fy - t / 2); sideBox(fw + 2 * t, t, 0, fy + fh + t / 2); sideBox(t, fh, -fw / 2 - t / 2, fy + fh / 2); sideBox(t, fh, fw / 2 + t / 2, fy + fh / 2);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshBasicMaterial({ color: 0xfff2dc, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending }));
    const [gx, gz] = toW(0, 0.03); gl.position.set(gx, y0 + fy + fh / 2, gz); gl.rotation.y = faceRot(f); g.add(gl);
  }
  const sc = sp.scene || 'none';
  if (D >= (SCENE_MIN[sc] ?? 1.5) && SCENES[sc]) SCENES[sc](makeCtx(THREE, g, y0, toW, faceRot(f), W, Math.max(0, D), obst));
  return foc;
}
const overlapsFocal = (r, f) => { const F = r.focal; return F && f.axis === F.f.axis && Math.abs(f.c - F.f.c) < 0.05 && f.a0 < F.am + F.W / 2 && f.a1 > F.am - F.W / 2; };

function placeRoomItems(r) {
  const s = r.sec; if (!s) return;
  r.focal = focalOf(r);
  clipFaces(r); r.obstBase = r.obst.length;
  // 档案查阅台：统一放在出口门旁，背靠出口所在的墙；这一小段墙不再挂展项
  r.kiosk = s.items.some(i => i.k === 'arch') ? exitKioskSpot(r) : null;
  const g = groupOf(r), y0 = floorY(r.floor);
  // 新增的六种展陈形式（悬吊照片、翻页展册、档案抽屉等）都不用：展项照旧挂在墙上
  const media = new Map(), deferred = new Map(), lamps = [], lateFeatures = [];
  const bays = [];
  // 展项多、墙面紧的展厅用更长的墙段，让宽展柜与展板能两两并排
  const freeFeat = (it) => it.k === 'feature' && r.featSpots && r.featSpots.length;   // 平面图预留了阅读台位置的展厅（墙面很紧）：阅读台不占墙
  const wall0 = s.items.filter(it => !freeFeat(it) && it.k !== 'obj' && it.k !== 'sculpt' && it.k !== 'impact' && it.k !== 'arch').reduce((a, it) => a + styleOf(it, s).w + 0.9, 0);
  const faceLen = r.faces.reduce((a, f) => a + Math.max(0, f.a1 - f.a0 - 0.6), 0), bayLen = r.bayLen || (wall0 > faceLen * 0.86 ? 10.5 : wall0 > faceLen * 0.6 ? 8.4 : 6.2);   // 平面图可以指定墙段长度（墙面特别紧的展厅用长墙段，宽展柜更好排）
  for (const f of r.faces) {
    const L = f.a1 - f.a0, n = Math.max(1, Math.round(L / bayLen));
    for (let i = 0; i < n; i++) {
      let a0 = f.a0 + i * L / n, a1 = f.a0 + (i + 1) * L / n;
      const K = r.kiosk;
      if (K && K.f === f && a0 < K.a1 && a1 > K.a0) { if (K.a0 - a0 > a1 - K.a1) a1 = K.a0; else a0 = K.a1; if (a1 - a0 < 2.4) continue; }
      const am = (a0 + a1) / 2;
      const [vx, vz] = facePos(f, am, 1.6);
      if (!walkable(vx, vz, r.floor)) continue;
      let gapP = Infinity; for (let k = 0; k <= 4; k++) { const [wx, wz] = facePos(f, a0 + (a1 - a0) * k / 4, 0); gapP = Math.min(gapP, pathDist(r.path, wx, wz)); }   // 墙面到参观路线的最近距离
      bays.push({ f, a0, a1, t: pathT(r.path, vx, vz), used: 0, items: [], gapP });
    }
  }
  bays.sort((p, q) => p.t - q.t);
  const wallItems = s.items.filter(it => !freeFeat(it) && it.k !== 'obj' && it.k !== 'sculpt' && it.k !== 'impact' && it.k !== 'arch');
  for (const it of s.items) if (freeFeat(it)) lateFeatures.push(it);
  const GAP = 0.9, cap = (b) => b.a1 - b.a0 - 0.6;
  let lastBay = null; const overflow = [];
  // 展板与紧随其后的照片组成一个单元，整体放进同一墙段，或放在同一面墙上相邻的两个墙段
  const units = [];
  for (const it of wallItems) { it.style = styleOf(it, s); if (it.attach && units.length && units[units.length - 1].includes(it.anchor)) units[units.length - 1].push(it); else units.push([it]); }
  const featOK = (b, it) => it.style.kind !== 'feature' || (b.gapP >= 3.2 && !b.f.stand && b.f.a1 - b.f.a0 >= 5.0);   // 阅读台：墙前要留得出读者站的地方，不放短墙（墙角、门边）
  const onPosters = (b, st) => b.f.posters && (st.kind === 'wall' || st.kind === 'quote' || st.kind === 'title');   // 大字报墙上只挂有底板的展项
  const fits = (b, list) => { const w = list.reduce((a, it) => a + it.style.w, 0) + GAP * (list.length - 1);
    return b.used + w <= cap(b) && list.every(it => (it.style.kind !== 'quote' || b.f.h > 5) && featOK(b, it) && it.style.y + it.style.h / 2 <= b.f.h - 0.15 && !onPosters(b, it.style)); };
  const put = (b, list) => { for (const it of list) { b.items.push([it, it.style]); b.used += it.style.w + GAP; it.pt = b.t; } lastBay = b; };
  // 左右分工：沿参观方向，左手墙讲大历史（展板、引文、比较表），右手墙讲具体的人和物（故事、人物、个案、展柜、反抗者）。
  // 墙段在路线哪一侧由墙面法线与就近路线方向的叉积判断；正对或背对路线的墙段两边都可用。
  const MICRO = new Set(['story', 'bio', 'dossier', 'case', 'resist', 'books', 'names', 'feature']);
  for (const b of bays) {
    const [vx, vz] = facePos(b.f, (b.a0 + b.a1) / 2, 1.6), [dx, dz] = pathDir(r.path, vx, vz);
    const nx = b.f.axis === 'z' ? b.f.nrm : 0, nz = b.f.axis === 'x' ? b.f.nrm : 0, cr = dx * nz - dz * nx;
    b.side = cr > 0.5 ? 'L' : cr < -0.5 ? 'R' : 'A';
  }
  let cls = 'L';
  const classOf = (u) => { const k = u[0].k; if (k === 'label') return cls; cls = MICRO.has(k) ? 'R' : 'L'; return cls; };
  const streams = { L: [], R: [] };
  for (const u of units) streams[classOf(u)].push(u);
  // 一侧放不下时，多出的单元退到另一侧
  const spill = [];
  function placeStream(list, B) {
    if (!list.length) return;
    const need = list.reduce((a, u) => a + u.reduce((x, it) => x + it.style.w + GAP, 0), 0), total = B.reduce((a, b) => a + cap(b), 0) || 1;
    const ratio = Math.min(1, need / total * 1.06 + 0.04), next = (b) => { const dir = b.f.axis === 'x' ? -b.f.nrm : b.f.nrm; return B.find(q => q.f === b.f && Math.abs(dir > 0 ? q.a0 - b.a1 : b.a0 - q.a1) < 0.01); };
    let bi = 0; lastBay = null;
    // 墙段比展项多时：每段只放一组，按顺序均匀铺开，不让几件挤在一段、旁边几段空着
    const sparse = list.length <= B.length && need < total * 0.7;
    list.forEach((u, ui) => {
      const st = u[0].style;
      if (sparse) {
        const q0 = Math.floor(ui * B.length / list.length);
        for (let q = q0; q < B.length; q++) if (!B[q].items.length && fits(B[q], u)) { put(B[q], u); bi = q + 1; return; }
      }
      if (need < total * 0.5) bi = Math.max(bi, Math.floor(ui * B.length / list.length));   // 墙面富余时沿整条展线均匀分布
      while (bi < B.length - 1 && B[bi].items.length && B[bi].used + st.w > cap(B[bi]) * ratio) bi++;
      const order = [...B.keys()].filter(q => q >= bi);
      if (lastBay) { const sameF = order.filter(q => B[q].f === lastBay.f && q < bi + 4); order.unshift(...sameF); }   // 优先沿同一面墙继续
      for (const q of order) { const b = B[q]; if (fits(b, u)) { put(b, u); return; } }
      if (u.length > 1) for (const q of order) {   // 顺着同一面墙的相邻墙段依次排开
        const plan = []; let b = B[q], i = 0, used = new Map();
        while (b && i < u.length) {
          const extra = used.get(b) || 0, w = u[i].style.w;
          if (b.used + extra + w <= cap(b) && fits(b, [u[i]])) { plan.push([b, u[i]]); used.set(b, extra + w + GAP); i++; }
          else { if (!plan.length) break; b = next(b); }
        }
        if (i === u.length) { for (const [bb, it] of plan) put(bb, [it]); return; }
      }
      spill.push([u, B.length ? B[Math.min(bi, B.length - 1)].t : 0]);
    });
  }
  // 默认大历史在左手；若本厅的墙主要在右手一侧（如绕中央装置的 U 形路线），就整厅左右对调，避免一侧挤满、一侧空着
  { const capOf = (sd) => bays.filter(b => b.side === sd).reduce((a, b) => a + cap(b), 0), cA = bays.filter(b => b.side === 'A').reduce((a, b) => a + cap(b), 0) / 2;
    const needOf = (L) => L.reduce((a, u) => a + u.reduce((x, it) => x + it.style.w + GAP, 0), 0), nM = needOf(streams.L), nm = needOf(streams.R);
    const deficit = (mac, mic) => Math.max(0, nM - capOf(mac) - cA) + Math.max(0, nm - capOf(mic) - cA);
    r.macroSide = deficit('R', 'L') + 6 < deficit('L', 'R') ? 'R' : 'L'; }
  const other = r.macroSide === 'L' ? 'R' : 'L';
  placeStream(streams.L, bays.filter(b => b.side !== other));
  placeStream(streams.R, bays.filter(b => b.side !== r.macroSide));
  // 退到全厅离原位置最近、仍放得下的墙段（引文也可退到较矮的墙）
  for (const [u, t0] of spill) for (const it of u) {
    const ok2 = (b) => featOK(b, it) && b.used + it.style.w <= cap(b) && it.style.y + it.style.h / 2 <= b.f.h - 0.15 && !onPosters(b, it.style);
    let best = null; for (const b of bays) if (ok2(b) && (!best || Math.abs(b.t - t0) < Math.abs(best.t - t0))) best = b;
    if (!best) overflow.push([it, it.style]); else put(best, [it]);
  }
  r.bays = bays;
  // 地面展台先定位置：先按第一遍的墙面分配给每件一个暂定位置（地面展台据此避让墙上展项），
  // 放成的展项让出墙面，剩下的墙面展项重新分配，免得墙上留下一个个空档；被地面展台挡住视线的墙段不再挂东西
  if (media.size) {
    const slots = (b) => { const tw = b.items.reduce((a, [, st]) => a + st.w, 0), gap = Math.min(1.6, ((b.a1 - b.a0) - tw) / (b.items.length + 1)), dir = b.f.axis === 'x' ? -b.f.nrm : b.f.nrm;
      let cur = (b.a0 + b.a1) / 2 - dir * (tw + gap * (b.items.length - 1)) / 2; return b.items.map(([it, st]) => { const am = cur + dir * st.w / 2; cur += dir * (st.w + gap); return [it, st, am]; }); };
    for (const b of bays) for (const [it, st, am] of slots(b)) { it.face = b.f; it.am = am; if (media.has(it)) deferred.set(it, { st, f: b.f, am }); }
    arrangeDisplays(r, g, y0, media, deferred, lamps, 'floor');
    const moved = new Set(wallItems.filter(it => it.medium));
    if (moved.size) {
      for (const it of moved) media.delete(it);
      deferred.clear();
      const boxes = r.islandBoxes || [];
      for (const b of bays) {
        b.used = 0; b.items = [];
        const [x0, z0] = facePos(b.f, b.a0, 0), [x1, z1] = facePos(b.f, b.a1, 2.0), bx = [Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)];
        b.blocked = boxes.some(q => q[0] < bx[1] && q[1] > bx[0] && q[2] < bx[3] && q[3] > bx[2]);
      }
      spill.length = 0; overflow.length = 0;
      const keep = (u) => !u.some(it => moved.has(it));
      const open = bays.filter(b => !b.blocked);
      placeStream(streams.L.filter(keep), open.filter(b => b.side !== other));
      placeStream(streams.R.filter(keep), open.filter(b => b.side !== r.macroSide));
      for (const [u, t0] of spill) for (const it of u) {
        const ok2 = (b) => !b.blocked && featOK(b, it) && b.used + it.style.w <= cap(b) && it.style.y + it.style.h / 2 <= b.f.h - 0.15 && !onPosters(b, it.style);
        let best = null; for (const b of bays) if (ok2(b) && (!best || Math.abs(b.t - t0) < Math.abs(best.t - t0))) best = b;
        if (!best) overflow.push([it, it.style]); else put(best, [it]);
      }
    }
  }
  // 空墙补白：在留白较多的墙段挂本厅档案柜里的藏品原件影像（带小标签，点击可读）
  // 只挂在完全空着的墙段，每段最多两件；其余藏品放进厅中的平柜
  const AR = s.archive || [], FW = 1.5;
  let ai = 0;
  const room = (b) => cap(b) - b.used;
  for (const b of [...bays].sort((p, q) => (p.side === 'A' ? 0 : 1) - (q.side === 'A' ? 0 : 1) || room(q) - room(p))) {   // 先补迎面的端墙（走过去一直看着的那面），再补其余空墙
    if (b.f.posters || b.f.h < 3.4 || b.items.length || b.blocked) continue;
    let k = 0;
    while (ai < AR.length && ai < 8 && k < 2 && room(b) >= FW + GAP) {   // 地面展台让出的空墙也用档案原件补上
      const o = AR[ai++], it = { k: 'archframe', o, t: o.t, idx: s.items.length, minor: true };
      it.style = { w: FW, h: 2.05, y: 1.8, kind: 'archframe' };
      s.items.push(it); put(b, [it]); k++;
    }
  }
  // 补白件按所在墙段的路线顺序排进阅读序列
  r.archUsed = ai;
  for (const b of bays) {
    if (!b.items.length) continue;
    // 专题阅读台排在墙段中间，不放在墙段两端（两端可能是墙角或门边，台子会挡住相邻墙面或通道）
    if (b.items.length > 1 && b.items.some(([it]) => it.k === 'feature')) {
      const fs = b.items.filter(([it]) => it.k === 'feature'), rest = b.items.filter(([it]) => it.k !== 'feature'), mid = Math.ceil(rest.length / 2);
      b.items = [...rest.slice(0, mid), ...fs, ...rest.slice(mid)];
      // 再比较正反两种排法，取阅读台离墙面两端（墙角、门边）更远的一种
      const lay = (list) => { const tw = list.reduce((a, [, st]) => a + st.w, 0), gap = Math.min(1.6, ((b.a1 - b.a0) - tw) / (list.length + 1)), dir = b.f.axis === 'x' ? -b.f.nrm : b.f.nrm;
        let cur = (b.a0 + b.a1) / 2 - dir * (tw + gap * (list.length - 1)) / 2, worst = Infinity;
        for (const [it, st] of list) { const am = cur + dir * st.w / 2; cur += dir * (st.w + gap); if (it.k === 'feature') worst = Math.min(worst, am - b.f.a0, b.f.a1 - am); }
        return worst; };
      const rev = [...b.items].reverse(); if (lay(rev) > lay(b.items) + 0.01) b.items = rev;
    }
    const tw = b.items.reduce((a, [, st]) => a + st.w, 0), gap = Math.min(1.6, ((b.a1 - b.a0) - tw) / (b.items.length + 1));
    const dir = b.f.axis === 'x' ? -b.f.nrm : b.f.nrm;   // 面对墙时从左到右
    let cur = (b.a0 + b.a1) / 2 - dir * (tw + gap * (b.items.length - 1)) / 2;
    for (const [it, st] of b.items) {
      const am = cur + dir * st.w / 2; cur += dir * (st.w + gap);
      if (media.has(it)) {
        // 保留原位置和观看区。若展厅净空不足，条目仍可回到预留墙段。
        it.face = b.f; it.am = am;
        deferred.set(it,{ st, f:b.f, am }); continue;
      }
      if (st.kind === 'feature') { wallLectern(r, g, it, b.f, am, y0); it.face = b.f; it.am = am; it.pt = b.t; lamps.push([...facePos(b.f, am, 2.0), ...facePos(b.f, am, 0.98), 1.1]); continue; }
      placeItem(r, g, it, st, b.f, am, y0);
      lamps.push([...facePos(b.f, am, 1.8), ...facePos(b.f, am, 0.05), st.y]);
    }
  }
  // 入口冲击区的大字
  if (r.focal) {
    const { f, am, yt, yb } = r.focal;
    const [lx, lz] = facePos(f, am, 2.1), [tx, tz] = facePos(f, am, 0.45);
    vlight(g, { spot: true, focal: true, color: r.theme.style.tint || 0xffebc9, power: 39, dist: 10, angle: 0.62, pen: 0.84, decay: 1.7,
      p: [lx, y0 + r.ceilH - 0.42, lz], t: [tx, y0 + (yb + yt) / 2, tz] });
    lamps.push([lx, lz, tx, tz, (yb + yt) / 2]);
    const F = r.focal, busy = ['brick', 'news', 'hoarding', 'planks'].includes((F.f.part ? r.theme.style.part : r.theme.style.wall).t);
    const it = { k: 'impact', sp: F.f.posters ? { ...F.sp, plate: 'dark' } : busy ? { ...F.sp, plate: true } : F.sp, t: F.sp.big || F.sp.line, minor: true, pt: -1 };
    const st = { w: F.W, h: F.yt - F.yb, y: (F.yb + F.yt) / 2, kind: 'impact' }; it.style = st;
    s.items.push(it); placeItem(r, g, it, st, F.f, F.am, y0);
  }
  frieze(r, g, y0);
  // 墙面放不下的展项：放到路线旁的独立展墙上，正面朝向参观路线
  for (const [it, st] of overflow) {
    const prev = s.items.slice(0, s.items.indexOf(it)).reverse().find(i => i.pt !== undefined);
    if (it.k === 'feature') { lateFeatures.push(it); continue; }
    let spot = findFloorSpot(r, prev ? prev.pt : 0, 2.2, [st.w + 0.5, 0.7]) || findFloorSpot(r, prev ? prev.pt : 0, 1.75, [st.w + 0.5, 0.7]);
    if (!spot && r.standSpot) {   // 墙面已满的展厅：在平面图指定的位置立一面展墙
      const { x, z, rot } = r.standSpot, sw = Math.abs(Math.sin(rot)) < 0.5, hw = (sw ? 0.7 : st.w + 0.5) / 2, hd = (sw ? st.w + 0.5 : 0.7) / 2;
      let t = 0, nd = Infinity; for (const q of samplePath(r, 0.5)) { const d = Math.hypot(q.x - x, q.z - z); if (d < nd) { nd = d; t = q.t; } }
      spot = { x, z, rot, t }; r.obst.push([x - hw - 0.3, x + hw + 0.3, z - hd - 0.3, z + hd + 0.3]); r.standSpot = null;
    }
    if (!spot) { console.warn('墙面不足：', s.room, itemTitle(it, s)); continue; }
    const alongZ = Math.abs(Math.sin(spot.rot)) < 0.5, T = 0.3, H = 3.8;
    let near = null, nd = Infinity; for (const q of samplePath(r, 0.5)) { const d = Math.hypot(q.x - spot.x, q.z - spot.z); if (d < nd) { nd = d; near = q; } }
    const nrm = alongZ ? Math.sign(near.x - spot.x) || 1 : Math.sign(near.z - spot.z) || 1;
    const sm = r.theme.style ? styleMat(r.theme.style.part) : partMat(r.theme.part);
    box(g, alongZ ? T : st.w + 0.4, H, alongZ ? st.w + 0.4 : T, sm, spot.x, y0 + H / 2, spot.z);
    occluder(r.key, spot.x, y0 + H / 2, spot.z, alongZ ? T - 0.08 : st.w + 0.4, H, alongZ ? st.w + 0.4 : T - 0.08);
    box(g, alongZ ? T + 0.06 : st.w + 0.46, 0.06, alongZ ? st.w + 0.46 : T + 0.06, metal, spot.x, y0 + H + 0.03, spot.z);
    const f = alongZ ? { axis: 'z', c: spot.x + nrm * (T / 2 + 0.005), nrm, a0: spot.z - st.w / 2, a1: spot.z + st.w / 2, h: H, stand: true }
                     : { axis: 'x', c: spot.z + nrm * (T / 2 + 0.005), nrm, a0: spot.x - st.w / 2, a1: spot.x + st.w / 2, h: H, stand: true };
    placeItem(r, g, it, st, f, alongZ ? spot.z : spot.x, y0);
    it.pt = spot.t;
  }
  for (const it of s.items.filter(i => i.k === 'obj')) {
    const prev = s.items.slice(0, it.idx).reverse().find(i => i.pt !== undefined);
    const bare = BARE.has(it.obj); let spot = findFloorSpot(r, prev ? prev.pt : 0, bare ? 2.5 : 2.6, bare ? [4.4, 1.6] : [1.6, 1.6], bare ? 2.2 : 0)
      || (bare && r.objSpot ? null : bare ? findFloorSpot(r, prev ? prev.pt : 0, 1.15, [4.4, 1.3], 1.9) : findFloorSpot(r, prev ? prev.pt : 0, 1.8, [1.45, 1.45], 1.6));   // 窄走廊里：靠墙放，长边顺着走廊；立柜退一步找较小的空地
    if (!spot && bare && r.objSpot) {   // 走廊式展厅：用平面图指定的位置
      const { x, z, rot } = r.objSpot, sw = Math.abs(Math.sin(rot)) < 0.5, hw = (sw ? 0.6 : 2.1), hd = (sw ? 2.1 : 0.6);
      let t = 0, nd = Infinity; for (const q of samplePath(r, 0.5)) { const d = Math.hypot(q.x - x, q.z - z); if (d < nd) { nd = d; t = q.t; } }
      spot = { x, z, rot, t }; r.obst.push([x - hw - 0.2, x + hw + 0.2, z - hd - 0.2, z + hd + 0.2]); r.objSpot = null;
    }
    if (!spot) { console.warn('没有空地放展柜：', s.room, it.t); continue; }
    vitrine(r, g, it, spot.x, spot.z, y0, spot.rot);
    it.pt = spot.t;
  }
  // 墙边放不下的专题阅读台（路线贴着墙的窄厅）：退回路线旁的空地，朝向迎着参观者，彼此至少隔 3 米
  { const micro = r.macroSide === 'R' ? 'L' : 'R', placed = [];
    for (const it of lateFeatures) {
      const prev = s.items.slice(0, s.items.indexOf(it)).reverse().find(i => i.pt !== undefined);
      let spot = lecternSpot(r, prev ? prev.pt : 0, micro, placed);
      if (!spot && r.featSpots && r.featSpots.length) {   // 走廊太窄的展厅：平面图预留的位置
        const { x, z } = r.featSpots.shift(); let near = null, nd = Infinity; for (const q of samplePath(r, 0.5)) { const d = Math.hypot(q.x - x, q.z - z); if (d < nd) { nd = d; near = q; } }
        const [dx, dz] = pathDir(r.path, near.x, near.z), face = Math.abs(dx) > Math.abs(dz) ? [-Math.sign(dx), 0] : [0, -Math.sign(dz)];
        spot = { x, z, t: near.t, face }; r.obst.push([x - 1.1, x + 1.1, z - 1.1, z + 1.1]);
      }
      if (!spot) { console.warn('没有空地放专题阅读台：', s.room, it.t); continue; }
      placed.push(spot); featureStand(r, g, it, spot, y0); it.pt = spot.t;
    }
  }
  const pool = (s.archive || []).slice(r.archUsed || 0), pathLen = (samplePath(r, 0.5).at(-1) || { t: 1 }).t;
  // 档案查阅台：厅末的立式触屏机柜，可浏览本厅全部档案
  for (const it of s.items.filter(i => i.k === 'arch')) {
    const spot = r.kiosk || findFloorSpot(r, pathLen * 0.9, 1.6, [1.3, 1.0]) || findFloorSpot(r, pathLen * 0.5, 1.3, [1.3, 1.0]);
    if (!spot) { console.warn('没有空地放查阅台：', s.room); continue; }
    kiosk(r, g, it, spot, y0); it.pt = spot.t;
  }
  arrangeDisplays(r, g, y0, media, deferred, lamps, 'hang');
  if (lamps.length) {
    const top = y0 + Math.min(r.ceilH, CEIL);
    const heads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.135, 0.32, 12), metal, lamps.length);
    const lenses = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.107, 0.107, 0.012, 12), lightPanel, lamps.length);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.034, 0.034, 0.42, 8), metal, lamps.length);
    const unit = new THREE.Vector3(1, 1, 1), down = new THREE.Vector3(0, -1, 0);
    const p = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Quaternion(), matrix = new THREE.Matrix4();
    lamps.forEach(([x, z, tx, tz, targetHeight], i) => {
      stems.setMatrixAt(i, matrix.makeTranslation(x, top - 0.21, z));
      p.set(x, top - 0.45, z);
      dir.set(tx - x, y0 + targetHeight - p.y, tz - z).normalize();
      q.setFromUnitVectors(down, dir);
      heads.setMatrixAt(i, matrix.compose(p, q, unit));
      lenses.setMatrixAt(i, matrix.compose(p.addScaledVector(dir, 0.166), q, unit));
    });
    g.add(heads, lenses, stems);
  }
  // 厅中的平柜：档案柜里没有挂上墙的藏品，每柜三件，沿参观路线分布
  const ncase = Math.min(6, Math.floor(pool.length / 3));
  for (let k = 0, pi = 0; k < ncase; k++) {
    const spot = centerSpot(r, pathLen * (k + 0.7) / (ncase + 0.4));
    if (!spot) continue;
    const objs = pool.slice(pi, pi + 3); pi += 3;
    if (!detourPath(r, spot)) { r.obst.pop(); pi -= 3; continue; }   // 绕不开就不放这个平柜（路线必须走得通）
    const it = { k: 'tcase', objs, t: objs[0].t, minor: true, pt: spot.t };
    s.items.push(it); tableCase(r, g, it, spot, y0);
  }
  // 阅读顺序：主展项在前，冲击区、补白与平柜按路线位置排在后面
  { const main = s.items.filter(i => !i.minor), extra = s.items.filter(i => i.minor).sort((p, q) => (p.pt ?? 0) - (q.pt ?? 0));
    s.items.splice(0, s.items.length, ...main, ...extra); s.items.forEach((i, n) => { i.idx = n; }); }
  let lastBench = -99;
  for (const p of samplePath(r, 0.7)) {
    if (p.t - lastBench < 18 || p.t < 6) continue;
    for (const off of [2.6, -2.6]) {
      const x = p.x + Math.cos(p.ang) * off, z = p.z - Math.sin(p.ang) * off;
      if (!inR(r.rect, x, z, 2) || clearance(r, x, z) < 2.2 || clearance(r, p.x, p.z) < 3.4 || pathDist(r.path, x, z) < 2.4) continue;
      bench(r, g, x, z, y0, p.ang); lastBench = p.t; break;
    }
  }
}
// 从可通行的直线路段选地坪嵌件的位置。只占用极薄的地表，避开楼梯井和门槛。
function dateRun(r, count, target) {
  const marks = samplePath(r, 0.65),
    width = count * 1.65 + 0.12;
  marks.sort((a, b) => Math.abs(a.t - target) - Math.abs(b.t - target));
  for (const p of marks) {
    if (p.t < 3) continue;
    const ax = Math.abs(Math.sin(p.ang)) > 0.71,
      tx = ax ? 1 : 0,
      tz = ax ? 0 : 1;
    for (const side of [1, -1]) {
      const nx = tz * side,
        nz = tx * side,
        x = p.x + nx * 0.77,
        z = p.z + nz * 0.77;
      let clear = true;
      for (let i = 0; i <= Math.ceil(width / 0.5) && clear; i++) {
        const a = width * (i / Math.ceil(width / 0.5) - 0.5);
        for (const off of [-0.5, 0, 0.5]) {
          const xx = x + tx * a + nx * off,
            zz = z + tz * a + nz * off;
          if (!inR(r.rect, xx, zz, 1.45) || !walkable(xx, zz, r.floor) || pathDist(r.path, xx, zz) > 1.65) {
            clear = false;
            break;
          }
        }
      }
      if (clear) return { x, z, yaw: Math.atan2(-nx, -nz), t: p.t };
    }
  }
  return null;
}

// phase 'floor'：先放地面展台（翻页、抽屉、人物、数据台）与地面时间线，记下占地；phase 'hang'：墙面定稿后挂双面照片，放不成的回到墙上预留的位置
function arrangeDisplays(r, g, y0, media, pending, lamps, phase = 'floor') {
  if (!pending.size) return;
  const entries = kind => r.sec.items.filter(it => pending.has(it) && media.get(it) === kind);
  const bind = (it, kind, t) => {
    it.medium = kind;
    it.pt = t;
    delete it.face;
    it.mesh.userData = { sec: r.sec, item: it };
    interactive[r.key].push(it.mesh);
    lazy[r.key].push(it);
    if (it.capMesh) {
      it.capMesh.userData = it.mesh.userData;
      interactive[r.key].push(it.capMesh);
    }
    for (const mesh of it.reverseFaces || []) {
      mesh.userData = it.mesh.userData;
      interactive[r.key].push(mesh);
    }
    pending.delete(it);
  };
  if (phase === 'hang') for (const it of entries('suspension')) {
    const { st, f, am } = pending.get(it);
    if (Math.min(f.h, r.ceilH) < 4.48 || f.stand) continue;
    const [x, z] = facePos(f, am, 1.18);
    if (!walkable(x, z, r.floor) || !inR(r.rect, x, z, 0.75)) continue;
    it.mesh = suspendedPhoto(g, it, f, am, y0, r.ceilH, 1.18);
    it.style = st;
    bind(it, 'suspension', it.pt);
  }
  // 不同媒介共用原展线旁的空位搜索。人物岛另留一圈观看空间。
  if (phase === 'floor') for (const kind of ['measure', 'portrait', 'drawer', 'folio']) {
    const list = entries(kind),
      size = displaySizes[kind];
    const count =
      kind === 'folio'
        ? list.length - (list.length % 2)
        : kind === 'portrait'
          ? 3
          : kind === 'measure'
            ? 1
            : list.length;
    if (!count || list.length < count || (kind === 'drawer' && count < 2)) continue;
    const batch = list.slice(0, count);
    const need = kind === 'portrait' ? 2.15 : Math.hypot(...size) / 2 + 0.17;
    const spot = findFloorSpot(r, batch[0].pt, need, size);
    if (!spot) continue;
    const alongZ = Math.abs(Math.sin(spot.rot)) < 0.5;
    const path = samplePath(r, 0.5).reduce((a, b) => (Math.abs(b.t - spot.t) < Math.abs(a.t - spot.t) ? b : a));
    spot.yaw = alongZ ? (path.x > spot.x ? Math.PI / 2 : -Math.PI / 2) : path.z > spot.z ? 0 : Math.PI;
    const shadowWidth = alongZ ? size[1] : size[0],
      shadowDepth = alongZ ? size[0] : size[1];
    contactShadow(g, spot.x, y0, spot.z, shadowWidth + 0.58, shadowDepth + 0.58);
    (r.islandBoxes ||= []).push([spot.x - shadowWidth / 2 - 0.3, spot.x + shadowWidth / 2 + 0.3, spot.z - shadowDepth / 2 - 0.3, spot.z + shadowDepth / 2 + 0.3]);
    island(g, kind, batch, spot, y0, interactive[r.key]);
    for (const it of batch) {
      if (kind === 'folio') it.style = { kind: it.k === 'names' ? 'nameLeaf' : 'leaf' };
      if (kind === 'measure') it.style = { kind: 'measure' };
      if (kind === 'drawer') it.style = { kind: 'drawer' };
      bind(it, kind, spot.t);
    }
  }
  const dates = phase === 'floor' ? entries('timeline') : [];
  if (dates.length) {
    const start = it => {
      const [, year, month, day] = it.d.match(/((?:18|19|20)\d{2})(?:年(\d{1,2})月(?:(\d{1,2})日)?)?/) || [];
      return Number(year || 0) * 10000 + Number(month || 0) * 100 + Number(day || 0);
    };
    if (r.id !== 'A') dates.sort((a, b) => start(a) - start(b) || a.idx - b.idx);
    const spot = dateRun(r, dates.length, dates[0].pt);
    if (spot) {
      const meshes = timeline(g, dates, spot, y0);
      dates.forEach((it, i) => {
        it.style = { kind: 'floorDate' };
        it.mesh = meshes[i];
        bind(it, 'timeline', spot.t);
      });
    }
  }
  if (phase === 'hang') for (const [it, { st, f, am }] of pending) {
    placeItem(r, g, it, st, f, am, y0);
    lamps.push([...facePos(f, am, 1.8), ...facePos(f, am, 0.05), st.y]);
  }
}

function pathDist(path, x, z) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(x - ax - u * dx, z - az - u * dz));
  }
  return best;
}
// 墙顶的章节字带
function frieze(r, g, y0) {
  const s = r.sec; if (!s || s.no === 0 || s.no === 25) return;
  const label = `${String(s.no).padStart(2, '0')}　${s.title}　${s.years}`, th = r.theme, st = th.style || {};
  const col = th.light ? 'rgba(30,26,23,.32)' : 'rgba(232,226,210,.22)';
  const cv = () => hdCanvas(1024, 96, (c, W, H) => { c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; let fs = 56; c.font = `${fs}px ${FONT}`; while (c.measureText(label).width > W - 20) { fs -= 2; c.font = `${fs}px ${FONT}`; } c.fillText(label, W / 2, H / 2 + 2); });
  const mat = new THREE.MeshBasicMaterial({ map: lazyTex(cv), transparent: true, depthWrite: false });
  // 时间线：贴墙的细线，展品上方标出年代
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(th.accentLight), transparent: true, opacity: th.light ? 0.6 : 0.45 });
  const dadoH = st.dado ? st.dado.h : 0.9, dadoM = st.dado ? (mats['dado' + st.dado.c] ||= lam(new THREE.Color(st.dado.c))) : (mats.dado ||= lam(0x101012));
  for (const f of r.fullFaces || r.faces) {   // 墙裙与时间线沿整面墙连续，不受展项避让的切分影响
    if (f.h < 4.9 && !st.dado) continue;
    const L = f.a1 - f.a0;
    if (f.h >= 4.9) {   // 时间线在高过 4.3 米的展项（入口大字、引文、大展板）处断开，不从字上穿过
      const same = (q) => q.axis === f.axis && Math.abs(q.c - f.c) < 0.05 && q.nrm === f.nrm, cut = [];
      for (const b of r.bays || []) if (same(b.f)) for (const [it, st2] of b.items) {
        if (!it.mesh || st2.y + st2.h / 2 < 4.2) continue; const u = f.axis === 'x' ? it.mesh.position.x : it.mesh.position.z; cut.push([u - st2.w / 2 - 0.3, u + st2.w / 2 + 0.3]); }
      if (r.focal && same(r.focal.f)) cut.push([r.focal.am - r.focal.W / 2 - 0.4, r.focal.am + r.focal.W / 2 + 0.4]);
      cut.sort((p, q) => p[0] - q[0]); let a = f.a0; const segs = [];
      for (const [c0, c1] of cut) { if (c0 > a) segs.push([a, Math.min(c0, f.a1)]); a = Math.max(a, c1); }
      if (a < f.a1) segs.push([a, f.a1]);
      for (const [s0, s1] of segs) { if (s1 - s0 < 0.4) continue; const ln = new THREE.Mesh(new THREE.PlaneGeometry(s1 - s0, 0.035), lineMat); const [x, z] = facePos(f, (s0 + s1) / 2, 0.016); ln.position.set(x, y0 + 4.3, z); ln.rotation.y = faceRot(f); g.add(ln); }
    }
    // 墙裙（风格表可指定颜色与高度，如五十年代机关的绿墙裙）
    const dado = new THREE.Mesh(new THREE.PlaneGeometry(L, dadoH), dadoM);
    const [dx, dz] = facePos(f, (f.a0 + f.a1) / 2, 0.01); dado.position.set(dx, y0 + dadoH / 2, dz); dado.rotation.y = faceRot(f); g.add(dado);
  }
  // 顶部字带：最长的一面墙写厅名，其余几面刷上当年的标语
  const band = r.faces.filter(f => f.h >= 5 && f.a1 - f.a0 >= 8 && !(f.part && f.h < r.ceilH - 0.1) && !overlapsFocal(r, f)).sort((p, q) => (q.a1 - q.a0) - (p.a1 - p.a0));
  const sl = st.slogans || [];
  band.slice(0, 1 + sl.length * 2).forEach((f, i) => {
    const am = (f.a0 + f.a1) / 2, yy = y0 + Math.min(f.h, r.ceilH) - 0.66;
    let m;
    if (i === 0 || !sl.length) { const w = Math.min(5.6, f.a1 - f.a0 - 2); m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 1024), mat); }
    else {
      const text = sl[(i - 1) % sl.length], w = Math.min(7, f.a1 - f.a0 - 1.5);
      const sm = mats['slogan' + text] ||= new THREE.MeshBasicMaterial({ map: lazyTex(() => sloganCanvas(text, th.light ? '#a8231b' : '#c0392b', st.sloganFade || 1, LOW_MEM ? 0.5 : 1)), transparent: true, depthWrite: false });
      lazyShare(sm.map);
      m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 8), sm);
    }
    const [x, z] = facePos(f, am, 0.02); m.position.set(x, yy, z);   // 低于顶棚梁（梁底在顶棚下 0.32 米）
    m.rotation.y = faceRot(f); m.renderOrder = 2; g.add(m);
  });
}
function samplePath(r, step) {
  const out = []; let acc = 0;
  for (let i = 0; i < r.path.length - 1; i++) {
    const [ax, az] = r.path[i], [bx, bz] = r.path[i + 1], L = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < L; d += step) out.push({ x: ax + (bx - ax) * d / L, z: az + (bz - az) * d / L, t: acc + d, ang: Math.atan2(bx - ax, bz - az) });
    acc += L;
  }
  return out;
}
function clearance(r, x, z) {
  let d = Math.min(x - r.x0, r.x1 - x, z - r.z0, r.z1 - z);
  for (const o of r.obst) d = Math.min(d, Math.hypot(Math.max(o[0] - x, 0, x - o[1]), Math.max(o[2] - z, 0, z - o[3])));
  if (r.void) d = Math.min(d, Math.hypot(Math.max(r.void[0] - x, 0, x - r.void[1]), Math.max(r.void[2] - z, 0, z - r.void[3])));
  for (const dd of DOORS.filter(q => q.floor === r.floor && (q.a === r.id || q.b === r.id))) {
    const px = dd.axis === 'z' ? dd.u : dd.c, pz = dd.axis === 'z' ? dd.c : dd.u;
    d = Math.min(d, Math.hypot(x - px, z - pz) - 2);
  }
  for (const it of (r.sec ? r.sec.items : [])) if (it.mesh) {
    const p = it.mesh.position; d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 1.2);
  }
  return d;
}
// 墙上展项前方 1.2 米内不放落地展柜，以免挡住
function frontBlocked(r, x, z, hw, hd, depth = 1.2) {   // depth：墙上展项前方要留空的进深（高的展屏要留得更多，免得挡住视线）
  const F = r.focal, zones = F ? [{ face: F.f, am: F.am, style: { w: F.W } }] : [];
  for (const it of [...(r.sec ? r.sec.items : []), ...zones]) {
    if (!it.face || it.face.stand || !it.style) continue;
    const f = it.face, a0 = it.am - it.style.w / 2, a1 = it.am + it.style.w / 2, d0 = Math.min(f.c, f.c + f.nrm * depth), d1 = Math.max(f.c, f.c + f.nrm * depth);
    const [zx0, zx1, zz0, zz1] = f.axis === 'x' ? [a0, a1, d0, d1] : [d0, d1, a0, a1];
    if (x + hw > zx0 && x - hw < zx1 && z + hd > zz0 && z - hd < zz1) return true;
  }
  return false;
}
function findFloorSpot(r, target, need, size, pd = 0, depth = 1.2) {
  let best = null, bestScore = Infinity;
  for (const p of samplePath(r, 0.5)) for (const off of [2.6, -2.6, 3.4, -3.4, 1.6, -1.6]) {
    const x = p.x + Math.cos(p.ang) * off, z = p.z - Math.sin(p.ang) * off;
    if (!inR(r.rect, x, z, 1.5)) continue;
    if (clearance(r, x, z) < need || pathDist(r.path, x, z) < (pd || 1.4 + Math.max(...size) / 2)) continue;
    const swap = Math.abs(Math.sin(Math.round(p.ang / (Math.PI / 2)) * Math.PI / 2)) < 0.5, hw = (swap ? size[1] : size[0]) / 2, hd = (swap ? size[0] : size[1]) / 2;
    let okRect = true;
    for (const [ux, uz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) if (pathDist(r.path, x + ux * hw, z + uz * hd) < 1.1 || !walkable(x + ux * hw, z + uz * hd, r.floor)) okRect = false;
    if (!okRect || frontBlocked(r, x, z, hw, hd, depth)) continue;
    const score = Math.abs(p.t - target) + Math.abs(off) * 0.4;
    if (score < bestScore) { bestScore = score; best = { x, z, t: p.t, rot: Math.round(p.ang / (Math.PI / 2)) * Math.PI / 2 }; }
  }
  if (best) {
    const swap = Math.abs(Math.sin(best.rot)) < 0.5, hw = (swap ? size[1] : size[0]) / 2, hd = (swap ? size[0] : size[1]) / 2;
    r.obst.push([best.x - hw - 0.3, best.x + hw + 0.3, best.z - hd - 0.3, best.z + hd + 0.3, 0.3]);
  }
  return best;
}
function bench(r, g, x, z, y0, ang) {
  const alongX = Math.abs(Math.sin(ang)) > 0.7, w = alongX ? 2.6 : 0.6, d = alongX ? 0.6 : 2.6;
  const seat = new THREE.Group(); seat.position.set(x, y0, z); seat.rotation.y = alongX ? 0 : Math.PI / 2; g.add(seat);
  for (let i = 0; i < 4; i++) box(seat, 2.6, 0.065, 0.138, surface('timber'), 0, 0.465, (i - 1.5) * 0.15);
  for (const end of [-0.92, 0.92]) {
    box(seat, 0.10, 0.06, 0.53, metal, end, 0.411, 0);
    for (const side of [-0.225, 0.225]) box(seat, 0.08, 0.36, 0.06, metal, end, 0.2, side);
    box(seat, 0.085, 0.04, 0.51, metal, end, 0.02, 0);
  }
  contactShadow(seat, 0, 0, 0, 3.25, 1.05);
  r.obst.push([x - w / 2 - 0.2, x + w / 2 + 0.2, z - d / 2 - 0.2, z + d / 2 + 0.2]);
}

let _resistMat = null;
const resistMat = () => _resistMat ||= new THREE.MeshBasicMaterial({ map: tex(hdCanvas(512, 146, (c, W, H) => { c.fillStyle = '#b01c14'; c.fillRect(0, 0, W, H); c.fillStyle = '#f6efe2'; c.font = `bold 78px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('反　抗', W / 2, H / 2 + 4); })) });
function placeItem(r, g, it, st, f, am, y0) {
  const key = r.key, th = r.theme, s = r.sec;
  const transparent = st.kind === 'title' || st.kind === 'quote' || st.kind === 'wall' || st.kind === 'names' || st.kind === 'impact';
  // 隔墙的明暗可能与房间墙面不同：按所挂的那面墙决定文字用深色还是浅色
  it.theme = f.light ? { ...th, wallText: '#1d1a17', wallSub: '#55524b', accentLight: th.accent, light: true }
    : (f.part && th.light) ? { ...th, wallText: '#e8e2d2', wallSub: '#a39d90', light: false, accentLight: th.accent === th.accentLight ? '#d0533f' : th.accentLight } : th;
  const baseColor = transparent ? 0xffffff : st.kind === 'photo' ? 0x2a2a2a : st.kind === 'archframe' ? 0xece6d8 : st.kind === 'case' ? 0x25221f : st.kind === 'books' ? 0x17120e : st.kind === 'bio' ? 0x1a1817 : (th.darkPanel ? 0x19191b : 0xece7da);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(st.w, st.h), new THREE.MeshBasicMaterial({ color: baseColor, transparent, depthWrite: !transparent }));
  const [px, pz] = facePos(f, am, st.kind === 'bio' ? 0.21 : st.kind === 'case' || st.kind === 'arch' || st.kind === 'books' ? 0.105 : 0.05);
  mesh.position.set(px, y0 + st.y, pz); mesh.rotation.y = faceRot(f);
  mesh.userData = { sec: s, item: it }; it.face = f; it.am = am;
  if (transparent) { mesh.visible = false; mesh.renderOrder = 2; }
  g.add(mesh); it.mesh = mesh;
  interactive[key].push(mesh); lazy[key].push(it);
  if (it.resist && st.kind !== 'impact') {   // 不服从者：展项左上角一条红色标记
    // 人物卡上方有一条铜灯架（离卡顶 0.16—0.24 米、伸出墙面 0.6 米）：标记压低到灯架下面、挂在画框前面，不与灯架穿插
    const bio = st.kind === 'bio', dir = f.axis === 'x' ? -f.nrm : f.nrm, u = am - dir * (st.w / 2 - 0.36), [rx, rz] = facePos(f, u, bio ? 0.27 : (st.kind === 'case' ? 0.37 : 0.05) + 0.02);
    const rb = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.2), resistMat()); rb.position.set(rx, y0 + st.y + st.h / 2 + (bio ? 0.045 : 0.16), rz); rb.rotation.y = faceRot(f); g.add(rb);
  }
  if (st.kind === 'books' || st.kind === 'case' || st.kind === 'arch') {
    const library = st.kind === 'books', [x, z] = facePos(f, am, 0);
    const cabinet = new THREE.Group(); cabinet.position.set(x, y0 + st.y, z); cabinet.rotation.y = faceRot(f); g.add(cabinet);
    const cabinetMat = library || r.floor === 0 ? surface('timber') : metal;
    box(cabinet, st.w + 0.14, st.h + 0.14, 0.09, recessedBase, 0, 0, 0.05);
    pictureFrame(cabinet, st.w + 0.018, st.h + 0.018, 0.072, 0.33, cabinetMat);
    box(cabinet, st.w - 0.08, 0.023, 0.046, lightPanel, 0, st.h / 2 - 0.018, 0.295);
    if (library) {
      // 与书脊画布相同的四行，每块层板的前沿投出实体厚度。
      const heading = 0.30, row = (st.h - heading) / 4;
      for (let k = 1; k <= 4; k++) {
        const shelfY = st.h / 2 - heading - k * row + 0.023;
        box(cabinet, st.w, 0.046, 0.24, cabinetMat, 0, shelfY, 0.225);
      }
    } else {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(st.w + 0.018, st.h + 0.018), caseGlass);
      pane.position.z = 0.32; pane.renderOrder = 3; cabinet.add(pane);
      box(cabinet, st.w + 0.16, 0.035, 0.36, bronze, 0, -st.h / 2 - 0.065, 0.18);
    }
  } else if (st.kind === 'bio') {
    const [bx, bz] = facePos(f, am, 0.1), cb = new THREE.Mesh(new THREE.BoxGeometry(st.w + 0.3, st.h + 0.3, 0.2), lam(0x0e0e0f));
    cb.position.set(bx, y0 + st.y, bz); cb.rotation.y = faceRot(f); g.add(cb);
    const surround = new THREE.Group(), [sx, sz] = facePos(f, am, 0.188);
    surround.position.set(sx, y0 + st.y, sz); surround.rotation.y = faceRot(f); g.add(surround);
    pictureFrame(surround, st.w + 0.015, st.h + 0.015, 0.044, 0.048, bronze);
    const [lx, lz] = facePos(f, am, 0.36);
    box(g, f.axis === 'x' ? st.w + 0.3 : 0.5, 0.08, f.axis === 'x' ? 0.5 : st.w + 0.3, brass, lx, y0 + st.y + st.h / 2 + 0.2, lz);
  } else if (!transparent) {
    const holder = new THREE.Group(), [x, z] = facePos(f, am, 0);
    holder.position.set(x, y0 + st.y, z); holder.rotation.y = faceRot(f); g.add(holder);
    mountPrint(holder, st.w, st.h, st.kind, r.floor);
  }
  if (!th.light && !f.light) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(st.kind === 'impact' ? st.w * 1.3 : st.w * 1.7, st.h + 2.6), glowMat);
    const [gx, gz] = facePos(f, am, 0.015); gl.position.set(gx, y0 + st.y + 0.9, gz); gl.rotation.y = faceRot(f); gl.renderOrder = 1; g.add(gl);
  }
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(st.w * 1.6, 2.6), poolMat);
  const [qx, qz] = facePos(f, am, 1.2); pl.rotation.x = -Math.PI / 2; pl.rotation.z = f.axis === 'x' ? 0 : Math.PI / 2; pl.position.set(qx, y0 + 0.03, qz); pl.renderOrder = 1; g.add(pl);
  const yr = String(it.d || it.life || (it.objs && it.objs[0] && it.objs[0].d) || '').match(/(1[89]\d\d|20[0-2]\d)/);
  if (yr && f.h >= 4.9 && s.no > 0 && s.no < 25 && st.y + st.h / 2 < 4.2) {   // 展项高过时间线时不标年代
    const col = th.light || f.light ? '#3b3833' : '#cfc7b4';
    const cv = () => hdCanvas(256, 64, (c, W, H) => { c.fillStyle = col; c.font = `bold 40px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(yr[1], W / 2, H / 2 + 2); });
    const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshBasicMaterial({ map: lazyTex(cv), transparent: true, depthWrite: false }));
    const [tx, tz] = facePos(f, am, 0.02); tg.position.set(tx, y0 + 4.55, tz); tg.rotation.y = faceRot(f); tg.renderOrder = 2; g.add(tg);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), basic(new THREE.Color(th.accentLight)));
    const [ox, oz] = facePos(f, am, 0.022); dot.position.set(ox, y0 + 4.3, oz); dot.rotation.y = faceRot(f); g.add(dot);
  }
  if (st.kind === 'photo') {
    const cw = Math.min(st.w, 2.2), dir = f.axis === 'x' ? -f.nrm : f.nrm;
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(cw, cw * 132 / 512), basic(0xe9e4d7));
    const [cx, cz] = facePos(f, am - dir * (st.w - cw) / 2, 0.05);
    cm.position.set(cx, y0 + st.y - st.h / 2 - 0.42, cz); cm.rotation.y = faceRot(f); cm.userData = mesh.userData; g.add(cm);
    it.capMesh = cm; interactive[key].push(cm);
  }
}

// 档案查阅台：带斜面屏幕的立柜，屏幕上是本厅档案的缩略图
// 出口门旁的位置：靠墙（出口所在的墙或旁边的墙）、离出口门洞 1 至 5 米、离墙 0.55 米，台面朝向房间，不挡参观路线；取离门最近的
function exitKioskSpot(r) {
  const d = DOORS.find(q => q.a === r.id && q.floor === r.floor); if (!d) return null;
  const dx0 = d.axis === 'x' ? d.c : d.u, dz0 = d.axis === 'x' ? d.u : d.c;
  let best = null;
  for (const f of r.faces) {
    if (f.posters || f.stand) continue;
    for (let a = f.a0 + 0.8; a <= f.a1 - 0.8; a += 0.25) {
      const [x, z] = facePos(f, a, 0.55), dd = Math.hypot(x - dx0, z - dz0);
      if (dd < d.w / 2 + 0.9 || dd > 5.5 || (best && dd >= best.dd)) continue;
      const face = f.axis === 'x' ? [0, f.nrm] : [f.nrm, 0], hw = face[0] ? 0.35 : 0.6, hd = face[0] ? 0.6 : 0.35;
      if (!inR(r.rect, x, z, 0.2) || pathDist(r.path, x, z) < 1.6) continue;
      if ([[a - 0.6, 0.95], [a + 0.6, 0.95], [a, 0.55]].some(([aa, off]) => !walkable(...facePos(f, aa, off), r.floor)) || r.obst.some(o => x + hw > o[0] && x - hw < o[1] && z + hd > o[2] && z - hd < o[3])) continue;   // 背面贴墙，只查台前与中心
      best = { x, z, face, f, a0: a - 1.0, a1: a + 1.0, dd, rot: 0, t: pathT(r.path, x, z), hw, hd };
    }
  }
  if (best) r.obst.push([best.x - best.hw - 0.2, best.x + best.hw + 0.2, best.z - best.hd - 0.2, best.z + best.hd + 0.2, 0.3]);
  return best;
}
function kiosk(r, g, it, spot, y0) {
  const alongZ = Math.abs(Math.sin(spot.rot)) < 0.5, key = r.key;
  let near = null, nd = Infinity; for (const q of samplePath(r, 0.5)) { const d = Math.hypot(q.x - spot.x, q.z - spot.z); if (d < nd) { nd = d; near = q; } }
  const side = alongZ ? Math.sign(near.x - spot.x) || 1 : Math.sign(near.z - spot.z) || 1;
  const grp = new THREE.Group(); grp.position.set(spot.x, y0, spot.z); grp.rotation.y = spot.face ? Math.atan2(spot.face[0], spot.face[1]) : alongZ ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI); g.add(grp);
  const body = metal;
  box(grp, 0.92, 0.075, 0.49, recessedBase, 0, 0.038, -0.05);
  box(grp, 1.1, 0.94, 0.55, body, 0, 0.545, -0.05);
  for (const side of [-1,1]) box(grp, 0.045, 0.91, 0.18, bronze, side * 0.53, 0.54, 0.155); box(grp, 1.16, 0.06, 0.7, metal, 0, 1.02, 0.02);
  const st = it.style = { kind: 'arch', w: 1.0, h: 0.83, dw: 3.6, dh: 3.0 };   // 按墙挂档案柜的版式排，缩到屏幕上
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(st.w, st.h), new THREE.MeshBasicMaterial({ color: 0x111112 }));
  scr.position.set(0, 1.42, 0.0); scr.rotation.x = -0.55; grp.add(scr);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.9, 0.06), body); back.position.set(0, 1.4, -0.04); back.rotation.x = -0.55; grp.add(back);
  const bezel = pictureFrame(grp, st.w + 0.008, st.h + 0.008, 0.035, 0.025, bronze);
  bezel.position.copy(scr.position); bezel.rotation.copy(scr.rotation);
  contactShadow(grp, 0, 0, -0.05, 1.85, 1.2);
  scr.userData = { sec: r.sec, item: it }; it.mesh = scr;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.set(0, 0.95, 0); hit.userData = { sec: r.sec, item: it }; grp.add(hit);
  interactive[key].push(scr, hit); lazy[key].push(it);
}
// 平柜：齐腰高的玻璃展柜，柜面略向参观者倾斜，里面平放三件档案影像
// 阅读台的位置：路线某一侧 1.9—2.7 米处，台面朝迎面走来的参观者（朝向取房间轴线方向），不占通道、不挡墙上展项、彼此至少隔 3 米
// 靠墙的专题阅读台：立在墙位正前方，台面背对墙、朝向房间，读者站在台前面对墙阅读；台后墙面留空
function wallLectern(r, g, it, f, am, y0) {
  const [x, z] = facePos(f, am, 0.98), face = f.axis === 'x' ? [0, f.nrm] : [f.nrm, 0];
  const hw = face[0] ? 0.65 : 1.05, hd = face[0] ? 1.05 : 0.65;
  r.obst.push([x - hw - 0.15, x + hw + 0.15, z - hd - 0.15, z + hd + 0.15, 0.3]);
  featureStand(r, g, it, { x, z, face }, y0);
  // 墙上的红色题名牌：远远就能看到这里有一座专题台
  const SW = 2.1, SH = 0.62, cv = () => hdCanvas(840, 248, (c, W, H) => {
    c.fillStyle = it.resist ? '#a81f17' : '#7c1d16'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(0, 0, W, 6); c.fillRect(0, H - 6, W, 6);
    c.fillStyle = '#f3d9a4'; c.font = `bold 34px ${SANS}`; c.textBaseline = 'middle'; c.fillText(it.resist ? '专题 · 反抗' : '专　题', 34, 58);
    let fs = 78; c.font = `bold ${fs}px ${FONT}`; while (c.measureText(it.t).width > W - 68 && fs > 40) { fs -= 2; c.font = `bold ${fs}px ${FONT}`; }
    c.fillStyle = '#fbf3e3'; c.fillText(it.t, 34, 160);
  }, 1.25);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: lazyTex(cv) }));
  const [px, pz] = facePos(f, am, 0.03); sign.position.set(px, y0 + Math.min(2.55, f.h - 0.6), pz); sign.rotation.y = faceRot(f);
  sign.userData = { sec: r.sec, item: it }; g.add(sign); interactive[r.key].push(sign);
}
function lecternSpot(r, target, side, placed) {
  let best = null, bestScore = Infinity;
  for (const p of samplePath(r, 0.5)) {
    const [dx, dz] = pathDir(r.path, p.x, p.z), L = [dz, -dx];   // 行进方向的左手法线
    for (const [sd, sgn] of [[side, side === 'L' ? 1 : -1], [side === 'L' ? 'R' : 'L', side === 'L' ? -1 : 1]]) for (const off of [1.9, 2.3, 2.7]) {
      const nx = L[0] * sgn, nz = L[1] * sgn, x = p.x + nx * off, z = p.z + nz * off;
      const face = Math.abs(dx) > Math.abs(dz) ? [-Math.sign(dx), 0] : [0, -Math.sign(dz)];   // 台面朝迎面走来的参观者（与行进方向相反），对齐房间轴线
      const hw = face[0] ? 0.65 : 1.05, hd = face[0] ? 1.05 : 0.65;   // 台面横宽 2.1 米，进深约 1.3 米
      let ok = inR(r.rect, x, z, 1.0) && clearance(r, x, z) >= 0.95;
      for (const [ux, uz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (!ok || pathDist(r.path, x + ux * hw, z + uz * hd) < 1.15 || !walkable(x + ux * (hw + 0.25), z + uz * (hd + 0.25), r.floor)) ok = false;
      if (!ok || frontBlocked(r, x, z, hw, hd, 1.4) || placed.some(q => Math.hypot(q.x - x, q.z - z) < 3)) continue;
      const score = Math.abs(p.t - target) + (sd === side ? 0 : 6) + (off - 1.9) * 0.8;
      if (score < bestScore) { bestScore = score; best = { x, z, t: p.t, face, hw, hd }; }
    }
  }
  if (best) r.obst.push([best.x - best.hw - 0.25, best.x + best.hw + 0.25, best.z - best.hd - 0.25, best.z + best.hd + 0.25, 0.3]);
  return best;
}
function featureStand(r, g, it, spot, y0) {   // 专题阅读台：细立柱托起一块斜面台，台面约 1.1 米高、向参观者倾斜
  const key = r.key, ang = Math.atan2(spot.face[0], spot.face[1]);
  const grp = new THREE.Group(); grp.position.set(spot.x, y0, spot.z); grp.rotation.y = ang; g.add(grp);
  const edge = bronze, base = recessedBase;
  const TW = 2.1, TD = 1.66, tilt = 0.66, cy = 1.02;   // 台面 2.1×1.66 米（与展板画布同比例），倾角约 38°
  box(grp, 1.1, 0.04, 0.72, base, 0, 0.02, -0.08);
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.62, cy - 0.06, 0.3), metal); col.position.set(0, (cy - 0.06) / 2, -0.08); grp.add(col);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(TW + 0.06, 0.05, TD + 0.06), metal); slab.position.set(0, cy, 0); slab.rotation.x = tilt; grp.add(slab);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(TW + 0.06, 0.06, 0.03), edge); lip.position.set(0, cy - Math.sin(tilt) * (TD / 2 + 0.03) + 0.02, Math.cos(tilt) * (TD / 2 + 0.03)); lip.rotation.x = tilt; grp.add(lip);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(TW, TD), new THREE.MeshBasicMaterial({ color: 0x1d1b18 }));
  board.position.set(0, cy + 0.027 * Math.cos(tilt), 0.027 * Math.sin(tilt)); board.rotation.x = -Math.PI / 2 + tilt; grp.add(board);
  const bezel = pictureFrame(grp, TW + 0.008, TD + 0.008, 0.018, 0.025, bronze);
  bezel.position.copy(board.position); bezel.rotation.copy(board.rotation);
  contactShadow(grp, 0, 0, -0.05, 2.3, 1.5);
  board.userData = { sec: r.sec, item: it }; it.mesh = board; it.style = { kind: 'feature', w: TW, h: TD };
  const hit = new THREE.Mesh(new THREE.BoxGeometry(TW, cy + 0.4, TD), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.set(0, (cy + 0.4) / 2, 0); hit.userData = { sec: r.sec, item: it }; grp.add(hit);
  interactive[key].push(board, hit); lazy[key].push(it);
}
// 平柜的位置：宽敞路段的正中，长边顺着参观方向，两侧各留至少 1.8 米通道；离路线拐点、门洞和墙上展项都远
function centerSpot(r, target) {
  const pts = samplePath(r, 0.5), turns = r.path.slice(1, -1), end = pts.length ? pts.at(-1).t : 0;
  let best = null, bestScore = Infinity;
  for (const p of pts) {
    if (p.t < 5 || p.t > end - 5 || turns.some(([tx, tz]) => Math.hypot(tx - p.x, tz - p.z) < 4.5)) continue;
    const [dx, dz] = pathDir(r.path, p.x, p.z), alongZ = Math.abs(dz) > Math.abs(dx), hw = alongZ ? 0.45 : 1.0, hd = alongZ ? 1.0 : 0.45;
    const x = p.x, z = p.z, px = alongZ ? 1 : 0, pz = alongZ ? 0 : 1;   // 横向（垂直于参观方向）
    if (!inR(r.rect, x, z, 2.0) || clearance(r, x, z) < 2.4) continue;
    let ok = true;
    for (const sgn of [-1, 1]) for (const k of [0.6, 1.4, 2.25]) for (const al of [-1.1, 0, 1.1]) {
      const qx = x + px * sgn * ((alongZ ? hw : hd) + k) + (alongZ ? 0 : al), qz = z + pz * sgn * ((alongZ ? hw : hd) + k) + (alongZ ? al : 0);
      if (!walkable(qx, qz, r.floor) || r.obst.some(o => qx > o[0] && qx < o[1] && qz > o[2] && qz < o[3])) ok = false;
    }
    if (!ok || frontBlocked(r, x, z, hw + 0.6, hd + 0.6, 1.6)) continue;
    const score = Math.abs(p.t - target);
    if (score < bestScore) { bestScore = score; best = { x, z, t: p.t, rot: alongZ ? 0 : Math.PI / 2, alongZ, hw, hd }; }
  }
  if (best) r.obst.push([best.x - best.hw - 0.3, best.x + best.hw + 0.3, best.z - best.hd - 0.3, best.z + best.hd + 0.3, 0.3]);
  return best;
}
// 平柜立在路线正中：路线（小地图上的线、路线检查）在柜前分开，从较宽的一侧绕过去
function detourPath(r, spot) {
  let si = 0, nd = Infinity;
  for (let i = 0; i < r.path.length - 1; i++) { const d = pathDist([r.path[i], r.path[i + 1]], spot.x, spot.z); if (d < nd) { nd = d; si = i; } }
  const [ax, az] = r.path[si], [bx, bz] = r.path[si + 1], L = Math.hypot(bx - ax, bz - az) || 1, dx = (bx - ax) / L, dz = (bz - az) / L;
  const clear = (pts) => { for (let k = 0; k < pts.length - 1; k++) { const [x0, z0] = pts[k], [x1, z1] = pts[k + 1], n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25);
    for (let q = 0; q <= n; q++) if (!walkable(x0 + (x1 - x0) * q / n, z0 + (z1 - z0) * q / n, r.floor)) return false; } return true; };
  // 路线斜着经过时，轴向摆放的柜子角会伸得更远：两侧都试，绕开的距离逐步加大，直到绕行的每一段都走得通
  for (const w of [1.4, 1.7, 2.0, 2.4, 2.8]) for (const sg of [1, -1]) {
    const nx = -dz * sg, nz = dx * sg, a = 1.2 + (w - 1.4), P = (along, side) => [spot.x + dx * along + nx * side, spot.z + dz * along + nz * side];
    const pts = [P(-a - 1.4, 0), P(-a, w), P(a, w), P(a + 1.4, 0)];
    if (clear(pts)) { r.path.splice(si + 1, 0, ...pts); return true; }
  }
  return false;
}
function tableCase(r, g, it, spot, y0) {
  const alongZ = Math.abs(Math.sin(spot.rot)) < 0.5, key = r.key;
  let near = null, nd = Infinity; for (const q of samplePath(r, 0.5)) { const d = Math.hypot(q.x - spot.x, q.z - spot.z); if (d < nd) { nd = d; near = q; } }
  const side = alongZ ? Math.sign(near.x - spot.x) || 1 : Math.sign(near.z - spot.z) || 1;
  const grp = new THREE.Group(); grp.position.set(spot.x, y0, spot.z); grp.rotation.y = alongZ ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI); g.add(grp);
  const W = 2.0, Dp = 0.9, H = 0.9, body = surface('timber'), trim = brassEdge;
  box(grp, W - 0.14, 0.10, Dp - 0.12, recessedBase, 0, 0.05, 0);
  box(grp, W, H - 0.2, Dp, body, 0, H / 2, 0); box(grp, W + 0.06, 0.04, Dp + 0.06, trim, 0, H - 0.08, 0);
  const pw = 1.84, ph = 0.76, plane = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ color: 0x1d1c1a }));
  plane.position.set(0, H + 0.02, 0.02); plane.rotation.x = -Math.PI / 2 + 0.08; grp.add(plane);
  for (const side of [-1, 1]) {
    box(grp, W, 0.025, 0.022, trim, 0, H + 0.142, side * (Dp / 2 - 0.015));
    box(grp, 0.022, 0.025, Dp, trim, side * (W / 2 - 0.012), H + 0.142, 0);
  }
  const gl = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.16, Dp - 0.04), caseGlass); gl.position.set(0, H + 0.06, 0); gl.renderOrder = 3; grp.add(gl);
  contactShadow(grp, 0, 0, 0, W + 1.05, Dp + 0.64);
  plane.userData = { sec: r.sec, item: it }; it.mesh = plane; it.style = { kind: 'tcase', w: pw, h: ph };
  const hit = new THREE.Mesh(new THREE.BoxGeometry(W, H + 0.2, Dp), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.set(0, (H + 0.2) / 2, 0); hit.userData = { sec: r.sec, item: it }; grp.add(hit);
  interactive[key].push(plane, hit); lazy[key].push(it);
}
function vitrine(r, g, it, x, z, y0, rot) {
  const tall = TALL.has(it.obj), bare = BARE.has(it.obj), key = r.key;
  const size = tall ? 1.3 : 1.25, baseH = bare ? 0.12 : tall ? 0.3 : 0.92, glassH = tall ? 2.15 : 0.95;
  const swap = bare && Math.abs(Math.sin(rot)) < 0.5;
  const bw = bare ? (swap ? 1.2 : 4.2) : size, bd = bare ? (swap ? 4.2 : 1.2) : size;
  const toe = Math.min(0.08, baseH / 3);
  box(g, bw - 0.12, toe, bd - 0.12, recessedBase, x, y0 + toe / 2, z);
  box(g, bw, baseH - toe, bd, bare ? recessedBase : surface('timber'), x, y0 + (baseH + toe) / 2, z);
  const obj = buildObject(it.obj); obj.position.set(x, y0 + baseH, z); if (swap) obj.rotation.y = Math.PI / 2; g.add(obj);
  if (!bare) {
    const gm = new THREE.Mesh(new THREE.BoxGeometry(size - 0.06, glassH, size - 0.06), caseGlass);
    gm.position.set(x, y0 + baseH + glassH / 2, z); gm.renderOrder = 3; g.add(gm);
    const corners = (size - 0.06) / 2;
    for (const dx of [-corners, corners]) for (const dz of [-corners, corners]) {
      box(g, 0.024, glassH, 0.024, bronze, x + dx, y0 + baseH + glassH / 2, z + dz);
      box(g, 0.078, 0.064, 0.078, metal, x + dx, y0 + baseH + 0.032, z + dz);
    }
    for (const dz of [-corners, corners]) box(g, size - 0.12, 0.015, 0.026, lightPanel, x, y0 + baseH + glassH - 0.012, z + dz);
    box(g, size, 0.06, size, metal, x, y0 + baseH + glassH + 0.03, z);
  }
  contactShadow(g, x, y0, z, bw + 0.9, bd + 0.9);
  const lt = lazyTex(() => drawLabel(it, LOW_MEM ? 1.2 : K_HI));
  for (const sgn of [-1, 1]) {
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.35), basic(0xffffff, { map: lt }));
    if (bare || tall) {
      const off = (swap ? bw : bd) / 2 + 0.5;
      if (swap) { lm.position.set(x + sgn * off, y0 + 0.75, z); lm.rotation.order = 'YXZ'; lm.rotation.set(-0.5, sgn > 0 ? Math.PI / 2 : -Math.PI / 2, 0); box(g, 0.04, 0.7, 0.04, metal, x + sgn * off, y0 + 0.35, z); }
      else { lm.position.set(x, y0 + 0.75, z + sgn * off); lm.rotation.order = 'YXZ'; lm.rotation.set(-0.5, sgn > 0 ? 0 : Math.PI, 0); box(g, 0.04, 0.7, 0.04, metal, x, y0 + 0.35, z + sgn * off); }
    } else { lm.position.set(x, y0 + 0.56, z + sgn * (bd / 2 + 0.006)); lm.rotation.y = sgn > 0 ? 0 : Math.PI; }
    lm.userData = { sec: r.sec, item: it }; g.add(lm); interactive[key].push(lm);
  }
  const hit = new THREE.Mesh(new THREE.BoxGeometry(bw, baseH + glassH, bd), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.set(x, y0 + (baseH + glassH) / 2, z); hit.userData = { sec: r.sec, item: it }; g.add(hit); interactive[key].push(hit);
}

// ───────────────────────── 装置 ─────────────────────────
function floorText(g, text, x, z, y, w = 8, rot = 0, color = '#b9b2a2') {
  const cv = () => hdCanvas(1024, 96, (c, W, H) => { c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; let s = 40; c.font = `${s}px ${FONT}`; while (c.measureText(text).width > W - 20) { s -= 2; c.font = `${s}px ${FONT}`; } c.fillText(text, W / 2, H / 2); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 1024), new THREE.MeshBasicMaterial({ map: lazyTex(cv), transparent: true, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, y + 0.04, z); m.renderOrder = 2; g.add(m);
}
// 重点装置向当前展厅的灯池登记；地面光斑保留柔和的光晕。
const spotMats = {};
const spot = (g, x, z, y, power, angle, h = GALLERY) => {
  vlight(g, { spot: true, color: 0xffe8c9, power: power * 0.55, dist: h + 6, angle, pen: 0.8, decay: 1.65,
    p: [x + 0.6, y + h - 0.45, z + 0.8], t: [x, y + 0.8, z] });
  const r = Math.max(1.4, Math.min(4.2, (h - 0.3) * Math.tan(angle) * 0.9)), op = Math.min(0.62, 0.22 + power / 260), k = op.toFixed(2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), spotMats[k] ||= new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: +k, color: 0xfff0d8 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.025, z); m.renderOrder = 1; g.add(m);
};
const plight = (g, color, power, dist, decay, x, y, z, flicker, flame) => vlight(g, { color, power, dist, decay, p: [x, y, z], flicker, flame });

const INSTALL = {
  titleWall(r, g, o, y) {
    const front = () => hdCanvas(2048, 800, (c, W) => {
      c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, W, 800); c.textBaseline = 'top';
      c.fillStyle = '#e8e2d2'; c.font = `bold 210px ${FONT}`; c.fillText('文革博物馆', 110, 90);
      c.fillStyle = '#a39d90'; c.font = `44px ${SANS}`; c.fillText('中国百年政治暴力及其受难者　1921—2022', 118, 340);
      c.fillStyle = '#c9a961'; c.fillRect(118, 440, 120, 6);
      c.fillStyle = '#d8d1c0'; c.font = `50px ${FONT}`;
      c.fillText('“只有牢牢记住‘文革’的人才能制止历史的重演，', 110, 500); c.fillText('　阻止‘文革’的再来。”', 110, 580);
      c.fillStyle = '#a39d90'; c.font = `36px ${SANS}`; c.fillText('—— 巴金，一九八六年', 118, 680);
    });
    const back = () => hdCanvas(2048, 800, (c, W) => {
      c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, W, 800); c.textBaseline = 'top'; c.fillStyle = '#e8e2d2'; c.font = `bold 84px ${FONT}`; c.fillText('参观路线', 110, 70);
      [['一层', '序厅 → 原瞻仰厅 → 1 革命道路与苏区肃反 → 2 延安 → 3 内战 → 4 土改 → 5 镇反 → 6 韩战 → 7 改造 → 8 反右'],
        ['二层', '9 大跃进 → 10 大饥荒 → 11 饥荒之后 → 12 文革爆发 → 13 红色恐怖 → 14 夺权与武斗 → 15 清队与屠杀 → 16 落幕 → 中庭楼梯'],
        ['三层', '17 转折 → 18 计划生育 → 19 严打 → 20 一九八九 → 21 维稳年代 → 22 边疆与香港 → 23 收紧 → 24 封城 → 纪念厅 → 出口']].forEach(([f, l], i) => {
        const yy = 210 + i * 170; c.fillStyle = '#c9a961'; c.font = `bold 70px ${FONT}`; c.fillText(f, 110, yy);
        c.fillStyle = '#d8d1c0'; c.font = `33px ${SANS}`; c.fillText(l, 300, yy + 22);
      });
      c.fillStyle = '#a39d90'; c.font = `32px ${SANS}`; c.fillText('全程单向参观。出口在三层纪念厅，乘电梯至一层南侧。', 110, 730);
    });
    const stone = surface('limestone'), dark = styleMat({ t: 'granite', c: '#313031' });
    box(g, 15, 6.03, 0.58, dark, o.x, y + 3.265, o.z);
    box(g, 15.2, 0.22, 0.88, stone, o.x, y + 0.11, o.z);
    box(g, 14.8, 0.085, 0.64, bronze, o.x, y + 0.252, o.z);
    for (const sign of [-1, 1]) {
      const face = new THREE.Group(); face.position.set(o.x, y + 3.28, o.z + sign * 0.295);
      face.rotation.y = sign < 0 ? Math.PI : 0; g.add(face);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 4.88), basic(0xffffff, { map: lazyTex(sign < 0 ? front : back) }));
      panel.position.z = 0.015; face.add(panel);
      pictureFrame(face, 12.52, 4.90, 0.051, 0.078, bronze);
      for (const end of [-1, 1]) for (let k = 0; k < 5; k++)
        box(face, 0.095, 5.92, 0.086, stone, end * (6.54 + k * 0.197), -0.014, 0.047);
      box(face, 12.54, 0.035, 0.074, lightPanel, 0, 2.57, 0.052);
    }
    contactShadow(g, o.x, y, o.z, 17.4, 2.1);
  },
  emptyDais(r, g, o, y) {
    const dark = styleMat({ t: 'granite', c: '#393532' });
    box(g, 3.80, 0.10, 8.8, recessedBase, o.x, y + 0.05, o.z);
    box(g, 4.0, 0.20, 9.0, dark, o.x, y + 0.20, o.z);
    box(g, 2.80, 0.46, 7.4, dark, o.x, y + 0.53, o.z);
    box(g, 2.84, 0.04, 7.44, bronze, o.x, y + 0.78, o.z);
    contactShadow(g, o.x, y, o.z, 5.6, 11.3);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 0.01, 2.8)), new THREE.LineBasicMaterial({ color: 0x8a7a50 }));
    outline.position.set(o.x, y + 0.81, o.z); g.add(outline);
    floorText(g, '一九七七年起，水晶棺安放于此。本馆将它留空。', o.x, o.z + 5.6, y, 9);
    // 空的水晶棺
    const profile = new THREE.Shape();
    profile.moveTo(-0.56, 0); profile.lineTo(0.56, 0); profile.lineTo(0.56, 0.47);
    profile.lineTo(0.39, 0.74); profile.lineTo(-0.39, 0.74); profile.lineTo(-0.56, 0.47); profile.closePath();
    const shell = new THREE.ExtrudeGeometry(profile, { depth: 2.6, bevelEnabled: false });
    const glass = new THREE.Mesh(shell, glassMat); glass.position.set(o.x, y + 0.81, o.z - 1.30);
    glass.renderOrder = 3; g.add(glass);
    const seam = new THREE.LineSegments(new THREE.EdgesGeometry(shell), new THREE.LineBasicMaterial({ color: 0x98a6a5 }));
    seam.position.copy(glass.position); g.add(seam);
    spot(g, o.x, o.z, y, 90, 0.35, CEIL);
  },
  // 原瞻仰厅的“账本”：每个方块十万人；黑色为估计下限，灰色补足到上限
  ledger(r, g, o, y) {   // 黑：死亡估计的下限；灰：补足到上限；暗红薄片：被关押、管制、划为右派或负伤的人。每块十万人
    const groups = [['土改　死亡：数十万—200万以上', 5, 15, 0], ['镇反　处决71.2万；另判刑劳改129万、管制120万（官方）', 7, 0, 25],
      ['韩战　直接战斗牺牲18.3万；1953年公布的战斗伤亡减员36.6万', 2, 0, 2], ['反右　划为右派552,877人（官方）', 0, 0, 6],
      ['大饥荒　非正常死亡约1,700万—4,500万', 170, 280, 0], ['文革　死亡约150万—200万；受迫害者以千万计', 15, 5, 0]];
    const C = 18, P = 0.38, S = 0.3, x0 = o.x - (C * P) / 2 + P / 2, dark = [], grey = [], red = [];
    let z = o.z + 0.9;
    for (const [lab, a, b2, c] of groups) {
      floorText(g, lab, o.x, z - 0.55, y, 6.6, Math.PI, '#d8cfbf');
      const n = a + b2 + c, rows = Math.max(1, Math.ceil(n / C));
      for (let i = 0; i < n; i++) (i < a ? dark : i < a + b2 ? grey : red).push([x0 + (i % C) * P, z + Math.floor(i / C) * P]);
      z += rows * P + 1.2;
    }
    const m4 = new THREE.Matrix4(), geo = new THREE.BoxGeometry(S, S, S), flatGeo = new THREE.BoxGeometry(S, 0.04, S);
    for (const [list, col, gg, hh] of [[dark, 0x0a0a0b, geo, S], [grey, 0x4a4a4e, geo, S], [red, 0x7a1f1f, flatGeo, 0.04]]) {
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(gg, lam(col), list.length);
      list.forEach(([x, zz], i) => { m4.makeTranslation(x, y + hh / 2, zz); im.setMatrixAt(i, m4); }); g.add(im);
    }
    r.obst.push([x0 - P, x0 + C * P, o.z + 0.2, z - 0.8]);
    floorText(g, '每块代表十万人。黑色为死亡人数估计的下限，灰色补足到上限；暗红色薄片是被关押、管制、划为右派或负伤的人。', o.x, o.z - 0.2, y, 7.6, Math.PI, '#b9b2a2');
    floorText(g, '文革中受迫害、受牵连的人，常见的说法是一亿上下——按这里的比例，需要一千块，铺满半个大厅。', o.x, z - 0.3, y, 7.6, Math.PI, '#b9b2a2');
  },
  // 造神运动的证物：倒在坑里的像章
  badgePit(r, g, o, y) {
    const W = 3.4, D = 3.0, R = rng(66), list = [], cols = [0xb81c14, 0xd8a83a, 0xc8b070, 0x9a1810];
    box(g, W + 0.3, 0.45, 0.15, lam(0x1a1a1c), o.x, y + 0.22, o.z - D / 2 - 0.08); box(g, W + 0.3, 0.45, 0.15, lam(0x1a1a1c), o.x, y + 0.22, o.z + D / 2 + 0.08);
    box(g, 0.15, 0.45, D, lam(0x1a1a1c), o.x - W / 2 - 0.08, y + 0.22, o.z); box(g, 0.15, 0.45, D, lam(0x1a1a1c), o.x + W / 2 + 0.08, y + 0.22, o.z);
    for (let i = 0; i < 2600; i++) { const u = (R() - 0.5) * W, v = (R() - 0.5) * D, h = 0.05 + (1 - Math.hypot(u / W, v / D) * 1.6) * 0.28 * R();
      list.push([o.x + u, y + Math.max(0.04, h), o.z + v, R() * 6, (R() - 0.5) * 2, cols[Math.floor(R() * cols.length)]]); }
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 10), lam(0xffffff), list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach((p, i) => { e.set(p[4], p[3], 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(p[0], p[1], p[2]), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, new THREE.Color(p[5])); });
    g.add(im);
    r.obst.push([o.x - W / 2 - 0.3, o.x + W / 2 + 0.3, o.z - D / 2 - 0.3, o.z + D / 2 + 0.3]);
    floorText(g, '像章：造神运动的证物（研究者估计生产了二十亿至五十亿枚）', o.x, o.z + D / 2 + 0.7, y, 5.4, 0, '#d8cfbf');
  },
  barbedWire(r, g, o, y) {   // 两道铁丝网，默认沿 z 方向；alongX 时沿 x 方向
    const wood = lam(0x3a3026), wire = lam(0x6a6a6a), X = !!o.alongX;
    const at = (u, v) => X ? [o.x + v, o.z + u] : [o.x + u, o.z + v];   // u：两道网之间的方向，v：沿网的方向
    const bx = (w, h, d, m, u, yy, v) => { const [x, z] = at(u, v); return box(g, X ? d : w, h, X ? w : d, m, x, yy, z); };
    for (const du of [-2.6, 2.6]) {
      for (let i = 0; i < 8; i++) { const p = bx(0.14, 1.9, 0.14, wood, du, y + 0.95, -7 + i * 2); p.rotation[X ? 'z' : 'x'] = (i % 3 - 1) * 0.05; }
      for (let k = 0; k < 5; k++) bx(0.025, 0.025, 14.2, wire, du, y + 0.35 + k * 0.36, 0);
      for (let i = 0; i < 7; i++) { const d = bx(0.02, 0.02, 2.5, wire, du, y + 1.05, -6 + i * 2); d.rotation[X ? 'z' : 'x'] = (i % 2 ? 1 : -1) * 0.62 * (X ? -1 : 1); }
      r.obst.push(X ? [o.x - 7.2, o.x + 7.2, o.z + du - 0.3, o.z + du + 0.3] : [o.x + du - 0.3, o.x + du + 0.3, o.z - 7.2, o.z + 7.2]);
    }
    floorText(g, '“卡空”：两道封锁线之间。一九四八年夏，长春', o.x, o.z, y, 4.6, X ? 0 : Math.PI / 2);
    spot(g, o.x, o.z, y, 60, 0.5);
  },

  furnaces(r, g, o, y) {
    const clay = lam(0xffffff, { map: noiseTex('#7d6046', 30, 128, 71) }), glow = basic(0xff7a1a);
    [[-4, 0], [0, 0.4], [4, 0]].forEach(([dx, dz]) => {
      const x = o.x + dx, z = o.z + dz;
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.3, 3.0, 12), clay); f.position.set(x, y + 1.5, z); g.add(f);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.1, 12), glow); top.position.set(x, y + 3.02, z); g.add(top);
      box(g, 0.6, 0.5, 0.3, glow, x, y + 0.45, z - 1.22);
      r.obst.push([x - 1.4, x + 1.4, z - 1.4, z + 1.4]);
    });
    plight(g, 0xff6a10, 30, 16, 1.5, o.x, y + 4, o.z - 1, 2.1);
    floorText(g, '土高炉（示意）', o.x, o.z - 2.1, y, 3.5, Math.PI);
  },
  bowls(r, g, o, y) {
    box(g, 14.4, 0.5, 14.4, lam(0x0a0a0b), o.x, y + 0.25, o.z);
    const N = 19, bowl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0xe9e6df, { side: THREE.DoubleSide }), N * N), m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { m.makeTranslation(o.x + (i - 9) * 0.72, y + 0.76, o.z + (j - 9) * 0.72); bowl.setMatrixAt(i * N + j, m); }
    g.add(bowl); spot(g, o.x, o.z, y, 140, 0.6);
    floorText(g, '三百六十一只空碗　每一只代表约十万人', o.x, o.z + 8.4, y, 10, Math.PI);
  },
  clocks(r, g, o, y) {
    box(g, 1.6, 3.2, 1.6, lam(0x151517), o.x, y + 1.6, o.z); r.obst.push([o.x - 1.1, o.x + 1.1, o.z - 1.1, o.z + 1.1]);
    [['一九七六年一月八日', '周恩来逝世'], ['一九七六年四月五日', '天安门广场'], ['一九七六年九月九日', '毛泽东逝世'], ['一九七六年十月六日', '十年终结']].forEach(([a, b], i) => {
      const t = lazyTex(() => hdCanvas(512, 1024, (c, w, hh) => { c.fillStyle = '#151517'; c.fillRect(0, 0, w, hh); c.fillStyle = '#d8c79a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `44px ${FONT}`; c.fillText(a, w / 2, 400); c.font = `bold 64px ${FONT}`; c.fillText(b, w / 2, 520); }));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3), basic(0xffffff, { map: t })), a2 = i * Math.PI / 2;
      m.position.set(o.x + Math.sin(a2) * 0.81, y + 1.6, o.z + Math.cos(a2) * 0.81); m.rotation.y = a2; g.add(m);
    });
    spot(g, o.x, o.z, y, 60, 0.4);
  },
  // 坦克人：1989 年 6 月 5 日长安街上的一列坦克与挡在前面的一个人（按原尺寸示意，炮口指向参观者来的方向）
  tankman(r, g, o, y) {
    const olive = lam(0x4c5636), dark = lam(0x2c3122), rubber = lam(0x1d1e1a), steel = lam(0x3d4430);
    const tank = (cx, cz) => {
      for (const sx of [-1, 1]) {
        box(g, 0.62, 0.82, 6.0, rubber, cx + sx * 1.28, y + 0.41, cz);
        for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), dark); w.rotation.z = Math.PI / 2; w.position.set(cx + sx * 1.6, y + 0.42, cz - 2.2 + i * 1.1); g.add(w); }
        box(g, 0.66, 0.05, 6.1, steel, cx + sx * 1.28, y + 0.86, cz);
      }
      box(g, 1.96, 0.62, 5.7, olive, cx, y + 0.9, cz + 0.05);
      const glacis = box(g, 1.96, 0.08, 0.95, olive, cx, y + 1.0, cz - 2.62); glacis.rotation.x = -0.45;
      const tz = cz - 0.75, tur = new THREE.Mesh(new THREE.SphereGeometry(1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), olive);
      tur.scale.set(1, 0.58, 1.08); tur.position.set(cx, y + 1.2, tz); g.add(tur);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.2, 14), steel); cup.position.set(cx + 0.38, y + 1.85, tz + 0.25); g.add(cup);
      box(g, 0.5, 0.42, 0.34, steel, cx, y + 1.5, tz - 1.0);
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 4.4, 12), steel); gun.rotation.x = Math.PI / 2; gun.position.set(cx, y + 1.52, tz - 1.1 - 2.2); g.add(gun);
      const mz = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12), dark); mz.rotation.x = Math.PI / 2; mz.position.set(cx, y + 1.52, tz - 5.4); g.add(mz);
      box(g, 0.9, 0.4, 0.9, dark, cx, y + 1.38, cz + 2.4);   // 车尾油箱
      r.obst.push([cx - 1.75, o.wx ?? cx + 1.75, cz - 3.3, cz + 3.2]);
    };
    tank(o.x, o.z); tank(o.x, o.z + 7.8);
    // 人：白衬衫、深色长裤，两手各提一只袋子，面向坦克
    const mx = o.x, mz = o.z - 6.8, shirt = lam(0xe8e6de), pants = lam(0x24252a), skin = lam(0xc49a76), hair = lam(0x141312), bag = lam(0xd9d6cc);
    box(g, 0.15, 0.86, 0.17, pants, mx - 0.1, y + 0.43, mz); box(g, 0.15, 0.86, 0.17, pants, mx + 0.1, y + 0.43, mz);
    box(g, 0.42, 0.62, 0.24, shirt, mx, y + 1.17, mz);
    for (const sx of [-1, 1]) {
      const arm = box(g, 0.1, 0.62, 0.11, shirt, mx + sx * 0.27, y + 1.13, mz); arm.rotation.z = sx * 0.12;
      box(g, 0.08, 0.1, 0.09, skin, mx + sx * 0.31, y + 0.78, mz);
      box(g, 0.26, 0.3, 0.08, bag, mx + sx * 0.33, y + 0.58, mz);
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), skin); head.scale.set(1, 1.15, 1); head.position.set(mx, y + 1.62, mz); g.add(head);
    const hr = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair); hr.position.set(mx, y + 1.64, mz + 0.01); g.add(hr);
    r.obst.push([mx - 0.45, mx + 0.45, mz - 0.4, mz + 0.4]);
    // 长安街：两道白色车道线
    for (const dx of [-1.9, 1.9]) { const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 16), basic(0xd8d4c6)); ln.rotation.x = -Math.PI / 2; ln.position.set(o.x + dx, y + 0.02, o.z + 1.5); g.add(ln); }
    floorText(g, '1989年6月5日，长安街，北京饭店前', o.x - 0.6, mz - 1.35, y, 3.6, Math.PI);
    floorText(g, '他是谁、后来怎样，至今无人能够确证', o.x - 0.6, mz - 1.8, y, 3.6, Math.PI, '#9a9384');
    const it = r.sec.items.find(i => i.t === '坦克人');
    if (it) {
      const hit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.set(o.x, y + 1.2, o.z + 1.0); hit.userData = { sec: r.sec, item: it }; g.add(hit); interactive[r.key].push(hit);
    }
    spot(g, mx, mz, y, 70, 0.4); spot(g, o.x, o.z, y, 90, 0.6); spot(g, o.x, o.z + 7.8, y, 60, 0.6);
  },
  // ───── 人物：用方块搭成的示意人形。pose：stand 站立 / kneel 跪 / jet “坐飞机”（弯腰、双臂反剪）/ sit 坐
  // 坐标以脚下为原点，面朝 −z；ry 为整体转向
  _person(g, x, y, z, ry, o = {}) {
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; g.add(grp);
    const top = lam(o.top ?? 0x3a3a40), bot = lam(o.bot ?? 0x24252a), skin = lam(0xc49a76), hair = lam(0x141312);
    const b = (w, h, d, m, px, py, pz, rx = 0, rz = 0) => { const k = box(grp, w, h, d, m, px, py, pz); k.rotation.set(rx, 0, rz); return k; };
    const pose = o.pose || 'stand';
    if (pose === 'kneel') { b(0.15, 0.45, 0.17, bot, -0.1, 0.12, 0.12, Math.PI / 2); b(0.15, 0.45, 0.17, bot, 0.1, 0.12, 0.12, Math.PI / 2); b(0.32, 0.42, 0.2, bot, 0, 0.4, -0.02); }
    else if (pose === 'sit') { b(0.15, 0.45, 0.17, bot, -0.1, 0.22, -0.2); b(0.15, 0.45, 0.17, bot, 0.1, 0.22, -0.2); b(0.34, 0.12, 0.42, bot, 0, 0.47, 0.02); }
    else { b(0.15, 0.86, 0.17, bot, -0.1, 0.43, 0); b(0.15, 0.86, 0.17, bot, 0.1, 0.43, 0); }
    const hip = pose === 'kneel' ? 0.6 : pose === 'sit' ? 0.52 : 0.86, jet = pose === 'jet';
    const torso = b(0.42, 0.62, 0.24, top, 0, hip + (jet ? 0.12 : 0.31), jet ? -0.28 : 0, jet ? -1.35 : 0);
    const hx = 0, hy = jet ? hip + 0.1 : hip + 0.76, hz = jet ? -0.68 : 0;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 9), skin); head.scale.set(1, 1.15, 1); head.position.set(hx, hy, hz); grp.add(head);
    const hr = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair); hr.position.set(hx, hy + 0.02, hz + 0.01); hr.rotation.x = jet ? -1.2 : 0; grp.add(hr);
    for (const sx of [-1, 1]) {
      if (jet) b(0.1, 0.62, 0.11, top, sx * 0.2, hip + 0.5, 0.05, 2.3);   // 双臂被反扭、向后上方举起
      else if (o.point && sx > 0) b(0.1, 0.62, 0.11, top, 0.27, hip + 0.62, -0.25, -1.3);
      else b(0.1, 0.62, 0.11, top, sx * 0.27, hip + 0.32, 0, 0, sx * 0.08);
    }
    if (o.cap) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.07, 14), lam(o.cap)); c.position.set(hx, hy + 0.1, hz); grp.add(c); }
    if (o.armband) b(0.11, 0.08, 0.12, lam(0xc01818), 0.27, hip + 0.48, 0);
    if (o.dunce) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.9, 12), lam(0xece6d6)); c.position.set(hx, hy + 0.5, hz); if (jet) { c.rotation.x = -1.45; c.position.set(hx, hy + 0.02, hz - 0.5); } grp.add(c); }
    if (o.placard) { const cv = hdCanvas(256, 192, (c, W, H) => { c.fillStyle = '#e8e2d0'; c.fillRect(0, 0, W, H); c.fillStyle = '#141414'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 46px ${FONT}`; c.fillText(o.placard, W / 2, 70); c.font = `bold 52px ${FONT}`; c.fillText('× × ×', W / 2, 140);
        c.strokeStyle = '#b01010'; c.lineWidth = 10; c.beginPath(); c.moveTo(40, 40); c.lineTo(216, 170); c.moveTo(216, 40); c.lineTo(40, 170); c.stroke(); });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), basic(0xffffff, { map: tex(cv), side: THREE.DoubleSide }));
      if (jet) { pl.position.set(0, hip - 0.28, -0.42); pl.rotation.y = Math.PI; } else { pl.position.set(0, hip + 0.38, -0.14); pl.rotation.y = Math.PI; } grp.add(pl); }
    if (o.stake) { b(0.03, 0.9, 0.03, lam(0x6a5236), 0, hip + 0.85, 0.16); const cv = hdCanvas(96, 320, (c, W, H) => { c.fillStyle = '#efe9d8'; c.fillRect(0, 0, W, H); c.fillStyle = '#111'; c.font = `bold 40px ${FONT}`; c.textAlign = 'center'; '反革命犯'.split('').forEach((ch, i) => c.fillText(ch, W / 2, 50 + i * 54));
        c.strokeStyle = '#c01414'; c.lineWidth = 8; c.beginPath(); c.moveTo(10, 30); c.lineTo(86, 290); c.stroke(); });
      const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.4), basic(0xffffff, { map: tex(cv), side: THREE.DoubleSide })); tg.position.set(0, hip + 1.1, 0.18); grp.add(tg); }
    return grp;
  },
  // 第 4 厅：斗争地主的大会。地主跪在地上，积极分子指着他控诉，村民坐在凳子上
  struggle(r, g, o, y) {   // 背靠南墙，面向 −z 的参观路线
    const P = (dx, dz, ry, opt) => INSTALL._person(g, o.x + dx, y, o.z + dz, ry, opt), wood = lam(0x5a4632);
    box(g, 1.6, 0.06, 0.7, wood, o.x, y + 0.78, o.z + 1.1);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.28, 0.28]) box(g, 0.06, 0.78, 0.06, wood, o.x + sx, y + 0.39, o.z + 1.1 + sz);
    box(g, 0.5, 0.08, 0.36, lam(0xd9ccb0), o.x + 0.3, y + 0.85, o.z + 1.1).rotation.y = 0.2;   // 桌上一摞地契
    P(0, 0.2, 0, { pose: 'kneel', top: 0x2a2a30, bot: 0x2a2a30, placard: '恶霸地主', dunce: true });
    P(-1.0, 0.1, -Math.PI / 2, { point: true, top: 0x4a4a52, bot: 0x2a2a2e, cap: 0x3a3a3e });
    P(1.1, 0.5, Math.PI / 2, { top: 0x6a6a5a, bot: 0x2a2a2e, armband: true });
    [[-2.3, -0.4, 2.2], [-1.7, -1.4, 2.6], [1.8, -1.3, -2.6], [2.4, -0.3, -2.2]].forEach(([dx, dz, a], i) => P(dx, dz, a, { pose: 'sit', top: [0x3a4458, 0x5a5048, 0x4a4a52, 0x5a4a3a][i], bot: 0x2a2a2e }));   // 村民坐在两侧，围着跪地的人
    r.obst.push([o.x - 2.7, o.x + 2.7, o.z - 2.0, o.z + 1.6]);
    floorText(g, '斗争会：地主跪地，积极分子诉苦控诉，村民坐在下面。许多斗争会以吊打、枪毙收场', o.x, o.z - 2.9, y, 5, Math.PI);
    spot(g, o.x, o.z, y, 70, 0.5);
  },
  // 第 5 厅：公审台。台上铺红布的长桌和两只高音喇叭，台下跪着背插斩标的人
  trial(r, g, o, y) {
    const H = 0.8, W = 2.4, L = 5;   // 台沿 x 方向宽 W，沿 z 长 L；面向 +x
    box(g, W, H, L, lam(0x4a3a2a), o.x, y + H / 2, o.z); box(g, W + 0.04, 0.04, L + 0.04, lam(0x6a5236), o.x, y + H + 0.02, o.z);
    const cv = hdCanvas(1024, 160, (c, Wd, Hd) => { c.fillStyle = '#9a1414'; c.fillRect(0, 0, Wd, Hd); c.fillStyle = '#f0d890'; c.font = `bold 96px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('公 审 大 会', Wd / 2, Hd / 2); });
    const sk = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.9, H * 0.7), basic(0xffffff, { map: tex(cv) })); sk.position.set(o.x + W / 2 + 0.01, y + H / 2, o.z); sk.rotation.y = Math.PI / 2; g.add(sk);
    box(g, 0.7, 0.75, 2.6, lam(0xa01818), o.x - 0.3, y + H + 0.375, o.z);   // 铺红布的长桌
    for (const dz of [-L / 2 + 0.3, L / 2 - 0.3]) { box(g, 0.06, 2.6, 0.06, metal, o.x - 0.8, y + H + 1.3, o.z + dz);
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.05, 0.45, 14, 1, true), lam(0x8a8a86, { side: THREE.DoubleSide })); horn.rotation.z = -Math.PI / 2 + 0.2; horn.position.set(o.x - 0.6, y + H + 2.5, o.z + dz); g.add(horn); }
    for (let i = 0; i < 3; i++) INSTALL._person(g, o.x + W / 2 + 0.7, y, o.z - 1.4 + i * 1.4, -Math.PI / 2, { pose: 'kneel', top: 0x2e2e34, bot: 0x26262a, stake: true });
    r.obst.push([o.x - W / 2 - 0.2, o.x + W / 2 + 1.2, o.z - L / 2 - 0.2, o.z + L / 2 + 0.2]);
    floorText(g, '公审大会：宣读罪状，当场宣判，押赴刑场。背上的斩标写着罪名，名字上打着红叉', o.x + W / 2 + 1.9, o.z, y, 4.6, -Math.PI / 2);
    spot(g, o.x + 0.6, o.z, y, 80, 0.55);
  },
  // 第 6 厅：长津湖的雪与工事
  trench(r, g, o, y) {
    const R = rng(52), sand = lam(0x8a7a5a), snow = lam(0xeef2f4), bags = [];
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, rx = 2.6, rz = 2.0; for (let k = 0; k < 2; k++) bags.push([o.x + Math.cos(a) * rx, y + 0.13 + k * 0.24, o.z + Math.sin(a) * rz, -a]); }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.24, 0.32), sand, bags.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    bags.forEach(([x, yy, z, a], i) => { e.set(0, a, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, yy, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); }); g.add(im);
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), snow); m.scale.set(0.5 + R() * 0.9, 0.08 + R() * 0.12, 0.4 + R() * 0.7); m.position.set(o.x + (R() - 0.5) * 4.6, y, o.z + (R() - 0.5) * 3.6); g.add(m); }
    { const sh = buildObject('pvacap'); sh.position.set(o.x + 0.4, y + 0.02, o.z + 0.3); sh.rotation.y = 0.6; g.add(sh); }
    { const gun = box(g, 0.04, 1.1, 0.05, lam(0x1e1e1e), o.x - 0.9, y + 0.52, o.z - 0.4); gun.rotation.z = 0.35; }
    r.obst.push([o.x - 3, o.x + 3, o.z - 2.4, o.z + 2.4]);
    floorText(g, '长津湖，1950年冬：零下三十多度，许多人只穿着单衣和胶鞋', o.x, o.z + 2.9, y, 4.6, 0);
    spot(g, o.x, o.z, y, 60, 0.6);
  },
  // 第 13 厅：批斗会。台上一人戴高帽、挂牌子，被两名红卫兵扭住双臂“坐飞机”
  pidou(r, g, o, y) {
    const H = 0.7, W = 4.4, D = 2.4;   // 台面向 +z
    box(g, W, H, D, lam(0x3a2c22), o.x, y + H / 2, o.z); box(g, W + 0.04, 0.04, D + 0.04, lam(0x6a5236), o.x, y + H + 0.02, o.z);
    const cv = hdCanvas(1024, 150, (c, Wd, Hd) => { c.fillStyle = '#b01414'; c.fillRect(0, 0, Wd, Hd); c.fillStyle = '#f4e8c8'; c.font = `bold 84px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('批斗大会', Wd / 2, Hd / 2); });
    const sk = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.8, H * 0.75), basic(0xffffff, { map: tex(cv) })); sk.position.set(o.x, y + H / 2, o.z + D / 2 + 0.01); g.add(sk);
    INSTALL._person(g, o.x - 0.2, y + H, o.z + 0.2, Math.PI / 2, { pose: 'jet', top: 0x2a2a30, bot: 0x26262a, dunce: true, placard: '牛鬼蛇神' });
    for (const sz of [-1, 1]) INSTALL._person(g, o.x + 0.45, y + H, o.z + 0.2 + sz * 0.42, Math.PI / 2 + sz * 0.5, { top: 0x5a6040, bot: 0x4a5034, cap: 0x5a6040, armband: true });
    const belt = buildObject('belt'); belt.position.set(o.x + 1.4, y + 0.01, o.z + D / 2 + 0.7); belt.rotation.y = 0.4; g.add(belt);
    r.obst.push([o.x - W / 2 - 0.2, o.x + W / 2 + 0.2, o.z - D / 2 - 0.2, o.z + D / 2 + 0.9]);
    floorText(g, '批斗会：低头认罪、挂牌、戴高帽、“坐飞机”。很多人在这样的会上被打死', o.x, o.z + D / 2 + 1.5, y, 4.6, 0);
    spot(g, o.x, o.z, y, 80, 0.5);
  },
  candles(r, g, o, y) {
    box(g, 4, 0.3, 9.4, lam(0x0a0a0b), o.x, y + 0.15, o.z); r.obst.push([o.x - 2.2, o.x + 2.2, o.z - 4.9, o.z + 4.9]);
    const n = 202, wax = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), lam(0xe9e4d6), n), fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 5), basic(0xffd27a), n), m = new THREE.Matrix4(), R = rng(89);
    for (let i = 0; i < n; i++) { const x = o.x - 1.6 + (i % 9) * 0.4 + (R() - 0.5) * 0.1, z = o.z - 4.3 + Math.floor(i / 9) * 0.38 + (R() - 0.5) * 0.1, hh = 0.14 + R() * 0.1; m.makeScale(1, hh / 0.22, 1).setPosition(x, y + 0.3 + hh / 2, z); wax.setMatrixAt(i, m); m.makeScale(1, 1.8, 1).setPosition(x, y + 0.36 + hh, z); fl.setMatrixAt(i, m); }
    g.add(wax, fl);
    plight(g, 0xffb55a, 36, 18, 1.3, o.x, y + 1.6, o.z, 9);
    floorText(g, '二百零二支烛光　“天安门母亲”已确认的遇难者人数', o.x, o.z + 5.5, y, 4.4);
  },
  hoarding(r, g, o, y) {
    const sheet = lam(0xffffff, { map: noiseTex('#2f6a4a', 18, 64, 77, [1, 1], { n: 8, color: 'rgba(0,0,0,.25)', w: 2 }) });
    for (let i = 0; i < 6; i++) { box(g, 0.06, 2.1, 2, sheet, o.x, y + 1.05, o.z - 5 + i * 2); box(g, 0.1, 2.3, 0.08, metal, o.x, y + 1.15, o.z - 6 + i * 2); }
    r.obst.push([o.x - 0.4, o.x + 0.4, o.z - 6.1, o.z + 6.1]);
    const seal = tex(hdCanvas(256, 512, (c, w) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, 512); c.fillStyle = '#b01818'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 150px ${FONT}`; c.fillText('封', w / 2, 150); c.font = `34px ${FONT}`; c.fillText('疫情防控指挥部', w / 2, 320); c.fillText('2022年　月　日', w / 2, 380); }));
    for (const sg of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1), basic(0xffffff, { map: seal })); m.position.set(o.x + sg * 0.04, y + 1.2, o.z + sg * 2); m.rotation.set(0, sg > 0 ? Math.PI / 2 : -Math.PI / 2, 0.12); g.add(m); }
    floorText(g, '铁皮围挡与封条（示意）', o.x + 1.6, o.z, y, 5, Math.PI / 2);
    spot(g, o.x, o.z, y, 50, 0.5);
  },
  // 《国殇之柱》：低矮基座 + 按需加载的三维模型（展厅附近时才下载）
  sculpture(r, g, o, y) {
    const it = r.sec.items.find(i => i.k === 'sculpt'); if (!it) return;
    const key = r.key, P = 2.6;
    box(g, P, 0.18, P, lam(0x161618), o.x, y + 0.09, o.z); r.obst.push([o.x - P / 2 - 0.4, o.x + P / 2 + 0.4, o.z - P / 2 - 0.4, o.z + P / 2 + 0.4]);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(P + 4, P + 4), poolMat); pl.rotation.x = -Math.PI / 2; pl.position.set(o.x, y + 0.03, o.z); pl.renderOrder = 1; g.add(pl);
    spot(g, o.x + 0.5, o.z + 0.4, y, 115, 0.42);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(P, it.h, P), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.set(o.x, y + 0.18 + it.h / 2, o.z); hit.userData = { sec: r.sec, item: it }; g.add(hit);
    interactive[key].push(hit); lazy[key].push(it);
    it.mesh = hit; it.style = { kind: 'sculpt' }; it.pos = [o.x, y + 0.18, o.z]; it.group = g; it.rot = o.rot || 0;
    const lt = lazyTex(() => drawLabel(it, LOW_MEM ? 1.2 : K_HI));
    for (const [dx, dz, ry] of [[0, P / 2 + 0.6, 0], [0, -P / 2 - 0.6, Math.PI]]) {
      const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.35), basic(0xffffff, { map: lt })); lm.position.set(o.x + dx, y + 0.75, o.z + dz); lm.rotation.order = 'YXZ'; lm.rotation.set(-0.5, ry, 0);
      box(g, 0.04, 0.7, 0.04, metal, o.x + dx, y + 0.35, o.z + dz); lm.userData = { sec: r.sec, item: it }; g.add(lm); interactive[key].push(lm);
    }
  },
  memorialPlinth(r, g, o, y) {
    box(g, 6.4, 0.25, 3.6, lam(0x1c1c1f), o.x, y + 0.125, o.z);
    box(g, 5, 0.9, 2.2, new THREE.MeshPhongMaterial({ color: 0x050506, shininess: 90, specular: 0x666666 }), o.x, y + 0.7, o.z);
    const flameProfile = [[0, 0], [0.048, 0.016], [0.084, 0.09], [0.070, 0.18], [0.038, 0.29], [0, 0.44]];
    const flameGeo = new THREE.LatheGeometry(flameProfile.map(([radius, h]) => new THREE.Vector2(radius, h)), 18);
    const v = flameGeo.attributes.position;
    for (let i = 0; i < v.count; i++) v.setX(i, v.getX(i) + 0.09 * (v.getY(i) / 0.44) ** 2);
    const flame = new THREE.Mesh(flameGeo, basic(0xffcf85)); flame.position.set(o.x, y + 1.25, o.z); g.add(flame);
    box(g, 0.5, 0.1, 0.5, lam(0x3a3320), o.x, y + 1.2, o.z);
    plight(g, 0xffbd73, 13, 12, 1.7, o.x, y + 1.65, o.z, 5, flame);
    const cy = y + CEIL;
    box(g, 7, 0.1, 7, basic(0xe9eef2), o.x, cy + 1.1, o.z);
    for (const [dx, dz, w, d] of [[-3.5, 0, 0.1, 7], [3.5, 0, 0.1, 7], [0, -3.5, 7, 0.1], [0, 3.5, 7, 0.1]]) box(g, w + 0.1, 1.2, d + 0.1, lam(0x111113), o.x + dx, cy + 0.5, o.z + dz);
    for (const off of [-1.75, 0, 1.75]) {
      box(g, 0.07, 0.14, 7, metal, o.x + off, cy + 0.95, o.z);
      box(g, 7, 0.14, 0.07, metal, o.x, cy + 0.95, o.z + off);
    }
    // 天窗在地面留下有窗棂分隔的柔光，明暗过渡落在材质表面。
    const daylight = tex(textCanvas(256, 256, (c, W, H) => {
      c.filter = 'blur(6px)'; c.fillStyle = '#eaf1ff';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) c.fillRect(18 + i * 56, 18 + j * 56, 48, 48);
    }));
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 8.3), basic(0xffffff, { map: daylight, transparent: true, opacity: 0.12, depthWrite: false }));
    patch.position.set(o.x + 0.9, y + 0.019, o.z + 0.8); patch.rotation.x = -Math.PI / 2; g.add(patch);
    floorText(g, '献给没有坟墓、没有留下名字的人', o.x, o.z + 3.4, y, 8);
  },
  inscription(r, g, o, y) {
    const lines = o.text.split('|'), th = r.theme, w = o.w, h = w * 0.11 * lines.length + 0.4;
    const cv = () => hdCanvas(2048, Math.round(2048 * h / w), (c, W, H) => {
      c.fillStyle = th.light ? '#2a2622' : '#d8d1c0'; c.textBaseline = 'top';
      const fs = Math.floor(H / lines.length * 0.62); c.font = `${fs}px ${FONT}`;
      lines.forEach((l, i) => c.fillText(l, 0, i * H / lines.length + 6));
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: lazyTex(cv), transparent: true, depthWrite: false }));
    const cy = Math.min(6.3, Math.min(r.ceilH, CEIL) - 0.75 - h / 2);   // 顶边留在顶棚梁之下
    if (o.wall === 'w') { m.position.set(o.x + WALL_T / 2 + 0.02, y + cy, o.z); m.rotation.y = Math.PI / 2; }
    m.renderOrder = 2; g.add(m);
  },
  portraitWall(r, g, o, y) {
    // 纪念厅北墙：本馆介绍过的每一个人
    const people = SECTIONS.flatMap(s => s.items.filter(i => i.k === 'bio').map(i => ({ s, i })));
    const cols = 16, rows = Math.ceil(people.length / cols), TW = 256, TH = 300;
    const W = Math.min(27, (r.ceilH - 1.65) * cols * TW / (rows * TH)), H = W / cols * TH / TW * rows;
    const cv = document.createElement('canvas'); cv.width = cols * TW; cv.height = rows * TH;
    const c = cv.getContext('2d'), t = tex(cv);
    const draw = (k, img) => {
      const { i } = people[k], x = (k % cols) * TW, yy = Math.floor(k / cols) * TH;
      c.fillStyle = '#0d0d0e'; c.fillRect(x, yy, TW, TH);
      if (img) {
        const pw = 196, ph = 220, rr = Math.max(pw / img.width, ph / img.height), sw = pw / rr, sh = ph / rr;
        c.save(); c.filter = 'grayscale(1) brightness(.95)'; c.drawImage(img, (img.width - sw) / 2, Math.max(0, (img.height - sh) * 0.3), sw, sh, x + 30, yy + 14, pw, ph); c.restore();
      } else { c.fillStyle = '#1a1a1c'; c.fillRect(x + 30, yy + 14, 196, 220); c.fillStyle = '#4a4740'; c.font = `bold 110px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText([...i.name][0], x + TW / 2, yy + 124); }
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = '#d9c489'; let fs = 30; c.font = `bold ${fs}px ${FONT}`;
      while (c.measureText(i.name).width > TW - 16 && fs > 14) { fs -= 2; c.font = `bold ${fs}px ${FONT}`; }
      c.fillText(i.name, x + TW / 2, yy + 240); c.fillStyle = '#8b8168'; c.font = `18px ${SANS}`; c.fillText(i.life, x + TW / 2, yy + 274);
      t.needsUpdate = true;
    };
    people.forEach((p, k) => { draw(k, null); if (p.i.portrait) loadImage(p.i.portrait.src).then(im => im && draw(k, im)); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), basic(0xffffff, { map: t }));
    m.position.set(o.x, y + 1.2 + H / 2, o.z + WALL_T / 2 + 0.04); g.add(m);
    const surround = new THREE.Group(); surround.position.copy(m.position); surround.position.z -= 0.022; g.add(surround);
    pictureFrame(surround, W + 0.025, H + 0.025, 0.09, 0.09, bronze);
    // 每列嵌在独立挂轨上。轨道落在照片留白处，点击坐标仍对应原肖像。
    for (let col = 1; col < cols; col++) box(surround, 0.017, H, 0.042, metal, -W / 2 + col * W / cols, 0, 0.035);
    box(surround, W + 0.18, 0.09, 0.19, bronze, 0, -H / 2 - 0.1, 0.042);
    m.userData = { portraitWall: { people, cols, rows } }; (interactive[r.key] ||= []).push(m);
    const cap = hdCanvas(1024, 80, (cc, Wd) => { cc.fillStyle = '#a39d90'; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.font = `30px ${FONT}`; cc.fillText(`本馆介绍过的 ${people.length} 个人。他们之外，还有千百万没有留下名字和面孔的人。`, Wd / 2, 40); });
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.1), new THREE.MeshBasicMaterial({ map: tex(cap), transparent: true, depthWrite: false }));
    cm.position.set(o.x, y + 0.75, o.z + WALL_T / 2 + 0.04); cm.renderOrder = 2; g.add(cm);
    r.obst.push([o.x - W / 2, o.x + W / 2, o.z, o.z + 1.2]);
  },
  elevator(r, g, o, y) {
    const z = o.z - 0.2;
    elevatorDoors(g, o.x, y, z, -1);
    const cv = hdCanvas(512, 160, (c, W) => { c.fillStyle = '#111'; c.fillRect(0, 0, W, 160); c.fillStyle = '#e8e2d2'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 56px ${FONT}`; c.fillText('出口　↓ 一层', W / 2, 62); c.fillStyle = '#a39d90'; c.font = `24px ${SANS}`; c.fillText('走近电梯门即下行至南侧出口', W / 2, 124); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), basic(0xffffff, { map: tex(cv) })); m.position.set(o.x, y + 3.75, z - 0.12); m.rotation.y = Math.PI; g.add(m);
    floorText(g, '出口', o.x, o.z - 2.4, y, 3, Math.PI, '#c9a961');
  }
};

function elevatorDoors(g, x, y, z, normal) {
  const lobby = new THREE.Group(); lobby.position.set(x, y, z);
  if (normal < 0) lobby.rotation.y = Math.PI;
  g.add(lobby);
  const steel = mats.lift ||= finish(0x94948c, 0.34, 0.64);
  box(lobby, 3.0, 3.18, 0.11, metal, 0, 1.59, 0.055);
  for (const side of [-1, 1]) {
    box(lobby, 1.19, 2.60, 0.08, steel, side * 0.606, 1.30, 0.15);
    box(lobby, 0.085, 2.76, 0.18, bronze, side * 1.26, 1.38, 0.15);
  }
  box(lobby, 2.61, 0.08, 0.18, bronze, 0, 2.75, 0.15);
  box(lobby, 2.39, 0.027, 0.24, steel, 0, 0.024, 0.208);
}
function buildInstallations() {
  for (const r of ROOMS) for (const o of r.install) {
    setLazyTex(TIGHT, r.key); setReleaseStatic(TIGHT && o.type !== 'portraitWall');   // 肖像墙的画布会随照片到达重画，不能释放
    INSTALL[o.type](r, groupOf(r), o, floorY(r.floor));
  }
  setLazyTex(false); setReleaseStatic(false);
  // 出口门厅
  const ex = ROOMS.find(q => q.id === 'EXIT'), g = groupOf(ex), y = floorY(0);
  const cv = hdCanvas(1024, 600, (c) => {
    c.fillStyle = '#1d1a17'; c.textBaseline = 'top'; c.font = `bold 76px ${FONT}`; c.fillText('感谢参观', 40, 40);
    c.fillStyle = '#5b564c'; c.font = `30px ${FONT}`;
    ['本馆是一个构想。展陈文字依据公开的研究、回忆录、', '官方文件与媒体报道撰写；历史照片来自 Wikimedia Commons', '的公有领域与自由授权影像，来源见 CREDITS.md。', '', '出口外是天安门广场南侧。'].forEach((l, i) => c.fillText(l, 40, 180 + i * 52));
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.05), new THREE.MeshBasicMaterial({ map: tex(cv), transparent: true }));
  m.position.set(ex.x1 - WALL_T / 2 - 0.03, y + 2.1, 43); m.rotation.y = -Math.PI / 2; g.add(m);
  elevatorDoors(g, -43, y, ex.z0 + WALL_T / 2, 1);
}

// ───────────────────────── 行走与碰撞 ─────────────────────────
function outsideH(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  if (ax <= 58 && az <= 58) return B;
  if (ax <= 14 && az > 58 && az <= 76) return B * (76 - az) / 18;
  if (ax <= 65 && az <= 65) return 1;
  return 0;
}
function onRamp(x, z, f) {
  for (const s of STAIRS) if (f === s.k || f === s.k + 1) { const t = rampT(s, x, z); if (t >= 0) return { s, t }; }
  return null;
}
function heightAt(x, z, f) {
  if (!(Math.abs(x) < HALF && Math.abs(z) < HALF)) return f === 0 ? outsideH(x, z) : 1e6;
  const rp = onRamp(x, z, f);
  return rp ? floorY(rp.s.k) + rp.t * FLOOR_H : floorY(f);
}
function walkable(x, z, f) {
  const m = 0.45;
  if (!(Math.abs(x) < HALF && Math.abs(z) < HALF)) {
    if (f !== 0 || Math.abs(x) > 560 || z > 300 || z < -640) return false;
    if (Math.abs(x) < HALF + 2.8 && Math.abs(z) < HALF + 2.8) {   // 外墙连同墙垛
      if (!DOORS.some(d => (d.a === 'OUT' || d.b === 'OUT') && Math.abs(z - d.c) < 3 && Math.abs(x - d.u) < d.w / 2 - 0.4)) return false;
    }
    for (const c of outsideColliders) if (x > c.x0 - m && x < c.x1 + m && z > c.z0 - m && z < c.z1 + m) return false;
    return true;
  }
  if (onRamp(x, z, f)) return true;
  for (const r of roomsOn[f]) {
    if (!inR(r.rect, x, z, WALL_T / 2 + m)) continue;
    if (r.walk && !r.walk.some(w => inR(w, x, z))) return false;
    if (r.void && inR(r.void, x, z, -0.35)) {
      const s = STAIRS.find(q => q.k === f - 1), [along, across] = s.axis === 'z' ? [z, x] : [x, z];
      if (!(across > s.lo && across < s.hi && Math.abs(along - s.to) < 0.6)) return false;
    }
    for (const o of r.obst) { const p = o[4] || 0; if (x > o[0] + p - m && x < o[1] - p + m && z > o[2] + p - m && z < o[3] - p + m) return false; }
    return true;
  }
  for (const d of DOORS) {
    if (d.floor !== f) continue;
    if (d.axis === 'z' ? Math.abs(x - d.u) < d.w / 2 - m && Math.abs(z - d.c) < 1.0 : Math.abs(z - d.u) < d.w / 2 - m && Math.abs(x - d.c) < 1.0) return true;
  }
  return false;
}
function roomAt(x, z, f) {
  if (Math.abs(x) >= HALF || Math.abs(z) >= HALF) return null;
  return roomsOn[f].find(r => inR(r.rect, x, z)) || null;
}

// ───────────────────────── 贴图按需加载 ─────────────────────────
const loader = new THREE.TextureLoader();
// 有容量上限的缓存（最近最少使用的先丢）：长时间参观时，解码后的图片、图片包和 Blob 地址不再无限增长
const lruTouch = (m, k, v) => { m.delete(k); m.set(k, v); return v; };
const IMG_MAX = TIGHT ? 40 : 160, IMG_BYTES = TIGHT ? 48e6 : 400e6, imgCache = new Map(), imgSize = new Map();   // 主线程解码图片的缓存：条数和字节数都设上限
// 低内存设备上，大图解码后缩到单边不超过 IMG_SIDE 像素再用（一张 4096 像素的照片解码后要占几十兆）
const IMG_SIDE = LOW_MEM ? 1024 : TIGHT ? 2048 : 0;
function shrinkImage(im, side) {
  const S = side && IMG_SIDE ? Math.min(side, IMG_SIDE) : side || IMG_SIDE;   // side：调用处另给的上限（展柜叠加照片在内存紧的设备上用 1024）
  if (!S || !im || Math.max(im.width, im.height) <= S) return im;
  const k = S / Math.max(im.width, im.height), cv = document.createElement('canvas');
  cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); return cv;
}
function decodeImage(src, side) { return assetURL(src).then(u => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(shrinkImage(im, side))); im.onerror = () => res(null); im.src = u; })); }
function loadImage(src) {
  const p = imgCache.get(src); if (p) return lruTouch(imgCache, src, p);
  const q = decodeImage(src); lruTouch(imgCache, src, q);
  q.then(im => { if (!im || imgCache.get(src) !== q) return; imgSize.set(src, (im.naturalWidth || im.width) * (im.naturalHeight || im.height) * 4); trimImages(src); });
  trimImages(src); return q;
}
function trimImages(keep) {
  let total = 0; for (const n of imgSize.values()) total += n;
  for (const k of [...imgCache.keys()]) {
    if (imgCache.size <= IMG_MAX && total <= IMG_BYTES) break;
    if (k === keep) continue;
    imgCache.delete(k); total -= imgSize.get(k) || 0; imgSize.delete(k);
  }
}
// 照片贴图：解码完成后排进任务队列再上传
function photoTex(src, side) { return decodeImage(src, side).then(im => { if (!im) return null; const t = new THREE.Texture(im); t.userData.src = src; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true; return t; }); }
// 发布版把展柜与档案柜图片合并成少量图片包（tools/pack.py）；按索引取出一段字节，转成 Blob 地址。开发版没有索引，直接用原路径
const packBuf = {}, blobCache = new Map(), BLOB_MAX = TIGHT ? 90 : 320, BLOB_BYTES = TIGHT ? 32e6 : 400e6, blobSize = new Map(), blobLen = new Map();   // 切出的图片 Blob：条数和字节数都设上限
// 图片包整包缓存（服务器不支持分段读取时）与小图包缓存：按字节数设上限
const bufOrder = new Map(), bufSize = {}, BUF_MAX = { pack: TIGHT ? 10e6 : isTouch ? 32e6 : 64e6, sm: TIGHT ? 10e6 : 24e6 };
function bufTouch(kind, name) { lruTouch(bufOrder, kind + ':' + name, kind); }
function bufTrim(kind, store, keep) {
  let total = 0; for (const [k, kd] of bufOrder) if (kd === kind) total += bufSize[k] || 0;
  for (const [k, kd] of [...bufOrder]) { if (total <= BUF_MAX[kind]) break; const name = k.slice(kind.length + 1); if (kd !== kind || name === keep) continue;
    total -= bufSize[k] || 0; delete store[name]; delete bufSize[k]; bufOrder.delete(k); if (kind === 'pack') delete packRange[name]; }
}
function bufWatch(kind, store, name) {   // 包下载完成后记下大小，超出上限就丢掉最久没用的
  const p = store[name]; bufTouch(kind, name);
  if (p && p.then) p.then(b => { if (store[name] !== p) return; bufSize[kind + ':' + name] = b.byteLength; bufTrim(kind, store, name); }, () => {});
}
// 从包里切出的图片对应的 Blob 地址：最多保留若干个，丢掉的地址 30 秒后撤销（让正在加载它的图片先读完）
function blobMemo(key, make) {
  const hit = blobCache.get(key); if (hit) return lruTouch(blobCache, key, hit);
  const p = make(); blobCache.set(key, p);
  p.then(u => { if (blobCache.get(key) !== p) return; blobSize.set(key, blobLen.get(u) || 0); blobLen.delete(u); trimBlobs(key); }, () => {});
  trimBlobs(key);
  return p;
}
function trimBlobs(keep) {
  let total = 0; for (const n of blobSize.values()) total += n;
  for (const [k, old] of [...blobCache]) {
    if (blobCache.size <= BLOB_MAX && total <= BLOB_BYTES) break;
    if (k === keep) continue;
    blobCache.delete(k); total -= blobSize.get(k) || 0; blobSize.delete(k);
    old.then(u => { if (typeof u === 'string' && u.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(u), 30000); }, () => {});
  }
}
const blobURL = (bytes) => { const u = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })); blobLen.set(u, bytes.byteLength); return u; };
// 每个图片包先试一次分段读取：服务器支持（206）就每张图只下载自己那一段；不支持就整包下载一次，大家共用
const packRange = {}, probeBytes = {}, assetFails = {};
const thumbOf = (src, hi) => (!hi && SMALL[src] ? 'sm:' + src : src);   // 普通清晰度用小图包里的小图
function assetURL(src, low = false) {   // low：预加载用低优先级，当前展厅的请求先走
  if (src.startsWith('sm:')) return smallURL(src.slice(3), low);
  const e = PACKS[src]; if (!e) return Promise.resolve(src);
  return blobMemo(src, async () => {
    const [name, off, len] = e, url = `assets/pack/${name}.jpg`, range = { headers: { Range: `bytes=${off}-${off + len - 1}` }, priority: low ? 'low' : 'high' };
    try {
      let bytes;
      if (!packBuf[name]) {
        if (!(name in packRange)) packRange[name] = fetch(url, range).then(async r => {
          if (r.status === 206) { probeBytes[src] = new Uint8Array(await r.arrayBuffer()); return true; }
          packBuf[name] = r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)); bufWatch('pack', packBuf, name); return false;
        });
        if (await packRange[name] && !packBuf[name]) {
          bytes = probeBytes[src]; delete probeBytes[src];
          if (!bytes) {
            const r = await fetch(url, range);
            if (r.status === 206) bytes = new Uint8Array(await r.arrayBuffer());
            else if (r.ok) { packBuf[name] = r.arrayBuffer(); bufWatch('pack', packBuf, name); }   // 缓存层有时不理会分段请求、直接给整个包：那就用整包
            else throw new Error(r.status);
          }
        }
      }
      if (!bytes) { bufTouch('pack', name); bytes = new Uint8Array(await packBuf[name], off, len); }
      return blobURL(bytes);
    } catch (err) {
      delete packBuf[name]; delete packRange[name]; blobCache.delete(src);
      // 网络出错：稍后重试两次；仍然失败才放弃（缩略图失败时退回原图）
      const n = (assetFails[src] = (assetFails[src] || 0) + 1);
      if (n <= 2) { await new Promise(r => setTimeout(r, 1500 * n)); return assetURL(src, low); }
      if (SMALL[src]) return smallURL(src, low);   // 原图取不到：继续用小图
      console.warn('图片未能载入：', src, err && err.message);
      return src;
    }
  });
}
// 小图：每厅一个小图包（几百 KB），整包用普通请求下载一次（不用分段读取，最稳），取出一段转成 Blob 地址
const smallBuf = {};
function smallURL(src, low = false) {
  const [name, off, len] = SMALL[src], key = 'sm:' + src;
  return blobMemo(key, async () => {
    for (let k = 0; k < 4; k++) {
      try {
        if (!smallBuf[name]) { smallBuf[name] = fetch(`assets/pack/${name}.jpg`, { priority: low ? 'low' : 'high' }).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))); bufWatch('sm', smallBuf, name); } else bufTouch('sm', name);
        const buf = await smallBuf[name];
        return blobURL(new Uint8Array(buf, off, len));
      } catch (err) { delete smallBuf[name]; await new Promise(r => setTimeout(r, 1200 * (k + 1))); }
    }
    console.warn('小图未能载入：', src); return src;
  });
}
// 阅读页里的包内图片：替换 src；点击大图链接时在页内灯箱中打开
function resolveImages(root) {
  for (const im of root.querySelectorAll('img[src^="assets/"]')) { const p = im.getAttribute('src'); if (PACKS[p]) { im.removeAttribute('src'); assetURL(p).then(u => { im.src = u; }); } }
}
function lightbox(p) {
  const lb = $('lightbox'), im = lb.querySelector('img'); im.removeAttribute('src'); lb.hidden = false;
  assetURL(p).then(u => { if (!lb.hidden) im.src = u; });
}
// 展项贴图的绘制与上传放进队列，每帧只用几毫秒，避免进入新展厅时卡顿
const PROF = new URLSearchParams(location.search).has('prof') ? (window.__prof = { jobs: [], render: [], up: [] }) : null;
const jobs = [];
// ───── 绘制线程：文字展板在后台画好，主线程只上传位图；浏览器不支持时退回主线程绘制
const OFF_FN = { panel: 'drawPanel', story: 'drawStory', dossier: 'drawDossier', wide: 'drawPanelWide', wall: 'drawWallText', quote: 'drawQuote', title: 'drawTitle', evidence: 'drawEvidence', names: 'drawNames' };
let DW = null, dwId = 0; const dwWait = new Map(), WORKERS = [];   // dwWait：id → [回调, 所在线程]
try {
  if (typeof OffscreenCanvas !== 'undefined' && !new URLSearchParams(location.search).has('noworker')) {
    const n = TIGHT ? 1 : Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 2));   // 每个绘制线程都占内存
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('js/drawworker.js', document.baseURI), { type: 'module' }); w.load = 0;
      w.postMessage({ cfg: { cacheBytes: TIGHT ? 64e6 : isTouch ? 200e6 : 400e6, maxSide: TIGHT ? IMG_SIDE : 0 } });   // 线程里的图片缓存按字节设上限
      w.postMessage({ fontsPending: true }); fontReady.then(() => w.postMessage({ fonts: FONT_BUFS.map(([wt, b]) => [wt, b.slice(0)]) }));   // 线程里也装上同一份字体
      w.onmessage = (e) => { if (e.data.stats) { w.stats = e.data.stats; return; } const r = dwWait.get(e.data.id); dwWait.delete(e.data.id); if (r) { r[1].load--; r[0](e.data); } };
      w.onerror = (e) => { console.warn('绘制线程不可用，改在主线程绘制', e.message); DW = null; for (const [id, r] of dwWait) if (r[1] === w) { dwWait.delete(id); r[0]({ err: 'worker' }); } };
      WORKERS.push(w);
    }
    DW = WORKERS[0];
  }
} catch (e) { DW = null; }
// 健康检查：绘制线程几秒内没有回音（例如被托管环境禁止却不报错），就全部改回主线程绘制
if (DW) {
  const fail = () => { if (!DW) return; console.warn('绘制线程无响应，改在主线程绘制'); DW = null; for (const [id, r] of dwWait) { dwWait.delete(id); r[0]({ err: 'timeout' }); } };
  let timer = 0;   // 线程要等字体装好才开始画：字体到了再计时
  fontReady.then(() => { timer = setTimeout(fail, 10000); return drawAnyOff('drawCaption', [{ cap: '检查', credit: '' }, 0.2], 9); }).then(d => { clearTimeout(timer); if (!d || !d.bm) fail(); else d.bm.close(); });
}
const repriDraws = (ids, pri) => { const by = new Map(); for (const id of ids) { const r = dwWait.get(id); if (r) { if (!by.has(r[1])) by.set(r[1], []); by.get(r[1]).push(id); } } for (const [w, l] of by) w.postMessage({ repri: l, pri }); };
const cancelDraws = (ids) => { const by = new Map(); for (const id of ids) { const r = dwWait.get(id); if (r) { if (!by.has(r[1])) by.set(r[1], []); by.get(r[1]).push(id); } } for (const [w, l] of by) w.postMessage({ cancel: l }); };
const SKIP_KEYS = new Set(['mesh', 'capMesh', 'ovl', 'sec', 'texs', 'maps', 'cache', 'anchor', 'reverseFaces', 'face', 'group', 'model3d', 'theme', 'style', 'menuBtn', 'gen']);
const plainOf = (o, skip) => { const out = {}; for (const [k, v] of Object.entries(o)) { if (skip && skip.has(k)) continue; if (v === null || typeof v !== 'object' || Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype) out[k] = v; } return out; };
async function drawAnyOff(fn, args, pri = 1, onId) {
  if (!DW) return { err: 'none' };
  const transfer = [], seen = new Map();
  const conv = async (a) => {
    if (a instanceof HTMLImageElement) { if (!seen.has(a)) { const b = await createImageBitmap(a); transfer.push(b); seen.set(a, b); } return seen.get(a); }
    if (Array.isArray(a)) return Promise.all(a.map(conv));
    if (a && typeof a === 'object' && Object.getPrototypeOf(a) === Object.prototype) { const o = {}; for (const k of Object.keys(a)) o[k] = await conv(a[k]); return o; }
    return a;
  };
  let payload; try { payload = await Promise.all(args.map(conv)); } catch (e) { return { err: 'clone' }; }
  return new Promise((res) => {
    const id = ++dwId, w = WORKERS.reduce((a, b) => (b.load < a.load ? b : a)); w.load++;
    dwWait.set(id, [res, w]); if (onId) onId(id);
    try { w.postMessage({ id, fn, args: payload, pri }, transfer); } catch (e) { dwWait.delete(id); w.load--; res({ err: 'post' }); }
  });
}
function bitmapTex(bm) { const t = new THREE.Texture(bm); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true; t.addEventListener('dispose', () => bm.close && bm.close()); return t; }
// 任务队列：jobs 是贴图的首次绘制（带所属展厅），djobs 是换清晰度。画一张大画布要几十毫秒，
// 所以人在走动或转视角时暂停：只偶尔补画当前展厅还空着的展项；停下来以后再补其余的
const djobs = [], upq = [];
let lastMotion = 0, jobTick = 0, lastBigUp = -1e9;
const moved = () => { lastMotion = performance.now(); };
function runJobs(now, budget) {
  if (upq.length) {
    const cur = player.room && player.room.key, pick = (ok) => { let i = upq.findIndex(u => ok(u) && u.key === cur); if (i < 0) i = upq.findIndex(ok); return i; };
    if (now - lastMotion < 350) { const i = pick(u => u.small || (u.first && now - lastBigUp > 120)); if (i >= 0) { const u = upq.splice(i, 1)[0]; if (!u.small) lastBigUp = now; u(); } }   // 走动时每帧最多传一张：小贴图，或还空着的展项的首张贴图（大的每 120 毫秒一张）；换清晰版的大贴图等停下
    else { const t0 = performance.now(); let i; while ((i = pick(() => true)) >= 0 && performance.now() - t0 < 6) { const big = !upq[i].small; if (big && t0 - lastBigUp < 150) break; upq.splice(i, 1)[0](); if (big) { lastBigUp = performance.now(); break; } } }   // 大贴图每次只传一张，两张之间至少隔 150 毫秒，免得接连卡顿
  }
  if (now - lastMotion < 350) {
    const t0 = performance.now();
    for (let i = 0; i < jobs.length && performance.now() - t0 < 3;) { if (jobs[i].light) jobs.splice(i, 1)[0](); else i++; }
    if (++jobTick % 10) return;
    const cur = player.room && player.room.key, i = jobs.findIndex(j => j.key === cur && !j.pre);
    if (i >= 0) jobs.splice(i, 1)[0]();
    return;
  }
  const t0 = performance.now();
  while (jobs.length && performance.now() - t0 < budget) jobs.shift()();
  while (djobs.length && performance.now() - t0 < budget) djobs.shift()();
}
function setMap(mesh, t) { const m = mesh.material, fresh = !m.map || !(m.defines && m.defines.SHARP_MAP); sharpen(m); m.map = t; m.color.set(0xffffff); if (fresh) m.needsUpdate = true; mesh.visible = true; }   // 已有贴图（含占位贴图）时只换贴图，不重编着色器
// 国殇之柱：在基座上立一张雕像照片
function pillarPhoto(it, later) {
  const src = it.photos[0][0];
  loadImage(src).then(im => { if (!im || it.model3d) return; later(() => {
    const h = 3.6, w = h * im.width / im.height, t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    m.position.set(it.pos[0], it.pos[1] + h / 2 + 0.05, it.pos[2]); m.rotation.y = Math.PI; m.userData.noMerge = true; it.group.add(m); it.model3d = m; m.visible = it.loaded;
  }); });
}
function loadItem(s, it) {
  if (it.loaded || !it.mesh) return; it.loaded = true; it.texs = []; it.maps = []; it.sec = s; const gen = it.gen = (it.gen || 0) + 1;
  if (it.pend && it.pend.length) { cancelDraws(it.pend); it.pend = []; }
  const K = it.hi ? (IMG_KINDS.has(it.style.kind) ? K_HI_IMG : K_HI) : K_LO, ph = !it.swapping;   // ph：换清晰度时不画空白占位，旧贴图留到新图就绪
  const put = (mesh, t) => { if (!it.loaded) { t.dispose(); return; }
    const prev = mesh.material.map;
    it.texs.push(t); it.maps = it.maps.filter(([m]) => m !== mesh); it.maps.push([mesh, t]);
    const t0 = PROF ? performance.now() : 0; renderer.initTexture(t); if (PROF) (PROF.up ||= []).push(performance.now() - t0); setMap(mesh, t);
    // 同一次加载里先画的占位版（不带图片）被正式版换下：马上释放，不必等整个展厅卸载（换清晰度时的旧贴图另有释放逻辑）
    if (prev && prev !== t && prev !== DUMMY_MAP && it.texs.includes(prev) && !it.maps.some(([, x]) => x === prev)) { it.texs = it.texs.filter(x => x !== prev); prev.dispose(); }
  };
  const later = (fn) => { const j = () => { if (it.loaded) fn(); }; j.key = s.roomObj && s.roomObj.key; jobs.push(j); };
  const h = { ...s, theme: it.theme || s.theme }, st = it.style;
  // paint：在绘制线程画（不支持时在主线程画），画好后贴上；过时的结果丢掉
  const IT = plainOf(it, SKIP_KEYS), H = { ...plainOf(h, new Set(['items', 'roomObj', 'theme', 'archive', 'reading'])), theme: h.theme };
  const local = (args) => args.map(a => a === IT ? it : a === H ? h : a);
  const unref = async (a) => a && a.__img ? loadImage(a.__img) : Array.isArray(a) ? Promise.all(a.map(unref)) : a && typeof a === 'object' && Object.getPrototypeOf(a) === Object.prototype && 'im' in a ? { ...a, im: await unref(a.im) } : a;
  const drawLocal = (fn, args, mesh) => Promise.all(local(args).map(unref)).then(a => { if (it.gen === gen && it.loaded) put(mesh, tex(DRAW[fn](...a))); });
  const paint = (fn, args, mesh = it.mesh) => {
    if (!DW || it.offFail) { drawLocal(fn, args, mesh); return; }
    const here = s.roomObj && s.roomObj === player.room;
    const near = mesh && mesh.position ? Math.max(0, 1 - Math.hypot(mesh.position.x - player.x, mesh.position.z - player.z) / 60) * 0.9 : 0;   // 同一档里离人近的先画
    const pri = (!it.swapping && here ? 4 : it.hi ? 3 : it._pre ? 0 : here ? 2 : 1) + near;   // 当前展厅里还空着的展项先画（首次绘制），换清晰版其次
    drawAnyOff(fn, args, pri, (id) => (it.pend ||= []).push(id)).then(d => {
      if (d.cancelled) return;
      if (it.gen !== gen || !it.loaded) { if (d.bm) d.bm.close(); return; }
      if (d.bm) { const u = () => { if (it.gen !== gen || !it.loaded) { d.bm.close(); return; } put(mesh, bitmapTex(d.bm)); }; u.small = d.bm.width * d.bm.height < 1.6e6; u.first = ph; u.key = s.roomObj && s.roomObj.key; upq.push(u); }   // 上传排队
      else { if (d.err !== 'timeout' && d.err !== 'none') console.warn('绘制线程出错，改在主线程画：', fn, d.err); it.offFail = true; drawLocal(fn, args, mesh); return; }
      if (d.missing) (window.__imgMissing ||= []).push([it.t || it.k, d.missing, it.retries || 0]);   // 诊断用：控制台可查看
      if (d.missing && (it.retries || 0) < 3) { it.retries = (it.retries || 0) + 1;   // 有图片没取到：过几秒整件重画
        setTimeout(() => { if (it.gen === gen && it.loaded) { unloadItem(it); loadItem(s, it); } }, 4000 * it.retries); }
    });
  };
  const after = (fn) => (DW && !it.offFail ? fn() : later(fn));   // 用绘制线程时不必排队
  // 叠加图片：展柜、平柜、档案框的图片不画进画布，而是各自作为一张贴图贴在画布前（和墙上照片一样，图片一到就显示，不必等画布重画）。
  // list：[[图片路径, [x, y, w, h]]]，坐标是画布设计像素；ppm：每米多少设计像素
  const overlay = (list, ppm) => {
    it.ovl ||= []; const sheets = {};   // 同一张拼版图只解码、上传一次，各格用克隆贴图（共用显存）只取自己那一块
    list.forEach(([src, [dx, dy, dw, dh], opt = {}], i) => {
      let m = it.ovl[i];
      if (!m) { m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: DUMMY_MAP })); sharpen(m.material); if (opt.gray) m.material.defines.GRAY_MAP = ''; m.visible = false; m.userData = it.mesh.userData; it.mesh.add(m); it.ovl[i] = m; }
      m.scale.set(dw / ppm, dh / ppm, 1); m.position.set((dx + dw / 2) / ppm - st.w / 2, st.h / 2 - (dy + dh / 2) / ppm, 0.004);
      (opt.tile ? (sheets[src] ||= photoTex(src)).then(t0 => { if (!t0) return null; const t = t0.clone(), [sx, sy, sw, sh] = opt.tile, W = t0.image.width, H = t0.image.height;
        t.repeat.set(sw / W, sh / H); t.offset.set(sx / W, 1 - (sy + sh) / H); t.needsUpdate = true; return t; }) : photoTex(thumbOf(src, it.hi), OVL_SIDE)).then(t => { if (!t) return;
        if (opt.cover !== undefined) {   // 铺满并裁切（与画布里的 cover 画法一致）：多出的部分按 cover 比例从上往下裁
          const ia = t.image.width / t.image.height, ra = dw / dh;
          if (ia > ra) { t.repeat.set(ra / ia, 1); t.offset.set((1 - ra / ia) / 2, 0); } else { const ry = ia / ra; t.repeat.set(1, ry); t.offset.set(0, (1 - ry) * (1 - opt.cover)); }
        }
        const u = () => {
        if (it.gen !== gen || !it.loaded) { t.dispose(); return; }
        const old = m.material.map; it.texs.push(t); renderer.initTexture(t); m.material.map = t; m.visible = true;
        if (old && old !== DUMMY_MAP && old !== t) { if (it.texs.includes(old)) it.texs = it.texs.filter(x => x !== old); if (!(it.ovl || []).some(o => o.material.map === old)) old.dispose(); }   // 换下的旧照片马上释放
      }; u.small = t.image.width * t.image.height < 1.6e6; u.first = ph; u.key = s.roomObj && s.roomObj.key; upq.push(u); });
    });
  };
  const OV = (w, h) => w > 0 && h > 0 ? { ow: w, oh: h, ov: true } : null;
  const img = (src0) => { const src = thumbOf(src0, it.hi);   // 普通清晰度用缩略图
    return DW && !it.offFail ? assetURL(src).then(u => ({ __img: new URL(u, location.href).href })) : loadImage(src); };   // 线程自己下载、解码
  if (st.kind === 'drawer') {
    const srcs=it.hero ? it.objs[0].img.slice(0,4).map(v=>v[0]) : it.objs.map(o=>o.img?.[0]?.[0]);
    const draw=ims=>it.hero ? paint('drawCase',[IT,H,K,ims,5.4,2.37]) : paint('drawDrawer',[IT,K,ims]);
    if (ph) draw([]);
    Promise.all(srcs.map(src=>src?img(src):null)).then(ims=>after(()=>draw(ims)));
  }
  else if (st.kind === 'nameLeaf') paint('drawNameLeaf',[IT,K]);
  else if (st.kind === 'floorDate') paint('drawFloorDate',[IT,K]);
  else if (st.kind === 'leaf') paint('drawDisplayLeaf',[IT,K]);
  else if (st.kind === 'measure') paint('drawMeasureLegend',[IT,K]);
  else if (st.kind === 'panel') paint('drawPanel', [IT, H, K]);
  else if (st.kind === 'story') paint('drawStory', [IT, H, K]);
  else if (st.kind === 'dossier') paint('drawDossier', [IT, H, K]);
  else if (st.kind === 'wide') paint('drawPanelWide', [IT, H, K]);
  else if (st.kind === 'wall') paint('drawWallText', [IT, H, K]);
  else if (st.kind === 'quote') paint('drawQuote', [IT, H, K]);
  else if (st.kind === 'title') paint('drawTitle', [H, K]);
  else if (st.kind === 'bio' && it.portrait) {   // 肖像单独贴在画布前，按黑白显示
    paint('drawBioCase', [IT, H, K, { ov: true }]);
    overlay([[it.hi && HIRES.has(it.portrait.src) ? hiSrc(it.portrait.src) : it.portrait.src, [44, 44, 290, 380], { cover: 0.3, gray: true }]], 900 / st.w);
  }
  else if (st.kind === 'bio') {
    if (ph || !it.portrait) paint('drawBioCase', [IT, H, K, null]);
    if (it.portrait) img(it.hi && HIRES.has(it.portrait.src) ? hiSrc(it.portrait.src) : it.portrait.src).then(im => { if (im) after(() => paint('drawBioCase', [IT, H, K, im])); });
  } else if (st.kind === 'books') {
    paint('drawBookshelf', [IT, K, st.w, st.h]);
  } else if (st.kind === 'case' && (it.hero ? it.objs[0].img.slice(0, 4) : it.objs.map(o => o.img[0])).every(v => OV(v[1], v[2]))) {
    const vs = it.hero ? it.objs[0].img.slice(0, 4) : it.objs.map(o => o.img[0]);
    paint('drawCase', [IT, H, K, vs.map(v => OV(v[1], v[2])), st.w, st.h]);
    const L = caseSlots(it, Math.round(st.w * 200), Math.round(st.h * 200), vs.length, MCTX);
    overlay(L.slots.map(([x, y, w, h], i) => [vs[i][0], fitRect(x, y, w, h, vs[i][1], vs[i][2])]), 200);
  } else if (st.kind === 'case') {
    if (ph) paint('drawCase', [IT, H, K, [], st.w, st.h]);
    const srcs = it.hero ? it.objs[0].img.slice(0, 4).map(v => v[0]) : it.objs.map(o => o.img[0][0]);
    Promise.all(srcs.map(img)).then(imgs => after(() => paint('drawCase', [IT, H, K, imgs, st.w, st.h])));
  } else if (st.kind === 'sculpt') {
    if (it.model3d) { it.model3d.visible = true; return; }
    pillarPhoto(it, later);   // 国殇之柱：只用照片（不再加载三维模型）
  } else if (st.kind === 'impact') {
    put(it.mesh, tex(drawImpact(it.sp, h.theme, K, st.w, st.h)));
  } else if (st.kind === 'evidence') {
    paint('drawEvidence', [IT, H, K, st.w, st.h]);
  } else if (st.kind === 'feature' && it.board && it.board.imgs && it.board.imgs.length) {
    const pics = it.board.imgs, S = featureSlots(pics.length);
    paint('drawFeatureBoard', [IT, H, K, pics.map(() => ({ ov: true }))]);
    overlay(pics.map(([src], i) => [src, S[i], { cover: 0.35 }]), 1200 / st.w);
  } else if (st.kind === 'feature') {
    const pics = (it.board && it.board.imgs) || [];
    if (ph || !pics.length) paint('drawFeatureBoard', [IT, H, K, []]);
    if (pics.length) Promise.all(pics.map(([src]) => img(src))).then(imgs => after(() => paint('drawFeatureBoard', [IT, H, K, imgs])));
  } else if (st.kind === 'tcase' && it.objs.every(o => OV(o.w, o.h))) {
    paint('drawTableCase', [IT.objs, it.objs.map(o => OV(o.w, o.h)), K, st.w, st.h]);
    const S = tcaseSlots(it.objs.length, Math.round(st.w * 400), Math.round(st.h * 400));
    overlay(it.objs.map((o, i) => [`assets/arch/${o.f}`, fitRect(...S[i], o.w, o.h)]), 400);
  } else if (st.kind === 'tcase') {
    if (ph) paint('drawTableCase', [IT.objs, [], K, st.w, st.h]);
    Promise.all(it.objs.map(o => img(`assets/arch/${o.f}`))).then(imgs => after(() => paint('drawTableCase', [IT.objs, imgs, K, st.w, st.h])));
  } else if (st.kind === 'names') {
    paint('drawNames', [IT, H, K, st.w, st.h]);
  } else if (st.kind === 'archframe' && OV(it.o.w, it.o.h)) {
    paint('drawArchFrame', [IT.o, K, OV(it.o.w, it.o.h), st.w, st.h]);
    overlay([[`assets/arch/${it.o.f}`, fitRect(...archSlot(Math.round(st.w * 200), Math.round(st.h * 200)), it.o.w, it.o.h)]], 200);
  } else if (st.kind === 'archframe') {
    if (ph) paint('drawArchFrame', [IT.o, K, null, st.w, st.h]);
    img(`assets/arch/${it.o.f}`).then(im => { if (im) after(() => paint('drawArchFrame', [IT.o, K, im, st.w, st.h])); });
  } else if (st.kind === 'arch' && it.objs.length && it.objs.slice(0, 12).every(o => o.sp && o.tr)) {   // 档案柜屏幕：缩略图也单独贴，不画进画布
    const KK = K * (st.dw ? 0.6 : 1), W = st.dw || st.w, HH = st.dh || st.h, W0 = Math.round(W * 200), S = archiveSlots(W0, Math.round(HH * 200));
    paint('drawArchive', [IT, H, KK, [], W, HH]);
    const n = Math.min(it.objs.length > 12 ? 11 : 12, it.objs.length);   // 超过 12 件时最后一格留给“+N”
    overlay(it.objs.slice(0, n).map((o, i) => { const [x, y, w, h] = S[i], [, , sw, sh] = o.tr; return [`assets/arch/${o.sp}.jpg`, fitRect(x + 4, y + 4, w - 8, h - 8, sw, sh), { tile: o.tr }]; }), W0 / st.w);
  } else if (st.kind === 'arch') {
    const KK = K * (st.dw ? 0.6 : 1), W = st.dw || st.w, HH = st.dh || st.h, m = 12;
    if (ph) paint('drawArchive', [IT, H, KK, [], W, HH]);
    const first = it.objs.slice(0, m), sheets = [...new Set(first.map(o => o.sp))];   // 缩略图可能来自几张图集
    Promise.all(sheets.map(sp => img(`assets/arch/${sp}.jpg`))).then(ims => { const by = new Map(sheets.map((sp, i) => [sp, ims[i]])); if (ims.some(Boolean)) after(() => paint('drawArchive', [IT, H, KK, first.map(o => ({ im: by.get(o.sp), r: o.tr })), W, HH])); });
  } else if (st.kind === 'photo') {
    paint('drawCaption', [IT, K_HI], it.capMesh);
    photoTex(it.src).then(t => { if (!t) return; const u = () => { if (it.gen !== gen || !it.loaded) { t.dispose(); return; } put(it.mesh, t); }; u.small = t.image.width * t.image.height < 1.6e6; u.key = s.roomObj && s.roomObj.key; upq.push(u); });
  }
}
// 切换清晰度：重绘贴图，旧贴图在新图换上后再释放
const TEXT_KINDS = new Set(['floorDate', 'leaf', 'measure', 'panel', 'wide', 'wall', 'quote', 'title', 'story', 'dossier', 'evidence', 'impact', 'names']);
const hiLRU = new Set(), HI_KEEP = LOW_MEM ? 1 : TIGHT ? 2 : isTouch ? 14 : 24;
// 同时处于高清的展项：内存紧的设备上只给离人最近的几件（每件高清贴图可达几十 MB），其余用普通清晰度；其他设备 12 米内都换高清
const HI_LIVE = LOW_MEM ? 3 : TIGHT ? 6 : Infinity, OVL_SIDE = TIGHT ? 1024 : 0;
function setDetail(it, hi) {
  if (!it.loaded || it.hi === hi || !it.sec || it.style.kind === 'sculpt') return;
  if (hi && !(it.maps && it.maps.length) && it.style.kind !== 'photo') return;   // 普通清晰度的贴图（小图）还没显示出来时先不换清晰版：否则那张会被撤销，台面一直空着
  if (it.style.kind === 'photo') {   // 照片：换用 assets/img/hi/ 中的高清版本
    if (!HIRES.has(it.src)) return; it.hi = hi;
    photoTex(hi ? hiSrc(it.src) : it.src).then(t => { if (!t) return; const j = () => {
      if (!it.loaded || it.hi !== hi) { t.dispose(); return; }
      const old = it.mesh.material.map; it.texs = it.texs.filter(x => x !== old); it.texs.push(t); renderer.initTexture(t); setMap(it.mesh, t);
      if (old && old !== DUMMY_MAP) setTimeout(() => old.dispose(), 500);
    }; j.small = false; upq.push(j); });
    return;
  }
  if (TEXT_KINDS.has(it.style.kind)) {
    it.cache ||= {};
    if (it.maps.length) it.cache[it.hi ? 'h' : 'l'] = { texs: it.texs, maps: it.maps };   // 还没画好（绘制线程未返回）的不缓存
    it.hi = hi; const want = it.cache[hi ? 'h' : 'l'];
    if (want && want.maps.length) { it.texs = want.texs; it.maps = want.maps; for (const [m, t] of want.maps) setMap(m, t); }
    else { it.loaded = false; it.swapping = true; loadItem(it.sec, it); it.swapping = false; }
    if (hi) { hiLRU.delete(it); hiLRU.add(it); }
    // 清晰贴图最多留若干套，超出时丢掉最久没看的（当前正用的不丢）
    for (const old of hiLRU) { if (hiLRU.size <= HI_KEEP) break; if (old.hi || !old.cache || !old.cache.h) { if (!old.cache || !old.cache.h) hiLRU.delete(old); continue; }
      for (const t of old.cache.h.texs) t.dispose(); old.cache.h = null; hiLRU.delete(old); }
    return;
  }
  const old = it.texs; it.hi = hi; it.loaded = false; it.swapping = true;
  loadItem(it.sec, it); it.swapping = false;
  // 旧贴图要等新贴图换上、不再被任何展项使用时才释放（绘制线程的结果是异步回来的）
  let tries = 0; const free = () => { const live = new Set([it.mesh, it.capMesh, ...(it.ovl || [])].filter(Boolean).map(m => m.material.map));
    for (let i = old.length - 1; i >= 0; i--) if (!live.has(old[i]) && !it.texs.includes(old[i])) old.splice(i, 1)[0].dispose();
    if (old.length && ++tries < 30) setTimeout(free, 1000); };
  setTimeout(free, 1000);
}
let detailT = 0;
function updateDetail(now) {
  if (now - detailT < 250 || !player.room) return; detailT = now;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), down = [], live = []; let up = [];
  for (const k of loadedKeys) for (const it of lazy[k] || []) {
    if (!it.loaded || !it.mesh || (it.style.kind === 'photo' && !HIRES.has(it.src))) continue;
    const p = it.mesh.position, dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz) + (Math.abs(p.y - player.y) > 4 ? 99 : 0);
    if (!it.hi && d < 12) up.push([d - (dx * fx + dz * fz > 0 ? 3 : 0), it]);
    else if (it.hi && d > 17) down.push(() => setDetail(it, false));
    else if (it.hi) live.push([d - (dx * fx + dz * fz > 0 ? 3 : 0), it]);
  }
  up.sort((a, b) => a[0] - b[0]);
  if (HI_LIVE < Infinity) {   // 名额有限：最近的 HI_LIVE 件是高清；新进来的更近的展项把最远的那件挤回普通清晰度
    const all = [...live.map(x => [...x, 1]), ...up.map(x => [...x, 0])].sort((a, b) => a[0] - b[0]), keep = new Set(all.slice(0, HI_LIVE).map(x => x[1]));
    for (const [dd, it, on] of all) if (on && !keep.has(it) && dd > 2) down.push(() => setDetail(it, false));
    up = up.filter(([, it]) => keep.has(it));
  }
  djobs.length = 0; djobs.push(...up.slice(0, 4).map(([, it]) => Object.assign(() => setDetail(it, true), { light: !!(DW && it.style.kind !== 'impact') })), ...down);   // 每次重排：只做此刻最近的几件
}
function unloadItem(it) {
  if (!it.loaded) return; it.loaded = false; it.hi = false;
  if (it.pend && it.pend.length) { cancelDraws(it.pend); it.pend = []; }
  if (it.model3d) { it.model3d.visible = false; return; }
  const all = new Set(it.texs); if (it.cache) { for (const c of Object.values(it.cache)) if (c) for (const t of c.texs) all.add(t); it.cache = null; hiLRU.delete(it); }
  for (const t of all) t.dispose(); it.texs = []; it.maps = [];
  for (const m of [it.mesh, it.capMesh]) if (m) { m.material.map = DUMMY_MAP; if (m.material.transparent) m.visible = false; }   // 换回占位贴图，不必重编着色器
  if (it.ovl) for (const m of it.ovl) { m.material.map = DUMMY_MAP; m.visible = false; }
}
const LINKS = { '0:S12': ['1:S12', '1:H9'], '1:S12': ['0:S12', '0:H8'], '1:S23': ['2:H17'], '2:H17': ['1:S23', '1:H16'] };
function neighborsOf(r) {
  const out = new Set([r.key, ...(LINKS[r.key] || [])]);
  for (const d of DOORS) if (d.a === r.id || d.b === r.id) {
    const other = d.a === r.id ? d.b : d.a;
    for (const q of ROOMS) if (q.id === other && Math.abs(q.floor - r.floor) <= 1) out.add(q.key);
  }
  return out;
}
let loadedKeys = new Set();
const prefetched = new Set();
function prefetchImages(it, low) {
  if (prefetched.has(it) && low) return; prefetched.add(it);
  if (it.k === 'case' && it.objs) for (const o of it.objs) for (const v of (it.hero ? o.img.slice(0, 4) : o.img.slice(0, 1))) assetURL(thumbOf(v[0]), low);
  else if (it.k === 'tcase' && it.objs) for (const o of it.objs) assetURL(thumbOf(`assets/arch/${o.f}`), low);
  else if (it.k === 'archframe' && it.o) assetURL(thumbOf(`assets/arch/${it.o.f}`), low);
  else if (it.k === 'feature' && it.board && it.board.imgs) for (const [src] of it.board.imgs) assetURL(thumbOf(src), low);
}
// 贴图保留：当前展厅与相邻展厅；沿参观路线往前两个展厅提前在空闲时画好；最近走过的若干展厅留着不释放（往回走不必重画、重传）
const KEEP_ROOMS = TIGHT ? 2 : isTouch ? 4 : 6;
let recentKeys = [];
function ensureTextures(r) {
  const near = r ? neighborsOf(r) : new Set(['0:A']), ahead = new Set(r ? [] : TIGHT ? ['0:B'] : ['0:B', '0:H1', '0:H2']);   // 还在馆外或看开场介绍时，先把前几个展厅画好
  if (r) { const i = ROOMS.indexOf(r); for (const q of ROOMS.slice(i + 1)) { if (ahead.size >= (TIGHT ? 0 : 2)) break; if (q.sec && !near.has(q.key)) ahead.add(q.key); } }   // 内存紧的设备只画相邻展厅（再往前的只预先下载图片）
  recentKeys = [...near, ...recentKeys.filter(k => !near.has(k))].slice(0, KEEP_ROOMS);
  const want = new Set([...near, ...ahead, ...recentKeys]);
  for (const k of loadedKeys) if (!want.has(k)) { for (const it of lazy[k] || []) unloadItem(it); for (const e of LAZY.get(k) || []) if (![...e.owners].some(o => want.has(o))) lazyFree(e); }
  // 按需绘制的固定贴图：附近的展厅马上画（每帧限时），沿路线往前的空闲时再画；画好立即上传显卡并释放画布
  for (const k of want) for (const e of LAZY.get(k) || []) if (!e.drawn && !e.queued) {
    e.queued = true; const j = () => { e.queued = false; if (loadedKeys.has(k)) lazyDraw(e, (t) => renderer.initTexture(t)); };
    j.key = k; j.pre = !near.has(k); j.light = near.has(k); jobs.unshift(j);
  }
  const add = [];
  for (const k of want) if (!loadedKeys.has(k)) { const room = ROOMS.find(q => q.key === k); for (const it of lazy[k] || []) add.push([room, it, !near.has(k)]); }
  const d = ([room, it, pre]) => (pre ? 5000 : 0) + (r && room === r ? 0 : 1000) + (it.mesh ? Math.hypot(it.mesh.position.x - player.x, it.mesh.position.z - player.z) : 0);
  add.sort((a, b) => d(a) - d(b));
  for (const [room, it, pre] of add) {
    const j = () => { if (!loadedKeys.has(room.key)) return; it._pre = pre; loadItem(room.sec, it); it._pre = false; };
    j.key = room.key; j.pre = pre; j.light = !!(DW && it.style && it.style.kind !== 'impact' && it.style.kind !== 'sculpt'); jobs.push(j);
  }
  for (const [room, it, pre] of add) prefetchImages(it, pre || room !== r);
  // 只下载不绘制：沿路线再往前四个展厅的展柜缩略图先取到本地（几十 KB 一张），走到时绘制线程不必再等网络
  if (r) { const i = ROOMS.indexOf(r); let n = 0;
    for (const q of ROOMS.slice(i + 1)) { if (n >= 4) break; if (!q.sec || want.has(q.key)) continue; n++; for (const it of lazy[q.key] || []) prefetchImages(it, true); } }
  loadedKeys = want;
  if (r && DW) { const ids = []; for (const it of lazy[r.key] || []) if (it.pend) ids.push(...it.pend); repriDraws(ids, 2); }
  const show = r ? near : new Set(['0:A', '0:EXIT']);
  for (const [k, g] of Object.entries(roomGroups)) g.visible = show.has(k);
}

// ───────────────────────── 状态与界面 ─────────────────────────
const player = { x: 0, z: -140, yaw: Math.PI, pitch: 0.08, y: EYE, floor: 0, room: null };
const $ = (id) => document.getElementById(id);
let extGroup = null;
function setRoom(r) {
  player.room = r; ensureTextures(r);
  if (r && r.sec && started) { store.last = r.sec.room; saveStore(); }
  const inside = !!r, s = r && r.sec;
  scene.fog = inside ? FOG_IN : FOG_OUT;
  const nearOut = !inside || r.id === 'A' || r.id === 'EXIT';
  sun.visible = !inside; poolS.forEach(l => { l.visible = inside; });
  scene.environment = inside ? interiorEnvironment : (extGroup?.userData.daylight || interiorEnvironment);
  scene.environmentIntensity = inside ? 0.48 : 0.64;
  hemi.color.set(inside ? 0xfff5e4 : 0xe3eeff); hemi.groundColor.set(inside ? 0x76706b : 0xa19480);
  hemi.intensity = inside ? 0.55 : 1.12;
  const stl = inside && r.theme.style || {};
  ambient.intensity = (inside ? (r.theme.light ? 1.2 : r.kind === 'memorial' ? 1.12 : 0.77) : 0.48) * (stl.amb || 1);
  ambient.color.set(stl.tint || 0xffffff); roomLight.color.set(stl.tint || 0xffe2b8); roomLight2.color.set(stl.tint || 0xffe2b8);
  roomLight.intensity = inside ? (r.theme.light ? 26 : 50) : 0; roomLight2.intensity = roomLight.intensity * 0.7;
  if (inside) {
    const long = (r.x1 - r.x0) > (r.z1 - r.z0), yy = floorY(r.floor) + Math.min(r.ceilH, CEIL) - 1.2;
    roomLight.position.set(long ? r.cx - (r.x1 - r.x0) / 4 : r.cx, yy, long ? r.cz : r.cz - (r.z1 - r.z0) / 4);
    roomLight2.position.set(long ? r.cx + (r.x1 - r.x0) / 4 : r.cx, yy, long ? r.cz : r.cz + (r.z1 - r.z0) / 4);
  }
  const f = player.floor, stairish = inside && (r.id === 'S12' || r.id === 'S23' || r.id === 'H17');
  floors.forEach((g, i) => { g.visible = inside ? (i === f || (stairish && Math.abs(i - f) === 1)) : i === 0; });
  G12.visible = inside && f <= 1; G23.visible = inside && f >= 1;
  if (extGroup) extGroup.visible = nearOut;
  assignLights();
  if (inside && s) {
    $('hall-no').textContent = `${FLOOR_NAMES[r.floor]} · ${s.label}`;
    $('hall-title').textContent = s.title;
    $('hall-sub').textContent = `${s.years}${s.no > 0 && s.no < 25 ? '　' + s.part.replace(/^第.部分　/, '') : ''}`;
  } else if (inside) {
    const t = r.id === 'S12' ? ['一层 → 二层', '楼梯', '前往二层：乌托邦与浩劫'] : r.id === 'S23' ? ['二层 → 三层', '中庭楼梯', '前往三层：未完成的告别'] : ['一层', '出口门厅', '感谢参观'];
    $('hall-no').textContent = t[0]; $('hall-title').textContent = t[1]; $('hall-sub').textContent = t[2];
  } else {
    $('hall-no').textContent = '广场'; $('hall-title').textContent = '文革博物馆';
    $('hall-sub').textContent = '天安门广场南端 · 原毛主席纪念堂 · 北门入口';
  }
}
function spawnOf(s) {
  const r = s.roomObj, [ax, az] = r.path[0], [bx, bz] = r.path[1];
  return { x: ax, z: az, yaw: Math.atan2(-(bx - ax), -(bz - az)), floor: r.floor };
}
function teleportTo(p) {
  Object.assign(player, { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch || 0, floor: p.floor });
  player.y = heightAt(p.x, p.z, p.floor) + EYE;
  setRoom(roomAt(p.x, p.z, p.floor));
}
// 起点：北门台阶顶端、博物馆正门前
const ENTRANCE = { x: 0, z: -58.6, yaw: Math.PI, pitch: 0.1, floor: 0 };
function teleport(target) {
  const s = typeof target === 'string' ? SECTIONS.find(x => x.room === target) : target;
  if (s) teleportTo(spawnOf(s)); else teleportTo(ENTRANCE);
}
// 导览里点某件展品：直接站到它跟前、面朝它（找不到合适的站位时退回展厅入口）
const _ip = new THREE.Vector3(), _in = new THREE.Vector3();
function spotOf(s, it) {
  const r = s.roomObj, m = it.mesh;
  if (!r || !m) return null;
  m.updateWorldMatrix(true, false); m.getWorldPosition(_ip);
  _in.set(0, 0, 1).transformDirection(m.matrixWorld); _in.y = 0;
  const st = it.style || {}, dist = Math.max(1.9, Math.min(3.8, (st.w || 1.2) * 0.85 + 0.9));
  const dirs = [];
  if (_in.lengthSq() > 0.09) { _in.normalize(); dirs.push([_in.x, _in.z]); }   // 展板正面朝向的那一侧
  for (let a = 0; a < 8; a++) dirs.push([Math.sin(a * Math.PI / 4), Math.cos(a * Math.PI / 4)]);   // 平放的展柜等：四周找一个能站的地方
  const clear = (x, z) => [0.55, 0.7, 0.85].every(q => walkable(_ip.x + (x - _ip.x) * q, _ip.z + (z - _ip.z) * q, r.floor));   // 站位和展品之间没有别的展台挡着
  for (const [dx, dz] of dirs) for (const d of [dist, dist * 0.75, dist * 1.3, 1.4, dist * 2, dist * 3]) {   // 大型装置（入口大字、雕塑）要站远一些
    const x = _ip.x + dx * d, z = _ip.z + dz * d;
    if (!walkable(x, z, r.floor) || roomAt(x, z, r.floor) !== r || !clear(x, z)) continue;
    const eye = heightAt(x, z, r.floor) + EYE, h = Math.hypot(_ip.x - x, _ip.z - z);
    return { x, z, floor: r.floor, yaw: Math.atan2(-(_ip.x - x), -(_ip.z - z)), pitch: Math.max(-0.5, Math.min(0.45, Math.atan2(_ip.y - eye, h))) };
  }
  return null;
}
function goToItem(s, it) { const p = spotOf(s, it); if (p) teleportTo(p); else teleport(s); }
let fading = false;
function checkElevator() {
  const e = ELEVATOR.from;
  if (fading || player.floor !== e.floor || Math.hypot(player.x - e.x, player.z - e.z) > e.r) return;
  fading = true; const fd = $('fade'); fd.classList.add('on');
  setTimeout(() => { teleportTo({ ...ELEVATOR.to, pitch: 0 }); setTimeout(() => { fd.classList.remove('on'); fading = false; }, 500); }, 900);
}

// ───────────────────────── 输入 ─────────────────────────
const keys = new Set();
let started = false, uiOpen = false;
const stick = { x: 0, y: 0 };
if (isTouch) document.body.classList.add('touch');
addEventListener('keydown', (e) => {
  if (chatHasFocus(e.target)) { if (e.code === 'Escape') toggleChat(false); return; }   // 在留言框里打字时不走动
  if (extrasFocusKey(e)) return;   // 在扩展面板里打字时也不走动
  if (!$('lightbox').hidden && (e.code === 'Escape' || e.code === 'Space')) { $('lightbox').hidden = true; e.preventDefault(); return; }
  if (e.code === 'Escape') { closeAll(false); return; }
  const onControl = e.target && e.target.closest && e.target.closest('button, a, input, textarea, select, summary, [contenteditable]');   // 焦点在按钮、链接上时，Enter/空格交给它本身（例如“下一块”）
  if (uiOpen && !$('reader').hidden && !onControl && ['Space', 'Enter', 'KeyE', 'KeyQ'].includes(e.code)) { e.preventDefault(); closeAll(); return; }
  if (!started) return;
  if (e.code === 'KeyM') { toggleMenu(); return; }
  if (e.code === 'KeyT' && !uiOpen) { e.preventDefault(); keys.clear(); toggleChat(true); return; }
  if (!uiOpen && extrasKey(e)) return;
  if (uiOpen) { if (!$('reader').hidden) { if (e.code === 'ArrowLeft') $('r-prev').click(); if (e.code === 'ArrowRight') $('r-next').click(); } return; }
  keys.add(e.code);
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const locked = () => document.pointerLockElement === canvas;
function lockPointer() { try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch { /* 沙盒中可能被拒绝 */ } }
function look(dx, dy) { moved(); player.yaw -= dx; player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch - dy)); }
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!started || uiOpen) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
  if (!locked()) canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!started || uiOpen) return;
  if (locked()) { look(e.movementX * 0.0022, e.movementY * 0.0022); return; }
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    look(dx * 0.004, dy * 0.004);   // 与鼠标转向一致：向右拖 = 向右看，向下拖 = 向下看
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const tap = drag.moved < 8 && performance.now() - drag.t < 500; drag = null;
  if (!tap || !started || uiOpen) return;
  const nx = locked() ? 0 : (e.clientX / innerWidth) * 2 - 1, ny = locked() ? 0 : -(e.clientY / innerHeight) * 2 + 1;
  if (extrasTap(nx, ny)) return;
  const hit = pick(nx, ny);
  if (hit?.userData.displayAction) hit.userData.displayAction();
  else if (hit && hit.userData.portraitWall) {
    const pw = hit.userData.portraitWall, h = lastHit && lastHit.uv;
    if (h) { const k = Math.floor(h.x * pw.cols) + Math.floor((1 - h.y) * pw.rows) * pw.cols, p = pw.people[k]; if (p) openItem(p.s, p.i.idx); }
  } else if (hit) openItem(hit.userData.sec, hit.userData.item.idx);
  else if (e.pointerType === 'mouse' && !locked()) lockPointer();
});
{ const el = $('stick'), knob = $('stick-knob'); let sid = null;
  const set = (e) => { const r = el.getBoundingClientRect(); let x = (e.clientX - r.left - 60) / 45, y = (e.clientY - r.top - 60) / 45; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } stick.x = x; stick.y = y; knob.style.transform = `translate(${x * 35}px,${y * 35}px)`; };
  el.addEventListener('pointerdown', (e) => { sid = e.pointerId; el.setPointerCapture(sid); set(e); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === sid) set(e); });
  const end = (e) => { if (e.pointerId === sid) { sid = null; stick.x = stick.y = 0; knob.style.transform = ''; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

// ───────────────────────── 拾取与阅读 ─────────────────────────
const ray = new THREE.Raycaster(); ray.far = 13;
let lastHit = null;
const ndc = new THREE.Vector2();
function pick(x, y) {
  const r = player.room; if (!r) return null;
  const keys = [...neighborsOf(r)], list = keys.flatMap(k => [...(interactive[k] || []), ...(occluders[k] || [])]);
  ndc.set(x, y); ray.setFromCamera(ndc, camera); ray.far = 30;
  const hits = ray.intersectObjects(list, false), h = hits[0];
  lastHit = h && !h.object.userData.occ ? h : null;
  return lastHit ? lastHit.object : null;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const paras = (s) => s.split('\n').map(p => `<p>${esc(p)}</p>`).join('');
// 参观记录（只保存在本机浏览器）：读过的展项与最后所在的展厅
const store = (() => { try { return JSON.parse(localStorage.getItem('museum-progress') || '{}'); } catch { return {}; } })();
store.read ||= {};
const saveStore = () => { try { localStorage.setItem('museum-progress', JSON.stringify(store)); } catch {} };
const itemKey = (s, it) => `${s.room}:${it.k}:${(it.t || it.name || it.cap || '').slice(0, 24)}`;
let reading = null;
function openItem(s, idx) {
  const it = s.items[idx]; reading = { s, idx }; extrasOpenItem(s, idx);
  if (!store.read[itemKey(s, it)]) { store.read[itemKey(s, it)] = 1; saveStore(); const b = it.menuBtn; if (b) b.classList.add('read'); updateHallCount(s); }
  $('r-hall').textContent = `${FLOOR_NAMES[s.floor]} · ${s.label}　${s.no > 0 && s.no < 25 ? s.title : ''}`;
  let title = '', date = '', html = '';
  const linkList = (arr) => `<ul class="links">${arr.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul>`;
  if (it.k === 'title') {
    title = s.title; date = `${s.part}　${s.years}`; html = paras(s.intro);
    const rd = s.reading; if (rd && rd.length) html += `<h3 class="more">延伸阅读（维基百科）</h3>` + linkList(rd.map(t => [t, wikiUrl(t)]));
  }
  else if (it.k === 'quote') { title = '引文'; date = it.by; html = `<blockquote>${esc(it.q)}</blockquote>`; }
  else if (it.k === 'photo') { title = '历史照片'; date = it.credit || ''; html = `<figure><a href="${esc(it.src)}" target="_blank" rel="noopener" title="打开原图"><img src="${esc(it.src)}" alt=""></a><figcaption>${esc(it.cap)}</figcaption></figure>` + (it.url ? `<p class="src">来源：<a href="${esc(it.url)}" target="_blank" rel="noopener">Wikimedia Commons 原始文件页（作者、授权与原始说明）</a></p>` : ''); }
  else if (it.k === 'case') {
    title = it.t; date = it.hero ? '文献影像' : `展柜 · ${it.objs.length} 件展品`;
    html = paras(it.n) + it.objs.map((o, i) => `<section class="art"><h3>${it.hero ? '' : `${i + 1}　`}${esc(o.t)}</h3><p class="meta">${esc(o.d)} · ${esc(o.ty)}</p>`
      + o.img.map(v => `<a href="${esc(v[0])}" target="_blank" rel="noopener" title="打开原图"><img src="${esc(v[0])}" alt="" loading="lazy"></a>`).join('') + `<p class="unit">点击图像可打开原图放大查看</p>`
      + (o.desc ? `<p class="desc">目录说明：${esc(o.desc)}</p>` : '')
      + `<p class="src">来源：${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.src || o.url)}</a>` : esc(o.src || '')}${o.credit && !String(o.src).includes(o.credit) ? `<br>${esc(o.credit)}` : ''}</p>`
      + (o.note || []).map(t => `<p class="note">※ ${esc(t)}</p>`).join('') + '</section>').join('');
  }
  else if (it.k === 'sculpt') {
    title = it.t; date = it.d; html = paras(it.b) + it.photos.map(([u, c]) => `<figure><a href="${esc(u)}" target="_blank" rel="noopener" title="打开原图"><img src="${esc(u)}" alt="" loading="lazy"></a><figcaption>${esc(c)}</figcaption></figure>`).join('')
      + it.note.map(t => `<p class="note">※ ${esc(t)}</p>`).join('') + `<p class="src">来源：<a href="${esc(it.url)}" target="_blank" rel="noopener">作者官网：《国殇之柱》2021 香港专题与三维文件下载页</a><br>${esc(it.credit)}</p>`;
  }
  else if (it.k === 'impact') {
    const sp = it.sp; title = sp.big || sp.line; date = sp.big ? sp.line : ''; html = paras(sp.note) + (sp.more ? paras(sp.more) : '') + `<p class="note">※ 数字取自本厅展板及其来源；有争议的数字标明了估计者与范围。</p>`;
  }
  else if (it.k === 'evidence') {
    title = `“${it.q}”`; date = `${it.who || '毛泽东'}，${it.date}`; html = `<p class="src">出处：${esc(it.src)}</p>` + paras(it.ctx) + (it.note ? `<p class="note">※ ${esc(it.note)}</p>` : '') + `<p class="note" style="color:#7a1f1f">此后：${esc(it.after)}</p>`;
  }
  else if (it.k === 'dossier' || it.k === 'bridge' || it.k === 'label') {
    const srcList = `<h3 class="more">来源</h3><ul class="links">${it.src.map(x => `<li>${x.u ? `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a>` : esc(x.t)}${x.d ? `<span class="meta">（${esc(x.d)}）</span>` : ''}${x.lim ? `<br><span class="note">限制：${esc(x.lim)}</span>` : ''}</li>`).join('')}</ul>`;
    const objs = (it.objs || []).map(o => `<section class="art"><h3>${esc(o.t)}</h3><p class="meta">${esc(o.d || '')}${o.ty ? ' · ' + esc(o.ty) : ''}</p>` + (o.img || []).slice(0, 3).map(v => `<a href="${esc(v[0])}" target="_blank" rel="noopener" title="打开原图"><img src="${esc(v[0])}" alt="" loading="lazy"></a>`).join('')
      + `<p class="src">来源：${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.src || o.url)}</a>` : esc(o.src || '')}</p>` + (o.note || []).map(t => `<p class="note">※ ${esc(t)}</p>`).join('') + '</section>').join('');
    if (it.k === 'bridge' || it.k === 'label') { title = it.t; date = it.term ? `名词解释${it.d ? ' · ' + it.d : ''}` : it.k === 'bridge' ? '串联说明' : '策展展签'; html = paras(it.b) + (objs ? `<h3 class="more">相关藏品</h3>${objs}` : '') + (it.note ? `<p class="note">※ ${esc(it.note)}</p>` : '') + srcList + (it.status ? `<p class="note">※ 文稿状态：${esc(it.status)}</p>` : ''); }
    else {
      title = it.t; date = [it.d, it.place].filter(Boolean).join('　');
      html = it.full.map(t => paras(t)).join('')
        + `<h3 class="more">时间线</h3><ul class="timeline">${it.tl.map(([d, t]) => `<li><b>${esc(d)}</b>　${esc(t)}</li>`).join('')}</ul>`
        + `<section class="art"><h3>证据签：${esc(it.ev.t)}</h3>${paras(it.ev.b)}</section>`
        + (objs ? `<h3 class="more">相关藏品</h3>${objs}` : '')
        + (it.gaps.length ? `<h3 class="more">尚未取得的材料</h3>${it.gaps.map(t => `<p class="note">※ ${esc(t)}</p>`).join('')}` : '')
        + srcList + `<p class="note">※ 本组文字依所列来源审读，只限其中写明的事实；原始案卷、判决、病历与影像并未全部取得。报告中的指控、家属的记忆、作者的判断与本馆的解释，各自注明。</p>`;
    }
  }
  else if (it.k === 'tcase') {
    title = '平柜'; date = `${it.objs.length} 件 · 本厅档案柜藏品`;
    html = it.objs.map(o => `<section class="art"><h3>${esc(o.t)}</h3><p class="meta">${esc(o.d || '')}${o.d ? ' · ' : ''}${esc(o.ty)}</p><a href="assets/arch/${esc(o.f)}" target="_blank" rel="noopener" title="打开大图"><img src="assets/arch/${esc(o.f)}" alt="" loading="lazy"></a>`
      + (o.desc ? `<p class="desc">${esc(o.desc)}</p>` : '') + (o.en ? `<p class="note" lang="en">原图注：${esc(o.en)}</p>` : '')
      + `<p class="src">来源：${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.src || '来源记录')}</a>` : esc(o.src || '')}</p></section>`).join('')
      + `<p class="note">※ 题名与年代据来源机构目录，外文题名为本馆翻译；未经本馆独立鉴定。</p>`;
  }
  else if (it.k === 'names') {
    title = '受难者名录'; date = `王友琴《文革受难者》所录 ${VICTIMS.length} 人`;
    html = paras('王友琴自 1980 年起寻访文革中被迫害致死者，访问上千人，调查二百多所学校，写成《文革受难者——关于迫害、监禁和杀戮的寻访实录》（2004 年香港开放杂志出版社首版）。下面是该书 2023 年版所录全部受难者的名字，按原书拼音顺序排列。他们只是文革非正常死亡者中极小的一部分。')
      + `<p class="names">${VICTIMS.map(esc).join('　')}</p>`
      + `<p><a class="pdf" href="${esc(VICTIMS_SRC.pdf)}" target="_blank" rel="noopener">在线阅读：作者网站发布的全书 PDF（每位受难者的生平）</a></p>`
      + `<p class="src">另见作者主持的 <a href="${esc(VICTIMS_SRC.site)}" target="_blank" rel="noopener">中国文革受难者纪念园</a>。</p>`;
  }
  else if (it.k === 'archframe') {
    const o = it.o; title = o.t; date = `${o.d || ''}${o.d ? ' · ' : ''}${o.ty}`;
    html = `<figure><a href="assets/arch/${esc(o.f)}" target="_blank" rel="noopener" title="打开大图"><img src="assets/arch/${esc(o.f)}" alt=""></a><figcaption>本厅档案柜藏品 · 点击图像放大</figcaption></figure>`
      + (o.desc ? paras(o.desc) : '') + (o.en ? `<p class="note" lang="en">原图注：${esc(o.en)}</p>` : '')
      + `<p class="src">来源：${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.src || '来源记录')}</a>` : esc(o.src || '')}</p>`
      + `<p class="note">※ 题名与年代据来源机构目录，外文题名为本馆翻译；未经本馆独立鉴定。</p>`;
  }
  else if (it.k === 'arch') {
    title = '档案柜：本厅延伸藏品'; date = `${it.objs.length} 件 · 照片、宣传画、档案与实物`;
    html = (it.objs.some(o => o.note2003) ? paras('最后两件是 2003—2004 年“非典”（SARS）时期的防疫宣传画，作为 2003 年疫情信息史的背景，与蒋彦永的举报对照；它们不是 2020—2022 年的物证。') : '') + paras('以下藏品来自本馆历史素材库，与本厅主题相关，按来源机构公开的目录整理。题名多据馆方目录（外文题名为本馆翻译），年代以目录标注为准，未经本馆独立鉴定；部分照片或宣传品的立场与说法属于当时的宣传，不代表事实本身。点击缩略图可打开大图，点击来源可查看原始目录记录。')
      + `<div class="arch-grid">${it.objs.map(o => `<figure><a href="assets/arch/${esc(o.f)}" target="_blank" rel="noopener" title="打开大图"><span class="thumb" style="background-image:url(assets/arch/${o.sp}.jpg);background-position:-${o.tr[0]}px -${o.tr[1]}px;width:${o.tr[2]}px;height:${o.tr[3]}px"></span></a><figcaption><b>${esc(o.t)}</b><span class="meta">${esc(o.d || '')}${o.d ? ' · ' : ''}${esc(o.ty)}</span>`
        + (o.desc ? `<span class="desc">${esc(o.desc)}</span>` : '') + (o.en ? `<span class="desc" lang="en">原图注：${esc(o.en)}</span>` : '')
        + `<span class="src">${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.src || '来源记录')}</a>` : esc(o.src || '')}</span></figcaption></figure>`).join('')}</div>`;
  }
  else if (it.k === 'books') {
    title = '禁书阅读'; date = `${it.books.length} 种 · 与本厅相关、在中国大陆被禁或无法出版的书`;
    html = paras('下列书籍在中国大陆被禁止出版、发行，或出版后被查禁下架。本馆不收录全文；“在线阅读”指向互联网档案馆（Internet Archive）上用户上传的 PDF，“在线借阅”指向该馆的数字图书馆（注册免费账户后可在浏览器中借阅）；其余链接通向介绍该书或作者的条目。外部链接的内容与可用性由对方网站决定。')
      + it.books.map(b => { const isRead = (l) => l[0].startsWith('在线'), pdf = (b.links || []).filter(isRead), rest = (b.links || []).filter(l => !isRead(l));
        return `<section class="art"><h3>${esc(b.t)}</h3><p class="meta">${esc(b.a)} · ${esc(b.y)}</p>${paras(b.d)}<p class="note">在中国大陆：${esc(b.st)}</p>`
          + pdf.map(([t, u]) => `<p><a class="pdf" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></p>`).join('') + (rest.length ? linkList(rest) : '') + '</section>'; }).join('');
  }
  else if (it.k === 'bio') { title = it.name; date = `${it.life}　${it.role}`; html = (it.portrait ? `<img class="portrait" src="${esc(it.portrait.src)}" alt="">` : '') + paras(it.b) + (it.portrait ? `<p class="unit">照片：${it.portrait.url ? `<a href="${esc(it.portrait.url)}" target="_blank" rel="noopener">${esc(it.portrait.credit || 'Wikimedia Commons')}</a>` : esc(it.portrait.credit || '')}</p>` : '')
      + (PEOPLE_WIKI[it.name] ? `<p class="src">延伸阅读：<a href="${esc(wikiUrl(PEOPLE_WIKI[it.name]))}" target="_blank" rel="noopener">维基百科：${esc(PEOPLE_WIKI[it.name])}</a></p>` : ''); }
  else {
    title = it.t; date = it.k === 'story' ? `故事 · ${it.d}` : it.k === 'resist' ? `反抗 · ${it.d}` : it.k === 'feature' ? `专题 · ${it.d}` : it.d || (it.k === 'obj' ? '展柜' : ''); html = paras(it.b);
    if (it.k === 'feature' && it.board) {
      const B = it.board;
      if (B.imgs) html = B.imgs.map(([src, cap, g]) => `<figure><img src="${esc(src)}" alt=""><figcaption>${esc(cap)}${g ? `<br><small>${esc(g.artist || '佚名')} · ${esc(g.license)} · <a href="${esc(g.page)}" target="_blank" rel="noopener">维基共享资源</a></small>` : ''}</figcaption></figure>`).join('') + html;
      if (B.bars) { const max = Math.max(...B.bars.rows.map(r => r[1])); html += `<h3 class="more">${esc(B.bars.title)}</h3><div class="bars">${B.bars.rows.map(([l, v, n]) => `<div class="bar"><b>${esc(l)}</b><span><i style="width:${(v / max * 60).toFixed(1)}%"></i>${esc(n || String(v))}</span></div>`).join('')}</div>`; }
      if (B.timeline) html += `<h3 class="more">时间线</h3><ul class="tl">${B.timeline.map(([d, t]) => `<li><b>${esc(d)}</b>　${esc(t)}</li>`).join('')}</ul>`;
    }
    // 附文：参观者指定附上的整篇文章（署名、出处照录）
    if (it.article) { const A = it.article; html += `<h3 class="more">附：${esc(A.t)}</h3><p class="meta">${esc(A.by)}${A.note ? '　' + esc(A.note) : ''}</p><div class="article">${A.text.split(/\n+/).filter(Boolean).map(l => /^[^，。：；、“”（）]{1,10}$/.test(l) ? `<h4>${esc(l)}</h4>` : `<p>${esc(l)}</p>`).join('')}</div>`; }
    if (it.ev) html += `<p class="note">※ 证据边界：${esc(it.ev)}</p>`;
    if (it.src && it.src.length) html += `<h3 class="more">来源</h3>` + linkList(it.src);
    if (it.k === 'resist') html += `<p class="note">※ 本馆在各厅用红色“反抗”标记那些说“不”的人。他们的故事多半来自回忆、家属的追索和后来的研究，不是官方叙事。</p>`;
    if (it.bars) { const max = Math.max(...it.bars.map(b => b.v)); html += `<div class="bars">${it.bars.map(b => `<div class="bar"><b>${esc(b.l)}</b><span><i style="width:${(b.v / max * 60).toFixed(1)}%"></i>${esc(b.n)}</span></div>`).join('')}${it.unit ? `<p class="unit">单位：${esc(it.unit)}</p>` : ''}</div>`; }
  }
  $('r-title').textContent = title; $('r-date').textContent = date; $('r-body').innerHTML = html; resolveImages($('r-body'));
  $('r-prev').disabled = idx === 0; $('r-next').disabled = idx === s.items.length - 1;
  showUI('reader');
}
$('r-body').addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="assets/"]'); if (!a || !PACKS[a.getAttribute('href')]) return;
  e.preventDefault(); lightbox(a.getAttribute('href'));
});
$('lightbox').onclick = () => { $('lightbox').hidden = true; };
$('r-prev').onclick = () => reading && reading.idx > 0 && openItem(reading.s, reading.idx - 1);
$('r-next').onclick = () => reading && reading.idx < reading.s.items.length - 1 && openItem(reading.s, reading.idx + 1);
let uiOpener = null;   // 打开阅读页/导览之前的焦点，关闭后还给它
function showUI(which) {
  const a = document.activeElement; if (!uiOpen || !(a && a.closest && a.closest('#menu, #reader'))) uiOpener = a;
  $('menu').hidden = which !== 'menu'; $('reader').hidden = which !== 'reader';
  uiOpen = true; keys.clear(); document.exitPointerLock?.();
  if (which === 'reader') document.querySelector('.reader-box').scrollTop = 0;
  if (which === 'menu') drawMap();
  // 焦点移进刚打开的面板（不能留在已隐藏的导览里）
  const box = which === 'reader' ? document.querySelector('.reader-box') : $('menu');
  if (!box.contains(document.activeElement) || (which === 'reader' && document.activeElement && document.activeElement.closest('#menu'))) box.focus({ preventScroll: true });
}
// 导览中的楼层平面图：展厅、参观路线、楼梯与出口、当前位置
function drawMap() {
  const cv = $('minimap'); if (!cv) return;
  const f = player.room ? player.floor : 0, dpr = Math.min(2, devicePixelRatio || 1), S = 300;
  cv.width = S * dpr; cv.height = S * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const m = 12, k = (S - 2 * m) / 96, X = (x) => m + (x + 48) * k, Z = (z) => m + (z + 48) * k;
  c.fillStyle = '#141416'; c.fillRect(0, 0, S, S);
  const rooms = ROOMS.filter(r => r.floor === f);
  for (const r of rooms) {
    const cur = player.room && player.room.id === r.id;
    c.fillStyle = cur ? '#5a2320' : r.kind === 'stair' ? '#2c3a30' : '#26262a'; c.fillRect(X(r.x0) + 1, Z(r.z0) + 1, (r.x1 - r.x0) * k - 2, (r.z1 - r.z0) * k - 2);
    c.strokeStyle = '#4a4a50'; c.lineWidth = 1; c.strokeRect(X(r.x0) + 1, Z(r.z0) + 1, (r.x1 - r.x0) * k - 2, (r.z1 - r.z0) * k - 2);
    for (const w of r.walls || []) { c.strokeStyle = '#555'; c.beginPath(); c.moveTo(X(w[0]), Z(w[1])); c.lineTo(X(w[2]), Z(w[3])); c.stroke(); }
  }
  c.strokeStyle = 'rgba(201,169,97,.75)'; c.lineWidth = 1.5; c.setLineDash([4, 3]);
  for (const r of rooms) if (r.path && r.floor === f) { c.beginPath(); r.path.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); }
  c.setLineDash([]);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const r of rooms) {
    const s2 = r.sec, lab = r.kind === 'stair' ? '楼梯' : r.id === 'EXIT' ? '出口' : r.id === 'MEM' ? '纪念厅' : s2 ? (s2.no > 0 && s2.no < 25 ? String(s2.no) : s2.title) : '';
    if (!lab) continue;
    c.fillStyle = r.kind === 'stair' || r.id === 'EXIT' ? '#9fc3a8' : '#d8d0bf'; c.font = `${lab.length > 2 ? 11 : 15}px ${SANS}`; c.fillText(lab, X(r.cx), Z(r.cz));
  }
  if (player.room || !started) {
    const px = X(player.x), pz = Z(player.z), a = player.yaw;
    c.fillStyle = '#e8c35a'; c.beginPath(); c.moveTo(px - Math.sin(a) * 9, pz - Math.cos(a) * 9); c.lineTo(px + Math.cos(a) * 5, pz - Math.sin(a) * 5); c.lineTo(px - Math.cos(a) * 5, pz + Math.sin(a) * 5); c.closePath(); c.fill();
  }
  $('minimap-cap').textContent = `${FLOOR_NAMES[f]}平面图 · 北在上 · 虚线为参观路线${player.room ? '' : '（您在馆外）'}`;
}
// 关闭阅读页/导览后重新锁定鼠标（电脑）；只有 Esc 会释放鼠标
function closeAll(relock = true) {
  const had = uiOpen;
  $('menu').hidden = true; $('reader').hidden = true; $('lightbox').hidden = true; uiOpen = false;
  if (had) { const a = document.activeElement; if (a && a.closest && a.closest('#menu, #reader')) a.blur(); if (uiOpener && uiOpener.isConnected && uiOpener !== document.body && uiOpener.offsetParent !== null) uiOpener.focus({ preventScroll: true }); uiOpener = null; }
  if (relock && started && !isTouch && !locked()) lockPointer();
}
function toggleMenu() { if ($('menu').hidden) showUI('menu'); else closeAll(); }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeAll(true));
$('reader').addEventListener('pointerdown', (e) => { if (e.target === $('reader')) closeAll(); });
$('menu-btn').onclick = toggleMenu;

function buildMenu() {
  const body = $('menu-body');
  const mp = document.createElement('figure'); mp.className = 'minimap'; mp.innerHTML = '<canvas id="minimap"></canvas><figcaption id="minimap-cap"></figcaption>'; body.append(mp);
  const out = document.createElement('div'); out.className = 'm-hall';
  out.innerHTML = '<h3><b>广场</b>馆外 · 北门入口</h3><button class="go" type="button">回到广场</button>';
  out.querySelector('.go').onclick = () => { teleport(null); closeAll(); };
  body.append(out);
  let lastFloor = -1;
  for (const s of SECTIONS) {
    if (s.floor !== lastFloor) { lastFloor = s.floor; const ft = document.createElement('h4'); ft.className = 'm-floor'; ft.textContent = `${FLOOR_NAMES[s.floor]}　${FLOOR_TITLES[s.floor]}`; body.append(ft); }
    const d = document.createElement('details'); d.className = 'm-hall';
    const n = s.items.filter(it => it.k !== 'title' && it.k !== 'quote' && (!it.minor || it.menu)).length;
    d.innerHTML = `<summary><b>${s.no === 0 ? '序' : s.no === 25 ? '终' : s.no}</b>${esc(s.title)}<small>${s.years} · <span class="cnt"></span></small></summary><button class="go" type="button">前往此厅</button><ol></ol>`;
    d.querySelector('.go').onclick = () => { teleport(s); closeAll(); };
    const ol = d.querySelector('ol');
    for (const it of s.items) {
      if (it.k === 'title' || it.k === 'quote' || (it.minor && !it.menu)) continue;
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.textContent = itemTitle(it, s); b.onclick = () => { goToItem(s, it); openItem(s, it.idx); };
      it.menuBtn = b; if (store.read[itemKey(s, it)]) b.classList.add('read');
      li.append(b); ol.append(li);
    }
    s.menuCnt = d.querySelector('.cnt'); updateHallCount(s);
    body.append(d);
  }
}
function updateHallCount(s) {
  if (!s.menuCnt) return;
  const its = s.items.filter(it => it.k !== 'title' && it.k !== 'quote' && (!it.minor || it.menu)), r = its.filter(it => store.read[itemKey(s, it)]).length;
  s.menuCnt.textContent = r ? `已读 ${r}/${its.length}` : `${its.length} 件`;
}

// ───────────────────────── 主循环 ─────────────────────────
function tryMove(dx, dz) {
  for (const [mx, mz] of [[dx, 0], [0, dz]]) {
    const nx = player.x + mx, nz = player.z + mz;
    if (!walkable(nx, nz, player.floor)) continue;
    if (Math.abs(heightAt(nx, nz, player.floor) - heightAt(player.x, player.z, player.floor)) > 0.5) continue;
    player.x = nx; player.z = nz;
    const rp = onRamp(nx, nz, player.floor);
    if (rp) player.floor = rp.t > 0.5 ? rp.s.k + 1 : rp.s.k;
  }
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  // 竖屏时保持约 72° 的水平视野，否则手机上只能看到一条窄缝
  const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(66) / 2) * camera.aspect);
  camera.fov = hf < THREE.MathUtils.degToRad(72) ? Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(72) / 2) / camera.aspect))) : 66;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
let last = performance.now(), hintT = 0;
let lightT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (started && !uiOpen && !fading) {
    let f = 0, s = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD')) s += 1;
    if (keys.has('KeyA')) s -= 1;
    if (keys.has('ArrowLeft')) { player.yaw += 1.8 * dt; moved(); }
    if (keys.has('ArrowRight')) { player.yaw -= 1.8 * dt; moved(); }
    f -= stick.y; s += stick.x;
    const l = Math.hypot(f, s);
    if (l > 0.01) {
      const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 11 : 5.5) * dt / Math.max(1, l), sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
      tryMove((-sin * f + cos * s) * sp, (-cos * f - sin * s) * sp); moved();
      const r = roomAt(player.x, player.z, player.floor);
      if (r !== player.room) setRoom(r);
    }
    checkElevator();
  } else if (!started) {
    const a = now * 0.00004 + 2.9;
    player.x = Math.sin(a) * 190; player.z = Math.cos(a) * -190; player.yaw = Math.atan2(player.x, player.z); player.pitch = 0.0;
  }
  const ty = started ? heightAt(player.x, player.z, player.floor) + EYE : 20;
  player.y += (ty - player.y) * Math.min(1, dt * 12);
  camera.position.set(player.x, player.y, player.z); camera.rotation.set(player.pitch, player.yaw, 0);
  for (const fl of flickers) {
    const k = 0.82 + 0.18 * Math.sin(now * 0.011 + fl.seed) * Math.sin(now * 0.0037 + fl.seed * 3);
    fl.light.intensity = fl.base * k; if (fl.flame) fl.flame.scale.set(1, 0.85 + 0.3 * k, 1);
  }
  if (started && !uiOpen && now - hintT > 120) {
    hintT = now;
    const hit = (locked() || !isTouch) ? pick(0, 0) : null;
    $('hint').classList.toggle('on', !!hit);
    if (hit) $('hint').textContent = hit.userData.displayAction ? hit.userData.actionLabel : hit.userData.portraitWall ? '点击肖像，阅读其生平' : `点击阅读：${itemTitle(hit.userData.item, hit.userData.sec)}${extrasHint(hit, isTouch)}`;
    else { const t = extrasHint(null, isTouch); if (t) { $('hint').classList.add('on'); $('hint').textContent = t; } }
  }
  if (started) extrasTick(dt, now);
  if (now - lightT > 500) { lightT = now; assignLights(); }
  updateDetail(now); adaptDPR(dt);
  const tj = PROF ? performance.now() : 0;
  runJobs(now, isTouch ? 8 : 10);
  const tr = PROF ? performance.now() : 0;
  updateDaylight();
  renderer.render(scene, camera);
  if (PROF) { PROF.jobs.push(tr - tj); PROF.render.push(performance.now() - tr); }
  requestAnimationFrame(frame);
}

// ───────────────────────── 启动 ─────────────────────────
// 分步建造，每步之间让出一帧，好让加载进度条更新
const loadStep = (p, text) => { window.__loadProgress?.(p, text); return new Promise(r => setTimeout(r, 0)); };
await loadStep(60, '正在载入字体…'); await fontReady;
await loadStep(62, '正在建造馆外的广场…');
extGroup = buildExterior(scene, { B, OUTER_H, collide: extCollide });
await loadStep(66, '正在建造展厅…');
setReleaseStatic(TIGHT);
buildShell();
for (const r of ROOMS) { setLazyTex(TIGHT, r.key); buildRoom(r); }   // 内存紧的设备上，各厅较大的固定贴图按需绘制（见 util.js 的 lazyTex）
setLazyTex(false); setReleaseStatic(false);   // 之后的装置里有会重画的画布（肖像墙），不能释放
buildInstallations();
for (let i = 0; i < ROOMS.length; i++) {
  if (i % 3 === 0) await loadStep(70 + 22 * i / ROOMS.length, `正在布置展品… ${i + 1} / ${ROOMS.length}`);
  setReleaseStatic(TIGHT); setLazyTex(TIGHT, ROOMS[i].key);
  placeRoomItems(ROOMS[i]);
  setLazyTex(false); setReleaseStatic(false);
}
buildMenu();
resize();
await loadStep(93, '正在优化场景…');
// 静态几何合并：把每个展厅里不会再变化的不透明小部件按材质合成一个网格，大幅减少绘制调用
function mergeStatic(group, skip) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.visible || o.renderOrder || o.userData.item || o.userData.portraitWall) return;
    for (let p = o.parent; p && p !== group; p = p.parent) if (!p.visible || p.userData.noMerge) return;
    const m = o.material;
    if (Array.isArray(m) || m.transparent || !(m.isMeshLambertMaterial || m.isMeshBasicMaterial || m.isMeshStandardMaterial) || !o.geometry.attributes.normal) return;
    const key = m.isMeshStandardMaterial || m.aoMap ? m.uuid : [m.type, m.color.getHex(), m.map ? m.map.uuid : '', m.side, m.fog, m.depthWrite].join('|');
    if (!buckets.has(key)) buckets.set(key, { mat: m, list: [] });
    buckets.get(key).list.push(o);
  });
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const { mat, list } of buckets.values()) {
    if (list.length < 2) continue;
    let nv = 0, ni = 0;
    for (const o of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const uv1 = mat.aoMap ? new Float32Array(nv * 2) : null;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const o of list) {
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      nm.getNormalMatrix(o.matrixWorld);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
        if (uv1 && g.attributes.uv1) { uv1[(vo + i) * 2] = g.attributes.uv1.getX(i); uv1[(vo + i) * 2 + 1] = g.attributes.uv1.getY(i); }
        if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
      else for (let i = 0; i < P.count; i++) idx[io + i] = vo + i;
      io += g.index ? g.index.count : P.count; vo += P.count;
      o.parent.remove(o); g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (uv1) geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
    group.add(new THREE.Mesh(geo, mat));
  }
}
{
  const skip = new Set([...Object.values(interactive).flat(), ...Object.values(lazy).flat().flatMap(it => [it.mesh, it.capMesh]).filter(Boolean), ...[...VLIGHTS.values()].flat().map(v => v.flame).filter(Boolean)]);
  for (const g of [...Object.values(roomGroups), G12, G23, extGroup, shellGroup]) mergeStatic(g, skip);
  for (const g of [extGroup, shellGroup]) g.traverse(o => {
    if (!o.isMesh) return;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    if (!materials.some(m => !m.isMeshBasicMaterial && !m.transparent)) return;
    o.receiveShadow = true;
    o.castShadow = o.name !== 'groundPlane' && o.name !== 'plazaPlane';
  });
  // 展项、展签、标语等不平铺的贴图取样偏清晰（见 SHARP_MAP）
  for (const g of [...Object.values(roomGroups), G12, G23, extGroup, shellGroup]) g.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) if (m && (o.userData.item || (m.map && m.map.wrapS !== THREE.RepeatWrapping))) sharpen(m);
  });
  for (const list of Object.values(lazy)) for (const it of list) for (const m of [it.mesh, it.capMesh]) if (m && m.material && !Array.isArray(m.material) && !m.material.map) { sharpen(m.material); m.material.map = DUMMY_MAP; }
  // 建筑和展品都不会动：算好一次变换矩阵后不再每帧重算（会动的只有烛火）
  scene.updateMatrixWorld(true);
  const flames = new Set([...VLIGHTS.values()].flat().map(v => v.flame).filter(Boolean));
  for (const g of [...floors, G12, G23, extGroup, shellGroup]) if (g) g.traverse(o => { if (!flames.has(o)) o.matrixAutoUpdate = false; });
}
// 启动时一次性编译全部材质的着色器，避免第一次看到某类材质时卡顿
await loadStep(97, '正在准备渲染…');
try {
  // 有并行编译扩展时用 compileAsync：着色器在后台编译，界面不卡、进度条照常更新
  let k = 0;
  for (const [sunOn, ptsOn] of [[true, true], [false, true], [false, false]]) {
    sun.visible = sunOn; poolS.forEach(l => { l.visible = !sunOn; }); poolP.forEach(l => { l.visible = ptsOn; });
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
    window.__loadProgress?.(97 + ++k, '正在准备渲染…');
  }
  sun.visible = true; poolS.forEach(l => { l.visible = false; }); poolP.forEach(l => { l.visible = true; });
} catch (e) { console.warn(e); }
// 预先把所有展厅的几何体上传到显卡：否则第一次走进某个展厅时，那一帧要上传整厅的顶点数据而卡顿。
// 放在“步入展馆”按钮出现之后再做（参观者读开场页的时候），首屏更快
function preUpload() { try {
  const saved = [], culled = [];
  for (const g of [...floors, ...Object.values(roomGroups), G12, G23]) { saved.push([g, g.visible]); g.visible = true; }
  scene.traverse(o => { if (o.isMesh || o.isInstancedMesh || o.isLine) { culled.push([o, o.frustumCulled]); o.frustumCulled = false; } });
  const size = renderer.getSize(new THREE.Vector2()); renderer.setSize(32, 18, false); renderer.render(scene, camera); renderer.setSize(size.x, size.y, false);
  for (const [o, v] of culled) o.frustumCulled = v; for (const [g, v] of saved) g.visible = v;
} catch (e) { console.warn(e); } }
window.__loadProgress?.(100, '');
$('loader').hidden = true; window.__loadReady?.();
if (!TIGHT) setTimeout(preUpload, 60);   // 低内存设备不一次上传全馆（那是 iOS 上崩溃的主要原因），走到哪里传哪里
floors[1].visible = floors[2].visible = false; G12.visible = G23.visible = false;
ensureTextures(null);
function start(id) {
  started = true; $('intro').hidden = true; $('hud').hidden = false; teleport(id ? SECTIONS.find(s => s.room === id) || null : null);
  extrasStart(id);
}
$('enter-btn').onclick = () => { start(); if (!isTouch) lockPointer(); };
initChat();
initExtras({ SECTIONS, player, scene, camera, heightAt, keys, openItem, closeAll, reading: () => reading, lookHit: () => ((locked() || !isTouch) ? pick(0, 0) : null) });
// 加载完自动进馆：从北门台阶出发（网址带 #H12 之类的片段时直接进入那个展厅）。电脑上点一下画面即可用鼠标转向
{ const h = location.hash.slice(1).toUpperCase(); start(SECTIONS.find(s => s.room === h) ? h : undefined); }
window.__plan = { DOORS, STAIRS };
window.__scene = scene; window.__camera = camera; window.__THREE_Basic = THREE.MeshBasicMaterial;
window.__museum = { LAZY, spotOf, goToItem, workerStats: () => { for (const w of WORKERS) w.postMessage({ stats: 1 }); return WORKERS.map(w => w.stats); }, player, teleport, teleportTo, tryMove, roomAt, heightAt, walkable, openItem, SECTIONS, ROOMS, start, setRoom, ...extrasDebug };
requestAnimationFrame(frame);
