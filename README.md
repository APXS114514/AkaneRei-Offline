# AkaneRei Offline / ECHOS ARG

一款伪装成聊天软件的浏览器 ARG。玩家以 `AkaneRei` 的身份登录「回声 ECHOS」，通过聊天记录检索、已读回执、在线状态、语音分轨与账号找回，逐步发现：**自己并不是活人，而是 208 天前已死、每晚 04:08 被平台强制「重新登录」的亡者。**

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm ci
npm run dev
```

常用验证命令：

```bash
npm run lint
npm test
npm run build:pages
```

## 项目结构

- `app/page.tsx`：主游戏、状态机、hash 路由与 ECHOS 表面（当前为外壳，案件谜题后续接入）
- `app/truth/page.tsx`：独立全案真相页
- `app/globals.css`：主游戏视觉与演出
- `docs/故事大纲.md`：完整剧情真值表与密码契约，含剧透
- `docs/游戏流程.md`：完整流程、触发条件与回归清单，含剧透
- `tests/rendered-html.test.mjs`：剧情门槛与关键交互回归测试

## 状态与路由

游戏进度保存在浏览器 `localStorage`，键名 `echos-arg-v1`。主游戏使用 hash 路由以兼容静态部署：`#/wake`、`#/login`、`#/app/home`、`#/app/chat/<id>`、`#/app/search`、`#/app/article/<id>`、`#/app/archive`、`#/app/settings`。登录页与账号安全中心的 `遗忘` 是故意的彻底重置。全案真相使用独立静态路由 `/truth/`。

## 设计纪律

- 平台表面必须是像真的聊天软件，不是恐怖游戏菜单；恐怖通过小状态变化升级（时间戳异常、已读回执、零信号标记、云端同步、账号状态、记忆覆盖）。
- 证据先于结论：玩家通过记录与交叉核对发现身份；不把答案预填为结论；不把超自然写成系统结论。
- 平台知道得比承认得多：通过预生成的守则、字段压制、账号变更、资金、警告来表现，而不是反派独白。
- 全真相只在真相页与剧透文档中直说。
