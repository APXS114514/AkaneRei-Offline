/**
 * 生成事故夜录音的四条占位分轨 WAV（纯 Node，无外部依赖）。
 * ① 通话人声（语音样式的 AM 噪声段）
 * ② 环境底噪（低频隆隆声 + 远处车流起伏）
 * ③ 平台重连提示音（两声短提示音）
 * ④ 断裂与撞击（静默后的一次断裂音与坠落撞击瞬态）
 *
 * 占位素材仅用于让分轨净化谜题可用；正式版本将替换为 CC0 实录素材，
 * 并把来源记录写入 public/audio/STEM_SOURCES.md（镜像 FIELD_RECORDINGS.md）。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SAMPLE_RATE = 22050;
const OUT_DIR = resolve(process.cwd(), "public", "audio");

function writeWav(path, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(path, buffer);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(name, duration, render) {
  const n = Math.floor(duration * SAMPLE_RATE);
  const out = new Float64Array(n);
  const rng = mulberry32(name.split("").reduce((a, c) => a + c.charCodeAt(0), 7));
  render(out, n, rng);
  writeWav(resolve(OUT_DIR, name), out);
  console.log(`  ${name}  ${(duration).toFixed(1)}s  ${(out.length * 2 / 1024).toFixed(1)} KB`);
}

mkdirSync(OUT_DIR, { recursive: true });

console.log("生成事故夜分轨（占位）：");

/* ① 通话人声：语音样式的 AM 噪声段（占位，正式版替换为实录） */
generate("stem-voice.wav", 6.0, (out, n, rng) => {
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // 三段"说话"与两段停顿
    const seg = t < 1.4 ? 0 : t < 2.6 ? 1 : t < 3.4 ? 2 : t < 4.6 ? 3 : 4;
    const active = seg === 1 || seg === 3;
    const syll = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.2 * t + phase);
    const noise = rng() * 2 - 1;
    const breath = Math.sin(2 * Math.PI * 1.7 * t) * 0.35;
    out[i] = active ? (noise * (0.16 + 0.14 * syll) + breath * 0.12) : (noise * 0.02 + breath * 0.05);
    if (i % 1200 < 2) phase += 0.6;
  }
});

/* ② 环境底噪：低频隆隆 + 远处车流起伏 */
generate("stem-ambient.wav", 6.0, (out, n, rng) => {
  let low = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    low = low * 0.985 + (rng() * 2 - 1) * 0.06;
    const car = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t / 9.0) + 1.2);
    out[i] = low * 0.9 + (rng() * 2 - 1) * 0.03 * (0.3 + 0.7 * car);
  }
});

/* ③ 平台重连提示音：两次短提示音 + 轻微底噪 */
generate("stem-ui.wav", 6.0, (out, n, rng) => {
  const beep = (t, f) => Math.sin(2 * Math.PI * f * t) * Math.exp(-3.2 * t);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = (rng() * 2 - 1) * 0.015;
    const at = (start, len, f) => {
      const dt = t - start;
      if (dt >= 0 && dt < len) v += beep(dt, f) * 0.5;
    };
    at(1.0, 0.35, 820);
    at(2.2, 0.35, 660);
    out[i] = v;
  }
});

/* ④ 断裂与撞击：4.2s 处断裂瞬态 + 坠落撞击 */
generate("stem-crash.wav", 6.0, (out, n, rng) => {  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = (rng() * 2 - 1) * 0.012;
    const thump = (start, f, decay) => {
      const dt = t - start;
      if (dt >= 0 && dt < 1.2) v += Math.sin(2 * Math.PI * f * dt) * Math.exp(-decay * dt) * 0.55;
    };
    thump(4.2, 90, 14); // 断裂
    thump(5.0, 55, 8);  // 撞击
    if (t >= 4.2 && t < 4.5) v += (rng() * 2 - 1) * 0.2 * Math.exp(-6 * (t - 4.2)); // 撕裂噪声
    if (t >= 5.0 && t < 5.2) v += (rng() * 2 - 1) * 0.18 * Math.exp(-9 * (t - 5.0));
    out[i] = v;
  }
});

console.log("生成界面音效（消息提示 / 证据确认 / 监视噪音）：");

/* ⑧ 消息提示音：两声轻柔的短提示（首次登录信息窗弹出时播放一次） */
generate("ui-message.wav", 0.9, (out, n) => {
  const tone = (t, f) => Math.sin(2 * Math.PI * f * t) * Math.exp(-7 * t);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    const d1 = t - 0.02;
    if (d1 >= 0 && d1 < 0.35) v += tone(d1, 880) * 0.5;
    const d2 = t - 0.16;
    if (d2 >= 0 && d2 < 0.45) v += tone(d2, 1318) * 0.42;
    out[i] = v;
  }
});

/* ⑨ 证据确认提示：独立的低音确认音（新证据写入调查台账时播放，重复核验不播放） */
generate("ui-evidence.wav", 0.9, (out, n) => {
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = Math.sin(2 * Math.PI * 82 * t) * Math.exp(-9 * t) * 0.85;
    const d2 = t - 0.28;
    if (d2 >= 0 && d2 < 0.5) v += Math.sin(2 * Math.PI * 62 * d2) * Math.exp(-7 * d2) * 0.6;
    out[i] = v;
  }
});

/* ⑩ 监视低频噪音：零信号演出「返回」按钮第二次点击时的一声低频噪音 */
generate("ui-surveillance-noise.wav", 0.7, (out, n, rng) => {
  let low = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    low = low * 0.92 + (rng() * 2 - 1) * 0.14;
    const env = Math.exp(-5 * t);
    out[i] = low * env * 0.9 + (rng() * 2 - 1) * 0.05 * env;
  }
});

// ⑤ 汐泊诺思告别语音：已由 Windows 中文语音（Microsoft Huihui）合成，
//   见 public/audio/STEM_SOURCES.md。不要用占位哼唱覆盖该文件。

// ⑥⑦ 背景氛围曲：已替换为真实授权曲目（见 public/audio/STEM_SOURCES.md）：
//   background-suspense.mp3 = Alexander Nakarada - Countdown
//   background-horror.mp3   = Rafael Krux - Lights
//   background-farewell.mp3 = Fan Yi Sun studio - I Walk With Ghosts
//   background-rain.mp3     = 雨声（白噪音助眠）
//   本脚本不再生成占位 WAV。

console.log("完成。来源与授权见 public/audio/STEM_SOURCES.md。");
