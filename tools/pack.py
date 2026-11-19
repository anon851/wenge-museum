#!/usr/bin/env python3
"""把站点打包成 dist/：展柜影像（assets/hist）与档案柜大图（assets/arch）合并成少量包（扩展名 .jpg：托管平台只接受常见类型；每个包以一张完整 JPEG 开头），
以适应托管平台的文件数上限。页面通过 js/content/packs.js 的索引从包中取图（见 main.js 的 assetURL）。
本地开发不需要打包：packs.js 为空时页面直接读取原始文件。
用法：python3 tools/pack.py [输出目录，默认 dist]"""
import json, os, re, shutil, subprocess, sys
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.abspath(ARGS[0] if ARGS else os.path.join(ROOT, 'dist'))
MAX = 18 * 1024 * 1024
os.chdir(ROOT)
files = [f for f in subprocess.check_output(['git', 'ls-files'], text=True).split('\n') if f and not f.startswith(('.', 'tools/'))]
# 托管平台只提供常见网页文件类型；其他类型（如 .glb 模型、无扩展名的许可文件）不放进发布包，页面对缺失的模型有照片替代
SERVABLE = ('.html', '.css', '.js', '.jpg', '.png', '.md', '.woff2')
files = [f for f in files if f.endswith(SERVABLE) and not f.startswith(('functions/', 'cloudflare/', 'docs/', 'server/'))]   # 服务端代码不进静态包
def js_obj(path, name):
    s = open(path, encoding='utf-8').read(); i = s.index(f'export const {name} = ') + len(f'export const {name} = ')
    return json.JSONDecoder().raw_decode(s[i:])[0]
ART, CASES, ARCH = js_obj('js/content/artifacts.js', 'ART'), js_obj('js/content/artifacts.js', 'CASES'), js_obj('js/content/archive.js', 'ARCHIVE')
# 精选（js/content/curate.js）撤下的档案与展柜不进发布包
_cur = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', '''
import { ARCHIVE } from './js/content/archive.js'; import { ART, CASES } from './js/content/artifacts.js';
import { DROP_SRC, DROP_CASES, curateArchive } from './js/content/curate.js';
const A = {}; for (const k in ARCHIVE) A[k] = curateArchive(k, ARCHIVE[k]);
const C = {}; for (const k in CASES) C[k] = CASES[k].filter(c => !DROP_CASES.includes(c.t)).map(c => ({ ...c, items: c.items.filter(id => !DROP_SRC.test(ART[id].src || '')) })).filter(c => c.items.length);
console.log(JSON.stringify({ A, C }));'''], text=True, cwd=ROOT))
dropped = {v[0] for cs in CASES.values() for c in cs for i in c['items'] for v in ART[i]['img']} | {f"assets/arch/{o['f']}" for L in ARCH.values() for o in L}
ARCH, CASES = _cur['A'], _cur['C']
dropped -= {v[0] for cs in CASES.values() for c in cs for i in c['items'] for v in ART[i]['img']} | {f"assets/arch/{o['f']}" for L in ARCH.values() for o in L}
files = [f for f in files if f not in dropped]
groups = {}   # 包名 -> [文件]，按展厅分组，同厅的图一起下载
for h, cs in CASES.items():
    for c in cs:
        for i in c['items']:
            for v in ART[i]['img']: groups.setdefault(f'hist-{h}', []).append(v[0])
for h, L in ARCH.items(): groups[f'arch-{h}'] = [f"assets/arch/{o['f']}" for o in L]
groups['feat'] = sorted(f for f in files if f.startswith('assets/feat/'))   # 专题屏配图
seen, packed = set(), {}
hist = [f for f in files if f.startswith('assets/hist/')]
groups['hist-misc'] = [f for f in hist if f not in {p for g in groups.values() for p in g}]
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, 'assets/pack'))
for name, L in groups.items():
    part, buf, n = 0, bytearray(), name
    for p in L:
        if p in seen or not os.path.exists(p): continue
        seen.add(p); b = open(p, 'rb').read()
        if len(buf) + len(b) > MAX and buf:
            open(os.path.join(OUT, f'assets/pack/{n}.jpg'), 'wb').write(buf); part += 1; n = f'{name}-{part}'; buf = bytearray()
        packed[p] = [n, len(buf), len(b)] + ([1] if name.startswith('arch-') else []); buf += b
    if buf: open(os.path.join(OUT, f'assets/pack/{n}.jpg'), 'wb').write(buf)
# 小图：展柜、平柜、档案框、专题台在普通清晰度下用最长边 400 像素的小图（每张约 20 KB）。每厅的小图合成一个小图包
# （平均几百 KB），整包用普通请求下载一次，不用分段读取，最先显示；走近换清晰贴图时才从原图包取原图，取不到就继续用小图。
# （托管平台每个作品最多 512 个文件，所以小图不能单独存放）
small = {}
try:
    from PIL import Image
    import io
    for name, L in groups.items():
        buf, pn = bytearray(), f'sm-{name}'
        for p in dict.fromkeys(L):
            if p not in packed or p in small: continue
            try:
                im = Image.open(p); im.thumbnail((400, 400), Image.LANCZOS); im = im.convert('RGB'); out = io.BytesIO()
                im.save(out, 'JPEG', quality=70, optimize=True, progressive=True); b = out.getvalue()
            except Exception: continue
            small[p] = [pn, len(buf), len(b)]; buf += b
        if buf: open(os.path.join(OUT, f'assets/pack/{pn}.jpg'), 'wb').write(buf)
except ImportError:
    print('PIL not installed: no small images')
for f in files:
    if f in packed or f == 'js/content/packs.js': continue
    os.makedirs(os.path.dirname(os.path.join(OUT, f)) or OUT, exist_ok=True); shutil.copy2(f, os.path.join(OUT, f))
open(os.path.join(OUT, 'js/content/packs.js'), 'w', encoding='utf-8').write(
    '// 由 tools/pack.py 生成：图片路径 -> [包名, 偏移, 长度, 按需分段读取]；SMALL：图片路径 -> [小图包名, 偏移, 长度]（小图包整包下载）\nexport const PACKS = ' + json.dumps(packed, separators=(',', ':')) + ';\nexport const SMALL = ' + json.dumps(small, separators=(',', ':')) + ';\n')
# 打包脚本：用 esbuild 把主程序（含 three.js 与全部展陈内容）打成一个压缩过的 js/app.js，绘制线程另打一个文件。
# 页面由 index.html 里的小脚本按字节下载 app.js，进度条随下载推进。没有 esbuild（npm install）时保留未打包的模块。
ESB = os.path.join(ROOT, 'node_modules', '.bin', 'esbuild')
if os.path.exists(ESB):
    run = lambda *a: subprocess.run([ESB, *a, '--bundle', '--format=esm', '--target=es2022', '--minify', '--legal-comments=none', '--log-level=warning',
                                     '--alias:three=./js/vendor/three.module.js'], cwd=OUT, check=True)
    run('js/main.js', '--outfile=js/app.js')
    run('js/drawworker.js', '--outfile=js/drawworker.bundle.js')
    os.replace(os.path.join(OUT, 'js/drawworker.bundle.js'), os.path.join(OUT, 'js/drawworker.js'))
    for d, _, fs in list(os.walk(os.path.join(OUT, 'js'))):
        for f in fs:
            if f.endswith('.js') and os.path.join(d, f) not in (os.path.join(OUT, 'js/app.js'), os.path.join(OUT, 'js/drawworker.js')): os.remove(os.path.join(d, f))
    for d, ds, fs in list(os.walk(os.path.join(OUT, 'js'), topdown=False)):
        if not os.listdir(d): os.rmdir(d)
    size = os.path.getsize(os.path.join(OUT, 'js/app.js'))
    html = open(os.path.join(OUT, 'index.html'), encoding='utf-8').read()
    html = re.sub(r'<script type="importmap">.*?</script>\n', '', html, flags=re.S)
    i = html.index('<script>\n// 加载进度'); j = html.index('<script type="module" src="js/main.js"></script>') + len('<script type="module" src="js/main.js"></script>')
    html = html[:i] + """<script>
// 加载进度：按字节下载打包好的程序 js/app.js（约占六成），其余由程序在建造展厅时报告
(function () {
  var bar = document.getElementById('load-bar'), msg = document.getElementById('load-msg'), shown = 0, SIZE = %d;
  window.__loadProgress = function (p, text) { window.__loadAlive && window.__loadAlive(); if (p > shown) { shown = p; bar.style.width = p + '%%'; } if (text) msg.textContent = text; };
  window.__loadProgress(2, '正在下载展馆程序…');
  var fallback = function () { var s = document.createElement('script'); s.type = 'module'; s.src = 'js/app.js';
    s.onerror = function () { window.__loadFail && window.__loadFail('展馆程序下载失败（网络中断或被拦截）。请重试，或先读文字导览。'); };
    document.body.appendChild(s); };
  if (!window.fetch || !window.ReadableStream) { fallback(); return; }
  fetch('js/app.js').then(function (r) {
    if (!r.ok || !r.body) throw new Error(r.status);
    var reader = r.body.getReader(), chunks = [], got = 0, mb = function (n) { return (n / 1048576).toFixed(1); };
    return (function pump() { return reader.read().then(function (x) {
      if (x.done) return new Blob(chunks, { type: 'text/javascript' });
      chunks.push(x.value); got += x.value.length;
      window.__loadProgress(2 + 58 * Math.min(1, got / SIZE), '正在下载展馆程序… ' + mb(Math.min(got, SIZE)) + ' / ' + mb(SIZE) + ' MB');
      return pump(); }); })();
  }).then(function (blob) { window.__loadProgress(60, '正在启动…'); return import(URL.createObjectURL(blob)); }).catch(function (e) { console.warn(e); fallback(); });
})();
</script>""" % size + html[j:]
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
    print(f'bundled js/app.js: {size / 1e6:.2f} MB')
# 文字导览：不依赖 WebGL 和主程序的静态网页，进馆失败时的兜底
subprocess.run(['node', os.path.join(ROOT, 'tools', 'guide.mjs'), os.path.join(OUT, 'guide.html')], cwd=ROOT, check=True)
n = sum(len(fs) for _, _, fs in os.walk(OUT)); sz = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
print(f'{len(packed)} images in {len(os.listdir(os.path.join(OUT, "assets/pack")))} packs; dist: {n} files, {sz / 1e6:.1f} MB')
