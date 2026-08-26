"use client";

/* 主组件：状态、路由与流程编排（数据与展示组件已拆分至 app/game/） */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { GameRecord, GameState, Msg, Route } from "./game/types";
import {
  SAVE_KEY,
  assetPath,
  clearLocalData,
  initialGame,
  parseRoute,
  readSavedGame,
  routeToHash,
} from "./game/types";
import {
  CONVS,
  RECORDS,
  SEARCH_INDEX,
  SURVEILLANCE_TERMS,
  echoAssistMessages,
  endingAvailable,
  groupMessages,
  luvisMessages,
  maskName,
  n9rtzMessages,
  reviewReady,
  shioMessages,
  shioName,
} from "./game/data";
import {
  AudioLayer,
  Breach,
  CameraTest,
  ColdBackup,
  CompletionPage,
  EndingScreen,
  IdentityCheck,
  LEGACY_NOTES,
  LegacyAccount,
  LegacyLogin,
  LegacyWindowPage,
  PlaylistDetail,
  ReviewPage,
  RulesAppender,
  StemPuzzle,
  SurveillanceScreen,
  TimelineBoard,
  WelcomeInfoWindow,
} from "./game/components";
import { playEvidenceConfirm } from "./game/sound";

/* ---------- 调试模式后门（在搜索框输入调试码） ----------
 * APXS-NEXT  完成当前 CASE 并进入下一关
 * APXS-END1  直接触发好结局「已离线」（自动补全全部前置）
 * APXS-END2  直接触发坏结局「重新登录」（自动补全全部前置）
 */
const DEBUG_NEXT = "APXS-NEXT";
const DEBUG_END1 = "APXS-END1";
const DEBUG_END2 = "APXS-END2";
const DEBUG_CODES = [DEBUG_NEXT, DEBUG_END1, DEBUG_END2];

const CASE01_RECS = [
  "rec-drop-record", "rec-call-record", "rec-audio-stems", "rec-timeline",
  "rec-n9rtz-profile", "rec-n9rtz-conv",
];
const CASE02_RECS = [
  "rec-luvisdrug-profile", "rec-note-1", "rec-note-2", "rec-note-3", "rec-note-4",
  "rec-luvis-audit", "rec-hz-vendor", "rec-hz-fund", "rec-rules",
];
const CASE03_RECS = ["rec-shio-profile", "rec-playlist", "rec-cold-backup"];
const CASE04_RECS = ["rec-qa-1", "rec-qa-2", "rec-qa-3", "rec-qa-4", "rec-accident", "rec-aka0-archive", "rec-identity-check"];
const LEGACY_NOTE_IDS = ["rec-note-1", "rec-note-2", "rec-note-3", "rec-note-4"];

function withRecs(g: GameState, ids: string[]): GameState {
  const openedRecords = [...g.openedRecords];
  for (const id of ids) {
    if (!openedRecords.includes(id)) openedRecords.push(id);
  }
  return { ...g, openedRecords };
}

/** 调试：完成当前最靠前的一个未完成阶段，返回新状态与提示 */
function debugNextCase(g: GameState): { state: GameState; msg: string } {
  if (g.case01 !== "done") {
    return {
      state: { ...withRecs(g, CASE01_RECS), case01: "done", case01Timeline: true, case01Stems: true },
      msg: "CASE 01「已读不回」已完成，进入 CASE 02。",
    };
  }
  if (g.case02 !== "done") {
    return {
      state: { ...withRecs(g, CASE02_RECS), case02: "done", luvisNotes: [...LEGACY_NOTE_IDS], luvisLogin: false },
      msg: "CASE 02「已注销」已完成，进入 CASE 03。",
    };
  }
  if (g.case03 !== "done") {
    return {
      state: { ...withRecs(g, CASE03_RECS), case03: "done" },
      msg: "CASE 03「冷备份」已完成，进入 CASE 04。",
    };
  }
  if (!g.aka0Confirmed) {
    return {
      state: { ...withRecs(g, CASE04_RECS), aka0Confirmed: true },
      msg: "Aka-0 身份复核已完成（隐藏复核页视为已通过）。",
    };
  }
  if (!g.identityCheck) {
    return {
      state: { ...withRecs(g, ["rec-identity-check"]), identityCheck: true },
      msg: "账号来源人工校验已完成。",
    };
  }
  if (!g.memoryBlocked) {
    return {
      state: { ...g, memoryBlocked: true },
      msg: "记忆覆盖已阻断，全部调查完成。可在账号安全中心选择结局。",
    };
  }
  return { state: g, msg: "全部阶段均已完成，可在账号安全中心选择结局。", };
}

/** 调试：补全全部调查前置并直接进入指定结局 */
function debugEndGame(g: GameState, good: boolean): GameState {
  const base: GameState = {
    ...g,
    case01: "done",
    case01Timeline: true,
    case01Stems: true,
    case02: "done",
    luvisNotes: [...LEGACY_NOTE_IDS],
    luvisLogin: false,
    case03: "done",
    aka0Confirmed: true,
    identityCheck: true,
    memoryBlocked: true,
  };
  const s = withRecs(base, [...CASE01_RECS, ...CASE02_RECS, ...CASE03_RECS, ...CASE04_RECS]);
  s.ending = good ? "good" : "bad";
  return s;
}

export default function Page() {
  const [game, setGame] = useState<GameState>(() => readSavedGame());
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined" ? { name: "wake" } : parseRoute(window.location.hash)
  );
  const [loginAccount, setLoginAccount] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginFlash, setLoginFlash] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSearch, setLastSearch] = useState("");
  const [survPending, setSurvPending] = useState<string | null>(null);
  const [survCount, setSurvCount] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCamTest, setShowCamTest] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState<string | null>(null);
  const voiceRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [debugNotice, setDebugNotice] = useState("");
  const [legacyPopupHint, setLegacyPopupHint] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const survTimerRef = useRef<number | null>(null);
  const survIntervalRef = useRef<number | null>(null);
  const welcomeTimerRef = useRef<number | null>(null);
  const prevOpenedRef = useRef<string[] | null>(null);

  const applyRoute = useCallback((r: Route) => {
    window.location.hash = routeToHash(r);
    setRoute(r);
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* 跨窗口同步：本地备份线索页（#/legacy 新窗口）写回存档后，主窗口自动刷新状态 */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVE_KEY || e.key === null) {
        setGame(readSavedGame());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...game, lastRoute: routeToHash(route) }));
    } catch {
      /* 存储不可用时静默 */
    }
  }, [game, route]);

  useEffect(() => {
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight });
  }, [route]);

  /* 打开会话后标记已读（未读红点消失，避免与新消息混淆） */
  useEffect(() => {
    if (route.name === "chat") {
      const convId = route.convId;
      if (!game.readConvs.includes(convId)) {
        setGame((g) =>
          g.readConvs.includes(convId) ? g : { ...g, readConvs: [...g.readConvs, convId] }
        );
      }
    }
  }, [route, game.readConvs]);

  /* 新证据写入调查台账时播放一次独立的低音确认提示；刷新/恢复旧存档不重复播放 */
  useEffect(() => {
    const prev = prevOpenedRef.current;
    prevOpenedRef.current = game.openedRecords;
    if (prev === null) return; // 首次挂载（含刷新恢复）不播放
    const added = game.openedRecords.filter((id) => !prev.includes(id));
    const hasCaseEvidence = added.some((id) => {
      const rec = RECORDS[id];
      return rec && rec.chapter !== "meta";
    });
    if (hasCaseEvidence) playEvidenceConfirm();
  }, [game.openedRecords]);

  /* 监视演出：检索期间反复追加「没有找到完全匹配的记录」 */
  useEffect(() => {
    if (!survPending) {
      setSurvCount(0);
      return;
    }
    setSurvCount(0);
    survIntervalRef.current = window.setInterval(() => {
      setSurvCount((c) => (c < 5 ? c + 1 : c));
    }, 420);
    return () => {
      if (survIntervalRef.current) window.clearInterval(survIntervalRef.current);
    };
  }, [survPending]);

  /* 首次登录信息窗：全新存档进入首页后约 3 秒安静，再播放一次消息提示音并弹出摘要 */
  useEffect(() => {
    const fresh = !game.welcomeShown && game.openedRecords.length === 0 && game.case01 === "none";
    if (route.name === "home" && game.loggedIn && fresh) {
      welcomeTimerRef.current = window.setTimeout(() => setShowWelcome(true), 3000);
      return () => {
        if (welcomeTimerRef.current) window.clearTimeout(welcomeTimerRef.current);
      };
    }
  }, [route.name, game.loggedIn, game.welcomeShown, game.openedRecords.length, game.case01]);

  useEffect(
    () => () => {
      if (survTimerRef.current) window.clearTimeout(survTimerRef.current);
      if (survIntervalRef.current) window.clearInterval(survIntervalRef.current);
      if (welcomeTimerRef.current) window.clearTimeout(welcomeTimerRef.current);
    },
    []
  );

  const openRecord = useCallback((recId: string) => {
    setGame((g) => {
      if (g.openedRecords.includes(recId)) return g;
      const openedRecords = [...g.openedRecords, recId];
      const next = { ...g, openedRecords };
      // 三份 CASE 01 材料全部打开后，解锁「事故夜时间线」谜题阶段
      if (
        next.case01 === "none" &&
        ["rec-drop-record", "rec-call-record", "rec-audio-stems"].every((id) => openedRecords.includes(id))
      ) {
        next.case01 = "puzzles";
      }
      return next;
    });
  }, []);

  /** 完成一个 CASE 01 谜题后推进章节状态 */
  const finishCase01Puzzle = useCallback((puzzle: "timeline" | "stems") => {
    setGame((g) => {
      const next = { ...g };
      if (puzzle === "timeline") next.case01Timeline = true;
      if (puzzle === "stems") next.case01Stems = true;
      if (next.case01 === "puzzles" && next.case01Timeline && next.case01Stems) {
        next.case01 = "done";
      }
      return next;
    });
  }, []);

  /** 打开 LuvisDrug 本地笔记；读完四篇触发身份侦测崩坏演出 */
  const openLegacyNote = useCallback(
    (recId: string) => {
      const nextNotes = game.luvisNotes.includes(recId)
        ? game.luvisNotes
        : [...game.luvisNotes, recId];
      openRecord(recId);
      setGame((g) => ({
        ...g,
        luvisNotes: nextNotes,
        // 章节只前进不后退：CASE 02 已完成后重读笔记，不得把 case02 降回 partial
        //（否则检索门槛会突然重新锁死，出现「第一次能搜到、第二次变成未解锁」）
        case02: g.case02 === "done" ? "done" : "partial",
      }));
      if (nextNotes.length >= LEGACY_NOTES.length && game.case02 !== "done") {
        window.setTimeout(() => applyRoute({ name: "breach" }), 600);
      }
    },
    [applyRoute, openRecord, game.luvisNotes, game.case02]
  );

  /** 崩坏演出结束：断开残留账号，返回登录页重新登录 AkaneRei（流程文档 §2.5） */
  const escapeBreach = useCallback(() => {
    setGame((g) => ({ ...g, luvisLogin: false, case02: "done", loggedIn: false }));
    applyRoute({ name: "login" });
  }, [applyRoute]);

  const goTo = useCallback(
    (r: Route) => {
      if (r.name === "article" && RECORDS[r.recId]) openRecord(r.recId);
      applyRoute(r);
    },
    [applyRoute, openRecord]
  );

  /** 汐泊诺思资料卡动态标题/摘要：歌单解锁前掩码为「汐○」，解锁后显示完整姓名（§3.1/§3.2） */
  const shioRecord = (rec: GameRecord): GameRecord => {
    if (rec.id !== "rec-shio-profile") return rec;
    const unmasked = game.openedRecords.includes("rec-playlist");
    return {
      ...rec,
      title: unmasked ? "汐泊诺思 资料卡" : "汐○ 资料卡",
      snippet: unmasked ? "姓名：汐泊诺思（已解除掩码）。状态：刚刚在线。" : rec.snippet,
    };
  };

  /* ---------- 登录 ---------- */

  const tryLogin = () => {
    if (loginAccount.trim() === "AkaneRei" && loginPassword.trim() === "0408") {
      setLoginError("");
      setLoginFlash(true);
      window.setTimeout(() => {
        setLoginFlash(false);
        setGame((g) => ({ ...g, loggedIn: true, loopHint: false }));
        applyRoute({ name: "home" });
      }, 620);
    } else {
      setLoginError("账号或密码不正确。");
    }
  };

  const forgetAll = () => {
    clearLocalData();
    setGame({ ...initialGame });
    setConfirmReset(false);
    setLoginAccount("");
    setLoginPassword("");
    setLoginError("");
    window.location.hash = "#/wake";
    setRoute({ name: "wake" });
  };

  /* ---------- 检索 ---------- */

  const doSearch = (raw: string) => {
    const q = raw.trim();
    setSearchQuery(q);
    if (!q) {
      setLastSearch("");
      return;
    }
    // 调试模式后门
    const up = q.toUpperCase();
    if (up === "TEST-CAM") {
      // TEST-CAM：请求摄像头权限并显示实时画面（调试用）
      setLastSearch("");
      setSurvPending(null);
      setShowCamTest(true);
      return;
    }
    if (DEBUG_CODES.includes(up)) {
      setLastSearch("");
      setSurvPending(null);
      if (up === DEBUG_NEXT) {
        const { state, msg } = debugNextCase(game);
        setGame(state);
        setDebugNotice(`调试模式：${msg}`);
        applyRoute({ name: "home" });
      } else {
        const good = up === DEBUG_END1;
        setGame(debugEndGame(game, good));
        setDebugNotice(`调试模式：已触发${good ? "好结局「已离线」" : "坏结局「重新登录」"}。`);
        applyRoute({ name: "ending" });
      }
      return;
    }
    const hit = SURVEILLANCE_TERMS.find((t) => q.includes(t));
    if (hit) {
      // Aka-0：人工复核提交后，精确检索只返回《Aka-0 账号身份复核归档》
      if (hit === "Aka-0" && game.aka0Confirmed) {
        setSurvPending(null);
        setLastSearch(q);
        return;
      }
      // 监视演出：先反复追加「没有找到完全匹配的记录」，再被灰色波形接管
      setLastSearch("");
      setSurvPending(hit);
      if (survTimerRef.current) window.clearTimeout(survTimerRef.current);
      survTimerRef.current = window.setTimeout(() => {
        setSurvPending(null);
        applyRoute({ name: "surveillance", source: hit });
        setGame((g) => ({
          ...g,
          surveillanceSeen: { ...g.surveillanceSeen, [hit]: true },
        }));
      }, 2800);
      return;
    }
    setSurvPending(null);
    setLastSearch(q);
  };

  const searchResults = useMemo(() => {
    if (!lastSearch) return null;
    const q = lastSearch;
    const lower = q.toLowerCase();
    // 大小写不敏感匹配
    const matches = SEARCH_INDEX.filter((e) =>
      e.terms.some((t) => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower))
    );
    const recs = matches
      .map((e) => RECORDS[e.recId])
      .filter((r) => game.ending === "good" || !r.require || r.require(game));
    if (recs.length === 0) {
      if (matches.length > 0) {
        // 命中了索引但全部被章节门槛锁定：给出解锁提示，而非「没有找到」
        return {
          kind: "locked" as const,
          q,
          lockedItems: matches.map((e) => {
            const rec = RECORDS[e.recId];
            return {
              // 标题走姓名掩码：档案仍被封锁时不得泄露「汐泊诺思」等完整姓名
              title: maskName(rec.title, game),
              hint: rec.unlockHint,
            };
          }),
        };
      }
      return { kind: "empty" as const, q };
    }
    return { kind: "results" as const, q, recs };
  }, [lastSearch, game]);

  /* 初次挂载：校验存档状态与当前 hash 是否允许（刷新/恢复场景），不允许则改写 hash */
  useEffect(() => {
    const guard = () => {
      const r = parseRoute(window.location.hash);
      if (r.name === "surveillance" || r.name === "breach" || r.name === "legacyWindow") return;
      if (!game.wakeDone && r.name !== "wake") {
        window.location.hash = "#/wake";
        return;
      }
      if (!game.loggedIn && r.name !== "wake" && r.name !== "login") {
        window.location.hash = "#/login";
        return;
      }
      if (game.loggedIn && (r.name === "wake" || r.name === "login")) {
        window.location.hash = "#/app/home";
        return;
      }
      if (r.name === "legacy" && (!game.luvisLogin || game.case02 === "done")) {
        window.location.hash = "#/app/home";
        return;
      }
      if (r.name === "review" && (!reviewReady(game) || game.aka0Confirmed)) {
        window.location.hash = "#/app/home";
        return;
      }
      if (r.name === "ending" && !endingAvailable(game)) {
        window.location.hash = "#/app/home";
        return;
      }
      if (r.name === "completion" && game.ending !== "good") {
        window.location.hash = "#/app/home";
      }
    };
    const t = window.setTimeout(guard, 0);
    return () => window.clearTimeout(t);
  }, [game]);

  /* ---------- 渲染 ---------- */

  const renderWake = () => (
    <div className="opening">
      <div className="opening-phone" aria-hidden="true">
        <div className="opening-scene">
          <div className="opening-msg">
            <div className="bubble them">
              <span className="sender">全员群 · APXS</span>
              楼下新开的奶茶店第二杯半价，有人拼单吗？
            </div>
          </div>
          <div className="opening-msg">
            <div className="bubble them">
              <span className="sender">全员群 · Rtwyzz</span>
              路过。你们不觉得最近群里的时间都不对劲吗
            </div>
          </div>
          <div className="opening-msg">
            <div className="bubble me">哈哈哈你们别闹了</div>
          </div>
        </div>
        <div className="opening-share">
          <div className="share-icon">🎵</div>
          <div className="share-meta">
            <b>汐○ 分享了歌单</b>
            <span>汐泊与零的歌单 · 14 首 · 「如果有一天你不再上线，我会把歌单听完。」</span>
          </div>
        </div>
        <div className="opening-call">
          <div className="avatar">N</div>
          <div className="call-meta">
            <b>N9Rtz</b>
            <span>00:04:08 · 通话中 · 深夜语音</span>
          </div>
        </div>
      </div>
      <div className="opening-copy">
        人总以为，<b>连接</b>会一直在线。<br />
        直到某天凌晨，一条消息发出后，<b>永远停在 04:08</b>。<br />
        你睁开眼，手机还亮着。
      </div>
      <button
        className="primary-button"
        onClick={() => {
          setGame((g) => ({ ...g, wakeDone: true }));
          applyRoute({ name: "login" });
        }}
      >
        醒来
      </button>
      <button
        className="opening-skip"
        onClick={() => {
          setGame((g) => ({ ...g, wakeDone: true }));
          applyRoute({ name: "login" });
        }}
      >
        跳过梦境
      </button>
    </div>
  );

  const renderLogin = () => (
    <div className={`login-screen ${loginFlash ? "login-flash" : ""}`}>
      {game.loopHint && (
        <div className="login-loop-hint">
          <b>轮回</b>
          <span>一切都像第一次一样。你缺少了什么？——真相，被留在了 04:08 之前。</span>
        </div>
      )}
      <div className="login-card card">
        <div className="traffic-lights" aria-hidden="true"><i /><i /><i /></div>
        <div className="login-logo">
          <div className="logo-mark">E</div>
          <h1>回声 ECHOS</h1>
        </div>
        <p className="login-sub">别让重要的人掉线。</p>
        <div className="login-field">
          <label htmlFor="account">账号</label>
          <input
            id="account"
            className="input-field"
            value={loginAccount}
            onChange={(e) => setLoginAccount(e.target.value)}
            placeholder="AkaneRei"
            autoComplete="username"
          />
        </div>
        <div className="login-field">
          <label htmlFor="password">密码</label>
          <input
            id="password"
            className="input-field"
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            placeholder="••••"
            autoComplete="current-password"
          />
        </div>
        <div className="login-error">{loginError}</div>
        <button className="primary-button" style={{ width: "100%" }} onClick={tryLogin}>
          登录
        </button>
        <div className="login-forget">
          <button className="text-button" onClick={() => setConfirmReset(true)}>
            遗忘 · 清除本机数据
          </button>
        </div>
      </div>
      {confirmReset && (
        <div className="confirm-overlay">
          <div className="confirm-box card">
            <h3>遗忘</h3>
            <p>将清除本机全部聊天记录与调查进度，回到初始状态。此操作无法撤销。</p>
            <div className="row">
              <button className="text-button" onClick={() => setConfirmReset(false)}>取消</button>
              <button className="primary-button danger-button" onClick={forgetAll}>确认遗忘</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSidebar = (active: string) => (
    <aside className="app-sidebar">
      <div className="traffic-lights" aria-hidden="true"><i /><i /><i /></div>
      <div className="app-brand">
        <div className="logo-mark">E</div>
        <h1>回声 ECHOS</h1>
      </div>
      <nav className="app-nav">
        <button className={active === "home" || active === "chat" ? "active" : ""} onClick={() => goTo({ name: "home" })}>
          <span className="nav-icon">💬</span>
          <span className="nav-label">消息</span>
        </button>
        <button className={active === "search" ? "active" : ""} onClick={() => goTo({ name: "search" })}>
          <span className="nav-icon">🔍</span>
          <span className="nav-label">检索</span>
        </button>
        <button className={active === "archive" ? "active" : ""} onClick={() => goTo({ name: "archive" })}>
          <span className="nav-icon">🗂</span>
          <span className="nav-label">调查台账</span>
        </button>
        <button className={active === "settings" ? "active" : ""} onClick={() => goTo({ name: "settings" })}>
          <span className="nav-icon">⚙</span>
          <span className="nav-label">账号安全</span>
        </button>
      </nav>
      <div className="app-account">
        <div>AkaneRei · 在线</div>
        <div style={{ marginTop: 4, fontFamily: "var(--mono)" }}>ECHOS v1.0.0 · 04:08</div>
        <button
          className="music-toggle"
          onClick={() => setGame((g) => ({ ...g, bgmMuted: !g.bgmMuted }))}
          aria-label="背景音乐开关"
        >
          {game.bgmMuted ? "🔇 背景音乐：关" : "🔊 背景音乐：开"}
        </button>
        <div className="volume-row">
          <span className="volume-label">音量</span>
          <input
            className="volume-slider"
            type="range"
            min={0}
            max={100}
            value={Math.round(game.bgmVolume * 100)}
            onChange={(e) => setGame((g) => ({ ...g, bgmVolume: Number(e.target.value) / 100 }))}
            aria-label="背景音乐音量"
          />
          <span className="volume-val">{Math.round(game.bgmVolume * 100)}%</span>
        </div>
      </div>
    </aside>
  );

  const renderHome = () => (
    <div className="conv-list">
      {debugNotice && (
        <div className="home-notices">
          <div className="home-notice">
            <b>调试模式</b>
            <span>{debugNotice}</span>
            <button className="text-button" onClick={() => setDebugNotice("")}>关闭提示</button>
          </div>
        </div>
      )}
      {legacyPopupHint && (
        <div className="home-notices">
          <div className="home-notice">
            <b>本地备份</b>
            <span>{legacyPopupHint}</span>
            <button className="text-button" onClick={() => setLegacyPopupHint("")}>知道了</button>
          </div>
        </div>
      )}
      {game.luvisLogin && (
        <div className="home-notices">
          <div className="home-notice warn">
            <b>残留账号会话中</b>
            <span>你仍停留在 LuvisDrug 的本地证据模块。断开前，平台看不到这里。</span>
            <button className="text-button" onClick={() => goTo({ name: "legacy" })}>返回残留账号 →</button>
          </div>
        </div>
      )}
      {game.case03 === "done" && !game.aka0Confirmed && !reviewReady(game) && (
        <div className="home-notices">
          <div className="home-notice warn">
            <b>继续调查：CASE 04 最后在线</b>
            <span>
              冷备份已破拆，四段质检回访的最后一段（平台客服记录）已解锁。
              检索「质检」读完四段回访、检索「事故」查看 4·08 坠亡事故通报，
              并确认已读过《连接与断开守则》（首页待办）。
              全部完成后，平台质检系统会发来仅当前会话可读的复核通知。
            </span>
            <button className="text-button" onClick={() => goTo({ name: "search" })}>去检索 →</button>
          </div>
        </div>
      )}
      {reviewReady(game) && !game.aka0Confirmed && (
        <div className="home-notices">
          <div className="home-notice warn">
            <b>系统通知</b>
            <span>有一条仅当前会话可读的复核请求。该请求不出现在检索索引中。</span>
            <button className="text-button" onClick={() => goTo({ name: "review" })}>打开复核请求 →</button>
          </div>
        </div>
      )}
      {game.aka0Confirmed && !game.identityCheck && (
        <div className="home-notices">
          <div className="home-notice">
            <b>待办：账号来源人工校验</b>
            <span>身份复核已完成。继续核对账号来源的原始字段。</span>
            <button className="text-button" onClick={() => goTo({ name: "article", recId: "rec-identity-check" })}>打开人工校验 →</button>
          </div>
        </div>
      )}
      {game.identityCheck && !game.memoryBlocked && (
        <div className="home-notices">
          <div className="home-notice warn">
            <b>异常：记忆覆盖进行中</b>
            <span>CONNECTION-KEEP 正在覆盖你的关系字段。返回人工校验页，用平台外原始记录阻断同步。</span>
            <button className="text-button" onClick={() => goTo({ name: "article", recId: "rec-identity-check" })}>继续阻断 →</button>
          </div>
        </div>
      )}
      {game.identityCheck && game.memoryBlocked && game.ending === "none" && (
        <div className="home-notices">
          <div className="home-notice warn">
            <b>04:08 强制退出倒计时</b>
            <span>平台已将账号降为只读，并预告 04:08 强制退出。你保留着「自己已死、朋友在等你下线」的关系记忆。</span>
          </div>
        </div>
      )}
      {endingAvailable(game) && game.ending === "none" && (
        <div className="home-notices">
          <div className="home-notice">
            <b>账号安全中心已开放注销</b>
            <span>调查已完整。可以提交全部证据并注销账号，或重新登录。</span>
            <button className="text-button" onClick={() => goTo({ name: "ending" })}>前往注销页 →</button>
          </div>
        </div>
      )}
      {game.ending === "good" && (
        <div className="home-notices">
          <div className="home-notice">
            <b>恭喜通关</b>
            <span>好结局「已离线」已归档。可以补读全部档案，也可以留下昵称进入个人通关页。</span>
            <div className="completion-entry">
              <input
                className="input-field"
                placeholder="昵称（可选）"
                value={game.nickname}
                onChange={(e) => setGame((g) => ({ ...g, nickname: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && goTo({ name: "completion" })}
                aria-label="昵称"
              />
              <button className="primary-button" onClick={() => goTo({ name: "completion" })}>进入通关页</button>
            </div>
          </div>
        </div>
      )}
      {game.case02 === "done" && (
        <div className="home-notices">
          <div className="home-notice warn">
            <b>待处理：平台通知</b>
            <span>《连接与断开守则》已被平台推送为待办。</span>
            <button className="text-button" onClick={() => goTo({ name: "article", recId: "rec-rules" })}>打开守则 →</button>
          </div>
          <div className="home-notice">
            <b>平台公告</b>
            <span>{shioName(game)}账号状态异常，已迁移至冷备份服务器。详见其会话。</span>
            <button className="text-button" onClick={() => goTo({ name: "chat", convId: "shio" })}>查看会话 →</button>
          </div>
        </div>
      )}
      <div className="conv-section">会话</div>
      {CONVS.map((c) => {
        const unread = c.unread && !game.readConvs.includes(c.id) ? c.unread : 0;
        return (
          <button
            key={c.id}
            className={`conv-item ${route.name === "chat" && route.convId === c.id ? "active" : ""}`}
            onClick={() => goTo({ name: "chat", convId: c.id })}
          >
            <div className={`conv-avatar ${c.kind === "ghost" ? "ghosty" : ""}`} style={c.kind === "ghost" ? undefined : { background: c.color }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.avatar ? <img src={assetPath(c.avatar)} alt="" className="conv-avatar-img" /> : c.initials}
            </div>
            <div className="conv-meta">
              <div className="row">
                <span className="name">{c.id === "shio" ? shioName(game) : c.name}</span>
                <span className="time">{c.time}</span>
              </div>
              <div className="preview">
                {unread ? <span className="unread">{c.preview}</span> : c.preview}
              </div>
            </div>
          {unread ? <div className="conv-badge">{unread}</div> : <span className={`status-tag ${c.statusClass ?? ""}`}>{c.kind === "ghost" ? "已注销" : c.kind === "bot" ? "服务号" : ""}</span>}
        </button>
        );
      })}
    </div>
  );

  const renderChat = (convId: string) => {
    const conv = CONVS.find((c) => c.id === convId);
    if (!conv) return <div className="chat-blank">会话不存在。</div>;
    let msgs: Msg[] = [];
    const headerStatus = conv.status;
    if (conv.id === "everyone") msgs = groupMessages(game.ending, shioName(game));
    if (conv.id === "n9rtz") msgs = n9rtzMessages(game.case01);
    if (conv.id === "shio") msgs = shioMessages(game.case02 === "done", game.case03 === "done", shioName(game));
    if (conv.id === "luvis") msgs = luvisMessages();
    if (conv.id === "echo-assist") msgs = echoAssistMessages(reviewReady(game) && !game.aka0Confirmed);
    const effectiveStatus =
      conv.id === "shio" && game.case03 === "done" ? "离线（用户主动）" : headerStatus;
    return (
      <div className="chat-wrap">
        <div className="chat-header">
          <div className="mini-avatar" style={conv.kind === "ghost" ? { background: "#cfd6de", color: "#7a828c" } : { background: conv.color }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {conv.avatar ? <img src={assetPath(conv.avatar)} alt="" className="conv-avatar-img" /> : conv.initials}
          </div>
          <div className="info">
            <b>{conv.id === "shio" ? shioName(game) : conv.name}</b>
            <span>{effectiveStatus}</span>
          </div>
        </div>
        <div className="chat-body" ref={chatBodyRef}>
          <div className="chat-date">2026-04-08</div>
          {msgs.map((m) => {
            if (m.kind === "divider") return <div key={m.id} className="chat-divider">{m.text}</div>;
            if (m.kind === "warn" || m.kind === "ghost") {
              return (
                <div key={m.id} className={`chat-system ${m.kind === "warn" ? "warn" : "ghost"}`}>
                  {m.text}
                </div>
              );
            }
            if (m.audio) {
              const isVoicePlaying = voicePlaying === m.id;
              return (
                <div key={m.id} className={`chat-msg ${m.from === "me" ? "me" : "them"}`}>
                  {m.from !== "me" && (
                    <div className="avatar" style={conv.kind === "ghost" ? { background: "#cfd6de", color: "#7a828c" } : { background: conv.color }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {conv.avatar ? <img src={assetPath(conv.avatar)} alt="" className="conv-avatar-img" /> : conv.initials}
                    </div>
                  )}
                  <div>
                    <div className={`voice-card ${m.kind === "abnormal" ? "abnormal" : ""}`}>
                      <button
                        className="voice-play"
                        onClick={() => {
                          const el = voiceRefs.current[m.id];
                          if (!el) return;
                          if (isVoicePlaying) {
                            el.pause();
                            setVoicePlaying(null);
                          } else {
                            if (voicePlaying) voiceRefs.current[voicePlaying]?.pause();
                            el.volume = game.bgmVolume;
                            void el.play().catch(() => setVoicePlaying(null));
                            setVoicePlaying(m.id);
                          }
                        }}
                        aria-label={isVoicePlaying ? "暂停语音" : "播放语音"}
                      >
                        {isVoicePlaying ? "❚❚" : "▶"}
                      </button>
                      <div className="voice-wave" aria-hidden="true">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                          <i key={i} className={isVoicePlaying ? "live" : ""} style={{ height: [12, 24, 36, 20, 30, 40, 16, 28][i] }} />
                        ))}
                      </div>
                      <div className="voice-meta">
                        <b>语音消息</b>
                        <span>{m.text}</span>
                      </div>
                      <audio
                        ref={(el) => { voiceRefs.current[m.id] = el; }}
                        src={assetPath(m.audio)}
                        onEnded={() => setVoicePlaying(null)}
                        preload="auto"
                      />
                    </div>
                    <div className="meta-line">
                      <span className="time">{m.time}</span>
                      {m.status === "read" && <span className="status">已读</span>}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`chat-msg ${m.from === "me" ? "me" : "them"}`}>
                {m.from !== "me" && (
                  <div className="avatar" style={conv.kind === "ghost" ? { background: "#cfd6de", color: "#7a828c" } : { background: conv.color }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {conv.avatar ? <img src={assetPath(conv.avatar)} alt="" className="conv-avatar-img" /> : conv.initials}
                  </div>
                )}
                <div>
                  <div className={`bubble ${m.kind === "abnormal" ? "abnormal" : ""}`}>
                    {m.name && <span className="sender">{m.name}</span>}
                    {m.text}
                  </div>
                  <div className="meta-line">
                    <span className="time">{m.time}</span>
                    {m.status === "read" && <span className="status">已读</span>}
                    {m.status === "unread" && <span className="status unread">未读</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="chat-input-bar">
          <input placeholder="输入消息…（本会话为只读档案）" disabled aria-label="消息输入（只读）" />
          <span className="mute">🔒</span>
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="search-wrap">
      <div className="search-box">
        <input
          className="input-field"
          placeholder="搜索聊天记录、联系人、关键词…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (survPending) {
              // 输入其他关键词即可中断监视演出
              setSurvPending(null);
              if (survTimerRef.current) window.clearTimeout(survTimerRef.current);
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && doSearch(searchQuery)}
          aria-label="搜索聊天记录"
        />
        <button className="primary-button" onClick={() => doSearch(searchQuery)}>检索</button>
      </div>
      <div className="search-note">不要按顺序读。按你怀疑的内容去找。</div>
      {survPending && (
        <div className="search-surv" key={survPending}>
          {Array.from({ length: survCount }).map((_, i) => (
            <p key={i} className="surv-line">没有找到完全匹配的记录。</p>
          ))}
          <p className="surv-typing">正在检索 {survPending} ……</p>
        </div>
      )}
      {!survPending && searchResults === null && <div className="search-hint">试试：N9Rtz、04:08、录音、LuvisDrug、汐○、事故</div>}
      {!survPending && searchResults?.kind === "empty" && (
        <div className="search-empty">
          没有找到与「{searchResults.q}」完全匹配的记录。<br />
          换一个词试试。
        </div>
      )}
      {!survPending && searchResults?.kind === "locked" && (
        <div className="search-empty locked">
          与「{searchResults.q}」相关的结果尚未解锁。<br />
          {searchResults.lockedItems.map((it) => (
            <div key={it.title}>
              🔒 {it.title}
              {it.hint ? `：${it.hint}` : "：需要先完成对应章节的调查"}
            </div>
          ))}
          <span className="search-lock-hint">档案会随调查进度逐步开放。完成后返回此页重新检索即可查看。</span>
        </div>
      )}
      {!survPending && searchResults?.kind === "results" && (
        <div className="search-results">
          {searchResults.recs.map((r) => {
            const rec = shioRecord(r);
            return (
              <button key={r.id} className="record-card" onClick={() => goTo({ name: "article", recId: r.id })}>
                <div className="rc-kind">{rec.kind}</div>
                <div className="rc-title">{rec.title}</div>
                <div className="rc-snippet">{rec.snippet}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderArticle = (recId: string) => {
    const rec = shioRecord(RECORDS[recId]);
    if (!rec) return <div className="chat-blank">档案不存在。</div>;
    const isLegacyNote = LEGACY_NOTES.includes(recId);
    return (
      <div className="article-wrap">
        <button className="text-button article-back" onClick={() => goTo(isLegacyNote ? { name: "legacy" } : { name: "search" })}>
          ← 返回{isLegacyNote ? "残留账号" : "检索"}
        </button>
        <div className="article-kind">{rec.kind}</div>
        <div className="article-title">{rec.title}</div>
        <div className="article-source">{rec.source}</div>
        <div className="article-body">
          {rec.body.map((p, i) => <p key={i}>{p}</p>)}
          {rec.fields && (
            <table className="field-table">
              <tbody>
                {rec.fields.map((f) => (
                  <tr key={f.k}>
                    <th>{f.k}</th>
                    <td className={f.abnormal ? "abnormal" : undefined}>{f.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {recId === "rec-timeline" && (
            <TimelineBoard done={game.case01Timeline} onDone={() => finishCase01Puzzle("timeline")} />
          )}
          {recId === "rec-audio-stems" && (
            <StemPuzzle done={game.case01Stems} onDone={() => finishCase01Puzzle("stems")} volume={game.bgmVolume} />
          )}
          {recId === "rec-luvisdrug-profile" && (
            game.case02 === "done" ? (
              <div className="puzzle-feedback right" style={{ marginTop: 14 }}>
                该残留账号已在身份侦测中断开。平台不再接受该凭据，本地证据模块已关闭。
              </div>
            ) : (
              <LegacyLogin
                done={game.luvisLogin}
                onSuccess={() => {
                  setGame((g) => ({ ...g, luvisLogin: true, case02: "partial" }));
                  applyRoute({ name: "legacy" });
                }}
                onOpenLegacyWindow={() => {
                  // 密码验证通过的同一手势内弹出本地备份线索页（新窗口）
                  try {
                    const url = `${window.location.pathname}#/legacy`;
                    const win = window.open(url, "_blank", "noopener");
                    if (!win) {
                      // 弹窗被拦截：正常提示，不用「调试模式」横幅（那不是调试入口触发的）
                      setLegacyPopupHint("本地备份窗口未能打开（浏览器拦截了弹窗）。无需处理——残留账号的资料仍可在当前页面继续查看。");
                    }
                  } catch {
                    /* 弹窗不可用时忽略，主窗口流程不受影响 */
                  }
                }}
              />
            )
          )}
          {recId === "rec-rules" && <RulesAppender />}
          {recId === "rec-playlist" && <PlaylistDetail volume={game.bgmVolume} />}
          {recId === "rec-shio-profile" && game.openedRecords.includes("rec-playlist") && (
            <div className="puzzle-feedback right" style={{ marginTop: 14 }}>
              歌单解锁后，资料卡姓名解除掩码：<b>汐泊诺思</b>（全拼：XIBONUOSI）。
            </div>
          )}
          {recId === "rec-cold-backup" && (
            <ColdBackup
              done={game.case03 === "done"}
              onSuccess={() => setGame((g) => ({ ...g, case03: "done" }))}
              volume={game.bgmVolume}
            />
          )}
          {recId === "rec-identity-check" && (
            <IdentityCheck
              identityDone={game.identityCheck}
              memoryDone={game.memoryBlocked}
              onIdentity={() => setGame((g) => ({ ...g, identityCheck: true }))}
              onMemory={() => setGame((g) => ({ ...g, memoryBlocked: true }))}
            />
          )}
        </div>
      </div>
    );
  };

  const renderArchive = () => {
    const caseMeta: { key: "case01" | "case02" | "case03" | "case04"; name: string; done: boolean }[] = [
      { key: "case01", name: "已读不回", done: game.case01 === "done" },
      { key: "case02", name: "已注销", done: game.case02 === "done" },
      { key: "case03", name: "冷备份", done: game.case03 === "done" },
      { key: "case04", name: "最后在线", done: game.aka0Confirmed },
    ];
    const byChapter = (chapter: string) =>
      (game.ending === "good"
        ? Object.values(RECORDS)
        : game.openedRecords.map((id) => RECORDS[id]).filter(Boolean)
      ).filter((r): r is GameRecord => Boolean(r) && r.chapter === chapter);
    return (
      <div className="archive-wrap">
        <h2 style={{ fontSize: 18 }}>调查台账</h2>
        <p className="search-hint" style={{ marginBottom: 18 }}>
          只有打开过的记录会出现在这里。章节名在对应推导完成后揭示。
          {game.ending === "good" && "（结局后补读模式：全部档案已开放，不改变已归档结局）"}
        </p>
        {caseMeta.map((c) => {
          const items = byChapter(c.key);
          return (
            <div className="archive-section" key={c.key}>
              <h3>{c.done ? c.name : <span className="lock">🔒 {c.name}</span>}</h3>
              <div className="archive-items">
                {items.length === 0 && <div className="archive-empty">（本章暂无已打开的记录）</div>}
                {items.map((r) => {
                  const rec = shioRecord(r);
                  return (
                    <button key={r.id} className="archive-item" onClick={() => goTo({ name: "article", recId: r.id })}>
                      <span className="ai-title">{rec.title}</span>
                      <span className="ai-meta">{rec.kind}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="archive-section">
          <h3>其他记录</h3>
          <div className="archive-items">
            {byChapter("meta").length === 0 && <div className="archive-empty">（暂无）</div>}
            {byChapter("meta").map((r) => {
              const rec = shioRecord(r);
              return (
                <button key={r.id} className="archive-item" onClick={() => goTo({ name: "article", recId: r.id })}>
                  <span className="ai-title">{rec.title}</span>
                  <span className="ai-meta">{rec.kind}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="archive-hint">
          提示：打开「通话中断记录」「通话记录」「夜间录音」后，检索「时间线」开始复原事件序列；在「夜间录音」页完成分轨净化。两项完成后 CASE 01 收束。
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="settings-wrap">
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>账号安全</h2>
      <div className="settings-card card">
        <h3>账号信息</h3>
        <div className="settings-row"><span className="k">账号</span><span className="v">AkaneRei</span></div>
        <div className="settings-row"><span className="k">创建日期</span><span className="v">2026-04-09</span></div>
        <div className="settings-row"><span className="k">状态</span><span className="v">在线 · 208 天未掉线</span></div>
        <div className="settings-row"><span className="k">云端同步</span><span className="v abnormal" style={{ color: "var(--danger)" }}>04:08 自动执行</span></div>
      </div>
      {game.case03 === "done" && !game.aka0Confirmed && !reviewReady(game) && (
        <div className="settings-card card">
          <h3>账号来源与同名主体复核</h3>
          <p>复核入口尚未开放。需先完成：检索「质检」读完四段回访、检索「事故」查看 4·08 坠亡事故通报，并已读《连接与断开守则》。</p>
        </div>
      )}
      {reviewReady(game) && !game.aka0Confirmed && (
        <div className="settings-card card">
          <h3>账号来源与同名主体复核</h3>
          <p>
            系统把「注销申请」转派给被核查的账号本人，并警告不得建立私人关系。
            复核请求仅当前会话可读，未收录于检索索引。
          </p>
          <button className="primary-button" style={{ width: "100%" }} onClick={() => goTo({ name: "review" })}>
            进入复核 →
          </button>
        </div>
      )}
      {game.aka0Confirmed && (
        <div className="settings-card card">
          <h3>账号来源与同名主体复核</h3>
          <p>已完成。复核归档只读保存了人工判断及其依据。</p>
          <button className="text-button" onClick={() => goTo({ name: "article", recId: "rec-aka0-archive" })}>
            查看《Aka-0 账号身份复核归档》 →
          </button>
        </div>
      )}
      <div className="settings-card card">
        <h3>注销账号</h3>
        <p>
          提交全部证据并注销账号，或只处理今天的未读、重新登录进入下一个循环。
          {!endingAvailable(game) && "当前调查未完成，注销入口尚未开放。"}
        </p>
        <button
          className="primary-button"
          style={{ width: "100%" }}
          disabled={!endingAvailable(game)}
          onClick={() => applyRoute({ name: "ending" })}
        >
          {endingAvailable(game) ? "注销账号" : "注销账号（未开放 · 需完成调查）"}
        </button>
      </div>
      <div className="settings-card card">
        <h3>数据</h3>
        <div className="settings-row">
          <span className="k">背景音乐</span>
          <button className="text-button" onClick={() => setGame((g) => ({ ...g, bgmMuted: !g.bgmMuted }))}>
            {game.bgmMuted ? "已静音 · 点击开启" : "开启中 · 点击静音"}
          </button>
        </div>
        <div className="settings-row">
          <span className="k">全局音量</span>
          <div className="volume-row" style={{ width: 200, flex: "none" }}>
            <input
              className="volume-slider"
              type="range"
              min={0}
              max={100}
              value={Math.round(game.bgmVolume * 100)}
              onChange={(e) => setGame((g) => ({ ...g, bgmVolume: Number(e.target.value) / 100 }))}
              aria-label="全局音量"
            />
            <span className="volume-val">{Math.round(game.bgmVolume * 100)}%</span>
          </div>
        </div>
        <p>清除本机全部聊天记录与调查进度。该操作是故意的彻底重置。</p>
        <button className="primary-button danger-button" style={{ width: "100%" }} onClick={() => setConfirmReset(true)}>
          遗忘 · 清除本机数据
        </button>
      </div>
      {confirmReset && (
        <div className="confirm-overlay">
          <div className="confirm-box card">
            <h3>遗忘</h3>
            <p>将清除本机全部进度并回到初始状态。此操作无法撤销。</p>
            <div className="row">
              <button className="text-button" onClick={() => setConfirmReset(false)}>取消</button>
              <button className="primary-button danger-button" onClick={forgetAll}>确认遗忘</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSurveillance = (source: string) => (
    <SurveillanceScreen
      source={source}
      onExit={() => {
        setLastSearch("");
        applyRoute({ name: "search" });
      }}
    />
  );

  const renderLegacy = () => (
    <div className="app-shell">
      {renderSidebar("archive")}
      <main className="app-main">
        <div className="app-topbar">
          <h2>残留账号</h2>
          <span className="sub">LuvisDrug · 本地证据模块</span>
        </div>
        <div className="app-content">
          <LegacyAccount
            notesRead={game.luvisNotes}
            onOpenNote={(id) => {
              goTo({ name: "article", recId: id });
              openLegacyNote(id);
            }}
          />
        </div>
      </main>
    </div>
  );

  const renderBreach = () => (
    <Breach
      onEscape={() => {
        escapeBreach();
      }}
    />
  );

  const renderReview = () => (
    <div className="app-shell">
      {renderSidebar("archive")}
      <main className="app-main">
        <div className="app-topbar">
          <h2>复核请求</h2>
          <span className="sub">仅当前会话可读</span>
        </div>
        <div className="app-content">
          <ReviewPage
            done={game.aka0Confirmed}
            onDone={() => {
              setGame((g) => ({ ...g, aka0Confirmed: true }));
              applyRoute({ name: "home" });
            }}
          />
        </div>
      </main>
    </div>
  );

  const renderEnding = () => (
    <EndingScreen
      ending={game.ending}
      onChoose={(e) => setGame((g) => ({ ...g, ending: e }))}
      onBackHome={() => {
        // 结局返回：直接回到最开始登录界面（坏结局触发轮回提示）
        setGame((g) => ({ ...g, loggedIn: false, loopHint: g.ending === "bad" }));
        applyRoute({ name: "login" });
      }}
      onViewTruth={() => {
        // 真结局：前往全案真相页。
        // 用相对当前页面目录跳转（兼容 GitHub Pages 子路径、根域与本地预览）；
        // 确保目录以 "/" 结尾，避免无尾斜杠 URL 拼出错误路径。
        const path = window.location.pathname;
        const dir = path.endsWith("/") ? path : path.substring(0, path.lastIndexOf("/") + 1);
        window.location.href = `${dir}truth`;
      }}
    />
  );

  const renderCompletion = () => (
    <div className="app-shell">
      {renderSidebar("archive")}
      <main className="app-main">
        <div className="app-content">
          <CompletionPage
            nickname={game.nickname}
            openedCount={game.openedRecords.length}
            totalCount={Object.keys(RECORDS).length}
            gameFinished={game.gameFinished}
            onGameFinish={() => setGame((g) => (g.gameFinished ? g : { ...g, gameFinished: true }))}
            goTo={goTo}
          />
        </div>
      </main>
    </div>
  );

  let body: ReactNode;
  switch (route.name) {
    case "wake":
      body = renderWake();
      break;
    case "login":
      body = renderLogin();
      break;
    case "surveillance":
      body = renderSurveillance(route.source);
      break;
    case "home":
      body = (
        <div className="app-shell">
          {renderSidebar("home")}
          <main className="app-main">
            <div className="app-topbar"><h2>消息</h2><span className="sub">04:08 · 云端同步完成</span></div>
            <div className="app-content">{renderHome()}</div>
          </main>
        </div>
      );
      break;
    case "chat":
      body = (
        <div className="app-shell">
          {renderSidebar("chat")}
          <main className="app-main">
            {renderChat(route.convId)}
          </main>
        </div>
      );
      break;
    case "search":
      body = (
        <div className="app-shell">
          {renderSidebar("search")}
          <main className="app-main">
            <div className="app-topbar"><h2>检索</h2><span className="sub">全平台聊天记录</span></div>
            <div className="app-content">{renderSearch()}</div>
          </main>
        </div>
      );
      break;
    case "article":
      body = (
        <div className="app-shell">
          {renderSidebar("search")}
          <main className="app-main">
            <div className="app-content">{renderArticle(route.recId)}</div>
          </main>
        </div>
      );
      break;
    case "archive":
      body = (
        <div className="app-shell">
          {renderSidebar("archive")}
          <main className="app-main">
            <div className="app-topbar"><h2>调查台账</h2><span className="sub">已打开的记录</span></div>
            <div className="app-content">{renderArchive()}</div>
          </main>
        </div>
      );
      break;
    case "settings":
      body = (
        <div className="app-shell">
          {renderSidebar("settings")}
          <main className="app-main">
            <div className="app-topbar"><h2>账号安全</h2><span className="sub">AkaneRei</span></div>
            <div className="app-content">{renderSettings()}</div>
          </main>
        </div>
      );
      break;
    case "legacy":
      body = renderLegacy();
      break;
    case "review":
      body = renderReview();
      break;
    case "ending":
      body = renderEnding();
      break;
    case "completion":
      body = renderCompletion();
      break;
    case "breach":
      body = renderBreach();
      break;
    case "legacyWindow":
      body = <LegacyWindowPage />;
      break;
  }

  const routeKey =
    route.name +
    (route.name === "chat" ? `-${route.convId}` : "") +
    (route.name === "article" ? `-${route.recId}` : "") +
    (route.name === "surveillance" ? `-${route.source}` : "");

  return (
    <>
      <div className="route-view" key={routeKey}>
        {body}
      </div>
      {showWelcome && (
        <WelcomeInfoWindow
          onClose={() => {
            setShowWelcome(false);
            setGame((g) => ({ ...g, welcomeShown: true }));
          }}
        />
      )}
      {showCamTest && <CameraTest onClose={() => setShowCamTest(false)} />}
      {route.name !== "legacyWindow" && <AudioLayer game={game} />}
    </>
  );
}
