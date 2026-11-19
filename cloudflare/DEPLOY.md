# 部署到 Cloudflare

展馆本身是静态网站，放在 **Cloudflare Pages** 上。到馆人数和匿名留言由一个 **Worker + Durable Object** 负责：浏览器经 WebSocket 连到 `/api/ws`，Pages Function（`functions/api/ws.js`）把连接转给 Worker 里的 `Lobby` 对象。全站只有一个 `Lobby`，它持有所有连接，统计人数，保存最近 60 条留言，并负责限流。

```
浏览器 ──WebSocket /api/ws──▶ Pages Function ──绑定 LOBBY──▶ Worker museum-chat · Durable Object Lobby
```

没有部署留言服务时，展馆照常能用，右上角不显示人数，留言面板显示“未连接”。

## 需要的东西

- 一个 Cloudflare 账号。Workers 免费套餐可以使用基于 SQLite 的 Durable Object。
- Node.js 18 或更高版本，Python 3 和 Pillow（`pip install pillow`）用来打包。
- 本仓库。

## 一、部署留言 Worker（可选）

展馆可独立部署。若要启用匿名留言和到访人数，请使用独立的 Worker，在 `chat-worker/wrangler.toml` 中为它选一个新名称，并将 `ALLOWED_ORIGINS` 设为新网站的完整来源。来源列表或 `SALT` 缺失时，留言服务保持关闭。

```bash
cd cloudflare/chat-worker
npm install
npx wrangler login                 # 浏览器里授权
npx wrangler secret put SALT       # 输入一串随机字符，例如 openssl rand -hex 24 的输出
npx wrangler deploy
```

部署成功后会得到 Worker 所在的 `workers.dev` 地址。可以先访问 `…/stats` 确认，应返回 `{"now":0,"total":0}`。

`SALT` 用来给访客 IP 做哈希。服务器只保存哈希，不保存 IP。不要把 SALT 写进代码或 `wrangler.toml`。

## 二、部署展馆（Pages）

```bash
# 仓库根目录
npm install
npm run build                      # 生成 dist/
npx wrangler pages project create historical-memory-museum --production-branch main
npx wrangler pages deploy dist --project-name historical-memory-museum
```

根目录的 `wrangler.toml` 声明了静态输出目录 `dist/`。如果使用其他 Pages 项目名，请同步修改文件中的 `name`。`wrangler pages deploy` 会把 `functions/` 一起上传。

如果已部署新的留言 Worker，请在 Pages 项目 → 设置 → 绑定 → 添加 → Durable Object 命名空间，变量名填 `LOBBY`，选择该 Worker 的 `Lobby`。然后重新部署一次。

### 用 Git 自动构建（可选）

在 Pages 控制台连接 GitHub 仓库，构建设置如下：

- 构建命令：`python3 -m pip install pillow && npm ci && npm run build`
- 输出目录：`dist`

绑定同样按上面的方法添加。

## 三、上线后建议

1. **限制来源**：把 `cloudflare/chat-worker/wrangler.toml` 里的 `ALLOWED_ORIGINS` 改成你的站点地址，填写新 Pages 站点或新自定义域名的完整来源，再执行一次 `npx wrangler deploy`。留言服务只接受来源列表中的浏览器连接。
2. **不经 Pages Function 直连（可选）**：如果展馆放在别处托管，可以让页面直接连 Worker。把 `index.html` 里的
   `<meta name="chat-endpoint" content="">` 改为 `content="wss://museum-chat.<子域>.workers.dev/ws"`。
3. **Cloudflare 侧的额外防护（可选）**：在 WAF → 速率限制规则里，给 `/api/ws` 加一条“每个 IP 每分钟最多 20 次请求”，可以挡住反复建连。

## 防滥用规则

规则写在 `cloudflare/chat-worker/src/index.js` 开头的 `LIMITS` 里，可以按需调整。

| 规则 | 默认值 |
|---|---|
| 单条长度 | 最多 200 字，只保留一行。控制字符和零宽字符会被去掉 |
| 发言间隔 | 同一访客两条之间至少 8 秒 |
| 条数 | 每分钟最多 4 条，每十分钟最多 15 条 |
| 不能连续刷屏 | 没有别人插话时最多连发 4 条，之后要等 90 秒，或者等别人说话 |
| 不许重复 | 与自己最近 6 条内容相同的话会被拒绝（比较时忽略标点和空格） |
| 不许链接 | 含网址的留言会被拒绝 |
| 自动禁言 | 冷却期内硬发 3 次，禁言 10 分钟；24 小时内再犯，时长逐次加倍，最长 24 小时 |
| 同一网络 | 同一网络（同一 IP）合起来按 3 倍的条数限制，同时最多 4 个连接。这样同一校园网里的人互不连累，靠换浏览器刷屏的人也会被挡住 |

## 名字

默认昵称是“访客·XXXX”，按访客每天生成。访客可以在留言面板顶部改成自己的名字：

- 最多 12 个字，不许链接和 `< > @ #`；
- 不许用“管理”“官方”“本馆”“博物馆”“客服”等字样；
- 每十分钟最多改 5 次。

名字只存在访客自己的浏览器里，每次连接时带给服务器。每条留言还附一个 4 位短标识（同一访客当天不变），重名时也分得清是谁。

改名功能需要新版留言 Worker：更新前端后，在 `cloudflare/chat-worker` 里再执行一次 `npx wrangler deploy`（`ALLOWED_ORIGINS` 要填好站点来源，否则留言服务保持关闭）。旧版 Worker 会忽略改名请求，留言照常可用。

## 人数怎么算

- **当前在馆**：此刻连着的访客数。同一浏览器开多个标签页只算一人（按浏览器里的随机标识去重）。
- **累计到馆**：浏览器第一次来访时计一次，本地会留下到访标记。为防止有人反复清缓存刷数，同一网络 24 小时内最多计 5 人。

## 本地调试

```bash
cd cloudflare/chat-worker && npx wrangler dev --var SALT:dev --var ALLOWED_ORIGINS:http://localhost:8000   # ws://127.0.0.1:8787/ws
```

然后在根目录 `python3 -m http.server`，把 `index.html` 的 `chat-endpoint` 临时改成 `ws://127.0.0.1:8787/ws`。新版 Chrome 会拦截从 `localhost` 页面连 `127.0.0.1` 的请求（本地网络访问检查），两边都用 `localhost` 即可。
