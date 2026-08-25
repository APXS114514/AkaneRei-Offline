# AkaneRei Offline / ECHOS ARG

一款伪装成聊天软件的浏览器恐怖 ARG。玩家以 `AkaneRei` 的身份登录「回声 ECHOS」，通过聊天记录检索、已读回执、在线状态、语音分轨与账号找回，逐步发现：**自己并不是活人，而是 208 天前已死、每晚 04:08 被平台强制「重新登录」的亡者。**

主角：AkaneRei（真名晓茜）。朋友：N9Rtz（巴印）、LuvisDrug（李铭泽）、汐泊诺思（王镓铭）——以及群里那些看似无关的人：APXS（刘睿航）、Rtwyzz（李磊）、Roy（张贤德）。

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
npm run build:pages        # 静态导出（跨平台，Windows/macOS/Linux 均可）
npm run deploy             # 一键部署：构建 + 提交 + 推送 origin/main
npm run audio:generate     # 生成分轨与氛围曲（不覆盖告别语音）
```

## 项目结构

- `app/page.tsx`：主组件——状态、hash 路由与流程编排
- `app/game/types.ts`：类型、路由解析、存档读写
- `app/game/data.ts`：世界数据——会话、消息、档案、检索索引、结局门槛
- `app/game/components.tsx`：展示组件——谜题、崩坏演出、小游戏、音频分层
- `app/truth/page.tsx`：独立全案真相页
- `app/globals.css`：主游戏视觉与演出
- `public/`：封面 `cover.png`（源文件在 `.cover/`）、联系人头像 `avatars/`、分轨与氛围曲 `audio/`
- `docs/故事大纲.md`：完整剧情真值表与密码契约，含剧透
- `docs/游戏流程.md`：完整流程、触发条件与回归清单，含剧透
- `tests/rendered-html.test.mjs`：剧情门槛与关键交互回归测试

## 状态与路由

游戏进度保存在浏览器 `localStorage`，键名 `echos-arg-v1`。主游戏使用 hash 路由以兼容静态部署：`#/wake`、`#/login`、`#/app/home`、`#/app/chat/<id>`、`#/app/search`、`#/app/article/<id>`、`#/app/archive`、`#/app/settings`、`#/app/legacy`、`#/app/review`、`#/app/ending`、`#/app/completion`。登录页与账号安全中心的 `遗忘` 是故意的彻底重置。全案真相使用独立静态路由 `/truth/`。

## 音频分层

- 正常平台界面**无背景音乐**；检索到「零信号」并收到检索告警后，启用悬疑氛围曲（`background-suspense.wav`）；进入残留账号或身份侦测阶段，切换惊悚氛围曲（`background-horror.wav`）。
- 播放语音分轨或告别语音时，BGM 自动压低；侧栏与账号安全页可静音，偏好跨刷新保留。
- 告别语音为 Windows 中文语音合成（来源见 `public/audio/STEM_SOURCES.md`）。

## 部署

### 一键部署（推荐）

```bash
npm run deploy
```

脚本会依次执行：

1. `npm run build:pages` 静态构建
2. `git add -A` 暂存全部改动
3. `git commit` 提交（默认信息为 `Deploy: update AkaneRei Offline`，可用 `npm run deploy -- "自定义信息"`）
4. `git push origin main`

推送 `main` 后，GitHub Actions 会自动构建并部署到 GitHub Pages。

### 手动部署

```bash
git add -A
git commit -m "你的提交信息"
git push origin main
```

- 游戏：<https://apxs114514.github.io/AkaneRei-Offline/>
- 全案真相：<https://apxs114514.github.io/AkaneRei-Offline/truth/>

## 设计纪律

- 平台表面必须是像真的聊天软件，不是恐怖游戏菜单；恐怖通过小状态变化升级（时间戳异常、已读回执、零信号标记、云端同步、账号状态、记忆覆盖）。
- 证据先于结论：玩家通过记录与交叉核对发现身份；不把答案预填为结论；不把超自然写成系统结论。
- 平台知道得比承认得多：通过预生成的守则、字段压制、账号变更、资金、警告来表现，而不是反派独白。
- 全真相只在真相页与剧透文档中直说。
