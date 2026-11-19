#!/usr/bin/env python3
"""专题屏配图：按维基百科条目的主图和维基共享资源搜索为每个专题找人物、事件的照片。
只用托管在维基共享资源（Wikimedia Commons）上、许可为公有领域或 CC0 / CC BY / CC BY-SA 的文件；维基百科本地的“合理使用”图片不用。
结果：assets/feat/*.jpg（长边 1200 像素）与 js/content/featimgs.js（每张图的说明、作者、许可与原始页面）。
用法：python3 tools/feature_images.py [临时下载目录]；请求之间间隔两秒，遵守维基媒体的访问频率要求。"""
import hashlib, io, json, os, re, sys, time, urllib.parse, urllib.request
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = next((a for a in sys.argv[1:] if not a.startswith('--')), '/tmp/featimg')
os.makedirs(TMP, exist_ok=True); os.makedirs(os.path.join(ROOT, 'assets', 'feat'), exist_ok=True)
UA = {'User-Agent': 'museum-exhibit-builder/1.0 (non-commercial educational project)'}
FREE = re.compile(r'public domain|^pd|cc0|cc[ -]by', re.I)

# 专题标题 → [(维基百科条目或 commons:搜索词, 图注)]；按顺序取，最多两张
TOPICS = {
  '票证与证件': [('commons:全国通用粮票', '全国通用粮票'), ('commons:China ration coupon cloth', '布票')],
  '八千湘女上天山': [('八千湘女上天山', ''), ('新疆生产建设兵团', '新疆生产建设兵团')],
  '不起诉释放的日本战犯': [('抚顺战犯管理所', '抚顺战犯管理所'), ('中国归还者联络会', '')],
  '沈元：化装进使馆的人': [('沈元', '沈元')],
  '三位从香港回来的乒乓名将': [('容国团', '容国团'), ('commons:Rong Guotuan', '容国团'), ('姜永宁', '姜永宁')],
  '赵九章': [('赵九章', '赵九章'), ('commons:Zhao Jiuzhang', '赵九章')],
  '姚桐斌': [('姚桐斌', '姚桐斌')],
  '冯元春在四川大学': [('冯元春', '冯元春')],
  '汉阳一中': [('汉阳一中事件', '')],
  '郭沫若的两个儿子': [('郭沫若', '郭沫若'), ('郭世英', '郭世英')],
  '芒果': [('芒果崇拜', ''), ('commons:Mao mango cult', '')],
  '打鸡血': [('鸡血疗法', '')],
  '八八江面战斗': [('commons:重庆红卫兵墓园', '重庆红卫兵墓园'), ('重庆红卫兵墓园', '重庆红卫兵墓园'), ('commons:Chongqing Red Guard Cemetery', '重庆红卫兵墓园')],
  '海丰：“反彭湃”': [('反彭湃烈士事件', '')],
  '草原小姐妹与哈斯朝禄父子': [('草原英雄小姐妹', ''), ('commons:草原英雄小姐妹', '草原英雄小姐妹'), ('龙梅', '龙梅')],
  '雷锋之死': [('雷锋', '雷锋')],
  '汤飞凡': [('汤飞凡', '汤飞凡'), ('commons:Tang Feifan', '汤飞凡')],
  '二简字': [('commons:Second round simplified Chinese characters', '第二次汉字简化方案'), ('commons:二简字', '二简字')],
  '老舍之死的证言': [('老舍', '老舍'), ('太平湖 (北京)', '太平湖')],
  '傅雷的遗书': [('傅雷', '傅雷'), ('commons:Fu Lei translator', '傅雷'), ('朱梅馥', '朱梅馥')],
  '张玉凤': [('张玉凤', '张玉凤')],
  '《“571工程”纪要》': [('571工程纪要', ''), ('林彪', '林彪')],
  '板桥水库': [('板桥水库', '板桥水库'), ('commons:Banqiao Dam', '板桥水库'), ('1975年河南水灾', '')],
  '荥经': [],
  '道县：六十六天': [('道县大屠杀', ''), ('道县', '道县')],
  '海陆丰的“红色恐怖”': [('海陆丰苏维埃', ''), ('彭湃', '彭湃')],
  '“水淹南宁”的说法': [('广西文革', '')],
  '武宣': [('武宣县', '武宣')],
  '龙岩的“幸福委员会”': [],
  '广州街头的“吊劳改犯”': [],
  '1967年：春节不放假': [],
  '徐洪慈：四次越狱': [('徐洪慈', '徐洪慈')],
  '黄立众与“中国劳动党”': [('黄立众', '黄立众')],
  '毛泽东与日军：远藤誉的指控': [('潘汉年', '潘汉年'), ('岩井英一', '岩井英一')],
  '波尔布特与北京': [('commons:Tuol Sleng Genocide Museum', '金边吐斯廉（S-21）监狱旧址，今为屠杀博物馆'), ('commons:Choeung Ek stupa', '琼邑克“杀戮场”纪念塔')],
}

def get(url, pause=4):
    time.sleep(pause)
    for k in range(2):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r: return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(45); continue
            if e.code == 404: return b''
            raise
    raise RuntimeError('429')
# 不用 api.php（共享出口常被限流）：条目主图取页面的 og:image，搜索用站内搜索页，许可与作者从文件页读取
def file_from_url(u):
    m = re.search(r'/wikipedia/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/?#]+)', u or '')
    return urllib.parse.unquote(m.group(1)) if m else None
def lead_file(title):
    html = get('https://zh.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_'))).decode('utf-8', 'replace')
    m = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    return file_from_url(m.group(1)) if m else None   # 本地文件（多为合理使用）不在 commons 路径下，返回 None
def search_file(q):
    html = get('https://commons.wikimedia.org/w/index.php?' + urllib.parse.urlencode({'search': q, 'ns6': 1, 'fulltext': 1})).decode('utf-8', 'replace')
    for m in re.finditer(r'href="/wiki/File:([^"]+?\.(?:jpe?g|png|JPE?G|PNG))"', html): return urllib.parse.unquote(m.group(1))
def commons_info(name):
    html = get('https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(name.replace(' ', '_'))).decode('utf-8', 'replace')
    if not html: return None
    lics = [l.strip() for l in re.findall(r'licensetpl(?:&#95;|_)short[^>]*>([^<]+)<', html)]
    lic = next((l for l in lics if FREE.search(l)), None)
    if not lic or re.search(r'fair|non-free', ' '.join(lics), re.I): return None
    m = re.search(r'id="fileinfotpl(?:&#95;|_)aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', html, re.S)   # 文件页里下划线写作 &#95;
    art = re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', m.group(1))).strip()[:80] if m else ''
    art = '作者不详' if re.match(r'(?i)unknown', art) else re.sub(r'^User:', '', art)
    return {'thumb': 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(name.replace(' ', '_')) + '?width=1200',
            'page': 'https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(name.replace(' ', '_')), 'license': lic, 'artist': art}

def save():   # 每个专题之后都写一次，中途停下也不丢结果
    with open(os.path.join(ROOT, 'js', 'content', 'featimgs.js'), 'w', encoding='utf-8') as f:
        f.write('// 由 tools/feature_images.py 生成：专题屏配图（维基共享资源上的自由许可文件）。src、图注、作者、许可、原始页面\n')
        f.write('export const FEAT_IMGS = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
# 续跑：已经找到图片的专题保留，只重试没有图片的（例如上次被限流的）
out, prev_path = {}, os.path.join(ROOT, 'js', 'content', 'featimgs.js')
if os.path.exists(prev_path):
    txt = open(prev_path, encoding='utf-8').read(); i = txt.find('= ')
    if i > 0: out = json.loads(txt[i + 2:].rstrip().rstrip(';'))
if '--authors' in sys.argv:   # 只补作者：重新读取已有图片的文件页
    for topic, imgs in out.items():
        for g in imgs:
            if g.get('artist'): continue
            try:
                info = commons_info(g['file'])
                if info: g['artist'] = info['artist']; print('  author', topic, g['file'][:40], '->', info['artist'])
            except Exception as e: print('  error', topic, e)
    save(); sys.exit(0)
ONLY = next((a[7:] for a in sys.argv if a.startswith('--only=')), None)   # 只跑一个专题
for topic, cands in TOPICS.items():
    if out.get(topic) or (ONLY and topic != ONLY): continue
    got = []
    for q, cap in cands:
        if len(got) >= 2: break
        try:
            name = search_file(q[8:]) if q.startswith('commons:') else lead_file(q)
            if not name or any(g['file'] == name for g in got): continue
            info = commons_info(name)
            if not info: print('  skip (not free / not on Commons):', topic, name); continue
            raw = get(info['thumb']); open(os.path.join(TMP, 'dl.bin'), 'wb').write(raw)
            im = Image.open(io.BytesIO(raw)); im.load(); im = im.convert('RGB'); im.thumbnail((1200, 1200))
            fn = "feat-" + hashlib.md5((topic + name).encode()).hexdigest()[:10] + ".jpg"; im.save(os.path.join(ROOT, 'assets', 'feat', fn), 'JPEG', quality=86, optimize=True)
            got.append({'file': name, 'src': f'assets/feat/{fn}', 'cap': cap or re.sub(r'\.(jpe?g|png)$', '', name, flags=re.I).replace('_', ' '), **{k: info[k] for k in ('page', 'license', 'artist')}})
            print('  ok', topic, name, info['license'])
        except Exception as e: print('  error', topic, q, e)
    out[topic] = got
    save()
print(sum(len(v) for v in out.values()), 'images for', sum(1 for v in out.values() if v), 'topics')
