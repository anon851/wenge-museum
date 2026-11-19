#!/usr/bin/env python3
"""展板字体：从 Noto Serif SC（SIL OFL 1.1）里只取本馆文字用到的字，生成两个小字体（正文用 Medium、标题用 Bold）。
输出 assets/font/serif-400.woff2 与 serif-700.woff2；主线程载入后把字体数据转给绘制线程。
用法：python3 tools/font_subset.py <NotoSerifSC_500Medium.ttf> <NotoSerifSC_700Bold.ttf>
内容文字有增改后重新运行一次。需要：pip install fonttools brotli"""
import base64, glob, io, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
chars = set(chr(c) for c in range(0x20, 0x7f)) | set('　、。，；：？！“”‘’（）《》〈〉【】—…·・％＋－×÷°～「」『』')
for f in glob.glob(os.path.join(ROOT, 'js', '**', '*.js'), recursive=True):
    if f.endswith(('fontdata.js', 'app.js')) or '/vendor/' in f: continue
    chars |= set(open(f, encoding='utf-8').read())
chars |= set(open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read())
chars = {c for c in chars if ord(c) >= 0x20}
text = ''.join(sorted(chars))
out = {}
for key, src in (('400', sys.argv[1]), ('700', sys.argv[2])):
    font = TTFont(src)
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = ['*']; opt.notdef_outline = True; opt.hinting = False
    sub = subset.Subsetter(opt); sub.populate(text=text); sub.subset(font)
    buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf); out[key] = buf.getvalue()
    print(key, len(text), 'chars ->', len(out[key]) // 1024, 'KB')
os.makedirs(os.path.join(ROOT, 'assets', 'font'), exist_ok=True)
for k, b in out.items(): open(os.path.join(ROOT, 'assets', 'font', f'serif-{k}.woff2'), 'wb').write(b)
