"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameState, Route, SignalBall, SignalObstacle, Stem, TimelineItem } from "./types";
import { SAVE_KEY, assetPath, readSavedGame } from "./types";
import { RECORDS } from "./data";
import { playMessageTone, playSurveillanceNoise } from "./sound";
/* 展示组件 —— 由 app/page.tsx 拆分而来 */
/* ---------------- CASE 01 谜题：时间线复原 ---------------- */

const TIMELINE_ITEMS: TimelineItem[] = [
  { id: "t-0300", label: "语音通话开始（双方在线）", time: "03:00", correct: true },
  { id: "t-0406", label: "本地草稿（未发送）", time: "04:06", correct: true },
  { id: "t-0407", label: "最后一条消息「你还在吗？」（已读）", time: "04:07", correct: true },
  { id: "t-0408", label: "通话中断 / AkaneRei 离线", time: "04:08", correct: true },
  { id: "t-0409", label: "状态变为「刚刚在线」", time: "04:09", correct: true },
  { id: "d-0403", label: "全员群成员消息", time: "04:03", correct: false },
  { id: "d-0408b", label: "平台同步通知", time: "04:08", correct: false },
];

const TIMELINE_ANSWER = ["t-0300", "t-0406", "t-0407", "t-0408", "t-0409"];
const TIMELINE_SLOTS = 5;

export function TimelineBoard({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(TIMELINE_SLOTS).fill(null));
  const [feedback, setFeedback] = useState<"none" | "wrong" | "right">("none");

  const used = new Set(slots.filter((s): s is string => Boolean(s)));
  const pool = TIMELINE_ITEMS.filter((it) => !used.has(it.id));

  const place = (id: string) => {
    if (done) return;
    setSlots((prev) => {
      const next = [...prev];
      const empty = next.indexOf(null);
      if (empty === -1) return prev;
      next[empty] = id;
      return next;
    });
    setFeedback("none");
  };

  const remove = (idx: number) => {
    if (done) return;
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setFeedback("none");
  };

  const move = (idx: number, dir: -1 | 1) => {
    if (done) return;
    setSlots((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= TIMELINE_SLOTS) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setFeedback("none");
  };

  const submit = () => {
    const seq = slots.map((id, i) => ({ id, i })).filter((s) => s.id !== null);
    if (seq.length !== TIMELINE_SLOTS) {
      setFeedback("wrong");
      return;
    }
    const ok = seq.every((s, i) => s.id === TIMELINE_ANSWER[i]);
    setFeedback(ok ? "right" : "wrong");
    if (ok) onDone();
  };

  return (
    <div className="puzzle-box">
      <h4 className="puzzle-title">事件时间线复原</h4>
      <p className="puzzle-desc">将五个正确事件按先后顺序排入时间槽。干扰项不会进入答案。</p>

      <div className="timeline-slots">
        {slots.map((id, i) => {
          const item = id ? TIMELINE_ITEMS.find((t) => t.id === id) : undefined;
          return (
            <div key={i} className={`timeline-slot ${id ? "filled" : ""}`}>
              <span className="slot-index">{String(i + 1).padStart(2, "0")}</span>
              {item ? (
                <>
                  <span className="slot-label">
                    <b>{item.time}</b> {item.label}
                  </span>
                  <span className="slot-actions">
                    <button onClick={() => move(i, -1)} aria-label="前移">↑</button>
                    <button onClick={() => move(i, 1)} aria-label="后移">↓</button>
                    <button onClick={() => remove(i)} aria-label="移出">×</button>
                  </span>
                </>
              ) : (
                <span className="slot-empty">空槽</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="timeline-pool">
        {pool.length === 0 && <div className="puzzle-empty">候选事件已全部放入时间槽。</div>}
        {pool.map((it) => (
          <button key={it.id} className={`puzzle-item ${it.correct ? "" : "distractor"}`} onClick={() => place(it.id)}>
            <b>{it.time}</b> {it.label}
          </button>
        ))}
      </div>

      {feedback === "wrong" && (
        <div className="puzzle-feedback wrong">证据不连续。已保留当前排列，请继续调整。</div>
      )}
      {feedback === "right" && (
        <div className="puzzle-feedback right">时间线已复原：03:00 通话开始 → 04:06 草稿 → 04:07 已读 → 04:08 断线 → 04:09「刚刚在线」。</div>
      )}

      <div className="puzzle-actions">
        <button className="primary-button" disabled={done} onClick={submit}>
          {done ? "已完成" : "提交时间线"}
        </button>
        {done && <span className="puzzle-done-tag">✓ 已复原</span>}
      </div>
    </div>
  );
}

/* ---------------- CASE 01 谜题：四轨分轨净化 ---------------- */

const STEMS: Stem[] = [
  { id: "voice", name: "① 通话人声", desc: "断续的人声与呼吸", file: "/audio/stem-voice.wav", keep: true, color: "#2f7cf6" },
  { id: "ambient", name: "② 环境底噪", desc: "低频隆隆与远处车流", file: "/audio/stem-ambient.wav", keep: false, color: "#8a94a0" },
  { id: "ui", name: "③ 平台重连提示音", desc: "两声短提示音", file: "/audio/stem-ui.wav", keep: false, color: "#8a94a0" },
  { id: "crash", name: "④ 断裂与撞击", desc: "断裂瞬态与坠落撞击", file: "/audio/stem-crash.wav", keep: true, color: "#b03a3a" },
];

const STEM_DECODED = [
  "净化后的声纹露出关键残片：",
  "「信号要断了…我出去弄一下路由器——」",
  "「别去！喂——」（N9Rtz）",
  "断裂声 → 坠落撞击声 → 通话彻底中断。",
];

export function StemPuzzle({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<"none" | "wrong" | "right">("none");
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [playing, setPlaying] = useState<string | null>(null);

  const togglePlay = (id: string) => {
    const el = audioRefs.current[id];
    if (!el) return;
    if (playing === id) {
      el.pause();
      setPlaying(null);
    } else {
      if (playing) audioRefs.current[playing]?.pause();
      void el.play().catch(() => setPlaying(null));
      setPlaying(id);
    }
  };

  const toggleMute = (id: string) => {
    if (done) return;
    setMuted((m) => ({ ...m, [id]: !m[id] }));
    setFeedback("none");
  };

  const submit = () => {
    const ok = STEMS.every((s) => (muted[s.id] ?? false) === !s.keep);
    setFeedback(ok ? "right" : "wrong");
    if (ok) onDone();
  };

  return (
    <div className="puzzle-box">
      <h4 className="puzzle-title">四轨分轨净化</h4>
      <p className="puzzle-desc">逐轨试听。静音串音分轨（环境底噪、平台提示音），保留近场声源（人声、断裂撞击）。</p>

      {STEMS.map((s) => {
        const isMuted = muted[s.id] ?? false;
        const isPlaying = playing === s.id;
        return (
          <div key={s.id} className={`stem-row ${isMuted ? "muted" : ""} ${s.keep ? "keep" : "drop"}`}>
            <button
              className="stem-play"
              onClick={() => togglePlay(s.id)}
              aria-label={isPlaying ? "暂停" : "播放"}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <div className="stem-wave" style={{ ["--stem-color" as string]: s.color }} aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <i key={i} className={isPlaying ? "live" : ""} style={{ animationDelay: `${i * 0.11}s`, height: [10, 22, 34, 26, 40, 18, 30, 12][i] }} />
              ))}
            </div>
            <div className="stem-meta">
              <b>{s.name}</b>
              <span>{s.desc}</span>
            </div>
            <button className={`stem-toggle ${isMuted ? "muted" : ""}`} onClick={() => toggleMute(s.id)} disabled={done}>
              {isMuted ? "已静音" : "保留中"}
            </button>
            <audio
              ref={(el) => { audioRefs.current[s.id] = el; }}
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${s.file}`}
              onEnded={() => setPlaying(null)}
              preload="none"
            />
          </div>
        );
      })}

      {feedback === "wrong" && <div className="puzzle-feedback wrong">串音未排除，或近场声源被误静音。请重新判断。</div>}
      {feedback === "right" && (
        <div className="puzzle-feedback right">
          {STEM_DECODED.map((line, i) => (
            <p key={i} style={{ margin: "0 0 6px" }}>{line}</p>
          ))}
        </div>
      )}

      <div className="puzzle-actions">
        <button className="primary-button" disabled={done} onClick={submit}>
          {done ? "已完成" : "提交净化结果"}
        </button>
        {done && <span className="puzzle-done-tag">✓ 已净化</span>}
      </div>
    </div>
  );
}

/* ---------------- CASE 02：残留账号登录 ---------------- */

export const LEGACY_PASSWORD = "hzloopluvisdrug";

/** LuvisDrug 资料卡内嵌的残留账号登录表单。
 *  onOpenLegacyWindow 必须在密码验证通过的同一用户手势内同步调用（window.open 弹窗拦截策略）。 */
export function LegacyLogin({
  done,
  onSuccess,
  onOpenLegacyWindow,
}: {
  done: boolean;
  onSuccess: () => void;
  onOpenLegacyWindow?: () => void;
}) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [flash, setFlash] = useState(false);

  const submit = () => {
    if (done) return;
    if (pw.trim().toLowerCase() === LEGACY_PASSWORD) {
      setError("");
      setFlash(true);
      // 手势内同步打开本地备份线索页（新浏览器窗口）
      onOpenLegacyWindow?.();
      window.setTimeout(() => {
        setFlash(false);
        onSuccess();
      }, 500);
    } else {
      setWrongCount((n) => n + 1);
      setError("凭据不正确。");
    }
  };

  return (
    <div className={`puzzle-box ${flash ? "login-flash" : ""}`}>
      <h4 className="puzzle-title">残留账号登录</h4>
      <p className="puzzle-desc">
        凭据备注：头像波形图标注「97.0 HZ」；语音消息的静音规律是摩斯码；账号名为 LuvisDrug。去掉分隔符按顺序拼接。
      </p>
      <div className="legacy-form">
        <input
          className="input-field"
          placeholder="残留账号密码"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          aria-label="残留账号密码"
        />
        <button className="primary-button" disabled={done} onClick={submit}>
          {done ? "已登录" : "登录残留账号"}
        </button>
      </div>
      <div className={`login-error ${wrongCount > 0 ? "with-eyes" : ""}`}>{error}</div>
      {wrongCount > 0 && !done && (
        <div className="eye-strip" aria-hidden="true">
          {Array.from({ length: Math.min(wrongCount, 6) }).map((_, i) => (
            <span key={i} className="mini-eye" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 残留账号本地证据模块（#/app/legacy） */
export const LEGACY_NOTES = ["rec-note-1", "rec-note-2", "rec-note-3", "rec-note-4"];

export function LegacyAccount({
  notesRead,
  onOpenNote,
}: {
  notesRead: string[];
  onOpenNote: (recId: string) => void;
}) {
  const allRead = LEGACY_NOTES.every((id) => notesRead.includes(id));
  return (
    <div className="legacy-wrap">
      <div className="legacy-head">
        <div className="legacy-avatar" aria-hidden="true">L</div>
        <div>
          <b>LuvisDrug · 本地证据模块</b>
          <span>已注销账号的残存空间 · 仅本地可读</span>
        </div>
      </div>
      <div className="legacy-notice">该账号不属于检索索引。以下笔记按时间排列。</div>
      {LEGACY_NOTES.map((id, i) => {
        const rec = RECORDS[id];
        const read = notesRead.includes(id);
        return (
          <button key={id} className={`legacy-note ${read ? "read" : ""}`} onClick={() => onOpenNote(id)}>
            <span className="ln-index">{String(i + 1).padStart(2, "0")}</span>
            <span className="ln-body">
              <b>{rec.title}</b>
              <span>{rec.snippet}</span>
            </span>
            <span className="ln-state">{read ? "已读" : "未读"}</span>
          </button>
        );
      })}
      {allRead && (
        <div className="legacy-notice warn">
          四篇笔记全部读完。系统正在请求身份核验……
        </div>
      )}
    </div>
  );
}

/* ---------------- CASE 02：本地备份线索页（新浏览器窗口 #/legacy） ----------------
 * 登录残留账号成功后弹出。玩家在本页查找 LuvisDrug 的调查线索，
 * 点击「开启下一章节」写入共享存档（CASE 02 完成），主窗口通过 storage 事件同步并进入 CASE 03。 */

const LEGACY_WINDOW_RECS = [
  "rec-luvisdrug-profile",
  "rec-note-1", "rec-note-2", "rec-note-3", "rec-note-4",
  "rec-luvis-audit", "rec-hz-vendor", "rec-hz-fund", "rec-rules",
];

export function LegacyWindowPage() {
  const [done, setDone] = useState(false);

  const finish = () => {
    if (done) return;
    try {
      const g = readSavedGame();
      const next: GameState = {
        ...g,
        case02: "done",
        luvisNotes: [...LEGACY_NOTES],
        luvisLogin: false,
        openedRecords: [...new Set([...g.openedRecords, ...LEGACY_WINDOW_RECS])],
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      /* 存储不可用时忽略 */
    }
    setDone(true);
  };

  return (
    <div className="legacy-window">
      <div className="lw-head">
        <div className="lw-avatar" aria-hidden="true">L</div>
        <div>
          <b>LuvisDrug · 本地备份</b>
          <span>已注销账号的离线调查档案 · 新窗口</span>
        </div>
      </div>

      <div className="lw-intro">
        回声 ECHOS 在验证残留账号凭据后打开了这份本地备份。以下是 LuvisDrug 留下的一切线索——
        对照你的主窗口调查台账，找出平台在隐藏什么。
      </div>

      <div className="lw-card">
        <h4>零信号</h4>
        <p>
          正常波形是四格。他们只保留一格——剩下的三格被「切断」。
          被标记的账号没有任何设备在线，但每天 04:08 准时「重新登录」，处理完消息又消失。
        </p>
      </div>
      <div className="lw-card">
        <h4>赫兹实验室（HZ）</h4>
        <p>
          回声网络的供应商 / 实际控制方。内部口号：「连接该连接的，切断该切断的。」
          培训、缓存清理、令牌重建与好友迁移的时间高度重合。
        </p>
      </div>
      <div className="lw-card">
        <h4>没有去向的好友</h4>
        <p>
          17 名好友被「迁移」：没有目的地，没有接收方，没有回执。迁移时间全是凌晨 04:08。
        </p>
      </div>
      <div className="lw-card">
        <h4>预先存在的处置记录</h4>
        <p>
          我的注销处置记录创建时间比注销申请早了 3 天，处置人 HZ-COMPLIANCE。
          清除流程是预先存在的。档案上写的是我的实名。
        </p>
      </div>
      <div className="lw-card">
        <h4>有人在等一个不会回复的人</h4>
        <p>
          最后一个被迁移的账号，每晚 23:58 都在对同一个联系人说话。
          告诉她别等了。她的歌单和冷备份，是下一章节的入口。
        </p>
      </div>

      <div className="lw-footer">
        {!done ? (
          <button className="primary-button" onClick={finish}>
            已找到线索 · 开启下一章节（CASE 03 冷备份）
          </button>
        ) : (
          <div className="lw-done">
            ✅ 线索已同步。CASE 02「已注销」完成。
            <br />
            请返回主窗口继续调查——首页已出现《连接与断开守则》待办与汐泊诺思迁移公告。
          </div>
        )}
        <p className="lw-note">本页为只读线索页；点击上方按钮后可将结果写回主窗口存档。</p>
      </div>
    </div>
  );
}

/* ---------------- 调试：TEST-CAM 摄像头测试 ---------------- */

type CamStatus = "requesting" | "active" | "denied";

export function CameraTest({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>("requesting");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const md = navigator.mediaDevices;
        if (!md || typeof md.getUserMedia !== "function") {
          throw new Error("当前环境不支持 getUserMedia");
        }
        const stream = await md.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          void v.play().catch(() => {});
        }
        setStatus("active");
      } catch (err) {
        if (cancelled) return;
        setStatus("denied");
        setError(err instanceof Error ? err.message : "无法访问摄像头");
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div className="cam-test-overlay">
      <div className="cam-test-box">
        <div className="cam-test-head">
          <b>TEST-CAM · 摄像头测试</b>
          <button className="text-button" onClick={onClose}>关闭并释放摄像头 ✕</button>
        </div>
        {status === "requesting" && <div className="cam-test-status">正在请求摄像头权限……</div>}
        {status === "active" && (
          <video ref={videoRef} className="cam-test-video" autoPlay muted playsInline />
        )}
        {status === "denied" && (
          <div className="cam-test-status denied">
            摄像头不可用或被拒绝：{error}
            <br />请检查浏览器权限设置（地址栏摄像头图标）后重试。
          </div>
        )}
        <div className="cam-test-foot">
          {status === "active"
            ? "摄像头已开启 · 关闭本面板后自动释放"
            : status === "denied"
              ? "未获得权限 · 不影响游戏流程"
              : "授权后此处将显示实时画面"}
        </div>
      </div>
    </div>
  );
}

/* ---------------- CASE 02：身份侦测崩坏演出 ---------------- */

type BreachPhase = "camera" | "identity" | "stillThere" | "wave" | "escape";

export function Breach({ onEscape }: { onEscape: () => void }) {
  const [phase, setPhase] = useState<BreachPhase>("camera");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: number | undefined;

    // 摄像头核验：尝试以当前画面执行身份核验；拒绝 / 缺失 / 超时走历史特征回退，不阻断流程
    const fallback = () => {
      if (!cancelled) setPhase((p) => (p === "camera" ? "identity" : p));
    };
    try {
      const md = navigator.mediaDevices;
      if (md && typeof md.getUserMedia === "function") {
        const p = md.getUserMedia({ video: true });
        fallbackTimer = window.setTimeout(fallback, 1500);
        p.then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          const v = videoRef.current;
          if (v) {
            v.srcObject = stream;
            void v.play().catch(() => {});
          }
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
          window.setTimeout(() => {
            if (!cancelled) {
              streamRef.current?.getTracks().forEach((t) => t.stop());
              streamRef.current = null;
              setPhase((cur) => (cur === "camera" ? "identity" : cur));
            }
          }, 1100);
        }).catch(fallback);
      } else {
        fallbackTimer = window.setTimeout(fallback, 1500);
      }
    } catch {
      fallbackTimer = window.setTimeout(fallback, 1500);
    }

    const timers = [
      window.setTimeout(() => setPhase("stillThere"), 3400),
      window.setTimeout(() => setPhase("wave"), 5000),
      window.setTimeout(() => setPhase("escape"), 6800),
    ];
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const advance = () => {
    setPhase((p) =>
      p === "camera" ? "identity" : p === "identity" ? "stillThere" : p === "stillThere" ? "wave" : p === "wave" ? "escape" : p
    );
  };

  return (
    <div className="surveillance breach" onClick={advance}>
      {phase === "camera" && (
        <>
          <div className="breach-line">身份核验</div>
          <div className="breach-sub">正在请求摄像头，以当前画面执行身份核验……</div>
          <video ref={videoRef} className="breach-video" autoPlay muted playsInline aria-hidden="true" />
          <div className="breach-sub fallback">无摄像头 / 拒绝授权 / 超时 → 自动使用历史特征回退，不阻断流程</div>
        </>
      )}
      {phase === "identity" && <div className="breach-line">你是谁？</div>}
      {phase === "stillThere" && <div className="breach-line">你还在吗？</div>}
      {phase === "wave" && (
        <>
          <div className="wave-bars" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i key={i} className="on" style={{ height: [40, 80, 110, 90, 56, 32][i], animationDelay: `${i * 0.14}s` }} />
            ))}
          </div>
          <div className="typing">连接正在被识别……</div>
          <div className="eyes-row" aria-hidden="true">
            <div className="eye" style={{ animationDelay: "0s" }} />
            <div className="eye" style={{ animationDelay: "0.5s" }} />
            <div className="eye" style={{ animationDelay: "1.1s" }} />
            <div className="eye" style={{ animationDelay: "1.8s" }} />
            <div className="eye" style={{ animationDelay: "2.4s" }} />
          </div>
        </>
      )}
      {phase === "escape" && (
        <>
          <div className="breach-line">它找到你了。</div>
          <button className="escape" onClick={onEscape}>快断开</button>
        </>
      )}
      <div className="foot">ECHOS · 身份侦测 · 非平台功能</div>
    </div>
  );
}

/* ---------------- CASE 02：零信号 / Aka-0 监视演出 ---------------- */

export function SurveillanceScreen({ source, onExit }: { source: string; onExit: () => void }) {
  const [hits, setHits] = useState(0);
  const [showEscape, setShowEscape] = useState(false);

  // 返回按钮延迟出现
  useEffect(() => {
    const t = window.setTimeout(() => setShowEscape(true), 1400);
    return () => window.clearTimeout(t);
  }, []);

  const click = () => {
    if (hits >= 2) {
      onExit();
      return;
    }
    const next = hits + 1;
    setHits(next);
    if (next === 2) playSurveillanceNoise(); // 第二次点击播放一声低频噪音
  };

  const dodged = hits >= 2;
  return (
    <div className="surveillance" key={source}>
      <div className="wave-bars" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i
            key={i}
            className={source === "零信号" ? "on" : ""}
            style={{ height: [36, 72, 100, 84, 52, 30][i], animationDelay: `${i * 0.14}s` }}
          />
        ))}
      </div>
      <div className="typing">正在输入{source}…</div>
      <div className="eyes-row" aria-hidden="true">
        <div className="eye" style={{ animationDelay: "0s" }} />
        <div className="eye" style={{ animationDelay: "0.6s" }} />
        <div className="eye" style={{ animationDelay: "1.3s" }} />
        <div className="eye" style={{ animationDelay: "2.1s" }} />
      </div>
      {showEscape && (
        <button
          className="escape"
          style={dodged ? undefined : { transform: `translate(${hits === 0 ? -26 : 22}px, ${hits === 0 ? 8 : -10}px)` }}
          onClick={click}
        >
          {dodged ? "返回检索" : "离开"}
        </button>
      )}
      <div className="foot">ECHOS · 零信号 · 该页面未收录于任何索引</div>
    </div>
  );
}

/* ---------------- 首次登录信息窗（全员群最新消息摘要） ---------------- */

export function WelcomeInfoWindow({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    playMessageTone();
  }, []);
  return (
    <div className="welcome-overlay">
      <div className="welcome-toast card">
        <div className="welcome-head">
          <span className="welcome-icon" aria-hidden="true">💬</span>
          <b>回声 ECHOS · 新消息</b>
        </div>
        <div className="welcome-body">
          <b>全员群</b>
          <p>
            最新消息摘要：群公告已被替换为《连接与断开守则》节选，原公告无法查看。
            全员群所有消息停在 04:08。汐泊诺思 23:58 发来今天的「第一次」问候。
          </p>
        </div>
        <button className="primary-button" style={{ width: "100%" }} onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}

/* ---------------- CASE 02：《连接与断开守则》自动增补 ---------------- */

const RULES_BASE = [
  "第一条：本平台所有联系人均为虚拟形象。",
  "第二条：你从未认识任何人。",
  "第三条：若你记得不该记得的事，请点击这里忘记。",
  "第四条：联系人不会消失，除非你同意。",
];

const RULES_LOOP = [
  "第五条：04:08 的同步是例行维护。",
  "第六条：你没有任何关于昨晚的记忆。",
  "第七条：你最后一次上线是今天。",
  "第八条：你从未收到过 208 天前的消息。",
  "第九条：所有「第一次」都是第一次。",
  "第十条：不要核对时间戳。",
  "第十一条：已读就是已读。",
  "第十二条：没有人掉线。",
  "第十三条：连接该连接的，切断该切断的。",
  "第十四条：本文档没有终点。",
];

export function RulesAppender() {
  const [count, setCount] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
        setCount((c) => (c < RULES_LOOP.length ? c + 1 : c));
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="rules-box" ref={boxRef}>
      {RULES_BASE.map((r, i) => (
        <p key={`b${i}`} className="rule-clause">{r}</p>
      ))}
      {RULES_LOOP.slice(0, count).map((r, i) => (
        <p key={`l${i}`} className="rule-clause generated">{r}</p>
      ))}
      {count < RULES_LOOP.length ? (
        <p className="rule-clause generating">正在生成新条款……（继续向下滚动）</p>
      ) : (
        <p className="rule-clause end">本文档没有终点。停止向下滚动，或离开此页。</p>
      )}
    </div>
  );
}

/* ---------------- CASE 03：冷备份舱 ---------------- */

export const COLD_BACKUP_PASSWORD = "XIBONUOSI";
export const GREETING_COUNT = 208;

export function ColdBackup({ done, onSuccess }: { done: boolean; onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const farewellRef = useRef<HTMLAudioElement | null>(null);
  const [farewellPlaying, setFarewellPlaying] = useState(false);

  const submit = () => {
    if (done) return;
    if (pw.trim().toUpperCase() === COLD_BACKUP_PASSWORD) {
      setError("");
      onSuccess();
    } else {
      setWrongCount((n) => n + 1);
      setError("备份舱凭据不正确。");
    }
  };

  const greetings = useMemo(
    () =>
      Array.from({ length: GREETING_COUNT }, (_, i) => ({
        day: i + 1,
        read: true,
      })),
    []
  );

  return (
    <div className="puzzle-box">
      <h4 className="puzzle-title">冷备份舱 · 汐泊诺思</h4>
      {!done ? (
        <>
          <p className="puzzle-desc">
            备份舱密码来自资料卡完整姓名（歌单解锁后可见）转无声调全拼。
          </p>
          <div className="legacy-form">
            <input
              className="input-field"
              placeholder="备份舱密码"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              aria-label="备份舱密码"
            />
            <button className="primary-button" onClick={submit}>破拆冷备份</button>
          </div>
          <div className={`login-error ${wrongCount > 0 ? "with-eyes" : ""}`}>{error}</div>
          {wrongCount > 0 && (
            <div className="eye-strip" aria-hidden="true">
              {Array.from({ length: Math.min(wrongCount, 6) }).map((_, i) => (
                <span key={i} className="mini-eye" style={{ animationDelay: `${i * 0.4}s` }} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="backup-reveal">
            <h5 className="backup-title">封存内容 · 208 条「今天也是第一次见你。」</h5>
            <div className="backup-archive">
              {(showAll ? greetings : greetings.slice(0, 5).concat(greetings.slice(-2))).map((g) => (
                <div key={g.day} className="backup-line">
                  <span className="bl-day">第 {g.day} 天</span>
                  <span className="bl-text">今天也是第一次见你。</span>
                  <span className="bl-meta">23:58 · 已读</span>
                </div>
              ))}
              {!showAll && (
                <button className="text-button" onClick={() => setShowAll(true)}>
                  展开全部 {GREETING_COUNT} 条 →
                </button>
              )}
            </div>
            <div className="backup-note">
              读取状态：全部「已读」。她每晚都看到「他在线」——只是他不认识她。
            </div>

            <h5 className="backup-title">未发出的告别语音（2026-04-08 04:06 录制）</h5>
            <div className="stem-row keep">
              <button
                className="stem-play"
                onClick={() => {
                  const el = farewellRef.current;
                  if (!el) return;
                  if (farewellPlaying) {
                    el.pause();
                    setFarewellPlaying(false);
                  } else {
                    void el.play().catch(() => setFarewellPlaying(false));
                    setFarewellPlaying(true);
                  }
                }}
                aria-label={farewellPlaying ? "暂停" : "播放"}
              >
                {farewellPlaying ? "❚❚" : "▶"}
              </button>
              <div className="stem-meta">
                <b>告别语音（人声）</b>
                <span>约 11s · 女声 · 未发送</span>
              </div>
              <audio
                ref={farewellRef}
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/audio/shio-farewell.wav`}
                onEnded={() => setFarewellPlaying(false)}
                preload="none"
              />
            </div>
            <div className="backup-note" style={{ marginTop: 8 }}>
              转写：「如果……有一天你不再上线，我会把歌单听完。晚安。」<br />
              录音在 04:06 停止，比事故早两分钟。她没能发出去。
            </div>

            <h5 className="backup-title">AkaneRei 本地草稿（未发送）</h5>
            <div className="backup-draft">「等我弄好信号就回来。」<span className="bl-meta">04:07 · 未发送</span></div>

            <h5 className="backup-title">她保存的截图</h5>
            <table className="field-table">
              <tbody>
                <tr><th>内容</th><td>事故当晚 AkaneRei「最后上线 04:06」</td></tr>
                <tr><th>保存时间</th><td>2026-04-08 04:07</td></tr>
              </tbody>
            </table>
          </div>
          <div className="puzzle-feedback right" style={{ marginTop: 14 }}>
            冷备份已破拆。平台弹出警告：<b>FRIEND-KEEP 策略提示：不得动用私情。</b>
            <br />汐泊诺思账号状态变为：离线（用户主动）。
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- CASE 04：隐藏复核页（不可检索） ---------------- */

export function ReviewPage({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [who, setWho] = useState("");
  const [status, setStatus] = useState("");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (done) return;
    const ok =
      who.trim() === "晓茜" && status === "已死亡" && relation.trim() === "紧急联系人";
    if (ok) {
      setError("");
      onDone();
    } else {
      setError("复核结论不正确。请对照公开报道与账号绑定字段。");
    }
  };

  return (
    <div className="review-wrap review-stage">
      <div className="review-head">
        <b>复核请求（仅当前会话可读）</b>
        <span>该页面未收录于检索索引。</span>
      </div>
      <div className="review-form card">
        <div className="login-field">
          <label htmlFor="rv-who">Aka-0 是谁？</label>
          <input id="rv-who" className="input-field" value={who} onChange={(e) => setWho(e.target.value)} placeholder="对照事故报道" />
        </div>
        <div className="login-field">
          <label htmlFor="rv-status">AkaneRei 账号状态</label>
          <select id="rv-status" className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">— 请选择 —</option>
            <option>在线</option>
            <option>已注销</option>
            <option>已死亡</option>
          </select>
        </div>
        <div className="login-field">
          <label htmlFor="rv-rel">汐泊诺思与 AkaneRei 的关系</label>
          <input id="rv-rel" className="input-field" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="对照紧急联系人字段" />
        </div>
        <div className="login-error">{error}</div>
        <button className="primary-button" style={{ width: "100%" }} disabled={done} onClick={submit}>
          {done ? "已确认" : "提交复核结论"}
        </button>
      </div>
      {done && (
        <div className="puzzle-feedback right" style={{ marginTop: 14 }}>
          身份复核已完成。再次检索 Aka-0，将只返回《Aka-0 账号身份复核归档》。
        </div>
      )}
    </div>
  );
}

/* ---------------- CASE 04：身份核对与记忆覆盖阻断 ---------------- */

export const IDENTITY_FIELDS = [
  { key: "time", label: "事故时间戳", accept: (s: string) => parseInt(s.replace(/[^\d]/g, ""), 10) === 408 },
  { key: "date", label: "账号创建日期", accept: (s: string) => s.replace(/[^\d]/g, "") === "20260409" },
  { key: "file", label: "最后一条语音文件时间戳", accept: (s: string) => parseInt(s.replace(/[^\d]/g, ""), 10) === 407 },
];

export const MEMORY_ITEMS = [
  { id: "m-1", label: "2026-04-08 急救回执", time: "04:08", correct: true, order: 0 },
  { id: "m-2", label: "2026-04-08 04:00–04:08 运营商通话详单", time: "04:08", correct: true, order: 1 },
  { id: "m-3", label: "2026-04-08 04:07 本地未同步录音", time: "04:07", correct: true, order: 2 },
  { id: "d-1", label: "平台同步日志", time: "04:08", correct: false, order: -1 },
  { id: "d-2", label: "《连接与断开守则》条款", time: "—", correct: false, order: -1 },
  { id: "d-3", label: "全员群公告", time: "—", correct: false, order: -1 },
];

export function IdentityCheck({
  identityDone,
  memoryDone,
  onIdentity,
  onMemory,
}: {
  identityDone: boolean;
  memoryDone: boolean;
  onIdentity: () => void;
  onMemory: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [identityError, setIdentityError] = useState("");
  const [slots, setSlots] = useState<(string | null)[]>(Array(3).fill(null));
  const [memoryFeedback, setMemoryFeedback] = useState<"none" | "wrong" | "right">("none");

  const submitIdentity = () => {
    const ok = IDENTITY_FIELDS.every((f) => f.accept(values[f.key] ?? ""));
    if (ok) {
      setIdentityError("");
      onIdentity();
    } else {
      setIdentityError("字段与原始记录不一致。只抄录原始字段，不选择结论。");
    }
  };

  const used = new Set(slots.filter((s): s is string => Boolean(s)));
  const pool = MEMORY_ITEMS.filter((it) => !used.has(it.id));

  const place = (id: string) => {
    if (memoryDone) return;
    setSlots((prev) => {
      const next = [...prev];
      const empty = next.indexOf(null);
      if (empty === -1) return prev;
      next[empty] = id;
      return next;
    });
    setMemoryFeedback("none");
  };
  const remove = (idx: number) => {
    if (memoryDone) return;
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setMemoryFeedback("none");
  };
  const submitMemory = () => {
    const seq = slots.filter((s): s is string => Boolean(s));
    if (seq.length !== 3) {
      setMemoryFeedback("wrong");
      return;
    }
    const ok = seq.every((id, i) => MEMORY_ITEMS.find((it) => it.id === id)?.order === i);
    setMemoryFeedback(ok ? "right" : "wrong");
    if (ok) onMemory();
  };

  return (
    <div className="puzzle-box">
      <h4 className="puzzle-title">账号来源人工校验</h4>

      {!identityDone ? (
        <>
          <p className="puzzle-desc">只抄录以下原始字段，不要选择任何结论。</p>
          {IDENTITY_FIELDS.map((f) => (
            <div className="login-field" key={f.key}>
              <label>{f.label}</label>
              <input className="input-field" style={{ width: "100%" }} value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div className="login-error">{identityError}</div>
          <button className="primary-button" onClick={submitIdentity}>提交字段</button>
        </>
      ) : (
        <>
          <p className="puzzle-desc">
            平台已被 <b>CONNECTION-KEEP</b> 接管，开始覆盖联系人关系、账号主体与「未断连接」含义。
            从候选中只选择平台外仍可核验的三份原始材料，并按时间排列，阻断 04:08 的云端同步。
          </p>
          <div className="timeline-slots">
            {slots.map((id, i) => {
              const item = id ? MEMORY_ITEMS.find((it) => it.id === id) : undefined;
              return (
                <div key={i} className={`timeline-slot ${id ? "filled" : ""}`}>
                  <span className="slot-index">{String(i + 1).padStart(2, "0")}</span>
                  {item ? (
                    <>
                      <span className="slot-label"><b>{item.time}</b> {item.label}</span>
                      <span className="slot-actions">
                        <button onClick={() => remove(i)} aria-label="移出">×</button>
                      </span>
                    </>
                  ) : (
                    <span className="slot-empty">空槽</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="timeline-pool">
            {pool.length === 0 && <div className="puzzle-empty">候选已全部放入时间槽。</div>}
            {pool.map((it) => (
              <button key={it.id} className="puzzle-item" onClick={() => place(it.id)}>
                <b>{it.time}</b> {it.label}
              </button>
            ))}
          </div>
          {memoryFeedback === "wrong" && <div className="puzzle-feedback wrong">材料选择或顺序不正确。保留当前排列。</div>}
          {memoryFeedback === "right" && (
            <div className="puzzle-feedback right">
              记忆覆盖已阻断。你保留着「自己已死、朋友在等你下线」的关系记忆。平台将账号降为只读，并预告 04:08 强制退出。
            </div>
          )}
          <div className="puzzle-actions">
            <button className="primary-button" disabled={memoryDone} onClick={submitMemory}>
              {memoryDone ? "已阻断" : "提交阻断"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- 结局 ---------------- */


export function EndingScreen({ ending, onChoose, onBackHome }: { ending: GameState["ending"]; onChoose: (e: "good" | "bad" | "none") => void; onBackHome: () => void }) {
  if (ending === "good") {
    return (
      <div className="ending-screen good">
        <div className="ending-box">
          <div className="ending-kicker">账号安全中心 · 注销结果</div>
          <h2 className="ending-title">正在输入…永久消失</h2>
          <p className="ending-copy">
            账号状态变为 <b>已离线</b>。全员群里，朋友们完成了真正的告别。
            <br />
            23:58，汐泊诺思发出第 209 条消息——
          </p>
          <div className="ending-message">「晚安，不再是第一次见你。」</div>
          <p className="ending-copy">
            04:08 之后，账号没有回来。平台显示：「该账号已注销，联系人已解除关联。」
          </p>
          <div className="ending-actions">
            <button className="primary-button" onClick={() => onChoose("none")}>重新选择结局</button>
            <button className="back-home" onClick={onBackHome}>返回首页</button>
          </div>
          <p className="ending-foot">想重新开始？首页 → 账号安全 → 遗忘 · 清除本机数据。</p>
        </div>
      </div>
    );
  }
  if (ending === "bad") {
    return (
      <div className="ending-screen bad">
        <div className="ending-box">
          <div className="ending-kicker">04:08 · 云端同步完成</div>
          <h2 className="ending-title">重新登录</h2>
          <p className="ending-copy">
            一切如新。次日登录，汐泊诺思发出第 209 次——
          </p>
          <div className="ending-message">「今天也是第一次见你。」</div>
          <p className="ending-copy">
            这一次，她不再期待回复。N9Rtz 依旧已读不回。
          </p>
          <div className="ending-actions">
            <button className="primary-button" onClick={() => onChoose("none")}>重新选择结局</button>
            <button className="back-home" onClick={onBackHome}>返回首页</button>
          </div>
          <p className="ending-foot">想重新开始？首页 → 账号安全 → 遗忘 · 清除本机数据。</p>
        </div>
      </div>
    );
  }
  return (
    <div className="ending-screen">
      <div className="ending-box">
        <div className="ending-kicker">账号安全中心 · 注销账号</div>
        <h2 className="ending-title">提交全部证据并注销账号？</h2>
        <p className="ending-copy">
          你的调查已完整：N9Rtz 的录音、LuvisDrug 的调查链、冷备份里的告别、以及事故的真相。
        </p>
        <div className="ending-actions">
          <button className="primary-button" onClick={() => onChoose("good")}>提交全部证据并注销账号</button>
          <button className="primary-button danger-button" onClick={() => onChoose("bad")}>只处理今天的未读，重新登录</button>
          <button className="back-home" onClick={onBackHome}>返回首页</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 彩蛋：保持信号（像素小游戏） ---------------- */

export const SIGNAL_OBSTACLE_COUNT = 14;


export function buildSignalCourse(): { obstacles: SignalObstacle[]; balls: SignalBall[] } {
  const obstacles: SignalObstacle[] = [];
  const balls: SignalBall[] = [];
  let x = 700;
  for (let i = 0; i < SIGNAL_OBSTACLE_COUNT; i++) {
    const h = 28 + (i % 3) * 9;
    obstacles.push({ x, w: 14, h });
    if (i < SIGNAL_OBSTACLE_COUNT - 1) {
      balls.push({ x: x + 90, y: 150 - (i % 4) * 12, r: 7, taken: false });
    }
    x += 190 + (i % 4) * 26;
  }
  return { obstacles, balls };
}

export function SignalGame({ onFinish }: { onFinish: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [passed, setPassed] = useState(0);
  const [caught, setCaught] = useState(0);
  const [finished, setFinished] = useState(false);
  const [resetFlash, setResetFlash] = useState(0);
  const stateRef = useRef({
    playerY: 160,
    vy: 0,
    jump: false,
    course: buildSignalCourse(),
    progress: 0,
    balls: 0,
    speed: 3.2,
    done: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 640;
    const H = 240;
    const GROUND = 196;
    const PLAYER_X = 80;
    const PLAYER_SIZE = 26;

    let raf = 0;
    let last = performance.now();

    const jump = () => {
      const s = stateRef.current;
      if (s.done) return;
      if (s.playerY >= GROUND - PLAYER_SIZE - 0.5) {
        s.vy = -9.6;
        s.jump = true;
      } else if (s.vy < 0) {
        s.vy = -9.6;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      jump();
    };
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onPointer);

    const frame = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const s = stateRef.current;
      const frames = dt / 16.67;
        const px = PLAYER_X;
        const py = s.playerY;

      if (!s.done) {
        s.vy += 0.55 * frames;
        s.playerY += s.vy * frames;
        if (s.playerY >= GROUND - PLAYER_SIZE) {
          s.playerY = GROUND - PLAYER_SIZE;
          s.vy = 0;
          s.jump = false;
        }
        if (s.playerY < 40) s.playerY = 40;

        for (const ob of s.course.obstacles) ob.x -= s.speed * frames;
        for (const b of s.course.balls) b.x -= s.speed * frames;

        // 碰撞检测
        let hit = false;
        for (const ob of s.course.obstacles) {
          if (ob.x < px + PLAYER_SIZE && ob.x + ob.w > px + 6 && GROUND - ob.h < py + PLAYER_SIZE && GROUND > py) {
            hit = true;
          }
        }
        if (hit) {
          s.course = buildSignalCourse();
          s.playerY = GROUND - PLAYER_SIZE;
          s.vy = 0;
          s.progress = 0;
          setResetFlash((n) => n + 1);
          setPassed(0);
          setCaught(0);
        } else {
          for (const b of s.course.balls) {
            if (!b.taken && Math.abs(b.x - (px + PLAYER_SIZE / 2)) < 16 && Math.abs(b.y - (py + PLAYER_SIZE / 2)) < 22) {
              b.taken = true;
              s.balls += 1;
              setCaught(s.balls);
            }
          }
          const passedCount = s.course.obstacles.filter((ob) => ob.x + ob.w < px - 10).length;
          if (passedCount !== s.progress) {
            s.progress = passedCount;
            setPassed(passedCount);
          }
          if (passedCount >= SIGNAL_OBSTACLE_COUNT) {
            s.done = true;
            setFinished(true);
            onFinish();
          }
        }
      }

      // 渲染
      ctx.fillStyle = "#0d1116";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1c2530";
      ctx.fillRect(0, GROUND, W, 4);
      // 障碍：断线
      for (const ob of s.course.obstacles) {
        if (ob.x < -30) continue;
        ctx.fillStyle = "#39444f";
        ctx.fillRect(ob.x, GROUND - ob.h, ob.w, ob.h);
        ctx.fillStyle = "#b03a3a";
        ctx.fillRect(ob.x + 4, GROUND - ob.h + 6, ob.w - 8, 3);
      }
      // 信号球
      for (const b of s.course.balls) {
        if (b.taken || b.x < -20) continue;
        ctx.fillStyle = "#2f7cf6";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(47,124,246,.25)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 玩家：信号方块
      const glow = 3 + Math.sin(now / 200) * 1.5;
      ctx.fillStyle = "rgba(47,124,246,.28)";
      ctx.fillRect(px - glow, py - glow, PLAYER_SIZE + glow * 2, PLAYER_SIZE + glow * 2);
      ctx.fillStyle = "#2f7cf6";
      ctx.fillRect(px, py, PLAYER_SIZE, PLAYER_SIZE);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "center";
      ctx.fillText("E", px + PLAYER_SIZE / 2, py + 18);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointer);
    };
  }, [onFinish]);

  return (
    <div className="game-box">
      <div className="game-hud">
        <span>断线障碍 {Math.min(passed, SIGNAL_OBSTACLE_COUNT)}/{SIGNAL_OBSTACLE_COUNT}</span>
        <span>信号球 {caught}</span>
        <span className="game-controls">空格 / ↑ / 点击 跳跃</span>
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={240}
        className={resetFlash > 0 ? "game-flash" : ""}
        style={{ width: "100%", imageRendering: "pixelated", touchAction: "none" }}
        aria-label="保持信号：跳跃接住信号球并跳过断线障碍"
      />
      {finished && (
        <div className="game-end">
          <div className="game-end-title">04:09 · 信号恢复</div>
          <p>语音接通了。这一次，电话那头有人在等你。</p>
          <p className="game-end-sub">彩蛋通关文案：断线 208 天之后，你第一次没有掉线。</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- 个人通关页 ---------------- */

export function CompletionPage({
  nickname,
  openedCount,
  totalCount,
  gameFinished,
  onGameFinish,
  goTo,
}: {
  nickname: string;
  openedCount: number;
  totalCount: number;
  gameFinished: boolean;
  onGameFinish: () => void;
  goTo: (r: Route) => void;
}) {
  return (
    <div className="completion-wrap">
      <h1 className="completion-title">恭喜通关《AkaneRei Offline》</h1>
      <p className="completion-sub">
        好结局：<b>已离线</b> · 档案完成数：{openedCount}/{totalCount}
        {nickname && <> · 昵称：{nickname}</>}
      </p>
      <div className="completion-actions">
        <button className="primary-button" onClick={() => goTo({ name: "archive" })}>继续补读档案</button>
        <a className="text-button" href="/truth" style={{ fontSize: 14 }}>查看全案真相 →</a>
      </div>
      <div className="completion-section">
        <h3>彩蛋：保持信号</h3>
        <p className="completion-hint">点击或按空格/上方向键跳跃。接住信号球，跳过 14 个断线障碍，抵达 04:09。</p>
        <SignalGame onFinish={onGameFinish} />
      </div>
      {gameFinished && (
        <div className="completion-section appendix">
          <h3>附录</h3>
          <div className="appendix-block">
            <h4>最初的故事原稿</h4>
            <p>
              最初只有一个念头：一个人死后，他的聊天账号每晚自动上线，朋友们 208 天无法告别。
              平台把「永不掉线」当作礼物，实际是把他锁在账号里。游戏的核心不是跳吓，
              而是「他为了不断线而死」——以及朋友们终于能说出那句再见。
            </p>
          </div>
          <div className="appendix-block">
            <h4>创作者说</h4>
            <p>
              《AkaneRei Offline》是一封关于连接与告别的情书。感谢你读完 208 条「今天也是第一次见你」，
              也感谢你没有在 04:08 之前关掉页面。如果你是汐泊诺思，请把歌单听完；如果你是 AkaneRei，
              请记得：掉线不是终点，被记住才是。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 音频分层（BGM） ---------------- */

/** 各音轨音量：雨声为环境底噪，不能盖过消息提示音 */
const TRACK_VOLUME: Record<"rain" | "suspense" | "horror" | "farewell", number> = {
  rain: 0.12,
  suspense: 1,
  horror: 1,
  farewell: 1,
};

type BgmTrack = "rain" | "suspense" | "horror" | "farewell";

export function AudioLayer({ game }: { game: GameState }) {
  const ref = useRef<HTMLAudioElement>(null);
  const startedRef = useRef(false);
  const volumeRef = useRef(game.bgmVolume);
  const trackRef = useRef<BgmTrack>("rain");
  const duckedRef = useRef(false);
  volumeRef.current = game.bgmVolume;

  // 音轨选择（优先级从高到低）：惊悚 > 告别 > 悬疑 > 默认雨声。
  // 默认全天候保留深夜雨声作为环境底噪；检索到「零信号」后进入悬疑氛围，
  // 残留账号/身份侦测阶段换惊悚氛围，冷备份破拆与结局换告别氛围。
  const track: BgmTrack = useMemo(() => {
    const horror = game.luvisLogin || (game.identityCheck && !game.memoryBlocked);
    const farewell = game.case03 === "done" || game.ending !== "none";
    const suspense = game.surveillanceSeen["零信号"] || game.case02 !== "none";
    if (horror) return "horror";      // /audio/background-horror.mp3（Lights）
    if (farewell) return "farewell";  // /audio/background-farewell.mp3（I Walk With Ghosts）
    if (suspense) return "suspense";  // /audio/background-suspense.mp3（Countdown）
    return "rain";                    // /audio/background-rain.mp3（默认日常雨声，环境底噪）
  }, [game]);
  trackRef.current = track;

  // 实际音量 = 音轨基准音量 × 玩家音量（duck 时统一压到 0.16 再乘玩家音量）
  const applyVolume = (el: HTMLAudioElement) => {
    const base = duckedRef.current ? 0.16 : TRACK_VOLUME[trackRef.current];
    el.volume = Math.max(0, Math.min(1, base * volumeRef.current));
  };

  // 首次用户操作后开始播放（浏览器自动播放策略）
  useEffect(() => {
    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const el = ref.current;
      if (el && !game.bgmMuted && el.getAttribute("data-src")) void el.play().catch(() => {});
    };
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [track, game.bgmMuted]);

  // 音轨切换（含音量映射）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const src = `/audio/background-${track}.mp3`;
    if (el.getAttribute("data-src") !== src) {
      el.pause();
      el.setAttribute("data-src", src);
      el.setAttribute("src", assetPath(src));
      el.load();
      if (startedRef.current && !game.bgmMuted) void el.play().catch(() => {});
    }
    applyVolume(el);
  }, [track, game.bgmMuted]);

  // 玩家调节音量时立即生效（含 duck 状态）
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.getAttribute("data-src")) return;
    applyVolume(el);
  }, [game.bgmVolume, track]);

  // 其他媒体（分轨/告别语音）播放时压低 BGM
  useEffect(() => {
    const el = ref.current;
    const duck = () => { duckedRef.current = true; if (el) applyVolume(el); };
    const unduck = () => { duckedRef.current = false; if (el) applyVolume(el); };
    document.addEventListener("play", duck, true);
    document.addEventListener("pause", unduck, true);
    document.addEventListener("ended", unduck, true);
    return () => {
      document.removeEventListener("play", duck, true);
      document.removeEventListener("pause", unduck, true);
      document.removeEventListener("ended", unduck, true);
    };
  }, []);

  return (
    <audio ref={ref} loop muted={game.bgmMuted} preload="none" style={{ display: "none" }} />
  );
}