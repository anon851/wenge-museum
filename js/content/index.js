// 把各层文字、人物、照片组装成按参观顺序排列的“章节”。
// 每个章节对应平面图中的一个房间（见 plan.js）。
import { FLOOR1 } from './floor1.js';
import { FLOOR2 } from './floor2.js';
import { FLOOR3 } from './floor3.js';
import { CENTERS } from './people.js';
import { PHOTOS, PORTRAITS } from './photos.js';
import { ART, CASES } from './artifacts.js';
import { BOOKS } from './links.js';
import { ARCHIVE } from './archive.js';
import { MORE } from './more.js';
import { DROP_SRC, DROP_CASES, DROP_CASE_ITEMS, DROP_DOSSIERS, TERMS, STORY_TERMS, curateArchive } from './curate.js';
import { VICTIMS } from './victims.js';
import { EVIDENCE, PANELS_B } from './hall-b.js';
import { DOSSIERS } from './dossiers.js';
import { STORIES } from './stories.js';
import { EXTRA, RESIST } from './extra.js';
import { SELECTED } from './selected30.js';
import { FEATURES } from './features.js';
import { FEAT_IMGS } from './featimgs.js';
import { HALL_READING } from './links.js';

// 人物按时代归入展厅
const BIO_HALL = {
  陈独秀: 1, 刘敌: 2, 李文林: 2, 许继慎: 2, 段德昌: 2, 王实味: 3, 牛友兰: 4, 董时进: 5,
  卢作孚: 6, 梁漱溟: 6, 胡风: 6, 龚品梅: 6, 王明道: 6,
  储安平: 7, 罗隆基: 7, 林希翎: 7, 葛佩琦: 7, 杨兆龙: 7, 黄万里: 7, 马寅初: 7, 张春元: 7, 林昭: 7,
  彭德怀: 8, 张恺帆: 9, '第十世班禅额尔德尼·确吉坚赞': 10, 王容芬: 11, 遇罗克: 11,
  卞仲耘: 12, 老舍: 12, 傅雷: 12, 陈寅恪: 12, 刘少奇: 13, 刘文辉: 13, 顾圣婴: 13,
  陆洪恩: 14, 王佩英: 14, 张志新: 14, 容国团: 14, 叶企孙: 14, 顾准: 15, 李九莲: 15, 王申酉: 15,
  魏京生: 16, 陈光诚: 17, 胡耀邦: 18, 赵紫阳: 19, 丁子霖: 19, 方政: 19, 鲍彤: 19, 李旺阳: 19,
  刘晓波: 20, 高耀洁: 20, 蒋彦永: 20, 唐福珍: 20, 高智晟: 20, 曹顺利: 20,
  扎西文色: 21, '热依拉·达吾提': 21, 邹幸彤: 21, 王全璋: 22, 许志永: 22, 黄雪琴: 22, 张展: 23
};

const byNo = {};
for (const h of [...FLOOR1, ...FLOOR2, ...FLOOR3]) byNo[h.no] = h;
const prologue = byNo[0];
const take = (titles) => titles.map(t => {
  const it = prologue.items.find(i => i.t === t);
  if (!it) throw new Error('序厅缺少展板：' + t);
  return it;
});

const allBios = CENTERS.flatMap(c => c.items.filter(i => i.k === 'bio'));
const centerText = (t) => CENTERS.flatMap(c => c.items).find(i => i.t === t);

const FLOORS_OF = (g) => { const f = [...new Set(g.halls.map(h => h.no < 9 ? 0 : h.no < 17 ? 1 : 2))]; return `位于${f.map(x => ['一', '二', '三'][x] + '层').join('、')}。`; };
const PARTS = {
  1: '第一部分　革命的暗面', 4: '第二部分　建政', 9: '第三部分　乌托邦', 12: '第四部分　浩劫', 17: '第五部分　未完成的告别'
};

export const SECTIONS = [
  {
    room: 'A', no: 0, part: '序', title: '序厅', years: '1921—2022', noTitle: true,
    intro: prologue.intro,
    items: take(['前言', '巴金：建立“文革”博物馆', '参观路线', '关于展品与照片'])
  },
  {
    room: 'B', no: 0, part: '序', title: '他的所作所为', years: '1977—', label: '原瞻仰厅',
    intro: '这座建筑为一个人而建。一九七七年起，他的遗体安放在这间大厅中央，供人瞻仰。本厅不展示他的遗容，而展示他的所作所为：他亲口说过的话，他发动的运动，以及因此死去的人。',
    items: [PANELS_B[3], ...EVIDENCE.slice(0, 4), PANELS_B[0], ...EVIDENCE.slice(4, 8), PANELS_B[1], ...EVIDENCE.slice(8), PANELS_B[2], ...take(['这座建筑', '关于数字', '官方的结论', '年表（一）', '年表（二）', '现实中的纪念'])]
  },
  ...[...FLOOR1.slice(1), ...FLOOR2, ...FLOOR3].map(h => ({
    room: `H${h.no}`, no: h.no, part: h.part, title: h.title, years: h.years, intro: h.intro,
    items: [...h.items]
  })),
  {
    room: 'MEM', no: 24, part: '终章', title: '纪念厅', years: '1921—2022', label: '纪念厅',
    intro: '这里是展线的终点。大厅中央的石台空着，为没有坟墓、没有骨灰、没有留下名字的人而设。出口电梯在大厅西南角。',
    items: [
      { ...centerText('受难者纪念厅'), b: '本馆的展线在这里结束。\n这座建筑原来的瞻仰厅在一层中央，那里安放过一个人的遗体；本馆把它留空了。这间位于顶层、开着天窗的大厅，则留给所有其他的人。\n大厅中央是一方空着的黑色石台，为那些没有坟墓、没有骨灰、没有留下名字的人而设。\n请在此停留片刻。' },
      centerText('无名者'),
      centerText('记住'),
      centerText('走出这间展厅')
    ]
  }
];

// 人物插入所属展厅：放在该厅正文之后、按出现顺序
for (const b of allBios) {
  const no = BIO_HALL[b.name];
  if (!no) throw new Error('人物未归档：' + b.name);
  if (PORTRAITS[b.name]) b.portrait = PORTRAITS[b.name];
  SECTIONS.find(s => s.no === no && s.room.startsWith('H')).items.push(b);
}
// 人物放在本厅中第一次提到其名字的展板之后；没有提到的，在本厅内均匀穿插
for (const s of SECTIONS) {
  const bios = s.items.filter(i => i.k === 'bio'), rest = s.items.filter(i => i.k !== 'bio');
  if (!bios.length) continue;
  const short = (n) => n.replace(/^第十世/, '').split(/[·・]/)[0];
  const after = new Map(), loose = [];
  for (const b of bios) {
    const i = rest.findIndex(it => (it.t || '').includes(short(b.name)) || (it.b || '').includes(short(b.name)));
    if (i >= 0) { if (!after.has(i)) after.set(i, []); after.get(i).push(b); } else loose.push(b);
  }
  const out = [], step = Math.max(2, Math.floor(rest.length / (loose.length + 1)));
  rest.forEach((it, i) => { out.push(it); if (after.has(i)) out.push(...after.get(i)); else if ((i + 1) % step === 0 && loose.length) out.push(loose.shift()); });
  s.items = [...out, ...loose];
}
// 照片：优先跟在说明对象之后，否则放在本厅开头
const roomOfOldHall = (id) => {
  if (id === '0-N') return null;
  const h = [...FLOOR1, ...FLOOR2, ...FLOOR3].find(x => x.id === id);
  return h ? `H${h.no}` : null;
};
for (const p of PHOTOS) {
  let placed = false;
  for (const s of SECTIONS) {
    const i = s.items.findIndex(it => p.after && (it.t === p.after || it.name === p.after));
    if (i >= 0) { let j = i + 1; while (s.items[j] && s.items[j].anchor === s.items[i]) j++; s.items.splice(j, 0, { k: 'photo', ...p, attach: true, anchor: s.items[i] }); placed = true; break; }
  }
  if (!placed) {
    const r = roomOfOldHall(p.hall), s = SECTIONS.find(x => x.room === r) || SECTIONS[1];
    s.items.unshift({ k: 'photo', ...p });
  }
}
// 插入位置不能拆开“展板 + 紧随其后的照片”
const safeAt = (items, i) => { while (items[i] && items[i].attach) i++; return i; };
// 历史素材库的展柜：在本厅展项之间均匀穿插（首件导言之后、末尾之前）
// 精选：撤下外国情报文书展柜与凑数的件，展柜里单件来源为外国情报文书的也拿掉
// 展柜改名：不用官方用语
const CASE_RENAME = { '新时代的判决书与传单': '判决书与传单（2021—2022）' };
for (const k of Object.keys(CASES)) CASES[k] = CASES[k].map(c => CASE_RENAME[c.t] ? { ...c, t: CASE_RENAME[c.t] } : c);
for (const k of Object.keys(CASES)) CASES[k] = CASES[k].filter(c => !DROP_CASES.includes(c.t))
  .map(c => ({ ...c, items: c.items.filter(id => !DROP_CASE_ITEMS.includes(id) && !DROP_SRC.test((ART[id] && ART[id].src) || '')) })).filter(c => c.items.length);
for (const s of SECTIONS) {
  const cs = CASES[s.room]; if (!cs) continue;
  const items = cs.map(c => ({ k: 'case', t: c.t, n: c.n, hero: !!c.hero, after: c.after, objs: c.items.map(id => ({ id, ...ART[id] })) }));
  const step = s.items.length / (items.length + 1);
  items.forEach((it, i) => {
    // 放在相关展板（及其照片、此前已插入的同题展柜）之后；找不到展板时均匀穿插
    const a = it.after ? s.items.findIndex(x => x.t === it.after && x.k !== 'case') : -1;
    let at = a >= 0 ? a + 1 : Math.round(step * (i + 1)) + i;
    while (s.items[at] && (s.items[at].attach || (a >= 0 && s.items[at].k === 'case' && s.items[at].after === it.after))) at++;
    s.items.splice(at, 0, it);
  });
}
// 禁书书架：每厅一个，放在展线中段
// （此处仍是旧厅号）第 1 厅墙面已满：把《毛泽东：鲜为人知的故事》并到延安厅的书架；内战厅加远藤誉的书
BOOKS.H3 = [...(BOOKS.H2 || []), ...(BOOKS.H3 || [])]; delete BOOKS.H2;
BOOKS.H4 = [{ t: '《毛泽东：与日军共谋的男人》', a: '远藤誉', y: '2015 年日文版（《毛沢東 日本軍と共謀した男》，新潮新书），2016 年香港明镜出版社中文版',
  d: '作者生于长春，幼年亲历长春围城。书中依据日本外务省档案、岩井英一回忆录等，论述抗战期间中共经潘汉年等人与日本情报机关往来、向日方提供国民党军情报。学界对其推论有争议。',
  st: '中国大陆未出版。', links: [['远藤誉（日文维基百科）', 'https://ja.wikipedia.org/wiki/%E9%81%A0%E8%97%A4%E8%AA%89'], ['维基百科搜索：毛泽东 与日军共谋的男人', 'https://zh.wikipedia.org/w/index.php?search=' + encodeURIComponent('毛泽东 与日军共谋的男人')]] }, ...(BOOKS.H4 || [])];
for (const s of SECTIONS) {
  const bs = BOOKS[s.room]; if (!bs || !bs.length) continue;
  s.items.splice(safeAt(s.items, Math.floor(s.items.length / 2)), 0, { k: 'books', t: '禁书阅读', books: bs });
}
// 立体展品：《国殇之柱》（基座上立雕像照片）
{ const s = SECTIONS.find(x => x.room === 'H21'), i = s.items.findIndex(x => x.t === '香港：国安法之后');
  s.items.splice(i >= 0 ? safeAt(s.items, i + 1) : s.items.length, 0, {
    k: 'sculpt', t: '国殇之柱（Pillar of Shame）', d: '1997年首展　1999—2021年立于香港大学',
    b: '丹麦雕塑家高志活（Jens Galschiøt）为纪念1989年六四事件遇难者而作。原作高约8米，由数十个扭曲、痛苦的人体堆叠而成，基座刻有“六四屠城”和“The Old Cannot Kill the Young Forever”（老人不能永远杀害年轻人）。\n1997年六四前夕，香港市民支援爱国民主运动联合会（支联会）把它运到维多利亚公园的悼念晚会首次展出。1999年6月4日晚，港大学生会把它运往香港大学黄克竞平台竖立；此后二十多年，学生每年六四前为雕像清洗，它成为香港六四悼念的标志之一。\n2021年，支联会在《国家安全法》下被迫解散。同年10月港大要求移走雕像；12月22日深夜，校方用围板封锁现场，将雕像切割运走。2023年5月，警方在支联会案调查中以“证物”名义将其扣押。高志活此后公开发布雕像的三维扫描文件，鼓励各地自行复制。',
    h: 4.9,
    photos: [['assets/hist/pillar-photo-2.jpg', '雕像全貌（作者官网照片）'], ['assets/hist/pillar-photo-3.jpg', '基座铭牌：“国殇之柱”与“六四屠城”刻字'], ['assets/hist/pillar-photo-4.jpg', '基座铭牌：1999年6月4日晚由港大学生会运往香港大学竖立']],
    note: ['基座上立的是作者官网发布的雕像实拍照片（同系列铸件，不一定是香港大学的那一件）。'],
    url: 'https://www.galschiot.com/en/work/pillar-of-shame/2021-pillar-of-shame-in-hongkong/download', credit: 'Jens Galschiøt（雕塑与照片）；扫描：Jesper Libak',
  });
}
// ───────── 按历史素材库的内容编排重组展厅（curation/2026-11-17 第一轮交接）─────────
// 24 个内容厅 C01—C24 对应本馆第 1—24 展厅：旧 1、2 厅合并；旧 5 厅拆为土改、镇反、韩战三厅；
// 牛友兰与老区土改从内战厅移入土改厅；其后各厅顺延一号。上面的人物、照片、展柜、书架按旧编号装配，在此一并迁移。
{
  const old = (r) => SECTIONS.find(x => x.room === r), pull = (sec, titles) => titles.map(t => {
    const i = sec.items.findIndex(x => x.t === t || x.name === t); if (i < 0) throw new Error(`${sec.room} 缺少展项：${t}`);
    // 连同紧随其后的配图一起取出
    let j = i + 1; while (sec.items[j] && sec.items[j].attach && sec.items[j].anchor === sec.items[i]) j++;
    return sec.items.splice(i, j - i);
  }).flat();
  const o1 = old('H1'), o2 = old('H2'), o4 = old('H4'), o5 = old('H5');
  const land4 = pull(o4, ['老区土改', '老区土改：土地法大纲与丈量步弓', '晋绥：“斗牛大会”', '牛友兰', '康生在郝家坡']);
  const tibet = pull(o5, ['西藏：《十七条协议》']);
  const korea = pull(o5, ['中苏档案：1949—1950 年的莫斯科', '1950 年 10 月：出兵朝鲜的电报', '战俘与“细菌战”']);
  const purge = pull(o5, ['镇压反革命', '按比例处决', '会道门、教会与“改造”']);
  // “土改与镇反的宣传品”按展品拆成两柜
  const pc = o5.items.find(x => x.t === '土改与镇反的宣传品'), PURGE_OBJ = new Set(['cp-pc-195a-s-013', 'vam-o76715', 'wm-12722931']);
  let purgeCase = null;
  if (pc) { purgeCase = { ...pc, t: '镇反的宣传品', objs: pc.objs.filter(o => PURGE_OBJ.has(o.id)) }; pc.t = '土改的宣传品'; pc.objs = pc.objs.filter(o => !PURGE_OBJ.has(o.id)); }
  const rest5 = o5.items.filter(x => x.k !== 'arch');
  const yangban = rest5.findIndex(x => x.t === '样板'); const tail5 = yangban >= 0 ? rest5.splice(yangban, 1) : [];
  const xin = rest5.findIndex(x => x.t === '新政权');
  const xa = xin >= 0 ? safeAt(rest5, xin + 1) : 0, landItems = [...rest5.slice(0, xa), ...land4, ...rest5.slice(xa)];
  const purgeItems = [...purge.slice(0, 1), ...(purgeCase && purgeCase.objs.length ? [purgeCase] : []), ...purge.slice(1), ...tail5];   // “样板”：土改与镇反留下的方法
  const P1 = '第一部分　革命的暗面', P2 = '第二部分　建政';
  const NEW = [
    { room: 'H1', part: P1, title: '革命道路与苏区肃反', years: '1921—1936', intro: '1921年至1936年，中共从城市中的革命组织发展出武装力量与根据地，也经历路线争论和内部肃反。本厅选取书信争论、富田与白雀园三个案例，追问组织如何判断异议、指控如何形成，以及被指控者还有没有申辩的机会。不同地区的肃反各有经过，不能用一张总数字或一种解释代替。',
      items: [...o1.items.filter(x => x.k !== 'arch'), ...o2.items.filter(x => x.k !== 'arch')], from: ['H1', 'H2'] },
    { ...old('H3'), room: 'H2', from: ['H3'] },
    { ...o4, room: 'H3', from: ['H4'] },
    { room: 'H4', part: P2, title: '土地改革：土地、身份与暴力', years: '1946—1952', intro: '土地改革改变了土地的占有，也改变了村庄中的身份、权力和关系。1946年以来解放区的土改，与1950年后新解放区的土改并非完全相同。本厅从一件丈量工具、一位被斗争的士绅和一个村庄的记录出发，分别追问土地怎样分配、阶级怎样划定、暴力怎样发生，以及后来如何纠正。',
      items: landItems, from: ['H5'] },
    { room: 'H5', part: P2, title: '镇压反革命：运动与案件', years: '1950—1953', intro: '1950年至1953年的镇反，以政治运动和国家司法的双重方式展开。条例、会议部署、地方行动与一个人的案卷，呈现的是不同层面的历史。本厅从公开法律和一次城市行动进入，再看朱迈先等人的遭遇与后来的复查。运动中的指控、当年的判定与后来确认的事实，需要分别阅读。',
      items: purgeItems, from: ['H5'] },
    { room: 'H6', part: P2, title: '韩战：决策与人的代价', years: '1950—1953', intro: '1950年韩战爆发，同年中国决定出兵，官方称为抗美援朝。战争的历史既在领导人的决定和军队行动中，也在受伤士兵、被俘者、平民与家庭的经历中。这里先交代战争起点和参战过程，再沿周全弟与张泽石两条个人线索，追问战争怎样延续到停战以后的生活。',
      items: korea, from: ['H5'] },
  ];
  for (let n = 6; n <= 23; n++) NEW.push({ ...old(`H${n}`), room: `H${n + 1}`, from: [`H${n}`] });
  // 第 1 厅：主线留富田、白雀园与具名人物，其余地区的肃反合为一张比较表（配图随之）
  { const h = NEW[0], parts = pull(h, ['自相残杀', '闽西：“社会民主党”', '湘鄂西：夏曦', '川陕与陕北', '查田与“赤色恐怖”']), at = h.items.findIndex(x => x.t === '白雀园');
    const texts = parts.filter(x => x.k !== 'photo'), photos = parts.filter(x => x.k === 'photo');
    const cmp = { k: 'panel', t: '各地的肃反：比较表', d: '1931—1935年', b: texts.map(x => `【${x.t === '自相残杀' ? '总述' : x.t}　${x.d}】\n${x.b}`).join('\n') };
    photos.forEach(p => { p.anchor = cmp; });
    h.items.splice(at >= 0 ? safeAt(h.items, at + 1) : h.items.length, 0, cmp, ...photos); }
  // 彭德怀 1959 年 7 月 14 日的信：第一轮展签已专门讲这封信的前后，不再另挂引文
  { const h = NEW.find(x => x.room === 'H9'), i = h.items.findIndex(x => x.k === 'quote' && /^彭德怀致毛泽东的信/.test(x.by || '')); if (i >= 0) h.items.splice(i, 1); }
  // 董时进：第二轮详案已是本厅的完整叙述，人物卡不再重复；斯大林去世的照片移到停战之后
  { const h = NEW[3]; pull(h, ['董时进']); const ph = h.items.findIndex(x => x.k === 'photo' && /斯大林去世/.test(x.cap || ''));
    if (ph >= 0) { const [p] = h.items.splice(ph, 1); delete p.attach; delete p.anchor; NEW[5].items.push(p); } }
  NEW.forEach((h, i) => { h.no = i + 1; h.items = h.items.filter(x => x.k !== 'arch'); h.reading = [...new Set(h.from.flatMap(r => HALL_READING[r] || []))]; });
  // 十七条协议：作为西藏 1959 的前史，移到“调整年代”厅（新第 11 厅）
  { const h = NEW.find(x => x.room === 'H11'), i = h.items.findIndex(x => x.t === '西藏：一九五九'); h.items.splice(i >= 0 ? i : 0, 0, ...tibet); }
  const mem = old('MEM'); mem.no = 25;
  SECTIONS.splice(0, SECTIONS.length, old('A'), old('B'), ...NEW, mem);
}
// 第二轮：毛时代个案详案与串联短签。放在相关展项之后，或替换同题的旧展板（旧展板的照片改随新展板）
const insertAfter = (s, anchor, it, where) => {
  const i = s.items.findIndex(x => x.id === anchor || ((x.t === anchor || x.name === anchor) && x.k !== 'photo'));
  if (i < 0) throw new Error(`${where}：${s.room} 找不到插入位置：${anchor}`);
  s.items.splice(safeAt(s.items, i + 1), 0, it);
};
for (const d of DOSSIERS) {
  if (DROP_DOSSIERS.includes(d.id)) continue;
  if (Array.isArray(d.src)) d.src = d.src.filter(x => !/github\.com\/[^/]+\/museum\//.test(x.u || ''));   // 本仓库自身文件的“审计快照”链接不是历史出处，不对外显示
  const T = TERMS[d.id], s = SECTIONS.find(x => x.room === d.room);
  const it = T ? { ...d, k: 'label', term: true, ...T, ev: '', note: '', status: '', assets: [], objs: [] } : { ...d, objs: d.assets.filter(id => ART[id]).map(id => ({ id, ...ART[id] })) };
  if (d.replace) {
    const i = s.items.findIndex(x => x.t === d.replace); if (i < 0) throw new Error('找不到要替换的展板：' + d.replace);
    const old = s.items[i]; s.items[i] = it; for (const x of s.items) if (x.anchor === old) x.anchor = it;
    continue;
  }
  if (d.first) s.items.unshift(it); else insertAfter(s, d.after, it, d.id);
}
// 具体的故事：放进所属展厅的阅读序列，紧随相关展项（不再按空墙补白）
for (const [room, list] of Object.entries(STORIES)) {
  const s = SECTIONS.find(x => x.room === room);
  for (const st of list) { const T = STORY_TERMS[st.t], it = T ? { ...st, k: 'label', term: true, ...T } : { ...st }; if (st.after) insertAfter(s, st.after, it, '故事 ' + st.t); else s.items.push(it); }
}
// 补充展项：三个毛时代新厅的展板与故事、各厅的“反抗”卡
// 按锚点插入；锚点还没插进来的（同一批里引用后面的项）留到下一轮
const insertAll = (table, where) => {
  for (const [room, list] of Object.entries(table)) {
    const s = SECTIONS.find(x => x.room === room); let todo = list.slice();
    while (todo.length) {
      const next = todo.filter(e => !s.items.some(x => x.id === e.after || ((x.t === e.after || x.name === e.after) && x.k !== 'photo')));
      if (next.length === todo.length) { insertAfter(s, todo[0].after, { ...todo[0] }, where + ' ' + todo[0].t); break; }   // 报出找不到的锚点
      for (const e of todo) if (!next.includes(e)) insertAfter(s, e.after, { ...e }, where + ' ' + e.t);
      todo = next;
    }
  }
};
// 历史素材库选定的 30 组选题，以及道县、海丰两事件（js/content/selected30.js）；补充展项里有引用它们的
insertAll(SELECTED, '选题');
insertAll(EXTRA, '补充');
// 选定的 30 组选题（及道县、海丰）都改成地面上的专题屏：配图来自 featimgs.js（维基共享资源上的自由许可文件），
// 导读取正文第一段的前一两句；正文、证据边界、来源照旧在阅读页里
{ const lead = (b) => { const p = (b || '').split('\n')[0]; let out = ''; for (const seg of p.split(/(?<=[。！？])/)) { if (out && (out + seg).length > 110) break; out += seg; } return out || p.slice(0, 110); };
  for (const [room, list] of Object.entries(SELECTED)) {
    const s = SECTIONS.find(x => x.room === room);
    for (const e of list) {
      if (Object.values(FEATURES).flat().some(f => f.replaces === e.t)) continue;   // features.js 里已有详写
      const i = s.items.findIndex(x => x.t === e.t && x.k !== 'photo'); if (i < 0) continue;
      const old = s.items[i], pics = (FEAT_IMGS[e.t] || []).map(g => [g.src, g.cap, g]);
      s.items[i] = { ...old, k: 'feature', resist: old.resist || old.k === 'resist', lead: lead(old.b), board: { imgs: pics.length ? pics : null } };
      for (const x of s.items) if (x.anchor === old) x.anchor = s.items[i];
    }
  }
}
// 专题台：替换墙上的同题展项，改放在地面展台上
for (const [room, list] of Object.entries(FEATURES)) {
  const s = SECTIONS.find(x => x.room === room);
  for (const f of list) {
    if (f.after) { const extra = (FEAT_IMGS[f.t] || []).map(g => [g.src, g.cap, g]), board = { ...f.board }; if (extra.length) board.imgs = [...extra, ...(board.imgs || [])].slice(0, 2);
      insertAfter(s, f.after, { ...f, board }, '专题台 ' + f.t); continue; }   // 新增的专题台：放在指定展项之后
    const i = s.items.findIndex(x => x.t === f.replaces && x.k !== 'photo'); if (i < 0) throw new Error(`专题台：${room} 找不到要替换的展项：${f.replaces}`);
    const old = s.items[i], extra = (FEAT_IMGS[f.t] || []).map(g => [g.src, g.cap, g]), board = { ...f.board };
    if (extra.length) board.imgs = [...extra, ...(board.imgs || [])].slice(0, 2);
    s.items[i] = { ...f, board }; for (const x of s.items) if (x.anchor === old) x.anchor = s.items[i]; }
}
// 详写：参观者点名的专题，用 more.js 的正文覆盖（时间线并入背板）
for (const s of SECTIONS) for (let i = 0; i < s.items.length; i++) {
  const x = s.items[i], m = x.k === 'feature' && MORE[x.t]; if (!m) continue;
  const { timeline, ...rest } = m, lead = m.lead || (m.b.split('\n')[0].match(/^.{0,150}?。(.{0,80}?。)?/) || [m.b.slice(0, 120)])[0], y = { ...x, lead, ...rest, board: { ...(x.board || {}), ...(timeline ? { timeline } : {}) } };
  s.items[i] = y; for (const z of s.items) if (z.anchor === x) z.anchor = y;
}
// 第 11 展厅入口的西藏展板年代不合（1951 年协议、1958 年循化、1959 年拉萨），连同所附照片撤下
{ const s = SECTIONS.find(x => x.room === 'H11'), drop = new Set(['西藏：《十七条协议》', '西藏：一九五九', '循化事件']), gone = new Set();
  for (let i = 0; i < s.items.length; i++) { const x = s.items[i]; if (drop.has(x.t) && x.k !== 'photo') gone.add(x); }
  for (let i = s.items.length - 1; i >= 0; i--) { const x = s.items[i]; if (gone.has(x) || (x.attach && gone.has(x.anchor))) s.items.splice(i, 1); }
  // 班禅（1962—1964 年，年代相符）不再放在入口：移到伊塔事件、中苏交恶之后
  const bp = s.items.find(x => x.t === '班禅的“七万言书”' && x.k !== 'photo');
  if (bp) { const blk = s.items.filter(x => x === bp || (x.attach && x.anchor === bp) || (x.k === 'bio' && /班禅/.test(x.name || '')));
    for (const x of blk) s.items.splice(s.items.indexOf(x), 1);
    const j = s.items.findIndex(x => /中苏交恶/.test(x.t || '')); s.items.splice(j >= 0 ? safeAt(s.items, j + 1) : s.items.length, 0, ...blk); } }
// 四通桥（2022 年 10 月）移到“封城”厅，放在“白纸”之前（连同所附照片）
{ const from = SECTIONS.find(x => x.room === 'H23'), to = SECTIONS.find(x => x.room === 'H24'), p = from.items.find(x => x.t === '四通桥' && x.k !== 'photo');
  if (p) { const blk = from.items.filter(x => x === p || (x.attach && x.anchor === p)); for (const x of blk) from.items.splice(from.items.indexOf(x), 1);
    const j = to.items.findIndex(x => x.t === '白纸' && !x.k); to.items.splice(j >= 0 ? j : to.items.length, 0, ...blk); } }
// 陈光诚：只留一块文字展板（撤下人物卡与照片，生平并入展板）
{ const s = SECTIONS.find(x => x.room === 'H18');
  for (let i = s.items.length - 1; i >= 0; i--) { const x = s.items[i]; if ((x.k === 'bio' && x.name === '陈光诚') || (x.k === 'photo' && /陈光诚/.test(x.cap || ''))) s.items.splice(i, 1); } }
// 刘文辉 1966 年 9 月写成《驳文化大革命十六条》：移到时间相符的“红色恐怖”厅
{ const from = SECTIONS.find(x => x.room === 'H14'), to = SECTIONS.find(x => x.room === 'H13'), i = from.items.findIndex(x => x.name === '刘文辉');
  if (i >= 0) { const [b] = from.items.splice(i, 1); const j = to.items.findIndex(x => x.t === '批斗'); to.items.splice(j >= 0 ? safeAt(to.items, j + 1) : to.items.length, 0, b); } }
// 大饥荒厅墙面已满：“票证与特供”展柜移到“饥荒之后”厅开头（票证制度延续到八十年代）
{ const from = SECTIONS.find(x => x.room === 'H10'), to = SECTIONS.find(x => x.room === 'H11'), i = from.items.findIndex(x => x.k === 'case' && x.t === '票证与特供');
  if (i >= 0) { const [b] = from.items.splice(i, 1); to.items.splice(safeAt(to.items, 1), 0, b); } }
// 1935 年陕北肃反（瓦窑堡）发生在中央红军到达陕北之后：放到延安厅开头，第 1 厅也就不必再加短墙
{ const from = SECTIONS.find(x => x.room === 'H1'), to = SECTIONS.find(x => x.room === 'H2'), i = from.items.findIndex(x => x.t === '瓦窑堡的土坑');
  if (i >= 0) { const [b] = from.items.splice(i, 1); to.items.splice(safeAt(to.items, 1), 0, b); } }
// 不服从者：在展板上加红色“反抗”标记
for (const [room, key] of RESIST) {
  const s = SECTIONS.find(x => x.room === room), it = s && s.items.find(x => x.id === key || x.t === key || x.name === key);
  if (it) it.resist = true; else console.warn('反抗标记找不到展项：', room, key);
}
// 档案柜：每厅一个，放在展线后段（末项之前）。档案按新展厅重新归组；o.sp 记下缩略图所在的旧图集
{
  const tag = (r) => curateArchive(r, ARCHIVE[r] || []).map(o => ({ ...o, sp: o.sp || r }));
  const H5 = tag('H5'), kw = (o, re) => re.test(`${o.t} ${o.desc || ''} ${o.en || ''}`);
  const purge = H5.filter(o => kw(o, /镇压|反革命|公审|特务|counter-?revolution/i)), korea = H5.filter(o => !purge.includes(o) && kw(o, /朝鲜|抗美|援朝|志愿军|美帝|Korea/i));
  const land = H5.filter(o => !purge.includes(o) && !korea.includes(o));
  const sars = tag('H23');
  const AR = { H1: [...tag('H1'), ...tag('H2')], H2: tag('H3'), H3: tag('H4'), H4: land, H5: purge, H6: korea };
  for (let n = 6; n <= 22; n++) AR[`H${n + 1}`] = tag(`H${n}`);
  // 2003—2004 年的非典、禽流感宣传画不是 2020—2022 年的证据：撤出封城厅，择两件放进维稳厅作 2003 年非典的背景
  AR.H21 = [...AR.H21, ...sars.slice(0, 2).map(o => ({ ...o, note2003: true }))];
  AR.H24 = [];
  for (const s of SECTIONS) {
    const a = AR[s.room]; s.archive = a || [];
    if (a && a.length >= 3) s.items.push({ k: 'arch', t: '档案柜', objs: a });
  }
}
// 纪念厅：受难者名录墙（每面约 135 个名字），点击可看全部名单与出处
{ const s = SECTIONS.find(x => x.room === 'MEM'), per = 133, n = Math.ceil(VICTIMS.length / per);
  for (let i = 0; i < n; i++) s.items.splice(1 + i, 0, { k: 'names', t: `受难者名录（${i + 1}/${n}）`, names: VICTIMS.slice(i * per, (i + 1) * per), part: i, parts: n }); }
// 序厅：五个部分的总览展板
{ const s = SECTIONS.find(x => x.room === 'A'), groups = [];
  for (const h of SECTIONS) if (h.no > 0 && h.no < 25) { if (PARTS[h.no] || !groups.length) groups.push({ t: PARTS[h.no] || h.part, halls: [] }); groups[groups.length - 1].halls.push(h); }
  const y0 = (h) => h.years.split('—')[0], y1 = (h) => (h.years.split('—')[1] || h.years);
  groups.forEach((g, i) => s.items.splice(s.items.length - 1, 0, { k: 'panel', t: g.t.replace('　', ' · '), d: `展厅 ${g.halls[0].no}—${g.halls[g.halls.length - 1].no}　${y0(g.halls[0]).slice(0, 4)}—${y1(g.halls[g.halls.length - 1]).slice(-4)}`,
    b: g.halls.map(h => `第 ${h.no} 厅　${h.title}（${h.years}）`).join('\n') + '\n\n' + FLOORS_OF(g) }));
}
for (const s of SECTIONS) if (PARTS[s.no]) s.partStart = true;
