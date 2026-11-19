#!/usr/bin/env python3
"""把历史素材库 research/2026-11-17-selected-30 的选题（文字见 tools/selected30_text.py）生成展馆数据 js/content/selected30.js。
来源与证据边界取自素材库的 candidates.json；本馆补充的两条（道县、海丰）另附来源。
用法：python3 tools/import_selected30.py [素材库路径]"""
import json, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from selected30_text import TEXT, EXTRA_SRC, EXTRA_NOTE
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / 'museum-historical-assets') / 'research/2026-11-17-selected-30/candidates.json'
rows = {r['id']: r for r in json.loads(SRC.read_text(encoding='utf-8'))['rows']}
out = {}
for cid, room, after, kind, t, d, b in TEXT:
    r = rows.get(cid)
    it = {'k': kind, 't': t, 'd': d, 'b': b, 'after': after}
    if r:
        it['src'] = [[s['title'], s['url']] for s in r['sources']]
        it['ev'] = f"{r['evidence']}。{r['evidence_note']}".rstrip('。') + '。' if r.get('evidence_note') else r['evidence']
        it['topic'] = r['name']
    else:
        it['src'] = EXTRA_SRC.get(t, []); it['ev'] = EXTRA_NOTE.get(t, '')
    if kind == 'resist': it['resist'] = True
    out.setdefault(room, []).append(it)
dst = ROOT / 'js/content/selected30.js'
dst.write_text('// 历史素材库 research/2026-11-17-selected-30 的选题，以及道县 1967 年杀戮、海丰“反彭湃”事件。\n'
               '// 由 tools/import_selected30.py 生成；正文在 tools/selected30_text.py，来源与证据边界取自素材库。\n'
               'export const SELECTED = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n', encoding='utf-8')
print(sum(len(v) for v in out.values()), 'items →', dst.relative_to(ROOT))
