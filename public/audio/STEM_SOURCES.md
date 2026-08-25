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

## 告别语音（真实人声合成）

`shio-farewell.wav` 由 Windows 中文语音 **Microsoft Huihui（zh-CN，女声）** 合成，
内容为汐泊诺思未发出的告别（游戏内不揭示实名）：

> 「如果……有一天你不再上线，我会把歌单听完。晚安。」

- 采样率 22050 Hz，16-bit 单声道，约 8.7 秒，语速 -2。
- 合成命令：`System.Speech.Synthesis`（PowerShell）。
- **注意**：`npm run audio:generate` 不会再覆盖此文件（脚本已移除占位哼唱生成）。

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
