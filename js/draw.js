// 各类展项的画布绘制。K 为分辨率系数。
import { FONT, SANS, textCanvas, layout, fit, canvasMax } from './textutil.js';

const INK = '#1c1a17', SUB = '#6d665a', PAPER = '#ece7da';

function scaled(w, h, K, draw) {
  K = Math.min(K, Math.min(3072, canvasMax()) / Math.max(w, h));   // 单边不超过 3072 像素：再大上传显卡时会明显卡顿
  return textCanvas(Math.round(w * K), Math.round(h * K), (c) => { c.scale(K, K); c.textBaseline = 'top'; draw(c, w, h); });
}

// 文字展板 640×806（2.3m × 2.9m）
export function drawPanel(item, hall, K) {
  const dark = hall.theme.darkPanel;
  const bg = dark ? '#19191b' : PAPER, fg = dark ? '#e4ddcc' : INK, sub = dark ? '#989080' : SUB, acc = hall.theme.accent;
  return scaled(640, 806, K, (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = acc; c.fillRect(44, 44, 46, 5);
    c.fillStyle = sub; c.font = `17px ${SANS}`;
    c.fillText(item.d || '', 44, 62);
    c.fillStyle = fg;
    let ts = 40; c.font = `bold ${ts}px ${FONT}`;
    while (c.measureText(item.t).width > W - 88 && ts > 24) { ts -= 1; c.font = `bold ${ts}px ${FONT}`; }
    c.fillText(item.t, 44, 92);
    const top = 166, bottom = H - 40;
    const barsH = item.bars ? item.bars.length * 46 + 24 : 0;
    const f = fit(c, item.b, W - 88, bottom - top - barsH, 27, 15, FONT, 1.62);
    c.font = `${f.fs}px ${FONT}`; c.fillStyle = fg;
    f.lines.forEach((l, i) => c.fillText(l, 44, top + i * f.lh));
    if (item.bars) {
      const y0 = top + f.lines.length * f.lh + 22, maxV = Math.max(...item.bars.map(b => b.v));
      item.bars.forEach((b, i) => {
        const y = y0 + i * 46;
        c.font = `16px ${SANS}`; c.fillStyle = fg; c.fillText(b.l, 44, y);
        const bw = Math.max(3, (b.v / maxV) * (W - 88));
        c.fillStyle = dark ? '#3a3a3d' : '#d8d1c0'; c.fillRect(44, y + 22, W - 88, 9);
        c.fillStyle = dark ? '#b23b3b' : '#7a1f1f'; c.fillRect(44, y + 22, bw, 9);
        c.font = `15px ${SANS}`; c.fillStyle = sub; c.textAlign = 'right';
        c.fillText(b.n + (i === 0 && item.unit ? `（${item.unit}）` : ''), W - 44, y + 1); c.textAlign = 'left';
      });
    }
  });
}

// 人物生平 560×812（2.0m × 2.9m）。img 为已加载的 Image 或 null
export function drawBio(item, hall, K, img) {
  return scaled(560, 812, K, (c, W, H) => {
    c.fillStyle = '#e9e4d7'; c.fillRect(0, 0, W, H);
    let y = 40;
    if (img) {
      const pw = 190, ph = 240, r = Math.max(pw / img.width, ph / img.height);
      const sw = pw / r, sh = ph / r;
      c.save(); c.filter = 'grayscale(1) contrast(1.05)';
      c.drawImage(img, (img.width - sw) / 2, Math.max(0, (img.height - sh) * 0.3), sw, sh, 40, 40, pw, ph);
      c.restore();
      c.strokeStyle = '#1c1a17'; c.lineWidth = 1; c.strokeRect(40, 40, pw, ph);
      c.fillStyle = INK; c.font = `bold 38px ${FONT}`;
      const nameLines = layout(c, item.name, W - 40 - 250);
      nameLines.forEach((l, i) => c.fillText(l, 250, 46 + i * 46));
      let yy = 46 + nameLines.length * 46 + 8;
      c.fillStyle = '#7a1f1f'; c.font = `20px ${SANS}`; c.fillText(item.life, 250, yy); yy += 34;
      c.fillStyle = SUB; c.font = `17px ${SANS}`;
      layout(c, item.role, W - 40 - 250).forEach((l, i) => c.fillText(l, 250, yy + i * 24));
      y = 40 + ph + 26;
    } else {
      c.fillStyle = '#7a1f1f'; c.fillRect(40, 44, 5, 92);
      c.fillStyle = INK; let ns = 44; c.font = `bold ${ns}px ${FONT}`;
      while (c.measureText(item.name).width > W - 100 && ns > 24) { ns -= 1; c.font = `bold ${ns}px ${FONT}`; }
      c.fillText(item.name, 60, 44);
      c.fillStyle = '#7a1f1f'; c.font = `20px ${SANS}`; c.fillText(item.life, 60, 100);
      c.fillStyle = SUB; c.font = `17px ${SANS}`; c.textAlign = 'right'; c.fillText(item.role, W - 40, 102); c.textAlign = 'left';
      y = 166;
    }
    c.fillStyle = '#cfc7b4'; c.fillRect(40, y - 12, W - 80, 1);
    const f = fit(c, item.b, W - 80, H - 36 - y, 24, 14, FONT, 1.62);
    c.font = `${f.fs}px ${FONT}`; c.fillStyle = INK;
    f.lines.forEach((l, i) => c.fillText(l, 40, y + i * f.lh));
  });
}

// 墙面引文 1024×360（4.6m × 1.62m），透明底
export function drawQuote(item, hall, K) {
  return scaled(1024, 360, K, (c, W, H) => {
    c.fillStyle = hall.theme.accentLight; c.font = `bold 120px ${FONT}`; c.fillText('“', 0, -8);
    c.fillStyle = hall.theme.wallText;
    const f = fit(c, item.q, W - 110, H - 80, 40, 22, FONT, 1.5);
    c.font = `${f.fs}px ${FONT}`;
    f.lines.forEach((l, i) => c.fillText(l, 90, 18 + i * f.lh));
    c.fillStyle = hall.theme.wallSub; c.font = `19px ${SANS}`; c.textAlign = 'right';
    const by = layout(c, '—— ' + item.by, W - 110);
    by.forEach((l, i) => c.fillText(l, W - 10, Math.min(H - 30 - (by.length - 1 - i) * 26, 30 + f.lines.length * f.lh + i * 26)));
  });
}

// 展厅导言墙 1024×700（5.0m × 3.42m），透明底
export function drawTitle(hall, K) {
  return scaled(1024, 700, K, (c, W, H) => {
    const th = hall.theme;
    c.fillStyle = th.wallSub; c.font = `22px ${SANS}`;
    c.fillText(hall.part || '', 0, 6);
    c.fillStyle = th.accentLight;
    if (typeof hall.no === 'number' && hall.no > 0) { c.font = `bold 150px ${FONT}`; c.fillText(String(hall.no).padStart(2, '0'), -6, 40); }
    const tx = typeof hall.no === 'number' && hall.no > 0 ? 200 : 0;
    c.fillStyle = th.wallText;
    let ts = 86; c.font = `bold ${ts}px ${FONT}`;
    while (c.measureText(hall.title).width > W - tx && ts > 40) { ts -= 2; c.font = `bold ${ts}px ${FONT}`; }
    c.fillText(hall.title, tx, 62);
    c.fillStyle = th.wallSub; c.font = `30px ${SANS}`; c.fillText(hall.years, tx + 4, 62 + ts + 14);
    c.fillStyle = th.accentLight; c.fillRect(0, 250, 90, 4);
    c.fillStyle = th.wallText;
    const f = fit(c, hall.intro, W - 80, H - 290, 31, 20, FONT, 1.7);
    c.font = `${f.fs}px ${FONT}`;
    f.lines.forEach((l, i) => c.fillText(l, 0, 282 + i * f.lh));
  });
}

// 照片说明牌 512×132
export function drawCaption(photo, K, w = 512) {
  return scaled(w, 132, K, (c, W, H) => {
    c.fillStyle = '#f2eee4'; c.fillRect(0, 0, W, H);
    const credit = fit(c, photo.credit || '', W - 40, 32, 13, 10, SANS, 1.22);
    const ruleY = H - 11 - credit.lines.length * credit.lh - 7;
    const cap = fit(c, photo.cap, W - 40, ruleY - 19, 20, 12, FONT, 1.38);
    c.font = `${cap.fs}px ${FONT}`; c.fillStyle = INK;
    cap.lines.forEach((l, i) => c.fillText(l, 20, 12 + i * cap.lh));
    c.fillStyle = '#c8c0b0'; c.fillRect(20, ruleY, W - 40, 1);
    c.fillStyle = SUB; c.font = `${credit.fs}px ${SANS}`;
    credit.lines.forEach((l, i) => c.fillText(l, 20, ruleY + 6 + i * credit.lh));
  });
}

// 展柜说明牌 420×150
export function drawLabel(item, K) {
  return scaled(420, 150, K, (c, W, H) => {
    c.fillStyle = '#e9e4d7'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#7a1f1f'; c.fillRect(18, 18, 4, 30);
    c.fillStyle = INK; let ts = 23; c.font = `bold ${ts}px ${FONT}`;
    const tl = layout(c, item.t, W - 60).slice(0, 2);
    tl.forEach((l, i) => c.fillText(l, 32, 18 + i * 28));
    c.fillStyle = SUB;
    const f = fit(c, item.b, W - 50, H - 34 - tl.length * 28, 14, 12, FONT, 1.45);
    c.font = `${f.fs}px ${FONT}`;
    f.lines.forEach((l, i) => c.fillText(l, 32, 24 + tl.length * 28 + i * f.lh));
  });
}

// 门边导向文字（透明底）
export function drawWayfinding(text, sub, color, subColor, K) {
  return scaled(640, 120, K, (c, W, H) => {
    c.textAlign = 'center';
    c.fillStyle = color; let ts = 44; c.font = `bold ${ts}px ${FONT}`;
    while (c.measureText(text).width > W - 20 && ts > 20) { ts -= 2; c.font = `bold ${ts}px ${FONT}`; }
    c.fillText(text, W / 2, 14);
    c.fillStyle = subColor; c.font = `20px ${SANS}`; c.fillText(sub || '', W / 2, 78);
  });
}

// ── 第三版新增样式 ──

// 横幅展板 3.8m × 2.6m（1024×700）：两栏正文，图表放大
export function drawPanelWide(item, hall, K) {
  const dark = hall.theme.darkPanel;
  const bg = dark ? '#18181a' : '#e9e4d7', fg = dark ? '#e4ddcc' : INK, sub = dark ? '#989080' : SUB, acc = hall.theme.accent;
  return scaled(1024, 700, K, (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = acc; c.fillRect(0, 0, 14, H);
    c.fillStyle = sub; c.font = `18px ${SANS}`; c.fillText(item.d || '', 60, 44);
    c.fillStyle = fg; let ts = 46; c.font = `bold ${ts}px ${FONT}`;
    while (c.measureText(item.t).width > W - 120 && ts > 26) { ts -= 1; c.font = `bold ${ts}px ${FONT}`; }
    c.fillText(item.t, 60, 72);
    c.fillStyle = dark ? '#3a3a3d' : '#cfc7b4'; c.fillRect(60, 140, W - 120, 1);
    const top = 164, colW = (W - 120 - 40) / 2;
    if (item.bars) {
      const f = fit(c, item.b, colW, H - top - 40, 22, 14, FONT, 1.6);
      c.font = `${f.fs}px ${FONT}`; c.fillStyle = fg;
      f.lines.forEach((l, i) => c.fillText(l, 60, top + i * f.lh));
      const x0 = 60 + colW + 40, maxV = Math.max(...item.bars.map(b => b.v)), rowH = Math.min(78, (H - top - 50) / item.bars.length);
      item.bars.forEach((b, i) => {
        const y = top + i * rowH;
        c.font = `17px ${SANS}`; c.fillStyle = fg; c.fillText(b.l, x0, y);
        const bw = Math.max(4, (b.v / maxV) * colW);
        c.fillStyle = dark ? '#33333a' : '#d8d1c0'; c.fillRect(x0, y + 26, colW, 18);
        c.fillStyle = dark ? '#b23b3b' : '#7a1f1f'; c.fillRect(x0, y + 26, bw, 18);
        c.font = `15px ${SANS}`; c.fillStyle = sub; c.fillText(b.n, x0, y + 50);
      });
      if (item.unit) { c.font = `14px ${SANS}`; c.fillStyle = sub; c.fillText('单位：' + item.unit, x0, H - 36); }
    } else {
      // 两栏排版
      let fs = 25, lines, lh, per;
      for (; fs >= 15; fs--) {
        c.font = `${fs}px ${FONT}`; lh = Math.round(fs * 1.62);
        lines = layout(c, item.b, colW); per = Math.floor((H - top - 40) / lh);
        if (lines.length <= per * 2) break;
      }
      if (lines.length > per * 2) { lines = lines.slice(0, per * 2); lines[per * 2 - 1] = lines[per * 2 - 1].slice(0, -6) + '……（全文）'; }
      c.fillStyle = fg;
      lines.forEach((l, i) => c.fillText(l, 60 + (i < per ? 0 : colW + 40), top + (i % per) * lh));
    }
  });
}

// 墙面直印文字（透明底），3.2m × 3.0m（880×825）
export function drawWallText(item, hall, K) {
  const th = hall.theme;
  return scaled(880, 825, K, (c, W0, H0) => {
    // 直接印在墙上的文字：在斑驳的墙面（夯土、黄土、水泥）上加一层半透明衬底，保证对比度
    const P = 28, W = W0 - 2 * P, H = H0 - 2 * P;
    const hex = (th.wallText || '#222').replace('#', ''), v = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex.slice(0, 6), 16);
    const lightText = ((v >> 16) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11) > 128;
    const f0 = fit(c, item.b, W - 10, H - 160, 26, 15, FONT, 1.72);
    const bottom = Math.min(H0, P + 148 + f0.lines.length * f0.lh + P * 0.6);
    c.fillStyle = lightText ? 'rgba(20,17,14,0.9)' : 'rgba(246,241,231,0.93)'; c.fillRect(0, 0, W0, bottom);
    const ink = lightText ? '#f1ebdd' : '#1b1814', sub = lightText ? '#b9b0a0' : '#5a5348';
    c.translate(P, P);
    c.fillStyle = th.accentLight; c.fillRect(0, 6, 70, 5);
    c.fillStyle = sub; c.font = `20px ${SANS}`; c.fillText(item.d || '', 0, 26);
    c.fillStyle = ink; let ts = 50; c.font = `bold ${ts}px ${FONT}`;
    while (c.measureText(item.t).width > W && ts > 28) { ts -= 1; c.font = `bold ${ts}px ${FONT}`; }
    c.fillText(item.t, 0, 62);
    const f = fit(c, item.b, W - 10, H - 160, 26, 15, FONT, 1.72);
    c.font = `${f.fs}px ${FONT}`;
    f.lines.forEach((l, i) => c.fillText(l, 0, 148 + i * f.lh));
  });
}

// 人物展柜 3.4m × 3.0m（900×794）：左侧肖像，右侧生平
export function drawBioCase(item, hall, K, img) {
  return scaled(900, 794, K, (c, W, H) => {
    c.fillStyle = '#1a1817'; c.fillRect(0, 0, W, H);
    const px = 44, py = 44, pw = 290, ph = 380;
    if (img && img.ov) { c.fillStyle = '#2a2826'; c.fillRect(px, py, pw, ph); }   // 肖像单独贴在画布前
    else if (img) {
      const r = Math.max(pw / img.width, ph / img.height), sw = pw / r, sh = ph / r;
      c.save(); c.filter = 'grayscale(1) contrast(1.08) brightness(1.02)';
      c.drawImage(img, (img.width - sw) / 2, Math.max(0, (img.height - sh) * 0.3), sw, sh, px, py, pw, ph);
      c.restore();
    } else {
      c.fillStyle = '#2a2826'; c.fillRect(px, py, pw, ph);
      c.fillStyle = '#5e5850'; c.font = `bold 150px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText([...item.name][0], px + pw / 2, py + ph / 2 - 10);
      c.font = `16px ${SANS}`; c.fillStyle = '#7d766b'; c.fillText('没有可用的照片', px + pw / 2, py + ph - 30);
      c.textAlign = 'left'; c.textBaseline = 'top';
    }
    c.strokeStyle = '#6d665a'; c.lineWidth = 1; c.strokeRect(px, py, pw, ph);
    c.fillStyle = '#e9e2cf'; let ns = 64; c.font = `bold ${ns}px ${FONT}`;
    const tx = px + pw + 40, tw = W - tx - 44;
    while (c.measureText(item.name).width > tw && ns > 30) { ns -= 2; c.font = `bold ${ns}px ${FONT}`; }
    c.fillText(item.name, tx, 40);
    c.fillStyle = '#c9a961'; c.font = `26px ${SANS}`; c.fillText(item.life, tx, 46 + ns + 10);
    c.fillStyle = '#a39d90'; c.font = `19px ${SANS}`;
    const rl = layout(c, item.role, tw).slice(0, 2); rl.forEach((l, i) => c.fillText(l, tx, 46 + ns + 52 + i * 26));
    const y0 = 46 + ns + 60 + rl.length * 26 + 14;
    c.fillStyle = '#4a4540'; c.fillRect(tx, y0 - 10, tw, 1);
    // 正文先填右栏，再填肖像下方的整行
    c.fillStyle = '#d8d1c0';
    let fs = 21, lines1, lines2, lh;
    for (; fs >= 13; fs--) {
      c.font = `${fs}px ${FONT}`; lh = Math.round(fs * 1.6);
      const n1 = Math.floor((py + ph - y0) / lh), all = layout(c, item.b, tw);
      // 估算：右栏 n1 行，下方全宽
      const first = [], rest = [];
      let used = 0;
      for (const para of item.b.split('\n')) {
        const pl = layout(c, para, tw);
        if (used + pl.length <= n1) { first.push(...pl); used += pl.length; }
        else rest.push(para);
      }
      const restLines = layout(c, rest.join('\n'), W - 88);
      const n2 = Math.floor((H - 40 - (py + ph + 26)) / lh);
      lines1 = first; lines2 = restLines;
      if (restLines.length <= n2 || fs === 13) { if (restLines.length > n2) { lines2 = restLines.slice(0, n2); lines2[n2 - 1] = lines2[n2 - 1].slice(0, -6) + '……（全文）'; } break; }
      void all;
    }
    c.font = `${fs}px ${FONT}`;
    lines1.forEach((l, i) => c.fillText(l, tx, y0 + i * lh));
    lines2.forEach((l, i) => c.fillText(l, px, py + ph + 26 + i * lh));
  });
}

// 大型章节标志（门楣上方、透明底）
export function drawPortal(no, title, years, color, sub, accent, K) {
  return scaled(1024, 220, K, (c, W) => {
    c.textAlign = 'center';
    if (no) { c.fillStyle = accent; c.font = `bold 64px ${FONT}`; c.fillText(no, W / 2, 6); }
    c.fillStyle = color; let ts = 66; c.font = `bold ${ts}px ${FONT}`;
    while (c.measureText(title).width > W - 40 && ts > 30) { ts -= 2; c.font = `bold ${ts}px ${FONT}`; }
    c.fillText(title, W / 2, no ? 78 : 40);
    c.fillStyle = sub; c.font = `26px ${SANS}`; c.fillText(years || '', W / 2, no ? 160 : 122);
  });
}

// 文物展柜（历史素材库）：深色衬底上陈列 1—6 件影像，带编号；下方为展品清单。200 像素 / 米
// 图片单独贴在画布前（叠加平面，主线程直接用图片做贴图，和墙上照片一样第一时间显示）时，画布这边只收到占位标记 {ow, oh, ov}：
// 画框、衬纸、阴影和编号照画，图片区留暗色。槽位由下面的函数算出，主线程用同一套函数摆放叠加平面，两边严格对齐。
const dimsOf = (im) => (im.ov ? [im.ow, im.oh] : [im.width, im.height]);
export function fitRect(x, y, w, h, iw, ih) { const s = Math.min(w / iw, h / ih), dw = iw * s, dh = ih * s; return [x + (w - dw) / 2, y + (h - dh) / 2, dw, dh]; }
// 展柜（200 像素/米）：返回每个图片槽 [x, y, w, h, 编号]；c 用来量导读文字（主角文献的版式要知道导读占几行）
export function caseSlots(item, W, H, nimg, c) {
  const objs = item.objs, n = objs.length, LAB = item.hero ? 0 : Math.min(150, 40 + Math.ceil(n / 2) * 30), top = 78, bottom = H - LAB - 18;
  if (item.hero) {
    const pw = W * 0.56, x = pw + 10, tw = W - x - 30, out = [[30, top, pw - 40, bottom - top, '']];
    const f = fit(c, item.n, tw, 150, 21, 14, FONT, 1.6), ty = top + 36 + f.lines.length * f.lh + 18, th = Math.max(60, bottom - ty - 34), k = Math.min(3, nimg - 1);
    for (let i = 0; i < k; i++) out.push([x + i * (tw / 3), ty, tw / 3 - 14, th, '']);
    return { slots: out, LAB, top, bottom, f, x, tw };
  }
  const cols = n <= 3 ? n : Math.ceil(n / 2), rows = n <= 3 ? 1 : 2, cw = (W - 50) / cols, rh = (bottom - top) / rows;
  return { slots: objs.map((o, i) => [25 + (i % cols) * cw + 14, top + Math.floor(i / cols) * rh + 8, cw - 28, rh - 22, String(i + 1)]), LAB, top, bottom };
}
// 平柜（400 像素/米）
export function tcaseSlots(n, W, H) { const cw = W / n, top = 18, bh = H - 120 - top; return Array.from({ length: n }, (_, i) => [i * cw + 22, top, cw - 44, bh]); }
// 档案框（200 像素/米）
// 专题台照片区（1200×950 画布）
export function featureSlots(n) { const vx = 40, vy = 200, vw = 680, vh = 500, capH = 40, each = (vh - (n - 1) * 16) / n - capH; return Array.from({ length: n }, (_, i) => [vx, vy + i * (each + capH + 16), vw, each]); }
// 档案柜屏幕的缩略图格（4×3）
export function archiveSlots(W, H) { const cols = 4, rows = 3, top = 80, bottom = H - 56, cw = (W - 40) / cols, rh = (bottom - top) / rows; return Array.from({ length: cols * rows }, (_, i) => [20 + (i % cols) * cw + 8, top + Math.floor(i / cols) * rh + 6, cw - 16, rh - 12]); }
export function archSlot(W, H) { const lab = 92, m = 16; return [m, m, W - 2 * m, H - lab - 2 * m]; }
export function drawCase(item, hall, K, imgs, wm, hm) {
  const W0 = Math.round(wm * 200), H0 = Math.round(hm * 200);
  return scaled(W0, H0, K, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#34302b'); g.addColorStop(0.5, '#25221f'); g.addColorStop(1, '#1b1917');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    const acc = hall.theme.accentLight || '#b0402f', objs = item.objs, n = objs.length;
    c.fillStyle = acc; c.fillRect(28, 26, 5, 34);
    c.fillStyle = '#efe7d6'; let ts = 30; c.font = `bold ${ts}px ${FONT}`;
    while (c.measureText(item.t).width > W - 200 && ts > 18) { ts--; c.font = `bold ${ts}px ${FONT}`; }
    c.fillText(item.t, 44, 26 + (34 - ts) / 2);
    c.fillStyle = '#a99f8c'; c.font = `15px ${SANS}`; c.textAlign = 'right';
    c.fillText(item.hero ? `文献 · ${objs[0].img.length} 页` : `展柜 · ${n} 件`, W - 28, 36); c.textAlign = 'left';
    c.font = `15px ${SANS}`;
    const L = caseSlots(item, W, H, imgs.length, c), { LAB, top, bottom } = L;
    const mount = (im, x, y, w, h, no) => {
      if (!im) { c.fillStyle = '#3a3631'; c.fillRect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.8); return; }
      const [iw, ih] = dimsOf(im), [dx, dy, dw, dh] = fitRect(x, y, w, h, iw, ih);
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(dx + 5, dy + 7, dw, dh);
      c.fillStyle = '#e8e2d4'; c.fillRect(dx - 6, dy - 6, dw + 12, dh + 12);
      if (im.ov) { c.fillStyle = '#3a3631'; c.fillRect(dx, dy, dw, dh); } else c.drawImage(im, dx, dy, dw, dh);
      if (no) { c.fillStyle = '#efe7d6'; c.beginPath(); c.arc(dx - 2, dy + dh + 2, 13, 0, 7); c.fill(); c.fillStyle = '#1b1917'; c.font = `bold 15px ${SANS}`; c.textAlign = 'center'; c.fillText(no, dx - 2, dy + dh - 6); c.textAlign = 'left'; }
    };
    if (item.hero) {
      const o = objs[0], { x, f } = L;
      L.slots.forEach(([sx, sy, sw, sh], i) => mount(imgs[i], sx, sy, sw, sh, ''));
      c.fillStyle = '#d8cfbd'; c.font = `15px ${SANS}`; c.fillText(`${o.d}`.slice(0, 40), x, top + 4);
      c.fillStyle = '#efe7d6'; c.font = `${f.fs}px ${FONT}`;
      f.lines.forEach((l, i) => c.fillText(l, x, top + 36 + i * f.lh));
      c.fillStyle = '#a99f8c'; c.font = `14px ${SANS}`; c.fillText('点击阅读全部页面与来源说明', x, bottom - 14);
      return;
    }
    L.slots.forEach(([sx, sy, sw, sh, no], i) => mount(imgs[i], sx, sy, sw, sh, no));
    // 清单
    c.fillStyle = '#e9e4d7'; c.fillRect(0, H - LAB, W, LAB);
    c.fillStyle = '#1c1a17'; const lc = n <= 2 ? 1 : 2, lw = (W - 48) / lc;
    objs.forEach((o, i) => {
      const x = 24 + (i % lc) * lw, y = H - LAB + 16 + Math.floor(i / lc) * 30;
      c.font = `bold 15px ${SANS}`; c.fillText(String(i + 1), x, y + 2);
      c.font = `16px ${FONT}`; const yr = (String(o.d).match(/(1[89]\d\d|20[0-2]\d)/) || [''])[0];
      let t = o.t + (yr && !o.t.includes(yr) ? `（${yr}）` : '');
      while (c.measureText(t).width > lw - 34 && t.length > 4) t = t.slice(0, -2) + '…';
      c.fillText(t, x + 20, y);
    });
    c.fillStyle = '#6d665a'; c.font = `13px ${SANS}`; c.textAlign = 'right'; c.fillText('点击查看来源与说明', W - 24, H - 22); c.textAlign = 'left';
  });
}

// 禁书书架正面：书脊（每本禁书一个醒目书脊，竖排书名），其余为无字书脊。200 像素 / 米
export function drawBookshelf(item, K, wm, hm) {
  const W0 = Math.round(wm * 200), H0 = Math.round(hm * 200);
  return scaled(W0, H0, K, (c, W, H) => {
    c.fillStyle = '#17120e'; c.fillRect(0, 0, W, H);
    let top = 0;
    if (item.wall) { top = 60; c.fillStyle = '#7a1f1f'; c.fillRect(0, 0, W, 50); c.fillStyle = '#f2ead8'; c.font = `bold 28px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`禁书阅读 · ${item.books.length} 种`, W / 2, 26); c.textAlign = 'left'; c.textBaseline = 'top'; c.translate(0, top); H -= top; }
    const rows = 4, rh = H / rows, R = (() => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
    const books = item.books.map(b => b.t.replace(/[《》]/g, '')), cols = ['#6b1f1a', '#2c3a4f', '#5a4a2a', '#24402f', '#4a2a44', '#3b3b3b', '#7a5a1e'];
    let bi = 0;
    for (let r = 0; r < rows; r++) {
      const y1 = (r + 1) * rh - 10;
      c.fillStyle = '#3a2a1c'; c.fillRect(0, y1, W, 10);
      let x = 10;
      const special = new Set(); for (let k = 0; k < Math.ceil(books.length / rows); k++) special.add(Math.floor(2 + R() * 10));
      for (let n = 0; x < W - 14; n++) {
        const isB = special.has(n) && bi < books.length, bw = isB ? 34 : 12 + R() * 14, bh = isB ? rh - 24 : rh * (0.55 + R() * 0.32);
        if (x + bw > W - 10) break;
        c.fillStyle = isB ? '#e8dcc0' : cols[Math.floor(R() * cols.length)];
        c.fillRect(x, y1 - bh, bw, bh);
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + bw - 2, y1 - bh, 2, bh);
        if (isB) {
          const t = books[bi++]; c.fillStyle = '#7a1f1f'; c.fillRect(x, y1 - bh + 6, bw, 4);
          let fs = Math.min(20, (bh - 24) / t.length); c.font = `bold ${fs}px ${FONT}`; c.fillStyle = '#1c1a17'; c.textAlign = 'center';
          [...t].forEach((ch, k) => c.fillText(ch, x + bw / 2, y1 - bh + 16 + k * fs));
          c.textAlign = 'left';
        }
        x += bw + 2 + (R() < 0.08 ? 10 : 0);
      }
    }
  });
}

// 档案柜正面：缩略图网格 + 标题与件数。200 像素 / 米
export function drawArchive(item, hall, K, imgs, wm, hm) {
  const W0 = Math.round(wm * 200), H0 = Math.round(hm * 200);
  return scaled(W0, H0, K, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2f2b26'); g.addColorStop(1, '#1a1816');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const acc = hall.theme.accentLight || '#b0402f', n = item.objs.length;
    c.fillStyle = acc; c.fillRect(28, 24, 5, 36);
    c.fillStyle = '#efe7d6'; c.font = `bold 30px ${FONT}`; c.textBaseline = 'top'; c.fillText('档案柜：本厅延伸藏品', 44, 26);
    c.fillStyle = '#a99f8c'; c.font = `16px ${SANS}`; c.textAlign = 'right'; c.fillText(`共 ${n} 件 · 照片 宣传画 档案 实物`, W - 28, 36); c.textAlign = 'left';
    const cols = 4, rows = 3, top = 80, bottom = H - 56, cw = (W - 40) / cols, rh = (bottom - top) / rows, S = archiveSlots(W, H);
    for (let i = 0; i < cols * rows; i++) {
      const [x, y, w, h] = S[i], im = imgs[i];
      c.fillStyle = '#121110'; c.fillRect(x, y, w, h);
      if (!im?.im) continue;
      const [sx, sy, sw, sh] = im.r, s = Math.min((w - 8) / sw, (h - 8) / sh), dw = sw * s, dh = sh * s;
      c.drawImage(im.im, sx, sy, sw, sh, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }
    if (n > cols * rows) { c.fillStyle = 'rgba(18,17,16,.82)'; const x = 20 + (cols - 1) * cw + 8, y = top + 2 * rh + 6; c.fillRect(x, y, cw - 16, rh - 12); c.fillStyle = '#efe7d6'; c.font = `bold 26px ${SANS}`; c.textAlign = 'center'; c.fillText(`+${n - cols * rows + 1}`, x + (cw - 16) / 2, y + (rh - 12) / 2 - 13); c.textAlign = 'left'; }
    c.fillStyle = '#e9e4d7'; c.fillRect(0, H - 44, W, 44); c.fillStyle = '#1c1a17'; c.font = `17px ${SANS}`;
    c.fillText('点击打开档案柜：逐件浏览大图、年代与来源记录', 28, H - 34);
  });
}

// 墙上的档案影像：衬纸装裱的原件影像 + 下方小标签。200 像素 / 米
export function drawArchFrame(o, K, im, wm, hm) {
  const W0 = Math.round(wm * 200), H0 = Math.round(hm * 200);
  return scaled(W0, H0, K, (c, W, H) => {
    c.fillStyle = '#ece6d8'; c.fillRect(0, 0, W, H);
    const lab = 92, m = 16, [, , bw, bh] = archSlot(W, H);
    if (im) {
      const [iw, ih] = dimsOf(im), [dx, dy, dw, dh] = fitRect(m, m, bw, bh, iw, ih);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(dx + 3, dy + 4, dw, dh);
      if (im.ov) { c.fillStyle = '#d6cfbf'; c.fillRect(dx, dy, dw, dh); } else c.drawImage(im, dx, dy, dw, dh);
    } else { c.fillStyle = '#d6cfbf'; c.fillRect(m + bw * 0.15, m + bh * 0.15, bw * 0.7, bh * 0.7); }
    c.fillStyle = '#7a1f1f'; c.fillRect(m, H - lab + 4, 3, 22);
    c.fillStyle = '#1d1a17'; c.font = `bold 15px ${FONT}`;
    const lines = []; let line = '';
    for (const ch of o.t) { if (c.measureText(line + ch).width > W - 2 * m - 10) { lines.push(line); line = ''; if (lines.length === 2) break; } line += ch; }
    if (lines.length < 2 && line) lines.push(line); else if (lines.length === 2 && line) lines[1] = lines[1].slice(0, -1) + '…';
    lines.forEach((l, i) => c.fillText(l, m + 10, H - lab + 4 + i * 20));
    c.fillStyle = '#6d665a'; c.font = `12px ${SANS}`;
    c.fillText(`${o.d ? o.d + ' · ' : ''}${o.ty}`.slice(0, 30), m + 10, H - lab + 50);
    c.fillText('档案柜藏品 · 点击阅读', m + 10, H - lab + 68);
  });
}

// 受难者名录墙：直接印在墙面上的名字（透明底）。200 像素 / 米
export function drawNames(item, hall, K, wm, hm) {
  const W0 = Math.round(wm * 200), H0 = Math.round(hm * 200);
  return scaled(W0, H0, K, (c, W, H) => {
    const light = hall.theme.light, ink = light ? '#2a2622' : '#ddd5c2', sub = light ? '#6a645a' : '#9a927f';
    c.fillStyle = sub; c.font = `16px ${SANS}`; c.textBaseline = 'top';
    c.fillText(item.part === 0 ? `文革受难者名录　王友琴《文革受难者》所录 663 人（${item.part + 1}/${item.parts}）` : `（${item.part + 1}/${item.parts}）`, 6, 4);
    const cols = 7, rows = Math.ceil(item.names.length / cols), top = 40, rh = (H - top - 8) / rows, cw = (W - 12) / cols;
    c.fillStyle = ink; c.font = `${Math.min(26, rh * 0.72).toFixed(0)}px ${FONT}`;
    item.names.forEach((n, i) => c.fillText(n, 6 + (i % cols) * cw, top + Math.floor(i / cols) * rh));
  });
}

// 平柜里的三件档案：深色绒布上平放影像，下方小标签。400 像素 / 米
export function drawTableCase(objs, imgs, K, wm, hm) {
  const W0 = Math.round(wm * 400), H0 = Math.round(hm * 400);
  return scaled(W0, H0, K, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#24211d'); g.addColorStop(1, '#1a1815'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const n = objs.length, S = tcaseSlots(n, W, H);
    objs.forEach((o, i) => {
      const [x, top, w, bh] = S[i], im = imgs[i];
      if (im) {
        const [iw, ih] = dimsOf(im), [dx, dy, dw, dh] = fitRect(x, top, w, bh, iw, ih);
        c.fillStyle = '#151413'; c.fillRect(dx - 5, dy - 3, dw + 14, dh + 15);
        c.fillStyle = '#c7bb9f'; c.fillRect(dx - 7, dy - 7, dw + 14, dh + 14);
        if (im.ov) { c.fillStyle = '#2e2a25'; c.fillRect(dx, dy, dw, dh); } else c.drawImage(im, dx, dy, dw, dh);
      } else { c.fillStyle = '#2e2a25'; c.fillRect(x + w * 0.15, top + bh * 0.15, w * 0.7, bh * 0.7); }
      const ly = H - 96; c.fillStyle = '#e9e4d7'; c.fillRect(x + 10, ly, w - 20, 82);
      c.fillStyle = '#1c1a17'; c.font = `bold 19px ${FONT}`; c.textBaseline = 'top';
      const lines = layout(c, o.t, w - 44).slice(0, 2); lines.forEach((l, k) => c.fillText(l, x + 22, ly + 8 + k * 24));
      c.fillStyle = '#6d665a'; c.font = `15px ${SANS}`; c.fillText(`${o.d ? o.d + ' · ' : ''}${o.ty}`.slice(0, 26), x + 22, ly + 60);
    });
  });
}

// 原瞻仰厅的“证词”：他自己说过的话、出处，以及那以后发生的事
export function drawEvidence(item, hall, K, wm, hm) {
  const W0 = Math.round(wm * 200), H0 = Math.round(hm * 200);
  return scaled(W0, H0, K, (c, W, H) => {
    c.fillStyle = '#0f0f10'; c.fillRect(0, 0, W, H); c.strokeStyle = '#3a3634'; c.lineWidth = 2; c.strokeRect(10, 10, W - 20, H - 20);
    c.textBaseline = 'top'; c.fillStyle = '#8a8478'; c.font = `16px ${SANS}`; c.fillText(`证词 ${String(item.no).padStart(2, '0')}　·　${item.date}`, 32, 30);
    c.fillStyle = '#efe8d8'; const f = fit(c, `“${item.q}”`, W - 64, item.note ? 214 : 250, 34, 20, FONT, 1.45); c.font = `${f.fs}px ${FONT}`;
    f.lines.forEach((l, i) => c.fillText(l, 32, 66 + i * f.lh));
    let y = 66 + f.lines.length * f.lh + 14;
    c.fillStyle = '#8a8478'; c.font = `15px ${SANS}`; for (const l of layout(c, `${item.who || '毛泽东'}　${item.src}`, W - 64).slice(0, 2)) { c.fillText(l, 32, y); y += 21; }
    if (item.note) { c.fillStyle = '#b39a6a'; c.font = `14px ${SANS}`; for (const l of layout(c, '※ ' + item.note, W - 64).slice(0, 2)) { c.fillText(l, 32, y + 4); y += 19; } }
    const by = H - 118; c.fillStyle = '#7a1f1f'; c.fillRect(32, by, 70, 4);
    c.fillStyle = '#d65a4a'; c.font = `bold 15px ${SANS}`; c.fillText('此后', 32, by + 14);
    c.fillStyle = '#e8ddd0'; c.font = `19px ${SANS}`; layout(c, item.after, W - 64).slice(0, 3).forEach((l, i) => c.fillText(l, 32, by + 38 + i * 25));
  });
}

// 故事卡 520×640（1.9m × 2.34m）：一个具体的人、一件具体的事
export function drawStory(item, hall, K) {
  const dark = hall.theme.darkPanel;
  const bg = dark ? '#1d1c1e' : '#f1ece0', fg = dark ? '#e4ddcc' : INK, sub = dark ? '#9a9282' : SUB, acc = item.k === 'resist' ? '#b01c14' : hall.theme.accent || '#7a1f1f';
  return scaled(520, 640, K, (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.strokeStyle = dark ? '#3a383a' : '#cdc4b0'; c.lineWidth = 2; c.strokeRect(14, 14, W - 28, H - 28);
    c.fillStyle = acc; c.fillRect(38, 38, 64, 28);
    c.fillStyle = '#f4efe4'; c.font = `bold 17px ${SANS}`; c.fillText(item.term ? '名 词' : item.k === 'bridge' ? '串 联' : item.k === 'label' ? '展 签' : item.k === 'resist' ? '反 抗' : '故 事', 47, 43);
    c.fillStyle = sub; c.font = `16px ${SANS}`;
    const d = layout(c, item.term ? item.d || '名词解释' : item.k === 'bridge' ? '几件个案之间的关系' : item.k === 'label' ? '依据所列来源撰写' : item.d || '', W - 76 - 80)[0] || ''; c.fillText(d, 116, 44);
    c.fillStyle = fg; let ts = 34; c.font = `bold ${ts}px ${FONT}`;
    let tl = layout(c, item.t, W - 76);
    while ((tl.length > 2 || (tl.length > 1 && ts > 30)) && ts > 24) { ts -= 1; c.font = `bold ${ts}px ${FONT}`; tl = layout(c, item.t, W - 76); }
    tl.slice(0, 2).forEach((l, i) => c.fillText(l, 38, 86 + i * ts * 1.25));
    const top = 86 + Math.min(2, tl.length) * ts * 1.25 + 18;
    c.fillStyle = dark ? '#3a383a' : '#cdc4b0'; c.fillRect(38, top - 10, W - 76, 1);
    const f = fit(c, item.b, W - 90, H - 44 - top, 29, 14, FONT, 1.62);
    c.font = `${f.fs}px ${FONT}`; c.fillStyle = fg;
    f.lines.forEach((l, i) => c.fillText(l, 38, top + i * f.lh));
  });
}

// 个案详案 720×806（2.6m × 2.9m）：主签正文 + 下方的证据签
export function drawDossier(item, hall, K) {
  const dark = hall.theme.darkPanel;
  const bg = dark ? '#1a1a1c' : '#ebe5d6', fg = dark ? '#e4ddcc' : INK, sub = dark ? '#9a9282' : SUB, acc = hall.theme.accent || '#7a1f1f';
  return scaled(720, 806, K, (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = acc; c.fillRect(0, 0, W, 10);
    c.fillStyle = acc; c.fillRect(42, 40, 62, 26); c.fillStyle = '#f4efe4'; c.font = `bold 16px ${SANS}`; c.fillText('个 案', 52, 45);
    c.fillStyle = sub; c.font = `16px ${SANS}`; c.fillText(layout(c, [item.d, item.place].filter(Boolean).join('　'), W - 84 - 80)[0] || '', 118, 45);
    c.fillStyle = fg; let ts = 32; c.font = `bold ${ts}px ${FONT}`; let tl = layout(c, item.t, W - 84);
    while (tl.length > 2 && ts > 22) { ts -= 1; c.font = `bold ${ts}px ${FONT}`; tl = layout(c, item.t, W - 84); }
    tl.slice(0, 2).forEach((l, i) => c.fillText(l, 42, 84 + i * ts * 1.25));
    const top = 84 + Math.min(2, tl.length) * ts * 1.25 + 16;
    // 证据签：底部浅框
    c.font = `16px ${SANS}`; const evl = layout(c, item.ev.b, W - 84 - 28), evH = 36 + 22 + Math.min(4, evl.length) * 23 + 14, evY = H - 34 - evH;
    c.fillStyle = dark ? '#252427' : '#ddd5c3'; c.fillRect(42, evY, W - 84, evH);
    c.fillStyle = acc; c.fillRect(42, evY, 5, evH);
    c.fillStyle = sub; c.font = `bold 14px ${SANS}`; c.fillText('证据签', 60, evY + 14);
    c.fillStyle = fg; c.font = `bold 17px ${SANS}`; c.fillText(layout(c, item.ev.t, W - 84 - 90)[0] || '', 120, evY + 12);
    c.fillStyle = fg; c.font = `16px ${SANS}`; evl.slice(0, 4).forEach((l, i) => c.fillText(l, 60, evY + 44 + i * 23));
    const f = fit(c, item.b, W - 84, evY - 18 - top, 22, 13, FONT, 1.6);
    c.font = `${f.fs}px ${FONT}`; c.fillStyle = fg; f.lines.forEach((l, i) => c.fillText(l, 42, top + i * f.lh));
  });
}

// ───── 专题台 ─────
const wrapLines = (c, text, w) => { const out = []; let line = ''; for (const ch of text) { if (c.measureText(line + ch).width > w && line) { out.push(line); line = ch; } else line += ch; } if (line) out.push(line); return out; };
function coverImg(c, img, x, y, w, h) {
  if (img.ov) { c.fillStyle = '#25221d'; c.fillRect(x, y, w, h); return; }   // 图片单独贴在画布前
  const r = Math.max(w / img.width, h / img.height), sw = w / r, sh = h / r;
  c.save(); c.filter = 'grayscale(0.15) contrast(1.05)'; c.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.35, sw, sh, x, y, w, h); c.restore();
}
function featureMap(c, m, x, y, w, h) {
  c.fillStyle = '#25221d'; c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(x + w * i / 8, y); c.lineTo(x + w * i / 8, y + h); c.stroke(); c.beginPath(); c.moveTo(x, y + h * i / 8); c.lineTo(x + w, y + h * i / 8); c.stroke(); }
  const P = ([lo, la]) => [x + 30 + (lo - m.lon[0]) / (m.lon[1] - m.lon[0]) * (w - 60), y + 50 + (la - m.lat[0]) / (m.lat[1] - m.lat[0]) * (h - 80)];
  if (m.border) { c.save(); c.setLineDash([10, 8]); c.strokeStyle = '#8d8676'; c.lineWidth = 2.5; c.beginPath(); m.border.forEach((p, i) => { const [px, py] = P(p); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); c.restore();
    if (m.borderLabel) { const [px, py] = P(m.border[0]); c.fillStyle = '#8d8676'; c.font = `20px ${SANS}`; c.fillText(m.borderLabel, px + 6, py - 10); } }
  c.strokeStyle = '#c8463a'; c.lineWidth = 4; c.lineJoin = 'round';
  for (const rt of m.routes || []) { c.beginPath(); rt.forEach((p, i) => { const [px, py] = P(p); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
    const [ax, ay] = P(rt[rt.length - 2]), [bx, by] = P(rt[rt.length - 1]), a = Math.atan2(by - ay, bx - ax);   // 箭头
    c.fillStyle = '#c8463a'; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - 18 * Math.cos(a - 0.4), by - 18 * Math.sin(a - 0.4)); c.lineTo(bx - 18 * Math.cos(a + 0.4), by - 18 * Math.sin(a + 0.4)); c.fill(); }
  for (const [name, lo, la, kind] of m.pts || []) {
    const [px, py] = P([lo, la]); c.fillStyle = kind === 'end' ? '#e9c46a' : '#efe8d8'; c.beginPath(); c.arc(px, py, 7, 0, Math.PI * 2); c.fill();
    c.font = `bold 24px ${FONT}`; c.fillStyle = '#efe8d8'; const tw = c.measureText(name).width; c.fillText(name, Math.min(px + 12, x + w - tw - 8), py - 10);
  }
  c.fillStyle = '#b9b0a0'; c.font = `22px ${SANS}`; c.fillText(m.title || '示意图', x + 16, y + 30);
}
function featureBars(c, B, x, y, w, h) {
  c.fillStyle = '#25221d'; c.fillRect(x, y, w, h);
  c.fillStyle = '#b9b0a0'; c.font = `24px ${SANS}`; c.fillText(B.title, x + 24, y + 44, w - 48);
  // 每行：上面一行标签，下面一根条，条尾写数值（条太长时写在条内）。行高按行数均分，标签、条和数值互不重叠
  const max = Math.max(...B.rows.map(r => r[1])), rowH = Math.min(130, (h - 80) / B.rows.length), full = w - 48;
  B.rows.forEach(([label, v, txt], i) => {
    const yy = y + 76 + i * rowH, bw = Math.max(6, full * v / max), val = txt || v.toLocaleString('en-US');
    let ls = 28; c.font = `bold ${ls}px ${FONT}`; while (c.measureText(label).width > full && ls > 18) { ls -= 1; c.font = `bold ${ls}px ${FONT}`; }
    c.fillStyle = '#efe8d8'; c.fillText(label, x + 24, yy + 28);
    c.fillStyle = '#9e2a22'; c.fillRect(x + 24, yy + 42, bw, 36);
    c.font = `bold 28px ${SANS}`; const vw = c.measureText(val).width;
    if (bw + 14 + vw <= full) { c.fillStyle = '#f2c46d'; c.fillText(val, x + 24 + bw + 14, yy + 70); }
    else { c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText(val, x + 24 + bw - 12, yy + 70); c.textAlign = 'left'; }
  });
}
// 引文：没有照片的人物，背板上放他／她自己说过的话
function featureQuote(c, [q, by], x, y, w, h) {
  c.fillStyle = '#25221d'; c.fillRect(x, y, w, h);
  c.fillStyle = '#9e2a22'; c.font = `bold 120px ${FONT}`; c.fillText('“', x + 24, y + 110);
  const f = fit(c, q, w - 88, h - 190, 40, 24, FONT, 1.5); c.font = `bold ${f.fs}px ${FONT}`; c.fillStyle = '#f1ebdd';
  f.lines.forEach((l, i) => c.fillText(l, x + 44, y + 130 + i * f.lh));
  c.fillStyle = '#b9b0a0'; c.font = `24px ${FONT}`; wrapLines(c, '—— ' + by, w - 88).slice(0, 2).forEach((l, i) => c.fillText(l, x + 44, y + h - 56 + i * 30));
}
// 专题屏 2.4m × 1.9m：标题、配图（照片／示意图／数字条）、时间线、导读
export function drawFeatureBoard(item, hall, K, imgs) {
  return scaled(1200, 950, K, (c, W, H) => {
    c.fillStyle = '#191714'; c.fillRect(0, 0, W, H);
    c.fillStyle = item.resist ? '#b3241c' : '#7a2a20'; c.fillRect(40, 36, item.resist ? 150 : 96, 40);
    c.fillStyle = '#fff'; c.font = `bold 24px ${SANS}`; c.textBaseline = 'middle'; c.fillText(item.resist ? '专题 · 反抗' : '专题', 54, 57); c.textBaseline = 'alphabetic';
    let ts = 54; c.font = `bold ${ts}px ${FONT}`; while (c.measureText(item.t).width > W - 80 && ts > 32) { ts -= 2; c.font = `bold ${ts}px ${FONT}`; }
    c.fillStyle = '#f1ebdd'; c.fillText(item.t, 40, 136);
    c.fillStyle = '#b9b0a0'; c.font = `24px ${SANS}`; c.fillText(item.d || '', 40, 176);
    const B = item.board || {}, pics = (imgs || []).filter(Boolean), visual = pics.length || B.map || B.bars || B.quote;
    const vx = 40, vy = 200, vw = visual ? 680 : 0, vh = 500;
    if (!visual && B.timeline) {   // 没有配图、有时间线：左栏排正文，右栏排时间线
      // 字号不随篇幅缩小：排不下的部分以省略号结束，全文在阅读窗里
      c.font = `24px ${FONT}`; c.fillStyle = '#e8e2d2'; const lh = 24 * 1.6, max = Math.floor((vh - 6) / lh); let L = [];
      for (const para of String(item.b || '').split('\n')) { L.push(...wrapLines(c, para, 680)); if (L.length > max) break; }
      if (L.length > max) { L = L.slice(0, max); L[max - 1] = L[max - 1].slice(0, -2) + '……'; }
      L.forEach((l, i) => c.fillText(l, 40, vy + 30 + i * lh));
    } else if (!visual || !B.timeline) {   // 没有时间线：右栏（或整幅）排正文
      const tx = visual ? 760 : 40, tw2 = W - tx - 40;
      const f2 = fit(c, item.b || '', tw2, vh, visual ? 25 : 28, 16, FONT, 1.62); c.font = `${f2.fs}px ${FONT}`; c.fillStyle = '#e8e2d2';
      f2.lines.forEach((l, i) => c.fillText(l, tx, vy + 30 + i * f2.lh));
    }
    if (pics.length) {
      const S = featureSlots(pics.length);
      pics.forEach((im, i) => { const [, yy, , each] = S[i]; coverImg(c, im, vx, yy, vw, each);
        c.fillStyle = '#b9b0a0'; c.font = `22px ${FONT}`; c.fillText((B.imgs[i] && B.imgs[i][1]) || '', vx, yy + each + 30); });
    } else if (B.map) featureMap(c, B.map, vx, vy, vw, vh);
    else if (B.bars) featureBars(c, B.bars, vx, vy, vw, vh);
    else if (B.quote) featureQuote(c, B.quote, vx, vy, vw, vh);
    else if (B.imgs) { c.fillStyle = '#25221d'; c.fillRect(vx, vy, vw, vh); }
    // 时间线
    if (!B.timeline) return drawLead();
    const tx = 760, tw = W - tx - 40; c.strokeStyle = '#5a5348'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx + 8, vy + 10); c.lineTo(tx + 8, vy + vh - 10); c.stroke();
    const tl = B.timeline || [], step = Math.min(110, (vh - 20) / Math.max(1, tl.length)); 
    tl.forEach(([d, t], i) => { const yy = vy + 24 + i * step;
      c.fillStyle = '#c8463a'; c.beginPath(); c.arc(tx + 8, yy - 8, 7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e9c46a'; c.font = `bold 26px ${SANS}`; c.fillText(d, tx + 28, yy);
      c.fillStyle = '#e8e2d2'; c.font = `24px ${FONT}`; wrapLines(c, t, tw - 30).slice(0, 2).forEach((l, k) => c.fillText(l, tx + 28, yy + 34 + k * 30)); });
    drawLead();
    function drawLead() {   // 底部导读
      c.fillStyle = '#5a5348'; c.fillRect(40, 726, W - 80, 2);
      const f = fit(c, item.lead || '', W - 80, 150, 27, 18, FONT, 1.55); c.font = `${f.fs}px ${FONT}`; c.fillStyle = '#e8e2d2';
      f.lines.forEach((l, i) => c.fillText(l, 40, 768 + i * f.lh));
      c.fillStyle = '#c8463a'; c.font = `bold 22px ${SANS}`; c.fillText('点击阅读全文 · 附来源与证据说明', 40, H - 22);
    }
  });
}

// 落地展具的近读版式。展页显示原文摘录，点选仍进入同一份完整档案。
export function drawDisplayLeaf(it, K) {
  return scaled(520, 624, K, (c, W, H) => {
    c.fillStyle = '#f2ead7';
    c.fillRect(0, 0, W, H);
    const head = it.k === 'evidence' ? it.who || '证词' : it.t || '';
    const date = it.d || it.date || '';
    c.fillStyle = '#776246';
    c.font = `19px ${SANS}`;
    c.fillText(date, 34, 31, W - 68);
    c.fillStyle = INK;
    const title = fit(c, head, W - 68, 112, 38, 21, FONT, 1.25);
    c.font = `bold ${title.fs}px ${FONT}`;
    title.lines.forEach((l, i) => c.fillText(l, 34, 74 + i * title.lh, W - 68));
    const y = 92 + title.lines.length * title.lh;
    c.fillStyle = '#936e45';
    c.fillRect(34, y, 60, 4);
    c.fillStyle = INK;
    const body = it.k === 'evidence' ? '“' + it.q + '”' : it.b || '';
    const f = fit(c, body, W - 68, H - y - 106, 25, 20, FONT, 1.56);
    c.font = `${f.fs}px ${FONT}`;
    f.lines.forEach((l, i) => c.fillText(l, 34, y + 27 + i * f.lh));
    c.fillStyle = '#c7b99d';
    c.fillRect(34, H - 56, W - 68, 1);
    c.fillStyle = SUB;
    c.font = `16px ${SANS}`;
    c.fillText(it.k === 'evidence' ? it.src || '' : '点选阅读原文', 34, H - 37, W - 68);
  });
}

export function drawFloorDate(it, K) {
  return scaled(660, 288, K, (c, W, H) => {
    c.fillStyle = '#262c2c';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#e5bd83';
    c.font = `35px ${SANS}`;
    c.fillText(it.d || '', 24, 30, W - 48);
    c.fillStyle = '#f3ead7';
    const f = fit(c, it.t, W - 48, 153, 48, 24, FONT, 1.26);
    c.font = `bold ${f.fs}px ${FONT}`;
    f.lines.forEach((l, i) => c.fillText(l, 24, 99 + i * f.lh, W - 48));
    c.fillStyle = '#b79a70';
    c.fillRect(24, H - 26, 44, 3);
  });
}

export function drawMeasureLegend(it, K) {
  return scaled(1184, 288, K, (c, W, H) => {
    c.fillStyle = '#262b2b';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#f1eada';
    c.font = `bold 38px ${FONT}`;
    c.fillText(it.t, 24, 21, W - 255);
    c.textAlign = 'right';
    c.fillStyle = '#d1b681';
    c.font = `22px ${SANS}`;
    c.fillText(it.unit || '', W - 26, 30);
    c.textAlign = 'left';
    const pitch = (W - 48) / it.bars.length;
    it.bars.forEach((b, i) => {
      const x = 24 + i * pitch;
      c.fillStyle = '#b99a67';
      c.fillRect(x, 84, pitch - 12, 2);
      const draw = (txt, y, hm, fs, color) => {
        const f = fit(c, txt, pitch - 14, hm, fs, 16, SANS, 1.2);
        c.fillStyle = color;
        c.font = `${f.fs}px ${SANS}`;
        f.lines.forEach((l, k) => c.fillText(l, x, y + k * f.lh));
      };
      draw(b.l, 98, 75, 26, '#e3dac7');
      draw(b.n, 181, 98, 25, '#f5deb3');
    });
  });
}

export function drawNameLeaf(it, K) {
  return scaled(560, 670, K, (c, W, H) => {
    c.fillStyle = '#ece5d7';
    c.fillRect(0, 0, W, H);
    c.fillStyle = INK;
    c.font = `bold 30px ${FONT}`;
    c.fillText('受难者名录', 24, 18);
    c.fillStyle = SUB;
    c.font = `18px ${SANS}`;
    c.fillText(`${it.part + 1} / ${it.parts}`, W - 82, 28);
    c.fillStyle = '#b8a78d';
    c.fillRect(24, 64, W - 48, 1);
    const cols = 6,
      rows = Math.ceil(it.names.length / cols),
      cw = (W - 48) / cols,
      rh = (H - 92) / rows;
    c.fillStyle = INK;
    c.font = `${Math.min(22, rh * 0.85)}px ${FONT}`;
    it.names.forEach((v, i) => c.fillText(v, 24 + (i % cols) * cw, 78 + Math.floor(i / cols) * rh, cw - 4));
  });
}

export function drawDrawer(it, K, imgs) {
  return scaled(1080, 474, K, (c, W, H) => {
    c.fillStyle = '#272b2b';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#eadfc8';
    c.font = `bold 32px ${FONT}`;
    c.fillText(it.t, 26, 16, W - 52);
    const cw = (W - 40) / it.objs.length;
    it.objs.forEach((o, i) => {
      const x = 20 + i * cw,
        im = imgs[i],
        w = cw - 22,
        h = 260;
      if (im) {
        const scale = Math.min(w / im.width, h / im.height),
          iw = im.width * scale,
          ih = im.height * scale;
        const dx = x + (cw - iw) / 2,
          dy = 70 + (h - ih) / 2;
        c.fillStyle = '#d1c6ae';
        c.fillRect(dx - 3, dy - 3, iw + 6, ih + 6);
        c.drawImage(im, dx, dy, iw, ih);
      }
      c.fillStyle = '#b79e71';
      c.fillRect(x + 8, 350, cw - 16, 2);
      const title = fit(c, o.t, cw - 20, 69, 25, 17, FONT, 1.2);
      c.fillStyle = '#f1eadb';
      c.font = `${title.fs}px ${FONT}`;
      title.lines.forEach((l, j) => c.fillText(l, x + 9, 362 + j * title.lh, cw - 18));
      c.fillStyle = '#c0b6a3';
      c.font = `17px ${SANS}`;
      c.fillText(o.d || o.ty || '', x + 9, 438, cw - 18);
    });
  });
}
