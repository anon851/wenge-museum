#!/usr/bin/env python3
"""把 js/content/featimgs.js 里的专题屏配图来源写进 CREDITS.md 的“专题屏配图”一节（重复运行会替换该节）。"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
txt = open(os.path.join(ROOT, 'js', 'content', 'featimgs.js'), encoding='utf-8').read()
data = json.loads(txt[txt.find('= ') + 2:].rstrip().rstrip(';'))
lines = ['## 专题屏配图', '', '地面专题屏上的人物与事件照片，均来自维基共享资源（Wikimedia Commons）上公有领域或 CC 许可的文件，由 `tools/feature_images.py` 收集（`assets/feat/`）：', '']
for topic, imgs in data.items():
    for g in imgs:
        lines.append(f"- {topic}：[{g['file'].replace('_', ' ')}]({g['page']})　{g.get('artist') or '作者不详'} · {g['license']}")
lines.append('')
p = os.path.join(ROOT, 'CREDITS.md'); s = open(p, encoding='utf-8').read()
sec = '\n'.join(lines)
s = re.sub(r'## 专题屏配图\n.*?(?=\n## |\Z)', sec.rstrip('\n'), s, flags=re.S) if '## 专题屏配图' in s else s.rstrip('\n') + '\n\n' + sec
open(p, 'w', encoding='utf-8').write(s)
print(sum(len(v) for v in data.values()), 'credits written')
