// 延伸阅读链接：均已通过维基百科 API 核实条目存在（标题为核实后的条目名）。
export const wikiUrl = (t) => `https://zh.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`;
export const PEOPLE_WIKI = {"陈独秀": "陈独秀", "李文林": "李文林", "许继慎": "许继慎", "段德昌": "段德昌", "王实味": "王实味", "董时进": "董时进", "卢作孚": "卢作孚", "梁漱溟": "梁漱溟", "胡风": "胡风", "龚品梅": "龚品梅", "王明道": "王明道", "储安平": "储安平", "罗隆基": "罗隆基", "林希翎": "林希翎", "葛佩琦": "葛佩琦", "杨兆龙": "楊兆龍", "黄万里": "黄万里", "马寅初": "马寅初", "林昭": "林昭", "彭德怀": "彭德怀", "张恺帆": "张恺帆", "第十世班禅额尔德尼·确吉坚赞": "第十世班禅额尔德尼", "王容芬": "王容芬", "遇罗克": "遇罗克", "卞仲耘": "卞仲耘", "老舍": "老舍", "傅雷": "傅雷", "陈寅恪": "陈寅恪", "刘少奇": "刘少奇", "刘文辉": "刘文辉", "顾圣婴": "顾圣婴", "陆洪恩": "陆洪恩", "王佩英": "王佩英", "张志新": "张志新", "容国团": "容国团", "叶企孙": "叶企孙", "顾准": "顧準", "李九莲": "李九莲", "王申酉": "王申酉", "魏京生": "魏京生", "陈光诚": "陈光诚", "胡耀邦": "胡耀邦", "赵紫阳": "赵紫阳", "丁子霖": "丁子霖", "方政": "方政", "鲍彤": "鲍彤", "李旺阳": "李旺陽事件", "刘晓波": "刘晓波", "高耀洁": "高耀洁", "蒋彦永": "蒋彦永", "唐福珍": "成都女业主自焚事件", "高智晟": "高智晟", "曹顺利": "曹顺利", "扎西文色": "扎西文色", "热依拉·达吾提": "热依拉·达吾提", "邹幸彤": "鄒幸彤", "王全璋": "王全璋", "许志永": "许志永", "黄雪琴": "黃雪琴", "张展": "张展"};
export const HALL_READING = {
"A": [
"毛主席纪念堂",
"汕頭文革博物館"
],
"B": [
"毛主席纪念堂"
],
"H1": [
"第三国际",
"中国共产党第一次全国代表大会",
"武装保卫苏联",
"中东路事件",
"顾顺章"
],
"H2": [
"中华苏维埃共和国",
"AB团",
"富田事变",
"白雀园肃反",
"夏曦"
],
"H3": [
"延安整风",
"王实味",
"延安整风"
],
"H4": [
"国共内战",
"马歇尔使华",
"长春围困战"
],
"H5": [
"土地改革运动",
"镇压反革命运动",
"朝鲜战争"
],
"H6": [
"三反五反运动",
"思想改造運動",
"胡风反革命集团案",
"肃反运动"
],
"H7": [
"百花齐放、百家争鸣",
"反右运动",
"林昭",
"夹边沟"
],
"H8": [
"大跃进",
"人民公社",
"土法煉鋼",
"庐山会议 (1959年)"
],
"H9": [
"三年困难时期",
"信阳事件",
"七千人大会"
],
"H10": [
"七万言书",
"四清运动"
],
"H11": [
"文化大革命",
"五一六通知",
"红卫兵",
"破四旧"
],
"H12": [
"红八月",
"卞仲耘",
"大兴事件"
],
"H13": [
"一月风暴",
"武斗",
"七·二〇事件"
],
"H14": [
"清理階級隊伍",
"广西文革屠杀",
"一打三反運動",
"内人党事件"
],
"H15": [
"九一三事件",
"批林批孔运动",
"四五运动",
"四人帮"
],
"H16": [
"拨乱反正",
"北京之春",
"西单民主墙",
"魏京生"
],
"H17": [
"中华人民共和国计划生育",
"陈光诚"
],
"H18": [
"严打",
"清除精神污染",
"八六学潮"
],
"H19": [
"六四事件",
"天安门母亲群体",
"坦克人"
],
"H20": [
"中國維權運動",
"法轮功",
"零八宪章",
"刘晓波"
],
"H21": [
"新疆再教育營",
"西藏自治区",
"反對逃犯條例修訂草案運動",
"中華人民共和國香港特別行政區維護國家安全法"
],
"H22": [
"中國709維權律師大抓捕事件",
"新公民运动"
],
"H23": [
"2019冠状病毒病疫情",
"李文亮",
"2022年3月上海市2019冠状病毒病聚集性疫情",
"2022年新疆乌鲁木齐高层住宅楼火灾",
"白紙運動"
]
};
export const BOOKS = {
 "H2": [
  {
   "t": "《毛泽东：鲜为人知的故事》",
   "a": "张戎、乔·哈利戴",
   "y": "2005 年英文版（Mao: The Unknown Story），2006 年香港开放出版社中文版",
   "d": "根据大量访谈与档案重写毛泽东生平，详述苏区肃反、长征与延安时期。学界对书中部分史料的运用和结论有批评。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/maozedongxianwei0001chan"
    ],
    [
     "维基百科：毛澤東：鮮為人知的故事",
     "https://zh.wikipedia.org/wiki/%E6%AF%9B%E6%BE%A4%E6%9D%B1%EF%BC%9A%E9%AE%AE%E7%82%BA%E4%BA%BA%E7%9F%A5%E7%9A%84%E6%95%85%E4%BA%8B"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H3": [
  {
   "t": "《红太阳是怎样升起的：延安整风运动的来龙去脉》",
   "a": "高华",
   "y": "2000 年，香港中文大学出版社",
   "d": "利用大量公开与内部出版的史料，系统研究延安整风与“抢救运动”如何确立毛泽东的绝对权威。",
   "st": "未能在大陆出版，以香港版本流传。",
   "links": [
    [
     "在线阅读 PDF（Internet Archive，用户上传）",
     "https://ia601400.us.archive.org/6/items/themicrostudios_gmail_2007/%E7%BA%A2%E5%A4%AA%E9%98%B3%E6%98%AF%E6%80%8E%E6%A0%B7%E5%8D%87%E8%B5%B7%E7%9A%84-%E9%AB%98%E5%8D%8E.pdf"
    ],
    [
     "维基百科：紅太陽是怎樣升起的",
     "https://zh.wikipedia.org/wiki/%E7%B4%85%E5%A4%AA%E9%99%BD%E6%98%AF%E6%80%8E%E6%A8%A3%E5%8D%87%E8%B5%B7%E7%9A%84"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H4": [
  {
   "t": "《雪白血红》",
   "a": "张正隆",
   "y": "1989 年，解放军出版社",
   "d": "以报告文学记述辽沈战役，其中写到长春围城中大批平民饿死。",
   "st": "出版后不久即被查禁，作者受到审查。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/xuebaixuehongjia0000zhan"
    ],
    [
     "维基百科：雪白血红",
     "https://zh.wikipedia.org/wiki/%E9%9B%AA%E7%99%BD%E8%A1%80%E7%BA%A2"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《大江大海一九四九》",
   "a": "龙应台",
   "y": "2009 年，台北天下杂志",
   "d": "以个人与家族的离散写 1949 年前后的战争与迁徙，包括长春围城。",
   "st": "未获在大陆出版。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/dajiangdahaiyiji0000long"
    ],
    [
     "维基百科：大江大海一九四九",
     "https://zh.wikipedia.org/wiki/%E5%A4%A7%E6%B1%9F%E5%A4%A7%E6%B5%B7%E4%B8%80%E4%B9%9D%E5%9B%9B%E4%B9%9D"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H5": [
  {
   "t": "《软埋》",
   "a": "方方",
   "y": "2016 年，人民文学出版社",
   "d": "长篇小说，以一位失忆老人的身世，回溯土地改革中地主家庭的灭门与自杀。",
   "st": "出版后受到批判，2017 年起下架停印。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/ruanmai0000fang"
    ],
    [
     "维基百科：软埋",
     "https://zh.wikipedia.org/wiki/%E8%BD%AF%E5%9F%8B"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《解放的悲剧：中国革命史 1945—1957》",
   "a": "冯客（Frank Dikötter）",
   "y": "2013 年英文版（The Tragedy of Liberation），2018 年台北联经中文版",
   "d": "“人民三部曲”第一部，利用地方档案叙述土改、镇反与思想改造中的暴力。",
   "st": "不能在大陆出版。",
   "links": [
    [
     "在线借阅：英文原版《The Tragedy of Liberation》（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/tragedyofliberat0000diko"
    ],
    [
     "维基百科：解放的悲剧",
     "https://zh.wikipedia.org/wiki/%E8%A7%A3%E6%94%BE%E7%9A%84%E6%82%B2%E5%8A%87%EF%BC%9A%E4%B8%AD%E5%9C%8B%E9%9D%A9%E5%91%BD%E5%8F%B21945-1957"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H7": [
  {
   "t": "《往事并不如烟》",
   "a": "章诒和",
   "y": "2004 年，人民文学出版社（删节版）；香港版书名《最后的贵族》",
   "d": "回忆父亲章伯钧及储安平、罗隆基、史良等民主人士在 1957 年前后的遭遇。",
   "st": "2005 年起作者的书被列入禁止再版名单。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/wangshibingburuy0000zhan"
    ],
    [
     "维基百科：往事並不如煙",
     "https://zh.wikipedia.org/wiki/%E5%BE%80%E4%BA%8B%E4%B8%A6%E4%B8%8D%E5%A6%82%E7%85%99"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《夹边沟记事》",
   "a": "杨显惠",
   "y": "2002 年，天津古籍出版社",
   "d": "根据对幸存者的采访写成的纪实小说，记述甘肃夹边沟劳教农场右派的大批饿死。",
   "st": "曾在大陆出版，相关电影《夹边沟》（王兵）不能公映，题材长期受限。",
   "links": [
    [
     "在线借阅：英文版《Woman from Shanghai》（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/womanfromshangha0000yang"
    ],
    [
     "维基百科：作者杨显惠",
     "https://zh.wikipedia.org/wiki/%E6%9D%A8%E6%98%BE%E6%83%A0"
    ],
    [
     "维基百科：夹边沟农场",
     "https://zh.wikipedia.org/wiki/%E5%A4%B9%E8%BE%B9%E6%B2%9F%E5%86%9C%E5%9C%BA"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H9": [
  {
   "t": "《墓碑：中国六十年代大饥荒纪实》",
   "a": "杨继绳",
   "y": "2008 年，香港天地图书",
   "d": "前新华社记者走访各省档案与亲历者写成，估计大饥荒非正常死亡约三千六百万人。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "在线阅读 PDF（Internet Archive，用户上传）",
     "https://archive.org/download/mu-bei-liu-shi-nian-dai-da-ji-huang-ji-shi-yang-ji-sheng/Mu%20Bei%20--Liu%20Shi%20Nian%20Dai%20Da%20Ji%20Huang%20Ji%20Shi%20-%20Yang%20Ji%20Sheng.pdf"
    ],
    [
     "维基百科：墓碑（书籍）",
     "https://zh.wikipedia.org/wiki/%E5%A2%93%E7%A2%91_%28%E4%B9%A6%E7%B1%8D%29"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《毛泽东的大饥荒：1958—1962 年的中国浩劫史》",
   "a": "冯客（Frank Dikötter）",
   "y": "2010 年英文版（Mao's Great Famine），中文版 2011—2012 年在香港出版",
   "d": "利用省、县档案，估计大跃进期间至少四千五百万人非正常死亡。",
   "st": "不能在大陆出版。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/maozedongdedajih0000dikt"
    ],
    [
     "维基百科：毛澤東的大饑荒：1958-1962年的中國浩劫史",
     "https://zh.wikipedia.org/wiki/%E6%AF%9B%E6%BE%A4%E6%9D%B1%E7%9A%84%E5%A4%A7%E9%A5%91%E8%8D%92%EF%BC%9A1958-1962%E5%B9%B4%E7%9A%84%E4%B8%AD%E5%9C%8B%E6%B5%A9%E5%8A%AB%E5%8F%B2"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H11": [
  {
   "t": "《出身论》",
   "a": "遇罗克",
   "y": "1967 年，刊于《中学文革报》第一期",
   "d": "批判“老子英雄儿好汉”的血统论，主张出身不同的青年政治权利平等。作者因此于 1970 年被处决。",
   "st": "从未在大陆重新正式出版。",
   "links": [
    [
     "在线阅读：维基文库（全文）",
     "https://zh.wikisource.org/wiki/%E5%87%BA%E8%BA%AB%E8%AE%BA"
    ],
    [
     "在线阅读：中文马克思主义文库（全文）",
     "https://www.marxists.org/chinese/reference-books/minjian-1966-1976/05.htm"
    ],
    [
     "维基百科：出身论",
     "https://zh.wikipedia.org/wiki/%E5%87%BA%E8%BA%AB%E8%AE%BA"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《毛泽东私人医生回忆录》",
   "a": "李志绥",
   "y": "1994 年，台北时报文化",
   "d": "毛泽东保健医生二十余年的回忆，写到毛的私生活与文革期间的宫廷政治。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "在线阅读 PDF（Internet Archive，用户上传）（英文版）",
     "https://archive.org/download/the-private-life-of-chairman-mao-the-memoirs-of-maos-personal-physician-z-library/The%20Private%20Life%20of%20Chairman%20Mao%20The%20Memoirs%20of%20Maos%20Personal%20Physician%20%E6%AF%9B%E6%B3%BD%E4%B8%9C%E7%A7%81%E4%BA%BA%E5%8C%BB%E7%94%9F%E5%9B%9E%E5%BF%86%E5%BD%95%20%28%E6%9D%8E%E5%BF%97%E7%BB%A5%29%20%28Z-Library%29.pdf"
    ],
    [
     "在线借阅：中文版（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/maozedongsirenyi008800"
    ],
    [
     "维基百科：毛泽东私人医生回忆录",
     "https://zh.wikipedia.org/wiki/%E6%AF%9B%E6%B3%BD%E4%B8%9C%E7%A7%81%E4%BA%BA%E5%8C%BB%E7%94%9F%E5%9B%9E%E5%BF%86%E5%BD%95"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H12": [
  {
   "t": "《文革受难者：关于迫害、监禁与杀戮的寻访实录》",
   "a": "王友琴",
   "y": "2004 年，香港开放杂志社",
   "d": "作者多年走访写成，记录六百多位文革中被打死、自杀或处决者的生平与死因，包括卞仲耘。",
   "st": "禁止出版；作者的“文革受难者纪念园”网站在大陆被屏蔽。",
   "links": [
    [
     "在线阅读 PDF（Internet Archive，用户上传）",
     "https://archive.org/download/china-cultural-revolution-victim/EBookVictim%2020190528.pdf"
    ],
    [
     "在线阅读：作者网站发布的全书 PDF（2023 年版）",
     "https://ccrhm.org/wp-content/uploads/2023/08/Vn.pdf"
    ],
    [
     "在线阅读：中国文革受难者纪念园（作者主持的受难者名录网站）",
     "https://www.chinese-memorial.org/"
    ],
    [
     "维基百科：文革受難者——關於迫害、監禁和殺戮的尋訪實錄",
     "https://zh.wikipedia.org/wiki/%E6%96%87%E9%9D%A9%E5%8F%97%E9%9B%A3%E8%80%85%E2%80%94%E2%80%94%E9%97%9C%E6%96%BC%E8%BF%AB%E5%AE%B3%E3%80%81%E7%9B%A3%E7%A6%81%E5%92%8C%E6%AE%BA%E6%88%AE%E7%9A%84%E5%B0%8B%E8%A8%AA%E5%AF%A6%E9%8C%84"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H14": [
  {
   "t": "《红色纪念碑》",
   "a": "郑义",
   "y": "1993 年，台北华视出版",
   "d": "根据作者在广西的调查与官方文件，记述 1968 年广西文革中的大屠杀与吃人事件。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "维基百科：红色纪念碑",
     "https://zh.wikipedia.org/wiki/%E7%BA%A2%E8%89%B2%E7%BA%AA%E5%BF%B5%E7%A2%91"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": false
  },
  {
   "t": "《文革大屠杀》",
   "a": "宋永毅 主编",
   "y": "2002 年，香港开放杂志社",
   "d": "汇集各地县志与调查资料，记录广西、湖南道县、北京大兴等地的集体屠杀。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "维基百科：文革大屠杀",
     "https://zh.wikipedia.org/wiki/%E6%96%87%E9%9D%A9%E5%A4%A7%E5%B1%A0%E6%9D%80"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": false
  }
 ],
 "H15": [
  {
   "t": "《关于社会主义的民主与法制》",
   "a": "李一哲（李正天、陈一阳、王希哲）",
   "y": "1974 年，广州街头大字报",
   "d": "要求保障人民的民主权利、反对特权与“封建性的社会法西斯专政”。作者被定为反革命。",
   "st": "未在大陆正式出版。",
   "links": [
    [
     "在线阅读：中文马克思主义文库（1976 年版全文，附校注）",
     "https://www.marxists.org/chinese/reference-books/liyizhe1976/00.htm"
    ],
    [
     "在线阅读：中文马克思主义文库（民间异议文献选本）",
     "https://www.marxists.org/chinese/reference-books/minjian-1966-1976/41.htm"
    ],
    [
     "维基百科：李一哲事件",
     "https://zh.wikipedia.org/wiki/%E6%9D%8E%E4%B8%80%E5%93%B2%E4%BA%8B%E4%BB%B6"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H16": [
  {
   "t": "《第五个现代化》",
   "a": "魏京生",
   "y": "1978 年 12 月，西单民主墙大字报",
   "d": "提出“民主是第五个现代化”。作者 1979 年被判处十五年徒刑。",
   "st": "未在大陆正式出版。",
   "links": [
    [
     "在线阅读：魏京生网站（全文）",
     "http://www.weijingsheng.org/doc/cn/46.htm"
    ],
    [
     "维基百科：第五个现代化",
     "https://zh.wikipedia.org/wiki/%E7%AC%AC%E4%BA%94%E4%B8%AA%E7%8E%B0%E4%BB%A3%E5%8C%96"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H18": [
  {
   "t": "《河殇》",
   "a": "苏晓康、王鲁湘 等（撰稿），夏骏（导演）",
   "y": "1988 年，中央电视台电视政论片",
   "d": "以黄河与蔚蓝色的海洋为喻，呼吁走出封闭的传统、走向开放与民主。",
   "st": "1989 年后被禁播，撰稿人流亡海外。",
   "links": [
    [
     "在线借阅：英文全译解说词《Deathsong of the River》（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/deathsongofriver00suhs"
    ],
    [
     "维基百科：河殇",
     "https://zh.wikipedia.org/wiki/%E6%B2%B3%E6%AE%87"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《第二种忠诚》",
   "a": "刘宾雁",
   "y": "1985 年，刊于《开拓》",
   "d": "报告文学，写两位因坚持说真话而受迫害的党员。作者 1987 年被开除党籍，后流亡。",
   "st": "作者作品长期不能出版。",
   "links": [
    [
     "维基百科：作者刘宾雁",
     "https://zh.wikipedia.org/wiki/%E5%88%98%E5%AE%BE%E9%9B%81"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": false
  }
 ],
 "H19": [
  {
   "t": "《中国“六四”真相》",
   "a": "张良 编",
   "y": "2001 年，香港明镜出版社（英文版 The Tiananmen Papers）",
   "d": "据称根据中共内部文件编成，记录 1989 年领导层的决策过程。文件的真实性有争议。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/tiananmenpapers00zhan"
    ],
    [
     "在线借阅：中文版（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/zhongguoliusizhe0000zhan"
    ],
    [
     "维基百科：天安门文件",
     "https://zh.wikipedia.org/wiki/%E5%A4%A9%E5%AE%89%E9%96%80%E6%96%87%E4%BB%B6"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《国家的囚徒：赵紫阳的秘密录音》",
   "a": "赵紫阳",
   "y": "2009 年英文版（Prisoner of the State），中文版名《改革历程》，香港新世纪出版社",
   "d": "赵紫阳在软禁中秘密录音的回忆，讲述 1989 年他反对戒严的经过。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/prisonerofstates00zhao_0"
    ],
    [
     "维基百科：改革历程",
     "https://zh.wikipedia.org/wiki/%E6%94%B9%E9%9D%A9%E5%8E%86%E7%A8%8B"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《子弹鸦片：天安门大屠杀的生与死》",
   "a": "廖亦武",
   "y": "2012 年，台北允晨文化",
   "d": "采访六四后以“暴徒”罪名被判重刑的普通工人与市民。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "在线试读：作者提供的中文版节选（文学城）",
     "https://www.wenxuecity.com/news/2019/06/12/8401706.html"
    ],
    [
     "维基百科：作者廖亦武",
     "https://zh.wikipedia.org/wiki/%E5%BB%96%E4%BA%A6%E6%AD%A6"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H20": [
  {
   "t": "《零八宪章》",
   "a": "刘晓波 等起草",
   "y": "2008 年 12 月",
   "d": "呼吁修改宪法、三权分立、司法独立与保障人权，首批签署者三百余人。刘晓波因此被判刑十一年。",
   "st": "全文及相关报道在大陆被屏蔽。",
   "links": [
    [
     "在线阅读 PDF（Internet Archive，用户上传）",
     "https://archive.org/download/charter-08book/Charter%2008book.pdf"
    ],
    [
     "在线阅读：自由亚洲电台（全文）",
     "https://www.rfa.org/mandarin/pinglun/liuxiaobopinglunzhuanji/lxb-07132017104422.html"
    ],
    [
     "在线阅读：中、英、日、法、德文全文（左拉网）",
     "https://www.zuola.com/charter08"
    ],
    [
     "维基百科：零八宪章",
     "https://zh.wikipedia.org/wiki/%E9%9B%B6%E5%85%AB%E5%AE%AA%E7%AB%A0"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  },
  {
   "t": "《中国农民调查》",
   "a": "陈桂棣、春桃",
   "y": "2004 年，人民文学出版社",
   "d": "调查安徽农村的苛捐杂税与干部暴力。",
   "st": "出版后迅速被禁止再印，作者被起诉。",
   "links": [
    [
     "在线借阅（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/zhongguonongmind0000chen"
    ],
    [
     "在线借阅：英文版《Will the Boat Sink the Water?》（Internet Archive 图书馆，需免费注册）",
     "https://archive.org/details/willboatsinkwate0000chen"
    ],
    [
     "维基百科：中國農民調查",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%9C%8B%E8%BE%B2%E6%B0%91%E8%AA%BF%E6%9F%A5"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H21": [
  {
   "t": "《杀劫》",
   "a": "唯色 著，泽仁多吉 摄影",
   "y": "2006 年，台北大块文化",
   "d": "以作者父亲拍摄的文革拉萨照片为线索，记录西藏的文化大革命。",
   "st": "禁止出版、发行。",
   "links": [
    [
     "作者唯色谈《杀劫》及其英文版（自由亚洲电台专栏）",
     "https://www.rfa.org/mandarin/pinglun/weise/ws-07272020101629.html"
    ],
    [
     "维基百科：作者唯色",
     "https://zh.wikipedia.org/wiki/%E5%94%AF%E8%89%B2"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": false
  },
  {
   "t": "《西藏笔记》",
   "a": "唯色",
   "y": "2003 年，花城出版社",
   "d": "散文集，写藏人的宗教生活与记忆。",
   "st": "出版后被查禁，作者因此被解职。",
   "links": [
    [
     "维基百科：作者唯色",
     "https://zh.wikipedia.org/wiki/%E5%94%AF%E8%89%B2"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": false
  },
  {
   "t": "《香港城邦论》",
   "a": "陈云",
   "y": "2011 年，香港天窗出版",
   "d": "主张香港作为“城邦”的自治论述，影响了此后的本土运动。",
   "st": "大陆不能发行。",
   "links": [
    [
     "在线阅读 PDF（Internet Archive，用户上传）",
     "https://archive.org/download/20200708_20200708_0551/%E9%A6%99%E6%B8%AF%E5%9F%8E%E9%82%A6%E8%AB%96.pdf"
    ],
    [
     "维基百科：香港城邦論",
     "https://zh.wikipedia.org/wiki/%E9%A6%99%E6%B8%AF%E5%9F%8E%E9%82%A6%E8%AB%96"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H23": [
  {
   "t": "《武汉日记》",
   "a": "方方",
   "y": "2020 年，网络日记；英文版 Wuhan Diary，2020 年",
   "d": "武汉封城 76 天里每天的记录，写到医院的困境与普通人的死亡。",
   "st": "中文版未能在大陆出版，作者在网络上遭到大规模攻击。",
   "links": [
    [
     "在线阅读：中国数字时代“方方日记”专题（日记原文汇编）",
     "https://chinadigitaltimes.net/space/%E6%96%B9%E6%96%B9%E6%97%A5%E8%AE%B0"
    ],
    [
     "维基百科：方方日記",
     "https://zh.wikipedia.org/wiki/%E6%96%B9%E6%96%B9%E6%97%A5%E8%A8%98"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H10": [
  {
   "t": "《七万言书》",
   "a": "第十世班禅额尔德尼·确吉坚赞",
   "y": "1962 年，呈交周恩来的报告；1997 年英文版（A Poisoned Arrow）在伦敦出版",
   "d": "报告西藏和其他藏区在“民主改革”与大跃进中的饥荒、大批逮捕和对宗教的摧毁。作者随后被批判，入狱近十年。",
   "st": "从未公开出版。",
   "links": [
    [
     "在线阅读：英文节选（Terror in Tibet 人权档案）",
     "https://www.subliminal.org/tibet/testimony/1962-panchen.html"
    ],
    [
     "维基百科：七万言书",
     "https://zh.wikipedia.org/wiki/%E4%B8%83%E4%B8%87%E8%A8%80%E4%B9%A6"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H13": [
  {
   "t": "《中国向何处去？》",
   "a": "杨曦光（杨小凯）",
   "y": "1968 年 1 月，湖南“省无联”文章",
   "d": "一名十九岁的中学生提出中国已出现“红色资本家阶级”，主张推翻新的特权阶层。被康生、江青点名为“反革命”，作者被判刑十年。",
   "st": "未在大陆正式出版。",
   "links": [
    [
     "在线阅读：中文马克思主义文库（1968 年原文）",
     "https://www.marxists.org/chinese/reference-books/minjian-1966-1976/25.htm"
    ],
    [
     "维基百科：作者杨小凯",
     "https://zh.wikipedia.org/wiki/%E6%9D%A8%E5%B0%8F%E5%87%AF"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ],
 "H22": [
  {
   "t": "《我们当下的恐惧与期待》",
   "a": "许章润",
   "y": "2018 年 7 月，网络文章",
   "d": "清华大学法学教授公开批评取消国家主席任期限制与个人崇拜。作者随后被停职，2020 年被拘押并被清华大学解聘。",
   "st": "文章在大陆网络被删除。",
   "links": [
    [
     "在线阅读：China Heritage（中英对照全文）",
     "https://chinaheritage.net/journal/imminent-fears-immediate-hopes-a-beijing-jeremiad/"
    ],
    [
     "维基百科：作者许章润",
     "https://zh.wikipedia.org/wiki/%E8%AE%B8%E7%AB%A0%E6%B6%A6"
    ],
    [
     "维基百科：中华人民共和国被禁出版物列表",
     "https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%A2%AB%E7%A6%81%E5%87%BA%E7%89%88%E7%89%A9%E5%88%97%E8%A1%A8"
    ]
   ],
   "pdf": true
  }
 ]
};
