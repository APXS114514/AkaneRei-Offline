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
内容为汐泊诺思（王镓铭）未发出的告别：

> 「如果……有一天你不再上线，我会把歌单听完。我是镓铭。晚安。」

- 采样率 22050 Hz，16-bit 单声道，约 10.9 秒，语速 -2。
- 合成命令：`System.Speech.Synthesis`（PowerShell）。
- **注意**：`npm run audio:generate` 不会再覆盖此文件（脚本已移除占位哼唱生成）。

## 告别语音（真实人声合成）

`shio-farewell.wav` 由 Windows 中文语音 **Microsoft Huihui（zh-CN，女声）** 合成，
内容为汐泊诺思（王镓铭）未发出的告别：

> 「如果……有一天你不再上线，我会把歌单听完。我是镓铭。晚安。」

- 采样率 22050 Hz，16-bit 单声道，约 10.9 秒，语速 -2。
- 合成命令：`System.Speech.Synthesis`（PowerShell）。
- **注意**：`npm run audio:generate` 不会再覆盖此文件（脚本已移除占位哼唱生成）。

## 氛围曲（占位合成）

`background-suspense.wav`（悬疑，Countdown 风格）与 `background-horror.wav`（惊悚，Lights 风格）
由 `scripts/generate-stems.mjs` 程序化合成（36s 循环），作为 BGM 分层的占位素材。
正式版本可替换为 CC0 授权曲目（参考项目使用 Alexander Nakarada 与 Rafael Krux 的 CC BY 4.0 曲目），
替换后保持文件名一致。

## 替换计划

正式版本可改用 CC0 实录/专业配音素材（镜像参考项目 `FIELD_RECORDINGS.md` 的做法），
把每位贡献者与许可记录在本文件；替换后保持文件名一致。
