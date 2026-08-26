/* 类型、路由与存档 —— 由 app/page.tsx 拆分而来 */
export const SAVE_KEY = "echos-arg-v1";
export const SAVE_PREFIX = "echos-";
export const SAVE_VERSION = 1;

export const assetPath = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;

/** 彻底清除本机游戏数据：localStorage 全部游戏键 + sessionStorage + 浏览器 Cache Storage */
export function clearLocalData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SAVE_PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* 存储不可用时静默 */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* 忽略 */
  }
  try {
    if (typeof caches !== "undefined") {
      void caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).catch(() => {});
    }
  } catch {
    /* 忽略 */
  }
}
/* ---------------- 路由 ---------------- */

export type Route =
  | { name: "wake" }
  | { name: "login" }
  | { name: "home" }
  | { name: "chat"; convId: string }
  | { name: "search" }
  | { name: "article"; recId: string }
  | { name: "archive" }
  | { name: "settings" }
  | { name: "legacy" }
  | { name: "review" }
  | { name: "ending" }
  | { name: "completion" }
  | { name: "breach" }
  | { name: "surveillance"; source: string }
  | { name: "legacyWindow" };

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "wake" };
  switch (parts[0]) {
    case "wake": return { name: "wake" };
    case "login": return { name: "login" };
    case "app":
      if (parts[1] === "chat" && parts[2]) return { name: "chat", convId: parts[2] };
      if (parts[1] === "search") return { name: "search" };
      if (parts[1] === "article" && parts[2]) return { name: "article", recId: parts[2] };
      if (parts[1] === "archive") return { name: "archive" };
      if (parts[1] === "settings") return { name: "settings" };
      if (parts[1] === "legacy") return { name: "legacy" };
      if (parts[1] === "review") return { name: "review" };
      if (parts[1] === "ending") return { name: "ending" };
      if (parts[1] === "completion") return { name: "completion" };
      return { name: "home" };
    case "breach":
      return { name: "breach" };
    case "surveillance":
      return { name: "surveillance", source: parts[1] ?? "unknown" };
    case "legacy":
      return { name: "legacyWindow" };
    default:
      return { name: "wake" };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case "wake": return "#/wake";
    case "login": return "#/login";
    case "home": return "#/app/home";
    case "chat": return `#/app/chat/${route.convId}`;
    case "search": return "#/app/search";
    case "article": return `#/app/article/${route.recId}`;
    case "archive": return "#/app/archive";
    case "settings": return "#/app/settings";
    case "legacy": return "#/app/legacy";
    case "review": return "#/app/review";
    case "ending": return "#/app/ending";
    case "completion": return "#/app/completion";
    case "breach": return "#/breach";
    case "surveillance": return `#/surveillance/${route.source}`;
    case "legacyWindow": return "#/legacy";
  }
}
/* ---------------- 存档 ---------------- */

export interface GameState {
  version: number;
  loggedIn: boolean;
  wakeDone: boolean;
  openedRecords: string[];
  case01: "none" | "puzzles" | "done";
  case01Timeline: boolean;
  case01Stems: boolean;
  case02: "none" | "partial" | "done";
  luvisLogin: boolean;
  luvisNotes: string[];
  case03: "none" | "done";
  aka0Confirmed: boolean;
  identityCheck: boolean;
  memoryBlocked: boolean;
  ending: "none" | "good" | "bad";
  /** 坏结局轮回标记：登录页提示「缺少了什么」 */
  loopHint: boolean;
  nickname: string;
  gameFinished: boolean;
  bgmMuted: boolean;
  bgmVolume: number;
  welcomeShown: boolean;
  /** 已打开过的会话 id（打开后未读红点消失，避免与新消息混淆） */
  readConvs: string[];
  surveillanceSeen: Record<string, boolean>;
  lastRoute: string;
}

export const initialGame: GameState = {
  version: SAVE_VERSION,
  loggedIn: false,
  wakeDone: false,
  openedRecords: [],
  case01: "none",
  case01Timeline: false,
  case01Stems: false,
  case02: "none",
  luvisLogin: false,
  luvisNotes: [],
  case03: "none",
  aka0Confirmed: false,
  identityCheck: false,
  memoryBlocked: false,
  ending: "none",
  loopHint: false,
  nickname: "",
  gameFinished: false,
  bgmMuted: false,
  bgmVolume: 1,
  welcomeShown: false,
  readConvs: [],
  surveillanceSeen: {},
  lastRoute: "#/wake",
};

export function readSavedGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...initialGame };
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      ...initialGame,
      ...parsed,
      openedRecords: Array.isArray(parsed.openedRecords) ? parsed.openedRecords : [],
      luvisNotes: Array.isArray(parsed.luvisNotes) ? parsed.luvisNotes : [],
      readConvs: Array.isArray(parsed.readConvs) ? parsed.readConvs : [],
      surveillanceSeen:
        parsed.surveillanceSeen && typeof parsed.surveillanceSeen === "object"
          ? parsed.surveillanceSeen
          : {},
    };
  } catch {
    return { ...initialGame };
  }
}
export interface Conv {
  id: string;
  name: string;
  kind: "group" | "dm" | "bot" | "ghost";
  color: string;
  initials: string;
  avatar: string;
  status: string;
  statusClass?: "dead";
  preview: string;
  time: string;
  unread?: number;
}
export interface Msg {
  id: string;
  from: "me" | "them" | "system";
  name?: string;
  text: string;
  time?: string;
  status?: "read" | "unread";
  kind?: "normal" | "divider" | "abnormal" | "warn" | "ghost" | "blank";
  /** 语音消息：音频文件路径（相对 public/），渲染为可播放的语音卡片 */
  audio?: string;
}

export interface GameRecord {
  id: string;
  kind: string;
  title: string;
  source: string;
  snippet: string;
  body: string[];
  fields?: { k: string; v: string; abnormal?: boolean }[];
  chapter: "case01" | "case02" | "case03" | "case04" | "meta";
  require?: (g: GameState) => boolean;
}

export interface TimelineItem {
  id: string;
  label: string;
  time: string;
  correct: boolean;
}

export interface Stem {
  id: string;
  name: string;
  desc: string;
  file: string;
  keep: boolean; // 净化后应保留
  color: string;
}

export interface SignalObstacle { x: number; w: number; h: number; }
export interface SignalBall { x: number; y: number; r: number; taken: boolean; }
