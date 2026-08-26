# 事故夜分轨与告别语音来源

## 事故夜分轨（占位）

`stem-*.wav` 四条分轨由 `scripts/generate-stems.mjs` 程序化生成，作为**占位素材**，
用于让「四轨分轨净化」谜题在正式实录前可用：

| 分轨 | 文件 | 内容（占位） |
| --- | --- | --- |
| ① 通话人声 | `stem-voice.wav` | 语音样式的 AM 噪声段，三段说话两段停顿 |
| ② 环境底噪 | `stem-ambient.wav` | 低频隆隆 + 远处车流起伏 |
| ③ 平台重连提示音 | `stem-ui.wav` | 两次短提示音（820Hz / 660Hz） |
| ④ 断裂与撞击 | `stem-crash.wav` | 4.2s 断裂瞬态 + 5.0s 坠落撞击 |

## 告别语音（真实女声素材）

`shio-farewell.wav` 为**真实女声素材**（原始文件 `音频/女声我会把歌单听完.wav`，
24kHz、16-bit 单声道，约 8.4 秒，AI 生成人声，文件含 AIGC 标记块），
内容为汐泊诺思未发出的告别核心句：

> 「我会把歌单听完。」

游戏内配套转写（流程文档锁定，保持完整告别句）：
「如果……有一天你不再上线，我会把歌单听完。晚安。」

- 替换说明：原 `shio-farewell.wav` 由 Windows 中文语音（Microsoft Huihui）合成，
  现按玩家提供的新女声素材替换音源（转写文本不变，播放时长标注更新为约 8 秒）。
- **注意**：`npm run audio:generate` 不会再覆盖此文件。

## LuvisDrug 摩斯语音（玩家素材）

`luvis-morse.wav` 由玩家提供（原始文件 `音频/LOOPmorsecode.wav`），
8kHz、8-bit 单声道，约 5 秒。内容为摩斯码 **LOOP**（`.--.`… 实际包络：
`.-..` / `---` / `---` / `.--.`），对应残留账号密码中的 `loop` 段：

| 字符 | 摩斯码 | 包络实测（点≈0.08s，划≈0.22s） |
| --- | --- | --- |
| L | `.-..` | 点 划 点 点 |
| O | `---` | 划 划 划 |
| O | `---` | 划 划 划 |
| P | `.--.` | 点 划 划 点 |

在 LuvisDrug 残留会话中作为「语音消息」播放；静音规律即摩斯码（见流程文档 §2.4）。


## 氛围曲（真实曲目）

| 文件 | 用途 | 来源曲目 | 授权 |
| --- | --- | --- | --- |
| `background-rain.mp3` | 默认日常环境底噪（深夜雨声） | 雨声 · 白噪音助眠（flac 转 mp3，192kbps） | 自用素材，公开部署前请确认来源许可 |
| `background-suspense.mp3` | 悬疑调查 BGM | Alexander Nakarada – *Countdown*（flac 转 mp3，256kbps） | CC BY 4.0 |
| `background-horror.mp3` | 惊悚/崩坏 BGM | Rafael Krux – *Lights*（flac 转 mp3，256kbps） | CC BY 4.0 |
| `background-farewell.mp3` | 情感/告别 BGM（冷备份、结局） | Fan Yi Sun studio – *I Walk With Ghosts*（flac 转 mp3，256kbps） | ⚠ 原曲通常署名 **Scott Buckley**（CC BY 4.0），公开使用前请核对实际作者并补充署名 |

## 替换计划

正式版本可改用 CC0 实录/专业配音素材（镜像参考项目 `FIELD_RECORDINGS.md` 的做法），
把每位贡献者与许可记录在本文件；替换后保持文件名一致。
