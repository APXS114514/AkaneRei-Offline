/* 界面音效：懒加载单例 Audio，全部失败静默（媒体不可用不阻断流程）。
 * ui-message.wav            消息提示音（首次登录信息窗弹出时播放一次）
 * ui-evidence.wav           独立的低音确认提示（新证据写入调查台账时播放）
 * ui-surveillance-noise.wav 低频噪音（零信号演出返回按钮第二次点击时播放） */
import { assetPath } from "./types";

const cache: Record<string, HTMLAudioElement | undefined> = {};

function ensure(name: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let el = cache[name];
  if (!el) {
    el = new Audio(assetPath(`/audio/${name}.wav`));
    el.preload = "auto";
    cache[name] = el;
  }
  return el;
}

function play(name: string): void {
  const el = ensure(name);
  if (!el) return;
  try {
    el.currentTime = 0;
    void el.play().catch(() => {
      /* 音频不可用时不阻塞 */
    });
  } catch {
    /* 忽略 */
  }
}

export function playMessageTone(): void {
  play("ui-message");
}

export function playEvidenceConfirm(): void {
  play("ui-evidence");
}

export function playSurveillanceNoise(): void {
  play("ui-surveillance-noise");
}
