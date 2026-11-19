// 绘制线程：在 OffscreenCanvas 上画展板、展柜等的画布，画好后把位图交回主线程，主线程只负责上传贴图。
// 位图在这里先上下翻转（WebGL 上传 ImageBitmap 时不会再翻转）。图片参数以 ImageBitmap 传入。
// 任务按优先级处理（近处的清晰贴图、当前展厅优先），过时的任务可以撤销。
import * as D from './draw.js';
const q = []; let busy = false;
// 图片：主线程只传地址，这里下载、解码并缓存最近用过的。缓存按解码后的字节数设上限（主线程用 cfg 消息设定；
// iOS 等内存紧的设备上限小，并把超大的原图缩到单边 maxSide 像素以内：手机屏幕上看不出差别，内存只占几分之一）
const imgCache = new Map(), sizes = new Map(), inUse = new Set();
let CACHE_MAX = 320e6, MAX_SIDE = 0, cacheBytes = 0;
async function decode(blob) {
  const bm = await createImageBitmap(blob);
  const k = MAX_SIDE ? Math.min(1, MAX_SIDE / Math.max(bm.width, bm.height)) : 1;
  if (k >= 1 || typeof OffscreenCanvas === 'undefined') return bm;
  const w = Math.max(1, Math.round(bm.width * k)), h = Math.max(1, Math.round(bm.height * k)), cv = new OffscreenCanvas(w, h), c = cv.getContext('2d');
  c.imageSmoothingQuality = 'high'; c.drawImage(bm, 0, 0, w, h); bm.close();
  return cv.transferToImageBitmap();
}
function trimCache() {
  for (const [k, p] of imgCache) {
    if (cacheBytes <= CACHE_MAX) break;
    if (inUse.has(p) || !sizes.has(p)) continue;   // 正在画的任务要用的、还没解码完的不丢
    imgCache.delete(k); cacheBytes -= sizes.get(p); sizes.delete(p); p.then(b => b && b.close());
  }
}
function getImage(url) {
  let p = imgCache.get(url);
  if (!p) {
    const once = () => fetch(url).then(r => r.ok ? r.blob() : null).then(b => b ? decode(b) : null).catch(() => null);
    p = once().then(b => b || new Promise(r => setTimeout(r, 800)).then(once));   // 失败重试一次
    p.then(b => {
      if (imgCache.get(url) !== p) return;
      if (!b) { imgCache.delete(url); return; }   // 失败的不留在缓存里，下次再取
      const n = b.width * b.height * 4; sizes.set(p, n); cacheBytes += n; trimCache();
    });
    imgCache.set(url, p);
  }
  else { imgCache.delete(url); imgCache.set(url, p); }
  inUse.add(p);
  return p;
}
let missing = 0;   // 本次任务里没能取到的图片数：报回主线程，稍后重画
async function resolveImages(a) {
  if (a && a.__img) { const b = await getImage(a.__img); if (!b) missing++; return b; }
  if (Array.isArray(a)) return Promise.all(a.map(resolveImages));
  if (a && typeof a === 'object' && Object.getPrototypeOf(a) === Object.prototype) { const o = {}; for (const k of Object.keys(a)) o[k] = await resolveImages(a[k]); return o; }
  return a;
}
let fontsReady = Promise.resolve(), fontsArrive = null;   // 主线程传来的字体装好之前不开始画
self.onmessage = (e) => {
  const d = e.data;
  if (d.cfg) { CACHE_MAX = d.cfg.cacheBytes || CACHE_MAX; MAX_SIDE = d.cfg.maxSide || 0; trimCache(); return; }
  if (d.stats) { self.postMessage({ stats: { cacheBytes, n: imgCache.size } }); return; }
  if (d.fontsPending) { fontsReady = new Promise(r => { fontsArrive = r; }); setTimeout(() => fontsArrive && fontsArrive(), 15000); return; }   // 字体还在路上：先等着（最多 15 秒）
  if (d.fonts) { const done = fontsArrive || (() => {}); fontsArrive = null;
    if (self.fonts && typeof FontFace !== 'undefined' && d.fonts.length) Promise.all(d.fonts.map(([w, b]) => { const f = new FontFace('MuseumSerif', b, { weight: w }); self.fonts.add(f); return f.load(); })).catch(() => {}).then(done); else done(); return; }
  if (d.repri) { for (const x of q) if (d.repri.includes(x.id)) x.pri = Math.max(x.pri, d.pri); return; }
  if (d.cancel) { for (const id of d.cancel) { const i = q.findIndex(x => x.id === id); if (i >= 0) { const [x] = q.splice(i, 1); closeBitmaps(x.args); self.postMessage({ id, cancelled: true }); } } return; }
  q.push(d); if (!busy) pump();
};
async function pump() {
  busy = true;
  while (q.length) {
    let bi = 0; for (let i = 1; i < q.length; i++) if (q[i].pri > q[bi].pri) bi = i;
    const { id, fn, args } = q.splice(bi, 1)[0];
    await fontsReady;
    try {
      missing = 0;
      const cv = D[fn](...(await Promise.all(args.map(resolveImages))));
      const bm = await createImageBitmap(cv, { imageOrientation: 'flipY' });
      self.postMessage({ id, bm, missing }, [bm]);
    } catch (err) { self.postMessage({ id, err: String(err && err.message || err) }); }
    closeBitmaps(args);   // 只关闭随消息转来的位图；缓存里的图片留着
    inUse.clear(); trimCache();
    await new Promise(r => setTimeout(r, 0));   // 让新到的（可能更紧急的）任务先排进来
  }
  busy = false;
}
function closeBitmaps(a) {
  if (typeof ImageBitmap !== 'undefined' && a instanceof ImageBitmap) a.close();
  else if (Array.isArray(a)) a.forEach(closeBitmaps);
  else if (a && typeof a === 'object' && Object.getPrototypeOf(a) === Object.prototype) Object.values(a).forEach(closeBitmaps);
}
