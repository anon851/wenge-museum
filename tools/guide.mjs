// 文字导览：把全部展陈文字生成一个不依赖 WebGL、不依赖主程序的静态网页（guide.html）。
// 浏览器打不开三维展馆、主程序下载失败时，开场页提供这个入口。用法：node tools/guide.mjs 输出路径
import { writeFileSync } from 'node:fs';
import { SECTIONS } from '../js/content/index.js';

const out = process.argv[2] || 'guide.html';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = (s) => String(s ?? '').split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
const KIND = { story: '故事', bio: '人物', feature: '专题', dossier: '个案', resist: '反抗', label: '展签', bridge: '串联', evidence: '证词', case: '展柜', obj: '实物', sculpt: '立体展品', quote: '引文', names: '名录' };
const FLOORS = [['一层　革命的暗面与建政', 1, 8], ['二层　乌托邦与浩劫', 9, 16], ['三层　未完成的告别', 17, 25]];

function item(it) {
  if (it.k === 'photo' || it.k === 'books' || it.k === 'arch') return '';
  const kind = it.term ? '名词' : KIND[it.k] || '';
  if (it.k === 'quote') return `<blockquote>${paras(it.q || it.t)}${it.by ? `<footer>—— ${esc(it.by)}</footer>` : ''}</blockquote>`;
  const title = it.t || it.name || '';
  if (!title && !it.b) return '';
  const date = it.d || it.life || it.date || '';
  let body = paras(it.b || it.n || '');
  if (it.k === 'case' && it.objs) body += `<ul>${it.objs.map(o => `<li>${esc(o.t)}${o.d ? `（${esc(o.d)}）` : ''}</li>`).join('')}</ul>`;
  if (it.article) body += `<h4>附：${esc(it.article.t)}</h4><p class="d">${esc(it.article.by)}${it.article.note ? '　' + esc(it.article.note) : ''}</p>${it.article.text.split(/\n+/).filter(Boolean).map(l => /^[^，。：；、“”（）]{1,10}$/.test(l) ? `<h4>${esc(l)}</h4>` : `<p>${esc(l)}</p>`).join('')}`;
  if (it.ev) body += `<p class="ev">证据说明：${esc(it.ev)}</p>`;
  const src = (Array.isArray(it.src) ? it.src : []).filter(x => Array.isArray(x) && x[1]).map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener">${esc(t)}</a></li>`).join('');
  return `<article><h3>${kind ? `<span class="k">${kind}</span>` : ''}${esc(title)}</h3>${date ? `<p class="d">${esc(date)}</p>` : ''}${body}${src ? `<ul class="src">${src}</ul>` : ''}</article>`;
}

const halls = SECTIONS.map(s => ({ s, id: `h-${s.room}`, label: s.no > 0 && s.no < 25 ? `第 ${s.no} 展厅　${s.title}` : s.title }));
const toc = FLOORS.map(([name, a, b]) => `<li>${name}<ol>${halls.filter(h => (h.s.no >= a && h.s.no <= b) || (a === 1 && h.s.no === 0)).map(h => `<li><a href="#${h.id}">${esc(h.label)}</a></li>`).join('')}</ol></li>`).join('');
const body = halls.map(({ s, id, label }) => `<section id="${id}"><h2>${esc(label)}</h2>${s.years ? `<p class="d">${esc(s.years)}</p>` : ''}${paras(s.intro || '')}${s.items.map(item).join('')}<p class="top"><a href="#toc">↑ 回到目录</a></p></section>`).join('');

writeFileSync(out, `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>文革博物馆 · 文字导览</title>
<style>
body{margin:0;background:#111;color:#e8e2d2;font:17px/1.8 "Noto Serif SC","Source Han Serif SC","Songti SC",serif}
main{max-width:760px;margin:0 auto;padding:24px 18px 80px}
h1{font-size:28px;margin:.4em 0 .2em}h2{font-size:23px;margin:2.2em 0 .2em;padding-top:.6em;border-top:1px solid #333}
h3{font-size:18px;margin:1.6em 0 .2em}.k{font-size:12px;color:#111;background:#c9a66b;padding:1px 6px;margin-right:8px;vertical-align:2px}
.d{color:#a39d90;font-size:14px;margin:0}.ev{color:#a39d90;font-size:14px}.src{font-size:13px;color:#a39d90}a{color:#e0b040}
blockquote{margin:1.4em 0;padding-left:16px;border-left:3px solid #7a1f1f}footer{color:#a39d90;font-size:14px}.top{font-size:14px}
nav ol{padding-left:1.4em}nav>ol>li{margin:.6em 0;color:#c9a66b}
</style></head>
<body><main>
<p><a href="index.html">← 返回三维展馆</a></p>
<h1>文革博物馆 · 文字导览</h1>
<p class="d">与三维展馆相同的展陈文字，按参观顺序排列；照片与展品图像请在三维展馆中查看。</p>
<nav id="toc"><h2>目录</h2><ol>${toc}</ol></nav>
${body}
</main></body></html>
`);
console.log('guide:', out);
