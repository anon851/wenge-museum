// 各厅的设计：时代风格（墙面、地面、墙裙、色调、墙上标语）与入口冲击区（大数字 + 装置）。
// 数字均取自本馆展板的文字及其来源；有争议的数字给出范围与出处。
import * as THREE from 'three';
import { textCanvas, rng, SANS, FONT } from './util.js';

// ───────────────────────── 风格表 ─────────────────────────
// wall / part / floor：{ t: 材质类型, c: 主色 }；dado：墙裙 { c, h }；light：浅色墙（墙上文字用深色）
// tint / amb：室内灯光的色调与强度系数；slogans：刷在墙上的当年标语（只用有据可查的原话）
export const STYLE = {
  A: { wall: { t: 'plaster', c: '#d7d0c0' }, part: { t: 'plaster', c: '#262428' }, floor: { t: 'stone', c: '#5a5650' }, accent: '#7a1f1f', accentLight: '#7a1f1f', light: true },
  B: { wall: { t: 'granite', c: '#1d1c1e' }, part: { t: 'granite', c: '#242325' }, floor: { t: 'granite', c: '#141315' }, accent: '#8a1a14', accentLight: '#c8463a', amb: 0.95,
    name: '黑色花岗岩' },
  H1: { wall: { t: 'earth', c: '#6e5238' }, part: { t: 'earth', c: '#5e4430' }, floor: { t: 'dirt', c: '#4a3a2a' }, accent: '#9a2a1a', accentLight: '#d06a48', tint: 0xffd8b0,
    slogans: ['肃清AB团', '肃清社会民主党'], name: '苏区：夯土墙' },
  H2: { wall: { t: 'loess', c: '#9a7d55' }, part: { t: 'loess', c: '#8a6e48' }, floor: { t: 'dirt', c: '#5e4b36' }, accent: '#8a2a1a', accentLight: '#8a2a1a', light: true, tint: 0xffe0b8,
    slogans: ['坦白从宽　抗拒从严'], name: '延安：黄土窑洞' },
  H3: { wall: { t: 'brick', c: '#4a4f56' }, part: { t: 'concrete', c: '#565a60' }, floor: { t: 'stone', c: '#3a3d42' }, accent: '#3e5f80', accentLight: '#9fb8d0', tint: 0xcfdcff, amb: 0.85,
    name: '围城：冬天的灰砖' },
  H4: { wall: { t: 'lime', c: '#cfc6b4' }, part: { t: 'lime', c: '#bdb3a0' }, floor: { t: 'dirt', c: '#584634' }, accent: '#a01c14', accentLight: '#a01c14', light: true,
    slogans: ['打倒恶霸地主', '耕者有其田'], name: '乡村：刷白的土墙与红标语' },
  H5: { wall: { t: 'plaster', c: '#c9c4b8' }, part: { t: 'plaster', c: '#2c2a28' }, floor: { t: 'cement', c: '#4a4844' }, accent: '#b01c1c', accentLight: '#b01c1c', light: true,
    slogans: ['镇压反革命', '坦白从宽　抗拒从严'], name: '公审布告：灰白墙与红勾' },
  H6: { wall: { t: 'plaster', c: '#3c4232' }, part: { t: 'planks', c: '#4a4232' }, floor: { t: 'planks', c: '#3a3226' }, accent: '#8a9a5a', accentLight: '#c0c890', tint: 0xe0f0d0, amb: 0.85,
    slogans: [], name: '战时：军绿与木板' },
  H7: { wall: { t: 'plaster', c: '#d6cfba' }, part: { t: 'plaster', c: '#cbc4ae' }, floor: { t: 'terrazzo', c: '#6e6a62' }, dado: { c: '#41604c', h: 1.6 }, accent: '#2f5a44', accentLight: '#2f5a44', light: true,
    name: '五十年代机关：绿墙裙与水磨石' },
  H8: { wall: { t: 'news', c: '#d8d0bc' }, part: { t: 'plaster', c: '#2d2b29' }, floor: { t: 'wood', c: '#4a3a2c' }, accent: '#7a1f1f', accentLight: '#7a1f1f', light: true,
    name: '一九五七：贴满报纸的墙' },
  H9: { wall: { t: 'plaster', c: '#6e1a12' }, part: { t: 'plaster', c: '#5a1610' }, floor: { t: 'dirt', c: '#3e2c20' }, accent: '#c8501a', accentLight: '#e0a040', tint: 0xffc890,
    slogans: ['人有多大胆　地有多大产', '超英赶美'], name: '大跃进：红与金' },
  H10: { wall: { t: 'earth', c: '#3c3833' }, part: { t: 'earth', c: '#33302c' }, floor: { t: 'cracked', c: '#4a4035' }, accent: '#666666', accentLight: '#9a9486', darkPanel: true, amb: 0.75,
    slogans: ['吃饭不要钱'], sloganFade: 0.4, name: '饥荒：干裂的土地' },
  H11: { wall: { t: 'plaster', c: '#3d3a33' }, part: { t: 'plaster', c: '#4a463e' }, floor: { t: 'stone', c: '#2e2c28' }, accent: '#2e5a6e', accentLight: '#8fb0c0',
    name: '边境与海：暗蓝' },
  H12: { wall: { t: 'plaster', c: '#5a1515' }, part: { t: 'plaster', c: '#4a1212' }, floor: { t: 'redtile', c: '#5a2a22' }, accent: '#c01818', accentLight: '#e0b040',
    slogans: ['造反有理', '破四旧　立四新'], name: '一九六六：大字报与红' },
  H13: { wall: { t: 'plaster', c: '#3a0e0e' }, part: { t: 'concrete', c: '#2e1c1a' }, floor: { t: 'cement', c: '#3a3434' }, accent: '#b01414', accentLight: '#d84a3a',
    slogans: ['红色恐怖万岁', '横扫一切牛鬼蛇神'], name: '红八月：血红' },
  H14: { wall: { t: 'concrete', c: '#555350' }, part: { t: 'concrete', c: '#4a4846' }, floor: { t: 'cement', c: '#3c3b39' }, accent: '#9a2a1a', accentLight: '#d06a48',
    slogans: ['文攻武卫'], bullets: true, name: '武斗：弹痕水泥墙' },
  H15: { wall: { t: 'planks', c: '#2a241d' }, part: { t: 'planks', c: '#231e18' }, floor: { t: 'dirt', c: '#2e2822' }, accent: '#8a1414', accentLight: '#c8463a', amb: 0.8,
    slogans: ['清理阶级队伍'], name: '牛棚：木板与泥地' },
  H16: { wall: { t: 'plaster', c: '#3a3a3c' }, part: { t: 'plaster', c: '#2c2c2e' }, floor: { t: 'stone', c: '#2a2a2c' }, accent: '#d8d4c8', accentLight: '#e8e4d8',
    name: '一九七六：黑与白' },
  H17: { wall: { t: 'brick', c: '#7a776f' }, part: { t: 'brick', c: '#6e6b64' }, floor: { t: 'cement', c: '#4b4a48' }, accent: '#3a4a5a', accentLight: '#3a4a5a', light: true,
    name: '西单：灰砖墙' },
  H18: { wall: { t: 'lime', c: '#d4d0c6' }, part: { t: 'tile', c: '#dcdedd' }, floor: { t: 'cement', c: '#5a5854' }, accent: '#b01c1c', accentLight: '#b01c1c', light: true, partText: true,
    slogans: ['一人超生　全村结扎', '该扎不扎　房倒屋塌'], name: '村墙上的标语与诊所白瓷砖' },
  H19: { wall: { t: 'plaster', c: '#d0d2cc' }, part: { t: 'plaster', c: '#c4c6c0' }, floor: { t: 'terrazzo', c: '#6a6a66' }, dado: { c: '#4f7378', h: 1.4 }, accent: '#1f4a6a', accentLight: '#1f4a6a', light: true, partText: true,
    slogans: ['从重从快'], name: '八十年代：蓝绿墙裙与布告' },
  H20: { wall: { t: 'plaster', c: '#111419' }, part: { t: 'plaster', c: '#181b20' }, floor: { t: 'asphalt', c: '#1c1c1e' }, accent: '#666666', accentLight: '#9a9486', darkPanel: true, tint: 0xb8c8ff, amb: 0.8,
    name: '六月四日夜：长安街' },
  H21: { wall: { t: 'plaster', c: '#2a2d31' }, part: { t: 'plaster', c: '#33363a' }, floor: { t: 'tile', c: '#3a3c3e' }, accent: '#3a4a5a', accentLight: '#9aaabb', tint: 0xe8f0ff,
    slogans: ['稳定压倒一切'], name: '维稳：日光灯与瓷砖' },
  H22: { wall: { t: 'concrete', c: '#3c3f41' }, part: { t: 'concrete', c: '#46494b' }, floor: { t: 'cement', c: '#2e3031' }, accent: '#3a4a5a', accentLight: '#9aaabb',
    name: '营地：混凝土与铁丝网' },
  H23: { wall: { t: 'plaster', c: '#15181c' }, part: { t: 'plaster', c: '#1c1f24' }, floor: { t: 'stone', c: '#121417' }, accent: '#c01818', accentLight: '#e04a3a',
    name: '收紧：黑与红' },
  H24: { wall: { t: 'plaster', c: '#d8dadb' }, part: { t: 'hoarding', c: '#2a5a9a' }, floor: { t: 'cement', c: '#4e5052' }, accent: '#3c6fb0', accentLight: '#2a5a9a', light: true,
    slogans: ['动态清零', '应检尽检'], name: '封控：白墙与蓝色围挡' },
  MEM: { wall: { t: 'plaster', c: '#121214' }, part: { t: 'plaster', c: '#1a1a1c' }, floor: { t: 'stone', c: '#0d0d0f' }, accent: '#7a1f1f', accentLight: '#b89a55', amb: 1.3 }
};

// ───────────────────────── 入口冲击区 ─────────────────────────
// mode：num 大数字 / quote 原话 / slogan 墙上标语 / blank 白纸 / frame 空画框；scene：地面装置
export const IMPACT = {
  B: { mode: 'frame', big: '这幅画像至今仍挂在天安门城楼上。', line: '天安门城楼上的毛泽东画像约6米高、4.6米宽，1949年以来几乎从未取下。', note: '本厅不展示他的遗容，只展示他说过的话、他发动的运动，以及因此死去的人。', scene: 'none' },
  H1: { big: '近 100,000', line: '1930—1936年各苏区内部肃反中，被自己的同志杀害的红军官兵和党员（研究者估计）', note: '“AB团”“社会民主党”“改组派”——被扣上这些罪名的人，绝大多数与这些组织毫无关系。地上每一根木桩代表一百人。', scene: 'stakes' },
  H2: { big: '15,000 / 30,000', line: '1943年“抢救运动”：延安三万多名干部和学生中，约一万五千人被打成特务嫌疑', note: '车轮战、假枪毙、捆绑吊打。“坦白从宽，抗拒从严”在这一时期流行开来。每两个凳子里，有一个倒在地上。', scene: 'stools' },
  H3: { big: '10万—30万', line: '1948年长春围城中饿死的平民（各方估计；时任长春市长尚传道回忆为十二万人）', note: '“使长春成为死城”。官方的叙述称长春“兵不血刃”，至今没有一座纪念碑。', scene: 'cheval' },
  H4: { big: '数十万—200万', line: '土地改革中被打死、逼死或处决的人（研究者的估计，差别很大；从未有过官方统计）', note: '地主、富农的“成分”此后跟随一家人三十年：升学、参军、招工、婚姻，都要先看出身。', scene: 'deeds' },
  H5: { big: '712,000', line: '镇压反革命运动中被处决的人数（公安部1954年报告）', note: '处决人数按人口比例下达，农村约为千分之一。土改中另有数十万至二百万以上的人被打死或处决（估计）。每一块斩标代表一万人。', scene: 'placards' },
  H6: { big: '21,000 / 14,000', line: '韩战结束时的志愿军战俘约两万一千人，其中约一万四千人去了台湾（约数）', note: '回到大陆的约七千人，大多被开除党籍、军籍，长期背着“叛徒”的嫌疑；张泽石直到1981年才得到平反。', scene: 'rifles' },
  H7: { big: '1,400,000', line: '1955年起的“肃反”运动中受到审查的人数（官方统计），最后定为“反革命分子”的约八万余人', note: '人人交代历史、相互检举。没有定罪的人，档案里也留下了伴随终生的“历史问题”。', scene: 'files' },
  H8: { big: '552,877', line: '1957年被划为“右派分子”的人数（官方公布）', note: '他们响应号召提了意见；各单位按比例分配名额。甘肃夹边沟农场关押了约三千人，到1961年大半饿死在戈壁上。', scene: 'dunes' },
  H9: { big: '9000万', line: '1958年秋被动员上山“大炼钢铁”的人数；年底宣布的1108万吨钢里，三百多万吨土钢根本无法使用', note: '农民的铁锅、门环、农具被收去回炉。成熟的庄稼烂在地里，无人收割。', scene: 'woks' },
  H10: { big: '3600万', line: '大饥荒中非正常死亡的人数（杨继绳《墓碑》的估计；研究者的推算多在1600万至4500万之间）', note: '没有战争，没有瘟疫，气候大体正常。国家按虚报的产量征购，拿走了农民的口粮和种子。', scene: 'canteen' },
  H11: { big: '560,000', line: '1954—1980年广东有案可查的偷渡香港者（人次）', note: '他们抱着篮球、猪尿泡和汽车内胎泅渡深圳湾。溺死、被鲨鱼咬死、被边防枪击的人数不详。他们被称为“叛国投敌分子”。', scene: 'sea' },
  H12: { big: '4,200,000', line: '文革中被关押审查的人数（1984年中共中央调查，转引自《建国以来历史政治运动事实》）', note: '被批斗、游街、挂牌、剃“阴阳头”的人从来没有统计过。同一调查说，非正常死亡一百七十二万余人，以“现行反革命”判处死刑十三万五千余人。', scene: 'speakers' },
  H13: { w: 4.8, big: '1,772', line: '1966年8月下旬至9月底，北京被打死的人数（官方统计）；同期11.4万多户被抄家', note: '第一个是北京师范大学女附中副校长卞仲耘，8月5日被本校学生殴打折磨数小时后死去。行凶者多数只有十几岁。', scene: 'classroom' },
  H14: { mode: 'quote', big: '“祝全国全面内战！”', line: '毛泽东在七十三岁生日晚宴上举杯，1966年12月26日', note: '1967年夏，两派从棍棒、长矛打到真枪实弹，坦克、高射炮和炮艇被投入巷战。', scene: 'sandbags' },
  H15: { big: '89,000+', line: '广西文革中有名有姓的死亡者（八十年代官方调查）；实际死亡估计超过十万', note: '文革中死人最多的阶段，是“革命委员会”建立之后。杀戮由新的政权机关组织实施。', scene: 'cowshed' },
  H16: { mode: 'quote', big: '“欲悲闹鬼叫，我哭豺狼笑。”', line: '贴在天安门广场人民英雄纪念碑前的诗，1976年清明', note: '上百万人次来到广场悼念周恩来。4月5日夜，民兵和警察持棍棒清场。这是十年间民意第一次公开的表达。', scene: 'wreaths' },
  H17: { big: '3,000,000', line: '1977—1982年得到平反的干部冤假错案（约数）；五十五万右派中绝大多数获得“改正”', note: '受害者多数只领到一纸结论和补发的少量工资。施害者多数没有被追究。', scene: 'brickwall' },
  H18: { mode: 'slogan', big: '宁可血流成河，不准超生一个', line: '计划生育时期刷在农村墙上的标语', note: '1971—2013年：人工流产约3.36亿例，结扎约1.96亿例（卫生部门2013年披露，含自愿与被强制者，比例无从得知）。', scene: 'clinic' },
  H19: { big: '约 24,000', line: '1983年“严打”第一战役一年内判处死刑的人数（约数）', note: '上诉期限由十日缩短为三日；各地按指标完成逮捕和判决，许多案件从逮捕到处决只有几天。', scene: 'notices' },
  H20: { big: '202', line: '“天安门母亲”已确认姓名的六四遇难者，最年幼的九岁', note: '当局从未公布死者名单，并禁止家属公开悼念。她们说，这只是冰山一角。', scene: 'tank' },
  H21: { big: '5,335', line: '汶川地震中遇难和失踪的学生（官方公布）', note: '政府办公楼没有倒，教学楼整体垮塌。要求调查校舍质量的家长被拦截、拘留，调查者被判刑。', scene: 'schoolbags' },
  H22: { big: '1,000,000', line: '新疆被关押在“职业技能教育培训中心”的人数（联合国消除种族歧视委员会2018年引述的可信报告）', note: '未经任何司法程序。被关押的理由包括戴面纱、留胡须、做礼拜、出过国、手机里装了某个软件。', scene: 'fence' },
  H23: { big: '300+', line: '2015年“709”大抓捕中被传唤、拘留或失踪的律师和活动人士', note: '多人被“指定居所监视居住”：不通知家属，不许会见律师，最长六个月。', scene: 'cameras' },
  H24: { mode: 'blank', big: '', line: '2022年11月，人们举起一张白纸', note: '乌鲁木齐火灾之后，上海、北京和许多城市的人们走上街头。纸上什么也没有写。', scene: 'papers' }
};


// ───────────────────────── 材质贴图 ─────────────────────────
// 返回 { cv, tile:[宽, 高]（米） }：贴图按真实尺寸平铺，不随墙面拉伸
const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgb = (c, k = 0, a = 1) => { const [r, g, b] = hex2rgb(c), f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgba(${f(r)},${f(g)},${f(b)},${a})`; };
function grain(c, W, H, amp, R) {
  const img = c.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  c.putImageData(img, 0, 0);
}
function blotches(c, W, H, n, R, dark = 0.06, light = 0.04) {
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H, r = 10 + R() * 60, g = c.createRadialGradient(x, y, 0, x, y, r), v = R() > 0.5;
    g.addColorStop(0, v ? `rgba(0,0,0,${dark * R()})` : `rgba(255,255,255,${light * R()})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
export function styleTexture(spec, seed = 11) {
  const R = rng(seed + spec.c.length * 7 + parseInt(spec.c.slice(1), 16) % 997), c0 = spec.c;
  const make = (W, H, tile, draw) => ({ cv: textCanvas(W, H, (c) => { draw(c, W, H); }), tile });
  switch (spec.t) {
    case 'earth': return make(512, 512, [2.4, 2.4], (c, W, H) => {   // 夯土墙：一层层压实的土，层次不规则
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H);
      for (let y = 0; y < H;) { const h = 34 + R() * 50; c.fillStyle = rgb(c0, (R() - 0.5) * 0.09); c.fillRect(0, y, W, h);
        c.strokeStyle = 'rgba(0,0,0,.07)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, y + h); for (let x = 0; x <= W; x += 32) c.lineTo(x, y + h + (R() - 0.5) * 6); c.stroke(); y += h; }
      blotches(c, W, H, 90, R, 0.14, 0.06); grain(c, W, H, 26, R);
      for (let i = 0; i < 360; i++) { c.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},${0.06 + R() * 0.1})`; c.beginPath(); c.arc(R() * W, R() * H, 0.6 + R() * 2.2, 0, 7); c.fill(); }
    });
    case 'loess': return make(512, 512, [2.4, 2.4], (c, W, H) => {   // 窑洞的黄土壁：竖向的镢头印
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); blotches(c, W, H, 110, R, 0.12, 0.07);
      for (let i = 0; i < 260; i++) { const x = R() * W, y = R() * H, h = 18 + R() * 46; c.fillStyle = `rgba(0,0,0,${0.03 + R() * 0.05})`; c.fillRect(x, y, 2 + R() * 3, h); c.fillStyle = `rgba(255,255,255,${0.02 + R() * 0.04})`; c.fillRect(x + 3, y, 1.5, h); }
      grain(c, W, H, 22, R);
    });
    case 'dirt': return make(512, 512, [3, 3], (c, W, H) => {   // 泥土地面
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); blotches(c, W, H, 140, R, 0.16, 0.06); grain(c, W, H, 30, R);
      for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${R() > 0.6 ? '200,190,170' : '0,0,0'},${0.1 + R() * 0.2})`; c.beginPath(); c.arc(R() * W, R() * H, 0.8 + R() * 2.5, 0, 7); c.fill(); }
    });
    case 'lime': return make(512, 512, [3, 3], (c, W, H) => {   // 刷白的土墙：石灰斑驳、墙根发黑
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); blotches(c, W, H, 90, R, 0.07, 0.06);
      for (let i = 0; i < 3; i++) { const x = R() * W, y = R() * H; c.fillStyle = rgb(c0, -0.22, 0.35); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28; c.lineTo(x + Math.cos(a) * (12 + R() * 30), y + Math.sin(a) * (8 + R() * 20)); } c.fill(); }
      grain(c, W, H, 14, R);
    });
    case 'brick': return make(512, 256, [1.0, 0.5], (c, W, H) => {   // 灰砖：一顺一丁的清水墙
      c.fillStyle = rgb(c0, -0.35); c.fillRect(0, 0, W, H);
      const rows = 8, bh = H / rows, bw = W / 4;
      for (let r = 0; r < rows; r++) for (let i = -1; i < 5; i++) { const x = i * bw + (r % 2) * bw / 2; c.fillStyle = rgb(c0, (R() - 0.5) * 0.22); c.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6); }
      grain(c, W, H, 22, R); blotches(c, W, H, 25, R, 0.12, 0.04);
    });
    case 'tile': return make(256, 256, [0.8, 0.8], (c, W, H) => {   // 瓷砖
      c.fillStyle = rgb(c0, -0.25); c.fillRect(0, 0, W, H);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = rgb(c0, (R() - 0.5) * 0.05); c.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
      grain(c, W, H, 8, R);
    });
    case 'concrete': return make(512, 512, [3, 1.8], (c, W, H) => {   // 模板混凝土：木模纹与对拉螺栓孔
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); blotches(c, W, H, 80, R, 0.1, 0.05);
      for (let y = 0; y < H; y += H / 6) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, y, W, 2); c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, y + 2, W, 1); }
      for (let y = H / 12; y < H; y += H / 3) for (let x = W / 8; x < W; x += W / 4) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
      grain(c, W, H, 20, R);
    });
    case 'news': return make(512, 384, [2.0, 1.5], (c, W, H) => {   // 贴满旧报纸的墙
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H);
      for (let p = 0; p < 6; p++) {
        const px = (p % 3) * W / 3 + (R() - 0.5) * 20, py = Math.floor(p / 3) * H / 2 + (R() - 0.5) * 16, pw = W / 3 + 10, ph = H / 2 + 8;
        c.fillStyle = rgb(c0, (R() - 0.5) * 0.08); c.fillRect(px, py, pw, ph);
        c.fillStyle = 'rgba(30,25,20,.55)'; c.fillRect(px + 10, py + 10, pw * (0.4 + R() * 0.4), 14);
        for (let col = 0; col < 4; col++) for (let l = 0; l < 24; l++) { const ly = py + 34 + l * 6.4; if (ly > py + ph - 8) break; c.fillStyle = `rgba(40,35,30,${0.18 + R() * 0.12})`; c.fillRect(px + 10 + col * (pw - 20) / 4, ly, (pw - 20) / 4 - 6 - R() * 10, 2.4); }
      }
      blotches(c, W, H, 40, R, 0.08, 0.03); grain(c, W, H, 10, R);
    });
    case 'granite': return make(512, 512, [2, 2], (c, W, H) => {   // 黑色花岗岩
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); grain(c, W, H, 18, R);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${R() > 0.7 ? '200,200,205' : '0,0,0'},${0.15 + R() * 0.3})`; c.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 0, W, 2); c.fillRect(0, 0, 2, H);
    });
    case 'planks': return make(512, 512, [1.8, 2.4], (c, W, H) => {   // 竖向木板墙
      for (let x = 0; x < W; x += W / 10) { c.fillStyle = rgb(c0, (R() - 0.5) * 0.25); c.fillRect(x, 0, W / 10, H); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x, 0, 3, H);
        for (let k = 0; k < 14; k++) { c.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.08})`; c.fillRect(x + R() * W / 10, 0, 1, H); } }
      grain(c, W, H, 16, R); blotches(c, W, H, 30, R, 0.15, 0.03);
    });
    case 'hoarding': return make(512, 256, [2.0, 1.0], (c, W, H) => {   // 蓝色彩钢围挡
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 16) { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(x, 0, 6, H); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x + 12, 0, 3, H); }
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(W - 4, 0, 4, H); grain(c, W, H, 8, R);
    });
    // ── 地面 ──
    case 'cracked': return make(512, 512, [3, 3], (c, W, H) => {   // 干裂的土地：龟裂成一块块的泥板
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); blotches(c, W, H, 80, R, 0.12, 0.06); grain(c, W, H, 20, R);
      const N = 7, cell = W / N, P = [];
      for (let j = 0; j <= N; j++) { P.push([]); for (let i = 0; i <= N; i++) { const edge = i === 0 || j === 0 || i === N || j === N; P[j].push([i * cell + (edge ? 0 : (R() - 0.5) * cell * 0.7), j * cell + (edge ? 0 : (R() - 0.5) * cell * 0.7)]); } }
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { if (i === N) P[j][i][1] = P[j][0][1]; if (j === N) P[j][i][0] = P[0][i][0]; }
      const crack = (a, b) => { c.lineWidth = 1.2 + R() * 2.2; c.strokeStyle = `rgba(12,9,6,${0.55 + R() * 0.3})`; c.beginPath(); c.moveTo(a[0], a[1]);
        const m = [(a[0] + b[0]) / 2 + (R() - 0.5) * 10, (a[1] + b[1]) / 2 + (R() - 0.5) * 10]; c.lineTo(m[0], m[1]); c.lineTo(b[0], b[1]); c.stroke(); };
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { if (i < N) crack(P[j][i], P[j][i + 1]); if (j < N) crack(P[j][i], P[j + 1][i]); if (i < N && j < N && R() > 0.65) crack(P[j][i], P[j + 1][i + 1]); }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const [x, y] = P[j][i], g = c.createRadialGradient(x + cell / 2, y + cell / 2, 2, x + cell / 2, y + cell / 2, cell * 0.6); g.addColorStop(0, 'rgba(255,240,210,.06)'); g.addColorStop(1, 'rgba(0,0,0,.08)'); c.fillStyle = g; c.fillRect(x, y, cell, cell); }
    });
    case 'terrazzo': return make(512, 512, [2, 2], (c, W, H) => {   // 水磨石，铜条分格
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H);
      for (let i = 0; i < 2200; i++) { const v = R(); c.fillStyle = v > 0.66 ? 'rgba(240,235,225,.55)' : v > 0.33 ? 'rgba(20,20,20,.45)' : 'rgba(150,110,80,.5)'; c.fillRect(R() * W, R() * H, 1.5 + R() * 4, 1.5 + R() * 4); }
      c.fillStyle = 'rgba(160,130,70,.8)'; c.fillRect(0, 0, W, 2); c.fillRect(0, 0, 2, H); c.fillRect(0, H / 2, W, 2); c.fillRect(W / 2, 0, 2, H);
      grain(c, W, H, 10, R);
    });
    case 'cement': return make(512, 512, [4, 4], (c, W, H) => {   // 水泥地，伸缩缝
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); blotches(c, W, H, 70, R, 0.12, 0.05); grain(c, W, H, 20, R);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, W, 2); c.fillRect(0, 0, 2, H); c.fillRect(0, H / 2, W, 2); c.fillRect(W / 2, 0, 2, H);
    });
    case 'asphalt': return make(512, 512, [3, 3], (c, W, H) => {   // 沥青路面
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); grain(c, W, H, 34, R);
      for (let i = 0; i < 1800; i++) { c.fillStyle = `rgba(${R() > 0.5 ? '120,120,120' : '0,0,0'},${0.2 + R() * 0.3})`; c.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }
      blotches(c, W, H, 30, R, 0.15, 0.03);
    });
    case 'redtile': return make(256, 256, [1.2, 1.2], (c, W, H) => {   // 红缸砖
      c.fillStyle = rgb(c0, -0.4); c.fillRect(0, 0, W, H);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = rgb(c0, (R() - 0.5) * 0.18); c.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
      grain(c, W, H, 16, R);
    });
    case 'stone': return make(512, 512, [2.4, 2.4], (c, W, H) => {   // 石板
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); grain(c, W, H, 16, R); blotches(c, W, H, 30, R, 0.08, 0.04);
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 0, W, 2); c.fillRect(0, 0, 2, H); c.fillRect(0, H / 2, W, 2); c.fillRect(W / 2, 0, 2, H);
    });
    case 'wood': return make(512, 512, [2.4, 2.4], (c, W, H) => {   // 木地板
      const rows = 16, bh = H / rows;
      for (let r = 0; r < rows; r++) for (let x = -((r % 4) * W / 8); x < W; x += W / 2) {
        c.fillStyle = rgb(c0, (R() - 0.5) * 0.25); c.fillRect(x, r * bh, W / 2, bh);
        c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, r * bh + bh - 1.5, W / 2, 1.5); c.fillRect(x + W / 2 - 1.5, r * bh, 1.5, bh);
      }
      grain(c, W, H, 12, R);
    });
    default: return make(512, 512, [4, 4], (c, W, H) => {   // 抹灰
      c.fillStyle = rgb(c0); c.fillRect(0, 0, W, H); blotches(c, W, H, 70, R, 0.07, 0.05); grain(c, W, H, 12, R);
    });
  }
}

// 刷在墙上的标语（红漆，带剥落）
export function sloganCanvas(text, color = '#b8231b', fade = 1, k = 1) {   // k：像素倍数（低内存设备用 0.5）
  const W = 2048, H = 256;
  return textCanvas(Math.round(W * k), Math.round(H * k), (c) => {
    c.scale(k, k);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 190; c.font = `900 ${fs}px ${SANS}`; while (c.measureText(text).width > W - 60 && fs > 60) { fs -= 6; c.font = `900 ${fs}px ${SANS}`; }
    c.globalAlpha = 0.86 * fade; c.fillStyle = color; c.fillText(text, W / 2, H / 2 + 6);
    // 剥落与褪色
    c.globalCompositeOperation = 'destination-out'; const R = rng(text.length * 31 + 7);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${0.2 + R() * 0.6})`; c.fillRect(R() * W, R() * H, 2 + R() * 9, 1 + R() * 5); }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  });
}

// 入口冲击区的大字：直接印在墙上（透明底）。整体按墙面大小缩放，保证所有文字都排得下
export function drawImpact(sp, theme, K, wm, hm) {
  const W0 = Math.round(wm * 160), H0 = Math.round(hm * 160);
  const W = Math.round(W0 * K), H = Math.round(H0 * K);
  return textCanvas(W, H, (c) => {
    c.scale(K, K);
    const dark = sp.plate === 'dark' || (sp.plate && !theme.light);
    if (sp.plate) { c.fillStyle = dark ? 'rgba(16,13,11,.86)' : 'rgba(236,231,220,.86)'; c.fillRect(0, 0, W0, H0); }
    const light = theme.light && !dark, ink = light ? '#1a1714' : '#efe8d8', sub = light ? '#4a453d' : '#b8b0a0', acc = theme.accentLight || '#c8463a';
    c.textBaseline = 'top';
    const wrap = (txt, max) => { const out = []; let l = ''; for (const ch of txt) { if (c.measureText(l + ch).width > max && l) { out.push(l); l = ''; } l += ch; } if (l) out.push(l); return out; };
    // 先按比例 f 排版并量出总高度；放不下就缩小再排
    const layout = (f, draw) => {
      let y = 10 * f; const pad = 14;
      const fitBig = (txt, size, weight, fam) => { let fs = size * f; c.font = `${weight} ${fs}px ${fam}`; while (c.measureText(txt).width > W0 - 30 && fs > 12) { fs -= 2; c.font = `${weight} ${fs}px ${fam}`; } return fs; };
      if (sp.mode === 'blank') {
        const ph = Math.min(H0 * 0.62, (W0 * 0.42) * 1.414) * f, pw = ph / 1.414, px = (W0 - pw) / 2;
        if (draw) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(px + 10, y + 10, pw, ph); c.fillStyle = '#f7f7f3'; c.fillRect(px, y, pw, ph); }
        y += ph + 18 * f;
      } else if (sp.mode === 'quote' || sp.mode === 'slogan' || sp.mode === 'frame') {
        const fam = sp.mode === 'slogan' ? SANS : FONT, fs = fitBig(sp.big, sp.mode === 'slogan' ? 150 : sp.mode === 'frame' ? 64 : 118, sp.mode === 'frame' ? 700 : 900, fam);
        if (draw) { c.fillStyle = sp.mode === 'slogan' ? (theme.accent || '#b01c1c') : ink; c.fillText(sp.big, pad, y); }
        y += fs * 1.28;
      } else {
        const fs = fitBig(sp.big, 250, 900, SANS);
        if (draw) { c.fillStyle = acc; c.fillText(sp.big, pad - 4, y - fs * 0.06); }
        y += fs * 1.02;
      }
      if (draw) { c.fillStyle = acc; c.fillRect(pad, y, 90 * f, 6 * f); }
      y += 22 * f;
      c.font = `600 ${34 * f}px ${SANS}`;
      for (const l of wrap(sp.line, W0 - 40)) { if (draw) { c.fillStyle = ink; c.fillText(l, pad, y); } y += 46 * f; }
      y += 8 * f; c.font = `${27 * f}px ${SANS}`;
      for (const l of wrap(sp.note, W0 - 40)) { if (draw) { c.fillStyle = sub; c.fillText(l, pad, y); } y += 38 * f; }
      return y;
    };
    let f = 1; while (f > 0.45 && layout(f, false) > H0 - 6) f -= 0.05;
    layout(f, true);
  });
}
