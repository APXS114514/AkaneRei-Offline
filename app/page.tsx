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
  PLAYLIST_TRACKS,
  RECORDS,
  SEARCH_INDEX,
  SURVEILLANCE_TERMS,
  echoAssistMessages,
  endingAvailable,
  groupMessages,
  luvisMessages,
  n9rtzMessages,
  reviewReady,
  shioMessages,
} from "./game/data";
import {
  AudioLayer,
  Breach,
  ColdBackup,
  CompletionPage,
  EndingScreen,
  IdentityCheck,
  LEGACY_NOTES,
  LegacyAccount,
  LegacyLogin,
  ReviewPage,
  RulesAppender,
  StemPuzzle,
  TimelineBoard,
} from "./game/components";

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
  const [survEscapeHits, setSurvEscapeHits] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const applyRoute = useCallback((r: Route) => {
    window.location.hash = routeToHash(r);
    setRoute(r);
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
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
      setGame((g) => ({ ...g, luvisNotes: nextNotes, case02: "partial" }));
      if (nextNotes.length >= LEGACY_NOTES.length && game.case02 !== "done") {
        window.setTimeout(() => applyRoute({ name: "breach" }), 600);
      }
    },
    [applyRoute, openRecord, game.luvisNotes, game.case02]
  );

  /** 崩坏演出结束：断开残留账号，回到 AkaneRei 主界面 */
  const escapeBreach = useCallback(() => {
    setGame((g) => ({ ...g, luvisLogin: false, case02: "done" }));
    applyRoute({ name: "home" });
  }, [applyRoute]);

  const goTo = useCallback(
    (r: Route) => {
      if (r.name === "article" && RECORDS[r.recId]) openRecord(r.recId);
      applyRoute(r);
    },
    [applyRoute, openRecord]
  );

  /* ---------- 登录 ---------- */

  const tryLogin = () => {
    if (loginAccount.trim() === "AkaneRei" && loginPassword.trim() === "0408") {
      setLoginError("");
      setLoginFlash(true);
      window.setTimeout(() => {
        setLoginFlash(false);
        setGame((g) => ({ ...g, loggedIn: true }));
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
    setLastSearch(q);
    setSearchQuery(q);
    if (!q) return;
    const hit = SURVEILLANCE_TERMS.find((t) => q.includes(t));
    if (hit) {
      applyRoute({ name: "surveillance", source: hit });
      setGame((g) => ({
        ...g,
        surveillanceSeen: { ...g.surveillanceSeen, [hit]: true },
      }));
      return;
    }
    setLastSearch(q);
  };

  const searchResults = useMemo(() => {
    if (!lastSearch) return null;
    const q = lastSearch;
    const recs = SEARCH_INDEX.filter((e) => e.terms.some((t) => q.includes(t) || t.includes(q)))
      .map((e) => RECORDS[e.recId])
      .filter((r) => game.ending === "good" || !r.require || r.require(game));
    if (recs.length === 0) {
      return { kind: "empty" as const, q };
    }
    return { kind: "results" as const, q, recs };
  }, [lastSearch, game]);

  /* 初次挂载：校验存档状态与当前 hash 是否允许（刷新/恢复场景），不允许则改写 hash */
  useEffect(() => {
    const guard = () => {
      const r = parseRoute(window.location.hash);
      if (r.name === "surveillance" || r.name === "breach") return;
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
      if (r.name === "legacy" && !game.luvisLogin) {
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
        <div className="opening-msg">
          <div className="bubble them">
            <span className="sender">汐泊诺思</span>
            今天也是第一次见你。
          </div>
        </div>
        <div className="opening-msg">
          <div className="bubble me">哈哈哈你们别闹了</div>
        </div>
        <div className="opening-msg">
          <div className="bubble them">
            <span className="sender">N9Rtz</span>
            夜深了。通宵语音吗？
          </div>
        </div>
        <div className="opening-call">
          <div className="avatar">N</div>
          <div className="call-meta">
            <b>N9Rtz</b>
            <span>00:04:08 · 通话中</span>
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
      <div className="login-card card">
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
      </div>
    </aside>
  );

  const renderHome = () => (
    <div className="conv-list">
      {game.luvisLogin && (
        <div className="home-notices">
          <div className="home-notice warn">
            <b>残留账号会话中</b>
            <span>你仍停留在 LuvisDrug 的本地证据模块。断开前，平台看不到这里。</span>
            <button className="text-button" onClick={() => goTo({ name: "legacy" })}>返回残留账号 →</button>
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
            <span>汐泊诺思账号状态异常，已迁移至冷备份服务器。详见其会话。</span>
            <button className="text-button" onClick={() => goTo({ name: "chat", convId: "shio" })}>查看会话 →</button>
          </div>
        </div>
      )}
      <div className="conv-section">会话</div>
      {CONVS.map((c) => (
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
              <span className="name">{c.name}</span>
              <span className="time">{c.time}</span>
            </div>
            <div className="preview">
              {c.unread ? <span className="unread">{c.preview}</span> : c.preview}
            </div>
          </div>
          {c.unread ? <div className="conv-badge">{c.unread}</div> : <span className={`status-tag ${c.statusClass ?? ""}`}>{c.kind === "ghost" ? "已注销" : c.kind === "bot" ? "服务号" : ""}</span>}
        </button>
      ))}
    </div>
  );

  const renderChat = (convId: string) => {
    const conv = CONVS.find((c) => c.id === convId);
    if (!conv) return <div className="chat-blank">会话不存在。</div>;
    let msgs: Msg[] = [];
    const headerStatus = conv.status;
    if (conv.id === "everyone") msgs = groupMessages();
    if (conv.id === "n9rtz") msgs = n9rtzMessages(game.case01);
    if (conv.id === "shio") msgs = shioMessages(game.case02 === "done", game.case03 === "done");
    if (conv.id === "luvis") msgs = luvisMessages();
    if (conv.id === "echo-assist") msgs = echoAssistMessages();
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
            <b>{conv.name}</b>
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
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch(searchQuery)}
          aria-label="搜索聊天记录"
        />
        <button className="primary-button" onClick={() => doSearch(searchQuery)}>检索</button>
      </div>
      <div className="search-note">不要按顺序读。按你怀疑的内容去找。</div>
      {searchResults === null && <div className="search-hint">试试：N9Rtz、04:08、录音、LuvisDrug、汐泊诺思、事故</div>}
      {searchResults?.kind === "empty" && (
        <div className="search-empty">
          没有找到与「{searchResults.q}」完全匹配的记录。<br />
          换一个词试试。
        </div>
      )}
      {searchResults?.kind === "results" && (
        <div className="search-results">
          {searchResults.recs.map((r) => (
            <button key={r.id} className="record-card" onClick={() => goTo({ name: "article", recId: r.id })}>
              <div className="rc-kind">{r.kind}</div>
              <div className="rc-title">{r.title}</div>
              <div className="rc-snippet">{r.snippet}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderArticle = (recId: string) => {
    const rec = RECORDS[recId];
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
            <StemPuzzle done={game.case01Stems} onDone={() => finishCase01Puzzle("stems")} />
          )}
          {recId === "rec-luvisdrug-profile" && (
            <LegacyLogin
              done={game.luvisLogin}
              onSuccess={() => {
                setGame((g) => ({ ...g, luvisLogin: true, case02: "partial" }));
                applyRoute({ name: "legacy" });
              }}
            />
          )}
          {recId === "rec-rules" && <RulesAppender />}
          {recId === "rec-playlist" && (
            <div className="playlist-tracks">
              {PLAYLIST_TRACKS.map((t) => (
                <div key={t} className="playlist-track">{t}</div>
              ))}
            </div>
          )}
          {recId === "rec-shio-profile" && game.openedRecords.includes("rec-playlist") && (
            <div className="puzzle-feedback right" style={{ marginTop: 14 }}>
              歌单解锁后，资料卡姓名解除掩码：<b>汐泊诺思</b>（全拼：XIBONUOSI）。
            </div>
          )}
          {recId === "rec-cold-backup" && (
            <ColdBackup
              done={game.case03 === "done"}
              onSuccess={() => setGame((g) => ({ ...g, case03: "done" }))}
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
                {items.map((r) => (
                  <button key={r.id} className="archive-item" onClick={() => goTo({ name: "article", recId: r.id })}>
                    <span className="ai-title">{r.title}</span>
                    <span className="ai-meta">{r.kind}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div className="archive-section">
          <h3>其他记录</h3>
          <div className="archive-items">
            {byChapter("meta").length === 0 && <div className="archive-empty">（暂无）</div>}
            {byChapter("meta").map((r) => (
              <button key={r.id} className="archive-item" onClick={() => goTo({ name: "article", recId: r.id })}>
                <span className="ai-title">{r.title}</span>
                <span className="ai-meta">{r.kind}</span>
              </button>
            ))}
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
        <div className="settings-row"><span className="k">状态</span><span className="v">在线 · 208 天未掉线</span></div>
        <div className="settings-row"><span className="k">云端同步</span><span className="v abnormal" style={{ color: "var(--danger)" }}>04:08 自动执行</span></div>
      </div>
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

  const renderSurveillance = (source: string) => {
    const dodged = survEscapeHits >= 2;
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
        <button
          className="escape"
          style={dodged ? undefined : { transform: `translate(${survEscapeHits === 0 ? -26 : 22}px, ${survEscapeHits === 0 ? 8 : -10}px)` }}
          onClick={() => {
            if (survEscapeHits < 2) {
              setSurvEscapeHits((n) => n + 1);
            } else {
              setSurvEscapeHits(0);
              setLastSearch("");
              applyRoute({ name: "search" });
            }
          }}
        >
          {dodged ? "返回检索" : "离开"}
        </button>
        <div className="foot">ECHOS · 零信号 · 该页面未收录于任何索引</div>
      </div>
    );
  };

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
      <AudioLayer game={game} />
    </>
  );
}
