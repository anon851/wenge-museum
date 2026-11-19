// 文革博物馆 · 到馆人数与匿名留言
// 一个 Durable Object（Lobby）持有全部 WebSocket 连接：
//   当前人数 = 在线连接数（同一访客多开标签页只算一次）；累计人数 = 首次到访的访客数（同一网络 24 小时内只计一次）。
//   留言匿名：默认昵称由“IP + 浏览器标识 + 密钥 + 日期”的哈希生成，每天更换；访客也可以自己取名字（不许冒充官方、不许链接）。
//   每条留言另带一个 4 位短标识（同一访客当天不变），重名时也分得清是谁说的。服务器不保存 IP，只保存哈希。
// 防滥用：单条长度、发言间隔、每分钟与每十分钟条数、不许连续刷屏、不许重复、不许链接；屡次违规自动禁言，时长逐次加倍。
// 使用 WebSocket Hibernation API：没人说话时对象可休眠，连接不断。

const LIMITS = {
  maxLen: 200,          // 单条最多字数
  minGap: 8_000,        // 两条之间至少间隔（毫秒）
  perMinute: 4,         // 每分钟最多条数
  perTenMin: 15,        // 每十分钟最多条数
  maxRun: 4,            // 没有别人插话时，最多连续发几条
  runCooldown: 90_000,  // 连续发满之后要等多久（除非有别人说话）
  history: 60,          // 新进来的人能看到的最近留言条数
  connsPerIp: 4,        // 同一网络最多同时连接数
  strikes: 3,           // 冷却期内再发几次就禁言
  muteBase: 10 * 60_000, muteMax: 24 * 3600_000,
  frameMax: 1024,       // 单个 WebSocket 消息的字节上限
  nameMax: 12,          // 自取名字最多字数
  renames: 5,           // 每十分钟最多改几次名字
};
const DAY = 24 * 3600_000;

export class Lobby {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    this.allowedOrigins = new Set((env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean));
    this.rate = new Map();      // ipHash -> { times: [], last: 0, strikes: 0 }
    this.lastSpeaker = null; this.run = 0; this.runEnd = 0;
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    // 没有设置 SALT 或来源列表时，留言服务保持关闭；只接受来源列表里的页面
    if (!this.env.SALT || !this.allowedOrigins.size) return new Response('chat not configured', { status: 503 });
    const origin = request.headers.get('Origin');
    const statsRequest = new URL(request.url).pathname.endsWith('/stats');
    if ((!origin && !statsRequest) || (origin && !this.allowedOrigins.has(origin))) {
      return new Response('forbidden', { status: 403 });
    }
    if (statsRequest) return json(await this.stats(), origin);
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const h = await this.hash(ip), day = new Date().toISOString().slice(0, 10);
    if (this.ctx.getWebSockets(h).length >= LIMITS.connsPerIp) return new Response('too many connections', { status: 429 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    const nick = '访客·' + (await this.hash(ip + '|' + day)).slice(0, 4).toUpperCase();
    this.ctx.acceptWebSocket(server, [h]);
    server.serializeAttachment({ h, nick, vid: null });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > LIMITS.frameMax) return this.send(ws, { t: 'err', msg: '消息过长' });
    let m; try { m = JSON.parse(data); } catch { return; }
    const a = ws.deserializeAttachment();
    if (m.t === 'hello') {
      const vid = typeof m.vid === 'string' && /^[a-z0-9]{8,40}$/i.test(m.vid) ? m.vid : null;
      const tag = vid ? (await this.hash(a.h + '|' + vid + '|' + new Date().toISOString().slice(0, 10))).slice(0, 4).toUpperCase() : a.nick.slice(-4);
      a.tag = tag; a.nick = '访客·' + tag;
      const nm = checkName(m.name); if (nm.ok) a.nick = nm.name;
      ws.serializeAttachment({ ...a, vid });
      let total = (await this.ctx.storage.get('total')) || 0;
      if (m.fresh) {   // 浏览器第一次来（本地没有到访标记）；同一网络 24 小时内最多计 5 人，防止清缓存刷数
        const seenKey = 'seen:' + a.h, now = Date.now(); let seen = await this.ctx.storage.get(seenKey);
        if (!seen || now - seen.t > DAY) seen = { t: now, n: 0 };
        if (seen.n < 5) { seen.n++; total++; await this.ctx.storage.put({ total, [seenKey]: seen }); this.scheduleCleanup(); }
      }
      const history = (await this.ctx.storage.get('history')) || [];
      this.send(ws, { t: 'welcome', me: a.nick, u: a.tag, history, now: this.online(), total, limits: { maxLen: LIMITS.maxLen, minGap: LIMITS.minGap } });
      this.broadcastCount(total);
      return;
    }
    if (m.t === 'say') return this.say(ws, a, m.text);
    if (m.t === 'name') return this.rename(ws, a, m.name);
  }

  // 自取名字：清掉空白就用回默认的“访客·XXXX”
  async rename(ws, a, raw) {
    if (!a.vid) return this.send(ws, { t: 'err', msg: '连接尚未就绪' });
    const now = Date.now(), k = a.h + ':' + a.vid, r = this.rate.get('rn:' + k) || [];
    const recent = r.filter(t => now - t < 10 * 60_000);
    if (recent.length >= LIMITS.renames) return this.send(ws, { t: 'err', msg: '改名太频繁了，稍后再试' });
    const nm = (typeof raw === 'string' && !clean(raw)) ? { ok: true, name: '访客·' + a.tag } : checkName(raw);
    if (!nm.ok) return this.send(ws, { t: 'err', msg: nm.msg });
    this.rate.set('rn:' + k, [...recent, now]);
    // 同一访客的其他标签页也一起改
    for (const s of this.ctx.getWebSockets()) { const b = s.deserializeAttachment(); if (b && b.h === a.h && b.vid === a.vid) { b.nick = nm.name; s.serializeAttachment(b); } }
    this.send(ws, { t: 'named', me: nm.name });
  }

  // 频率限制分两层：每位访客（网络哈希 + 浏览器标识）用严格的限制；同一网络合起来用宽三倍的限制，
  // 这样同一校园网、同一运营商出口的人互不连累，而换浏览器标识刷屏的人仍会被网络这一层挡住。
  async say(ws, a, raw) {
    if (!a.vid) return this.send(ws, { t: 'err', msg: '连接尚未就绪' });
    const now = Date.now(), keys = [[a.h + ':' + a.vid, 1], [a.h, 3]];
    for (const [k] of keys) {
      const mute = await this.ctx.storage.get('mute:' + k);
      if (mute && mute.until > now) return this.send(ws, { t: 'err', code: 'muted', msg: '发言过于频繁，已暂时禁言', wait: mute.until - now });
    }
    const text = clean(raw);
    if (!text) return;
    if ([...text].length > LIMITS.maxLen) return this.send(ws, { t: 'err', msg: `每条最多 ${LIMITS.maxLen} 字` });
    if (/https?:\/\/|www\.|\.(com|net|org|cn|io|xyz|top)\b/i.test(text)) return this.send(ws, { t: 'err', msg: '留言里不能有链接' });
    const norm = text.replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
    const rs = keys.map(([k, x]) => { const r = this.rate.get(k) || { times: [], recent: [], strikes: 0 }; this.rate.set(k, r); r.times = r.times.filter(t => now - t < 10 * 60_000); return [k, x, r]; });
    for (const [k, x, r] of rs) {
      const last = r.times.at(-1) || 0, min = r.times.filter(t => now - t < 60_000);
      let wait = 0, why = '';
      if (x === 1 && now - last < LIMITS.minGap) { wait = LIMITS.minGap - (now - last); why = '发得太快了'; }
      else if (min.length >= LIMITS.perMinute * x) { wait = 60_000 - (now - min[0]); why = x === 1 ? '一分钟内发言太多' : '你所在的网络发言太多'; }
      else if (r.times.length >= LIMITS.perTenMin * x) { wait = 10 * 60_000 - (now - r.times[0]); why = x === 1 ? '十分钟内发言太多' : '你所在的网络发言太多'; }
      else if (x === 1 && this.lastSpeaker === k && this.run >= LIMITS.maxRun && now < this.runEnd) { wait = this.runEnd - now; why = '已连续发了好几条，等别人说几句吧'; }
      if (wait > 0) {
        r.strikes++;
        if (r.strikes >= LIMITS.strikes) { r.strikes = 0; const until = await this.muteFor(k); return this.send(ws, { t: 'err', code: 'muted', msg: '多次刷屏，已暂时禁言', wait: until - now }); }
        return this.send(ws, { t: 'err', code: 'slow', msg: why, wait });
      }
      if (r.recent.includes(norm)) return this.send(ws, { t: 'err', msg: '不要重复发同样的话' });
    }
    for (const [, x, r] of rs) { r.recent = [...r.recent, norm].slice(-6 * x); r.times.push(now); r.strikes = Math.max(0, r.strikes - 1); }
    const vk = keys[0][0];
    if (this.lastSpeaker === vk) this.run++; else { this.lastSpeaker = vk; this.run = 1; }
    if (this.run >= LIMITS.maxRun) this.runEnd = now + LIMITS.runCooldown;
    const msg = { n: a.nick, u: a.tag, text, ts: now };
    const history = ((await this.ctx.storage.get('history')) || []).concat(msg).slice(-LIMITS.history);
    await this.ctx.storage.put('history', history);
    this.broadcast({ t: 'msg', ...msg });
  }

  async muteFor(h) {
    const prev = await this.ctx.storage.get('mute:' + h), now = Date.now();
    const len = prev && now - prev.until < DAY ? Math.min(LIMITS.muteMax, prev.len * 2) : LIMITS.muteBase;
    await this.ctx.storage.put('mute:' + h, { until: now + len, len });
    this.scheduleCleanup(); return now + len;
  }

  webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code); } catch { /* 已关闭 */ } this.broadcastCount(undefined, ws); }
  webSocketError(ws) { this.broadcastCount(undefined, ws); }

  // 在线人数：按访客（标签页 vid）去重；没发 hello 的连接按网络哈希算
  online(except) {
    const ids = new Set();
    for (const s of this.ctx.getWebSockets()) { if (s === except || s.readyState !== 1) continue; const a = s.deserializeAttachment() || {}; ids.add(a.vid || a.h); }
    return ids.size;
  }
  async stats() { return { now: this.online(), total: (await this.ctx.storage.get('total')) || 0 }; }
  async broadcastCount(total, except) {
    if (total === undefined) total = (await this.ctx.storage.get('total')) || 0;
    this.broadcast({ t: 'count', now: this.online(except), total }, except);
  }
  broadcast(obj, except) { const s = JSON.stringify(obj); for (const ws of this.ctx.getWebSockets()) { if (ws === except) continue; try { ws.send(s); } catch { /* 已断开 */ } } }
  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch { /* 已断开 */ } }

  // 每天清理一次过期的到访记录与禁言记录
  async scheduleCleanup() { if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + DAY); }
  async alarm() {
    const now = Date.now(), del = [];
    for (const [k, v] of await this.ctx.storage.list({ prefix: 'seen:' })) if (now - v.t > DAY) del.push(k);
    for (const [k, v] of await this.ctx.storage.list({ prefix: 'mute:' })) if (now - v.until > DAY) del.push(k);
    for (let i = 0; i < del.length; i += 128) await this.ctx.storage.delete(del.slice(i, i + 128));
    if ((await this.ctx.storage.list({ prefix: 'seen:', limit: 1 })).size || (await this.ctx.storage.list({ prefix: 'mute:', limit: 1 })).size) await this.ctx.storage.setAlarm(now + DAY);
  }

  async hash(s) {
    const salt = this.env.SALT;
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + s));
    return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// 去掉控制字符、零宽字符，合并空白，只留一行
function clean(s) {
  if (typeof s !== 'string') return '';
  return s.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim();
}
// 名字：1 到 12 个字，一行，不许链接，不许冒充本馆或管理人员
const RESERVED = /管理|官方|版主|客服|系统|本馆|博物馆|站长|admin|moderator|system/i;
function checkName(raw) {
  const name = clean(raw);
  if (!name) return { ok: false, msg: '名字不能为空' };
  if ([...name].length > LIMITS.nameMax) return { ok: false, msg: `名字最多 ${LIMITS.nameMax} 个字` };
  if (/https?:|www\.|\.(com|net|org|cn|io|xyz|top)\b|[<>@#]/i.test(name)) return { ok: false, msg: '名字里不能有链接或特殊符号' };
  if (RESERVED.test(name)) return { ok: false, msg: '这个名字不能用' };
  return { ok: true, name };
}
function json(data, origin) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers.Vary = 'Origin';
  }
  return new Response(JSON.stringify(data), { headers });
}

// 独立 Worker 和 Pages Functions 共用 Lobby 的密钥及来源检查。
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!/\/(api\/)?(ws|stats)$/.test(url.pathname)) return new Response('not found', { status: 404 });
    return env.LOBBY.get(env.LOBBY.idFromName('museum')).fetch(request);
  },
};
