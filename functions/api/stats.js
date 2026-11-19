// Pages Function：/api/stats 返回当前与累计人数（由留言 Worker museum-chat 里的 Lobby 对象统计）。
// 绑定在根目录 wrangler.toml（或 Pages 控制台 设置 → 绑定 → Durable Object）里配置。
export async function onRequest({ request, env }) {
  if (!env.LOBBY) return new Response('chat not configured', { status: 503 });
  return env.LOBBY.get(env.LOBBY.idFromName('museum')).fetch(request);
}
