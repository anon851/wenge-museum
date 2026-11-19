// 画布文字工具：不依赖 three.js，主线程和绘制线程（drawworker.js）共用。
export const FONT = '"MuseumSerif","Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun","WenQuanYi Zen Hei",serif';
export const SANS = '"Noto Sans SC","PingFang SC","Microsoft YaHei","WenQuanYi Zen Hei",sans-serif';

// 在主线程用 <canvas>，在绘制线程里用 OffscreenCanvas
export function textCanvas(w, h, draw) {
  const cv = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(w, h);
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  return cv;
}
// 带文字的固定贴图按两倍像素画（单边不超过 4096），绘制函数仍按原来的逻辑尺寸写
// 低内存设备（iOS 等）把固定贴图的像素降下来：HD_MUL 乘到放大倍数上，HD_MAX 是单边上限
let HD_MUL = 1, HD_MAX = 4096;
export function setCanvasBudget(mul, max) { HD_MUL = mul; HD_MAX = max; }
export const canvasMax = () => HD_MAX;
export function hdCanvas(w, h, draw, k = 2) {
  k = Math.min(k * HD_MUL, HD_MAX / Math.max(w, h));
  if (k <= 1) return textCanvas(w, h, draw);
  return textCanvas(Math.round(w * k), Math.round(h * k), (c) => { c.scale(k, k); draw(c, w, h); });
}

export const NO_HEAD = '，。、；：！？）》」”’…—·';
// 逐字量宽很慢：按字体缓存每个字的宽度
const widthCache = new Map();
function charWidth(ctx, ch) {
  let m = widthCache.get(ctx.font); if (!m) { m = new Map(); widthCache.set(ctx.font, m); if (widthCache.size > 200) widthCache.delete(widthCache.keys().next().value); }
  let w = m.get(ch); if (w === undefined) { w = ctx.measureText(ch).width; m.set(ch, w); }
  return w;
}
export function layout(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '', w = 0;
    for (const ch of para) {
      const cw = charWidth(ctx, ch);
      if (w + cw > maxW && line && !NO_HEAD.includes(ch)) { out.push(line); line = ''; w = 0; }
      line += ch; w += cw;
    }
    out.push(line);
  }
  return out;
}
// 在给定区域内自动缩小字号排版，返回 {fs, lh, lines}
export function fit(ctx, text, maxW, maxH, fsMax, fsMin, font, lhK = 1.55) {
  let fs = fsMax, lines, lh;
  for (; fs >= fsMin; fs -= 1) {
    ctx.font = `${fs}px ${font}`; lh = Math.round(fs * lhK);
    lines = layout(ctx, text, maxW);
    if (lines.length * lh <= maxH) break;
  }
  const max = Math.max(1, Math.floor(maxH / lh));
  if (lines.length > max) { lines = lines.slice(0, max); lines[max - 1] = lines[max - 1].slice(0, -6) + '……（全文）'; }
  return { fs, lh, lines };
}
