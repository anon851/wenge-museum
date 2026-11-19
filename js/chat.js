// 到馆人数与匿名留言（前端）。服务端见 cloudflare/：Pages Function /api/ws → Worker 里的 Durable Object（WebSocket）。
// 地址取 <meta name="chat-endpoint">，留空则用本站的 /api/ws。连不上服务端（本地预览、静态托管）时不显示留言图标，展馆照常可用。
// 界面极简：右上角一个透明的对话图标；有人说话时，图标旁显示几秒；点开即可看和发，顶部可以改自己的名字。
const $ = (id) => document.getElementById(id);
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 沙盒里可能不可用 */ } },
};
const PEEK_MS = 6000;   // 新消息在图标旁只显示几秒
let ws = null, ever = false, fails = 0, timer = 0, ping = 0, me = '', meU = '', waitUntil = 0, tick = 0, maxLen = 200, flash = 0, peekT = 0;

function endpoint() {
  const m = document.querySelector('meta[name="chat-endpoint"]'), v = m && m.content.trim();
  if (!/^https?:$/.test(location.protocol) && !v) return null;
  const u = new URL(v || 'api/ws', document.baseURI); u.protocol = u.protocol === 'https:' ? 'wss:' : u.protocol === 'http:' ? 'ws:' : u.protocol;
  return u.href;
}
function vid() { let v = store.get('museum-vid'); if (!v) { v = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 20); store.set('museum-vid', v); } return v; }

function connect() {
  const url = endpoint(); if (!url) return;
  clearTimeout(timer);
  try { ws = new WebSocket(url); } catch { return retry(); }
  ws.onopen = () => { fails = 0; ws.send(JSON.stringify({ t: 'hello', vid: vid(), fresh: !store.get('museum-visited'), name: store.get('museum-name') || undefined })); clearInterval(ping); ping = setInterval(() => ws && ws.readyState === 1 && ws.send('ping'), 30000); };
  ws.onmessage = (e) => { if (e.data === 'pong') return; let m; try { m = JSON.parse(e.data); } catch { return; } onMessage(m); };
  ws.onclose = () => { clearInterval(ping); ws = null; retry(); };
}
function retry() {
  fails++;
  if (!ever && fails >= 4) { count(null); return; }   // 一直连不上：不显示图标
  timer = setTimeout(connect, Math.min(60000, 1500 * 2 ** Math.min(fails, 5)));
}
function onMessage(m) {
  if (m.t === 'welcome') {
    ever = true; me = m.me; meU = m.u || ''; store.set('museum-visited', '1'); if (m.limits) maxLen = m.limits.maxLen || maxLen;
    $('chat-list').textContent = ''; for (const x of m.history || []) add(x, false);
    count(m); $('chat-input').maxLength = maxLen; $('chat-btn').hidden = false; showName();
  } else if (m.t === 'count') count(m);
  else if (m.t === 'msg') { add(m, true); if (!mine(m)) peek(m); }
  else if (m.t === 'named') { me = m.me; if (/^访客·/.test(me)) store.set('museum-name', ''); else store.set('museum-name', me); showName(); }
  else if (m.t === 'err') { if (m.wait) { waitUntil = Date.now() + m.wait; cooldown(); } status(m.msg); setTimeout(showName, 100); }
}
function count(m) {
  $('visitors').textContent = m ? `在馆 ${m.now} 人 · 累计 ${Number(m.total).toLocaleString('zh-CN')} 人` : '';
  $('visitors').hidden = !m;
}
const mine = (m) => (m.u && meU ? m.u === meU : m.n === me);
function add(m, scroll) {
  const li = document.createElement('li'), b = document.createElement('b'), own = mine(m);
  b.textContent = own ? '我' : m.n;
  if (!own && m.u && !/^访客·/.test(m.n)) { const t = document.createElement('i'); t.textContent = '#' + m.u; t.title = '同名时用来区分的短标识'; b.append(t); }
  li.append(b, document.createTextNode(m.text)); if (own) li.className = 'mine';
  const list = $('chat-list'), atEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
  list.append(li); while (list.children.length > 100) list.firstChild.remove();
  if (!scroll || atEnd || own) list.scrollTop = list.scrollHeight;
}
// 图标旁的文字：面板关着时，别人新说的话在这里显示几秒，然后消失
function peek(m) {
  const el = $('chat-peek'); clearTimeout(peekT);
  if (!m || !$('chat').hidden) { el.textContent = ''; return; }
  el.textContent = `${m.n}：${m.text}`; el.classList.remove('fade');
  peekT = setTimeout(() => { el.classList.add('fade'); peekT = setTimeout(() => { el.textContent = ''; el.classList.remove('fade'); }, 600); }, PEEK_MS);
}
// 自己的名字：面板顶部可以改，存在本机，下次来还用它
function showName() { const i = $('chat-name'); if (i && document.activeElement !== i) i.value = me; }
function saveName() {
  const i = $('chat-name'), v = i.value.replace(/\s+/g, ' ').trim();
  if (v === me) return;
  if (!ws || ws.readyState !== 1) { status('连接中断，稍后再试'); i.value = me; return; }
  ws.send(JSON.stringify({ t: 'name', name: v }));
}
function status(text) {   // 只在出错时短暂显示一行
  const el = $('chat-status'); el.textContent = text; el.hidden = false;
  clearTimeout(flash); flash = setTimeout(() => { el.hidden = true; }, 5000);
}
function cooldown() {
  clearInterval(tick);
  const btn = $('chat-send'), upd = () => { const s = Math.ceil((waitUntil - Date.now()) / 1000); if (s > 0) btn.textContent = `${s}`; else { btn.textContent = '发送'; btn.disabled = false; clearInterval(tick); } };
  btn.disabled = true; upd(); tick = setInterval(upd, 500);
}

export function toggleChat(open = $('chat').hidden) {
  if (open && $('chat-btn').hidden) return;   // 服务没连上时不打开
  $('chat').hidden = !open; $('chat-btn').style.visibility = open ? 'hidden' : '';
  if (open) { document.exitPointerLock?.(); $('chat-input').focus(); const l = $('chat-list'); l.scrollTop = l.scrollHeight; }   // 立即聚焦：打开后马上打字不丢字（T 键本身已被拦下，不会写进输入框）
  else $('chat-input').blur();
  peek(null);
}
export function chatHasFocus(target) { return !!(target && target.closest && target.closest('#chat')); }

export function initChat() {
  $('chat-btn').onclick = () => toggleChat();
  $('chat-close').onclick = () => toggleChat(false);
  $('chat-form').onsubmit = (e) => {
    e.preventDefault();
    const inp = $('chat-input'), text = inp.value.replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (!ws || ws.readyState !== 1) return status('连接中断，稍后再试');
    if (Date.now() < waitUntil) return;
    ws.send(JSON.stringify({ t: 'say', text: [...text].slice(0, maxLen).join('') })); inp.value = '';
    waitUntil = Date.now() + 8000; cooldown();   // 与服务端的最短间隔一致；服务端另有更严格的判断
  };
  const ni = $('chat-name');
  if (ni) { ni.addEventListener('change', saveName); ni.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ni.blur(); } }); }
  connect();
}
