#!/usr/bin/env python3
"""把历史素材库第二轮内容（curation/2026-11-17-round-02）转成展馆数据 js/content/dossiers.js。

用法：python3 tools/import_round02.py [素材库路径]
默认素材库在 ../museum-historical-assets。

逻辑内容厅 C04…C16 对应本馆展厅；每组详案放在 PLACE 指定的展项之后（或替换同题旧展板）。
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / 'museum-historical-assets') / 'curation/2026-11-17-round-02'

# case_id / 串联短签 id → (展厅, 放在哪个展项之后, 替换的旧展板标题或 None)
PLACE = {
    # 第二轮详案与串联短签
    'r2-bridge-land-phases':        ('H4', '土地改革法令与入股登记簿', None),
    'c04-cai-classes':              ('H4', '划分阶级成分', None),
    'c04-dong-shijin':              ('H4', None, '一个反对者：董时进'),
    'c05-wei-xiaoting':             ('H5', '按比例处决', None),
    'c05-zha':                      ('H5', 'c05-wei-xiaoting', None),
    'c08-chu-anping':               ('H8', '储安平', None),
    'c08-huang-wanli':              ('H8', '黄万里', None),
    'c08-jiabiangou':               ('H8', '劳动教养与夹边沟', None),
    'r2-bridge-labour-famine':      ('H8', 'c08-jiabiangou', None),
    'c08-xinghuo':                  ('H8', '林昭', None),
    'r2-bridge-corrections':        ('H8', '改正与不改正', None),
    'c09-xushui':                   ('H9', '“放卫星”', None),
    'c10-xinyang':                  ('H10', '信阳事件', None),
    'c10-rural-investigation':      ('H10', '张恺帆', None),
    'c15-lu-hongen':                ('H15', '陆洪恩', None),
    'r2-bridge-gongan':             ('H15', 'c15-lu-hongen', None),
    'c15-wang-peiying':             ('H15', '王佩英', None),
    'c15-fang':                     ('H15', None, '告密者的悔恨：方忠谋案'),
    'c16-li-qinglin':               ('H16', '知青的遭遇', None),
    'c16-liyizhe':                  ('H16', None, '李一哲大字报'),
    'r2-bridge-late-expression':    ('H16', 'c16-liyizhe', None),
    'c16-april5':                   ('H16', '四五运动', None),
    # 第一轮展签（curation/2026-11-17）；厅导言已用作各厅导言，张庄仍是研究候选，不展出
    'c01-panel-futian':             ('H1', '富田事变', None),
    'c01-panel-objects':            ('H1', '苏维埃政权的纸币', None),
    'c02-panel-dingling':           ('H2', '“野百合花”', None),
    'c04-panel-measure':            ('H4', '老区土改：土地法大纲与丈量步弓', None),
    'c04-panel-niu':                ('H4', '牛友兰', None),
    'c04-panel-two-laws':           ('H4', '《土地改革法》', None),
    'c04-panel-ren':                ('H4', 'c04-cai-classes', None),
    'c04-panel-cooperative':        ('H4', '得而复失的土地', None),
    'c05-panel-ordinance':          ('H5', '镇压反革命', None),
    'c05-panel-shanghai':           ('H5', 'c05-panel-ordinance', None),
    'c05-panel-conference':         ('H5', '按比例处决', None),
    'c05-panel-zhu':                ('H5', 'c05-panel-conference', None),
    'c05-panel-letter':             ('H5', 'c05-panel-zhu', None),
    'c05-panel-poster':             ('H5', '镇反的宣传品', None),
    'c06-panel-start':              ('H6', 'FIRST', None),
    'c06-panel-telegrams':          ('H6', '1950 年 10 月：出兵朝鲜的电报', None),
    'c06-panel-zhou':               ('H6', 'c06-panel-telegrams', None),
    'c06-panel-zhang':              ('H6', '战俘与“细菌战”', None),
    'c06-panel-armistice':          ('H6', 'c06-panel-zhang', None),
    'c07-panel-hukou':              ('H7', '统购统销与户口', None),
    'c09-panel-peng':               ('H9', '庐山会议', None),
    'c10-panel-wuwei':              ('H10', '无为放粮', None),
    'c10-panel-yang':               ('H10', '记录者', None),
    'c12-panel-yu':                 ('H12', '遇罗克', None),
    'c13-panel-bian':               ('H13', '卞仲耘', None),
    'c14-panel-liu':                ('H14', '刘少奇', None),
    # 老斤里与“三条人生线”接在停战之后（依赖上面的第一轮展签，故放在最后）
    'c06-civilians':                ('H6', 'c06-panel-armistice', None),
    'r2-bridge-war-lives':          ('H6', 'c06-civilians', None),
}
ALIAS = {'c12-panel-yu': 'c15-panel-yu', 'c14-panel-liu': 'c15-panel-liu'}   # 本馆这两位人物所在的展厅与内容表不同

load = lambda n: json.loads((SRC / n).read_text(encoding='utf-8'))
sources = {s['id']: s for s in load('sources.json')['sources']}
dossiers = load('dossiers.json')['dossiers']
panels = load('round02-panels.json')['panels']
all_panels = {p['id']: p for p in load('panels.json')['panels']}
main = {p['case_id']: p for p in panels if p['panel_role'] == 'main'}

def src(ids):
    out = []
    for i in ids:
        s = sources[i]
        if re.search(r'github\.com/[^/]+/museum/', s.get('url', '')): continue   # 本仓库自身文件的审计快照不是历史出处，也不对外显示仓库账号
        out.append({'t': s['title'], 'u': s.get('url', ''), 'd': s.get('document_or_publication_date', ''),
                    'lim': s.get('limitations', ''), 'loc': s.get('locator', '')})
    return out

def assets(ids):
    return [i[2:] for i in ids if i.startswith('A:')]

by_id = {}
for d in dossiers:
    cid = d['case_id']; p = main[cid]
    ids = list(dict.fromkeys(d['source_ids'] + [i for x in d['paragraphs'] for i in x['source_ids']]
                             + [i for x in d['timeline'] for i in x['source_ids']] + d['evidence_panel']['source_ids']))
    by_id[cid] = {'k': 'dossier', 't': p['title'], 'd': d.get('event_dates', ''), 'place': d.get('place', ''),
                  'b': p['text'], 'full': [x['text'] for x in d['paragraphs']],
                  'tl': [[x['date'], x['statement']] for x in d['timeline']],
                  'ev': {'t': d['evidence_panel']['title'], 'b': d['evidence_panel']['text']},
                  'gaps': d.get('remaining_gaps', []), 'assets': list(dict.fromkeys(d.get('existing_asset_ids', []) + assets(ids))),
                  'src': src([i for i in ids if not i.startswith('A:')])}
for key in PLACE:
    if key in by_id: continue
    p = all_panels[ALIAS.get(key, key)]
    by_id[key] = {'k': 'bridge' if p.get('panel_role') == 'bridge' else 'label', 't': p['title'], 'b': p['text'],
                  'note': p.get('editorial_note', ''), 'status': p.get('status', ''),
                  'assets': list(dict.fromkeys(p.get('existing_asset_ids', []) + assets(p['source_ids']))),
                  'src': src([i for i in p['source_ids'] if not i.startswith('A:')])}
items = []
for key, (room, after, replace) in PLACE.items():
    it = {'id': key, 'room': room, **by_id[key]}
    if replace: it['replace'] = replace
    elif after == 'FIRST': it['first'] = True
    else: it['after'] = after
    items.append(it)
missing = set(PLACE) - {i['id'] for i in items}
assert not missing, missing
out = ROOT / 'js/content/dossiers.js'
out.write_text('// 历史素材库的内容编排：第二轮个案详案、串联短签（2026-11-17-round-02）与第一轮展签（2026-11-17）。\n'
               '// 房号为重组后的新编号（第 1—24 展厅）。由 tools/import_round02.py 生成；文字以素材库为准，改动请改素材库后重新生成。\n'
               'export const DOSSIERS = ' + json.dumps(items, ensure_ascii=False, indent=0) + ';\n', encoding='utf-8')
print(f'{len(items)} items → {out.relative_to(ROOT)}')
