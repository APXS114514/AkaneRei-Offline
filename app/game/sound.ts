/* 界面音效：懒加载单例 Audio，全部失败静默（媒体不可用不阻断流程）。
 * ui-message.wav            消息提示音（首次登录信息窗弹出时播放一次）
 * ui-evidence.wav           独立的低音确认提示（新证据写入调查台账时播放）
 * ui-surveillance-noise.wav 低频噪音（零信号演出返回按钮第二次点击时播放） */
import { assetPath } from "./types";

const cache: Record<string, HTMLAudioElement | undefined> = {};

/** 全局音量（0–1），由 AudioLayer 随玩家设置同步；所有界面音效共享 */
let masterVolume = 1;

export function setMasterVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
}

function ensure(name: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let el = cache[name];
  if (!el) {
    el = new Audio(assetPath(`/audio/${name}.wav`));
    el.preload = "auto";
    el.volume = masterVolume;
    cache[name] = el;
  }
  return el;
}

function play(name: string): void {
  const el = ensure(name);
  if (!el) return;
  try {
    el.currentTime = 0;
    el.volume = masterVolume;
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

export function playScare(): void {
  play("ui-scare");
}
