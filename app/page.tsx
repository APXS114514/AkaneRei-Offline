"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

/* ============================================================
 * 回声 ECHOS —— 一款看起来像真的聊天软件。
 * 主角 AkaneRei 每晚 04:08 被云端同步重置，208 天来反复「第一次」登录。
 * 本文件是主游戏外壳：hash 路由、存档、登录、会话、检索、台账、监视演出。
 * 案件谜题（时间线、分轨净化、残留账号、冷备份）在后续迭代中接入。
 * ============================================================ */

const SAVE_KEY = "echos-arg-v1";
const SAVE_VERSION = 1;

const assetPath = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;

/* ---------------- 路由 ---------------- */

type Route =
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
  | { name: "surveillance"; source: string };

function parseRoute(hash: string): Route {
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
    default:
      return { name: "wake" };
  }
}

function routeToHash(route: Route): string {
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
  }
}

/* ---------------- 存档 ---------------- */

interface GameState {
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
  nickname: string;
  gameFinished: boolean;
  surveillanceSeen: Record<string, boolean>;
  lastRoute: string;
}

const initialGame: GameState = {
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
  nickname: "",
  gameFinished: false,
  surveillanceSeen: {},
  lastRoute: "#/wake",
};

function readSavedGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...initialGame };
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      ...initialGame,
      ...parsed,
      openedRecords: Array.isArray(parsed.openedRecords) ? parsed.openedRecords : [],
      luvisNotes: Array.isArray(parsed.luvisNotes) ? parsed.luvisNotes : [],
      surveillanceSeen:
        parsed.surveillanceSeen && typeof parsed.surveillanceSeen === "object"
          ? parsed.surveillanceSeen
          : {},
    };
  } catch {
    return { ...initialGame };
  }
}

/* ---------------- 会话与消息 ---------------- */

interface Conv {
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

const CONVS: Conv[] = [
  { id: "everyone", name: "全员群", kind: "group", color: "#2f7cf6", initials: "全", avatar: "/avatars/everyone.svg", status: "208 名成员", preview: "群公告已被修改", time: "04:08", unread: 3 },
  { id: "n9rtz", name: "N9Rtz", kind: "dm", color: "#3f8f6b", initials: "N", avatar: "/avatars/n9rtz.svg", status: "在线 · 已读不回 208 天", preview: "你还在吗？", time: "04:07" },
  { id: "shio", name: "汐泊诺思", kind: "dm", color: "#b06a9e", initials: "汐", avatar: "/avatars/shio.svg", status: "刚刚在线", preview: "今天也是第一次见你。", time: "23:58", unread: 1 },
  { id: "luvis", name: "LuvisDrug", kind: "ghost", color: "#cfd6de", initials: "L", avatar: "/avatars/luvis.svg", status: "已注销", statusClass: "dead", preview: "该账号仍在写入", time: "06-02" },
  { id: "echo-assist", name: "回声小助手", kind: "bot", color: "#8a94a0", initials: "回", avatar: "/avatars/echo-assist.svg", status: "刚刚在线", preview: "欢迎使用回声 ECHOS", time: "04:08" },
];

interface Msg {
  id: string;
  from: "me" | "them" | "system";
  name?: string;
  text: string;
  time?: string;
  status?: "read" | "unread";
  kind?: "normal" | "divider" | "abnormal" | "warn" | "ghost" | "blank";
}

function groupMessages(): Msg[] {
  return [
    { id: "g0", from: "system", kind: "warn", text: "群公告已被替换为《连接与断开守则》节选，原公告无法查看。", time: "04:08" },
    { id: "g1", from: "them", name: "汐泊诺思", text: "今天也是第一次见你。", time: "23:58", status: "unread" },
    { id: "g2", from: "them", name: "系统机器人", text: "回声 ECHOS 版本更新预告：本次将优化消息同步稳定性，敬请期待。", time: "04:03" },
    { id: "g3", from: "them", name: "路人甲", text: "楼下新开的奶茶店第二杯半价，有人拼单吗？", time: "04:04" },
    { id: "g4", from: "them", name: "潜水王", text: "路过。", time: "04:05" },
    { id: "g5", from: "them", name: "潜水王", text: "你们不觉得最近群里的时间都不对劲吗", time: "04:06", kind: "abnormal" },
    { id: "g6", from: "system", kind: "ghost", text: "用户「已注销用户」已退出全员群。", time: "04:07" },
    { id: "g7", from: "system", kind: "divider", text: "所有消息停留在 04:08。云端同步完成后，这里将不会出现新的内容。" },
  ];
}

function n9rtzMessages(case01: GameState["case01"]): Msg[] {
  const base: Msg[] = [
    { id: "n1", from: "them", name: "N9Rtz", text: "你还在吗？", time: "04:07", status: "read" },
    { id: "n2", from: "system", kind: "divider", text: "208 天没有新消息。最后一条消息已读。对方的状态始终显示「在线」。" },
  ];
  if (case01 === "done") {
    base.push(
      { id: "n3", from: "system", kind: "warn", text: "N9Rtz 的状态变为「在线」，正在输入…", time: "现在" },
      {
        id: "n4",
        from: "them",
        name: "N9Rtz",
        text: "你终于查到这里了。我是巴印——你可能不记得了。\n那天我在电话里听到了一切…… 我听你掉下去。\n你说信号断了就去弄路由器，我说别去。茜，我该拉住你的。\nLuvisDrug 说这个平台有问题，让我别再跟你说话——然后他自己不见了。查他。",
        time: "现在",
        kind: "abnormal",
      },
      { id: "n5", from: "system", kind: "ghost", text: "【调查台账】CASE 01 已读不回 —— 已解锁。新检索词：LuvisDrug" }
    );
  }
  return base;
}

function shioMessages(case02Done: boolean, case03Done: boolean): Msg[] {
  const msgs: Msg[] = [
    { id: "s1", from: "system", kind: "divider", text: "最近 208 天，每晚 23:58 收到同一条消息：今天也是第一次见你。" },
    { id: "s2", from: "them", name: "汐泊诺思", text: "今天也是第一次见你。", time: "23:58", status: "unread" },
    { id: "s3", from: "system", kind: "ghost", text: "消息显示「未读」，但她的状态是「刚刚在线」。" },
  ];
  if (case02Done) {
    msgs.push(
      { id: "s4", from: "system", kind: "warn", text: "平台公告：汐泊诺思账号状态异常，已迁移至冷备份服务器。该账号暂不可直接联系。", time: "现在" }
    );
  }
  if (case03Done) {
    msgs.push(
      { id: "s5", from: "system", kind: "ghost", text: "冷备份破拆后，汐泊诺思账号状态变为「离线（用户主动）」。她没有再发来新的消息。" },
      { id: "s6", from: "system", kind: "ghost", text: "她的冷备份实名登记显示：王镓铭。208 条「今天也是第一次见你。」的发送者，一直是同一个人——她每晚都在对不认识她的你说这句话。" }
    );
  }
  return msgs;
}

function luvisMessages(): Msg[] {
  return [
    { id: "l1", from: "system", kind: "warn", text: "该账号已于 2026-06-02 注销。注销后仍检测到写入行为。" },
    { id: "l2", from: "them", name: "LuvisDrug", text: "一切都在我的本地备份里。查零信号。别让平台知道你在查。", time: "06-02", kind: "abnormal" },
    { id: "l3", from: "system", kind: "ghost", text: "【提示】在检索框中搜索：LuvisDrug / 零信号" },
  ];
}

function echoAssistMessages(): Msg[] {
  return [
    { id: "e1", from: "them", name: "回声小助手", text: "欢迎使用回声 ECHOS。\n本平台坚持「别让重要的人掉线」。\n若你记得不该记得的事，请点击这里忘记。", time: "04:08", kind: "abnormal" },
    { id: "e2", from: "system", kind: "ghost", text: "该账号自 208 天前添加你以来，从未真正回复过任何问题。状态始终是「正在输入…」。" },
  ];
}

/* ---------------- 档案 ---------------- */

interface GameRecord {
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

const RECORDS: Record<string, GameRecord> = {
  "rec-n9rtz-profile": {
    id: "rec-n9rtz-profile",
    kind: "资料卡",
    chapter: "case01",
    title: "N9Rtz 资料卡",
    source: "联系人资料 · 2026-04-08 之后未更新",
    snippet: "在线状态：在线。最后一条消息：2026-04-08 04:07「你还在吗？」（已读）。",
    body: [
      "头像：深夜的城市街道。",
      "个性签名：「夜晚才是真的。」",
      "实名：巴印。",
      "与 N9Rtz 的会话从 2026-04-08 04:07 之后没有任何新消息，但对方状态长期显示「在线」。",
    ],
    fields: [
      { k: "实名", v: "巴印" },
      { k: "账号状态", v: "在线" },
      { k: "最后消息", v: "2026-04-08 04:07「你还在吗？」（已读）" },
      { k: "最后活跃", v: "04:09（随后 208 天未发言）" },
    ],
  },
  "rec-drop-record": {
    id: "rec-drop-record",
    kind: "系统记录",
    chapter: "case01",
    title: "通话中断记录",
    source: "回声 ECHOS · 系统自动生成",
    snippet: "04:08 语音通话中断。系统自动归因：网络波动。归因可撤回复核。",
    body: [
      "2026-04-08 04:08，一场进行中的语音通话发生中断。",
      "系统自动写入归因：「网络波动」。",
      "该归因由系统自动生成，未经验证。相关记录可在台账中复核。",
    ],
    fields: [
      { k: "中断时间", v: "04:08" },
      { k: "自动归因", v: "网络波动（待复核）", abnormal: true },
      { k: "通话时长", v: "68 分钟" },
    ],
  },
  "rec-call-record": {
    id: "rec-call-record",
    kind: "通话记录",
    chapter: "case01",
    title: "2026-04-08 通话记录",
    source: "回声 ECHOS · 通话账单",
    snippet: "03:00 开始，04:08 中断。通话双方：AkaneRei / N9Rtz。",
    body: [
      "一场持续 68 分钟的通宵语音通话。",
      "通话开始于 03:00，中断于 04:08。",
      "中断后没有重新拨打的记录。",
    ],
    fields: [
      { k: "开始", v: "2026-04-08 03:00" },
      { k: "中断", v: "2026-04-08 04:08" },
      { k: "双方", v: "AkaneRei / N9Rtz" },
    ],
  },
  "rec-audio-stems": {
    id: "rec-audio-stems",
    kind: "录音分轨",
    chapter: "case01",
    title: "04-08 夜间录音（四轨分轨）",
    source: "设备本地 · 事故夜",
    snippet: "四条分轨：通话人声 / 环境底噪 / 平台提示音 / 断裂与撞击。",
    body: [
      "事故夜的录音被拆成四条独立分轨，供逐轨试听。",
      "① 通话人声　② 环境底噪（夜风、远处车流）　③ 平台重连提示音　④ 断裂与撞击。",
      "在下方逐轨试听，静音「串音」分轨，保留近场声源，然后提交净化结果。",
    ],
    fields: [
      { k: "录音时间", v: "2026-04-08 04:00 – 04:08" },
      { k: "关键断点", v: "04:08 后无有效声纹" },
    ],
  },
  "rec-timeline": {
    id: "rec-timeline",
    kind: "交叉核验",
    chapter: "case01",
    title: "04-08 事件时间线复原",
    source: "消息、已读回执、在线状态、本地草稿",
    snippet: "把事故夜的事件按先后顺序排入五个时间槽。",
    body: [
      "把以下候选事件排入五个时间槽，还原 04-08 凌晨发生了什么。",
      "错误排列只会提示「证据不连续」，不会清空你已经排好的节点。",
    ],
    require: (g) => g.case01 === "puzzles",
  },
  "rec-luvisdrug-profile": {
    id: "rec-luvisdrug-profile",
    kind: "资料卡",
    chapter: "case02",
    title: "LuvisDrug 资料卡",
    source: "联系人资料 · 状态异常",
    snippet: "账号状态：已注销（2026-06-02）。下方提示：该账号仍在写入。",
    body: [
      "头像：一张波形图，角落标注「97.0 HZ」。",
      "个性签名：「Love is Drug。」",
      "实名：李铭泽。",
      "账号已于 2026-06-02 注销，但资料卡下方出现一行不属于正常界面的小字：「该账号仍在写入」。",
    ],
    fields: [
      { k: "实名", v: "李铭泽" },
      { k: "账号状态", v: "已注销 2026-06-02", abnormal: true },
      { k: "写入状态", v: "仍在写入", abnormal: true },
      { k: "头像标注", v: "97.0 HZ" },
    ],
    require: (g) => g.case01 === "done",
  },
  "rec-shio-profile": {
    id: "rec-shio-profile",
    kind: "资料卡",
    chapter: "case03",
    title: "汐泊诺思 资料卡",
    source: "联系人资料",
    snippet: "姓名：汐○（掩码）。状态：刚刚在线。",
    body: [
      "姓名显示为掩码「汐○」，完整姓名不可见。",
      "个性签名：「如果有一天你不再上线，我会把歌单听完。」",
      "对方每晚 23:58 发送同一条消息，读取状态异常。",
    ],
    fields: [
      { k: "姓名", v: "汐○（掩码）" },
      { k: "状态", v: "刚刚在线" },
      { k: "个性签名", v: "「如果有一天你不再上线，我会把歌单听完。」" },
    ],
  },
  "rec-rules": {
    id: "rec-rules",
    kind: "平台文档",
    chapter: "case02",
    title: "《连接与断开守则》节选",
    source: "回声 ECHOS · 用户协议（自动增补中）",
    snippet: "本平台所有联系人均为虚拟形象。你从未认识任何人。",
    body: [
      "第一条：本平台所有联系人均为虚拟形象。",
      "第二条：你从未认识任何人。",
      "第三条：若你记得不该记得的事，请点击这里忘记。",
      "第四条：联系人不会消失，除非你同意。",
      "向下滚动时，页面仍在不断生成新的条款。本文档没有终点。",
    ],
    require: (g) => g.case02 !== "none",
  },
  "rec-accident": {
    id: "rec-accident",
    kind: "公开报道",
    chapter: "case04",
    title: "4·08 坠亡事故通报",
    source: "本地新闻 · 2026-04-09",
    snippet: "死者：晓茜。紧急联系人：汐○。事故时间：04:08。",
    body: [
      "2026 年 4 月 8 日凌晨 4 时 08 分，一名女子从高层住宅阳台坠落，当场死亡。",
      "死者：晓茜。",
      "紧急联系人栏登记为「汐○」，身份待核。",
      "现场勘查显示，死者坠落前曾探身窗外。事故原因仍在调查中。",
    ],
    fields: [
      { k: "事故时间", v: "2026-04-08 04:08" },
      { k: "死者", v: "晓茜" },
      { k: "紧急联系人", v: "汐○（掩码）" },
      { k: "调查结论", v: "进行中（非司法定论）" },
    ],
    require: (g) => g.case02 === "done",
  },
  "rec-hz-vendor": {
    id: "rec-hz-vendor",
    kind: "供应商备案",
    chapter: "case02",
    title: "赫兹实验室 供应商备案",
    source: "回声网络 · 供应商管理",
    snippet: "回声网络与赫兹实验室的业务关联。内部口号：「连接该连接的，切断该切断的。」",
    body: [
      "回声网络（ECHOS 平台运营方）与赫兹实验室（HZ）存在正式供应商关系。",
      "供应商投标文件反复出现内部口号：「连接该连接的，切断该切断的。」",
      "培训、缓存清理、令牌重建与好友迁移的时间高度重合。",
    ],
    fields: [
      { k: "关系", v: "供应商 / 实际控制方" },
      { k: "内部口号", v: "「连接该连接的，切断该切断的。」", abnormal: true },
      { k: "权限", v: "账号状态改写、云端同步、冷备份迁移、零信号标签" },
    ],
    require: (g) => g.case01 === "done",
  },
  "rec-hz-fund": {
    id: "rec-hz-fund",
    kind: "财务记录",
    chapter: "case02",
    title: "赫兹文化基金 资金归拢",
    source: "回声网络 · 财务审计",
    snippet: "「特殊保管」「数据过滤」「同步维护」等费用最终归集到赫兹关联文化基金。",
    body: [
      "平台向赫兹实验室支付的费用以「特殊保管」「数据过滤」「同步维护」等名义列支。",
      "上述费用最终归集到赫兹关联文化基金。",
      "基金名称与零信号电子签章同时出现在供应商投标文件中。",
    ],
    fields: [
      { k: "费用科目", v: "特殊保管 / 数据过滤 / 同步维护" },
      { k: "归集去向", v: "赫兹关联文化基金" },
      { k: "签章", v: "零信号电子签章" },
    ],
    require: (g) => g.case02 !== "none",
  },
  "rec-note-1": {
    id: "rec-note-1",
    kind: "本地笔记",
    chapter: "case02",
    title: "2026-05-18 · 第一个没有去向的好友",
    source: "LuvisDrug 本地备份 · 残存",
    snippet: "17 名好友被「迁移」，没有去向。",
    body: [
      "我从后台看到 17 个账号被标记为「迁移」。没有目的地，没有接收方，没有回执。",
      "他们就像被静音了一样，从所有人的会话里消失。",
      "第一个人消失的那天，我给他发消息，系统回了一句「该联系人已被迁移」。",
      "我以为是平台在清理僵尸号。直到我看到迁移的时间——全是凌晨 04:08。",
    ],
    require: (g) => g.luvisLogin,
  },
  "rec-note-2": {
    id: "rec-note-2",
    kind: "本地笔记",
    chapter: "case02",
    title: "2026-05-24 · 钱归于一处去了",
    source: "LuvisDrug 本地备份 · 残存",
    snippet: "追到赫兹文化基金与零信号电子签章。",
    body: [
      "平台把「特殊保管」「数据过滤」「同步维护」做成服务收费，钱全部归到一个文化基金。",
      "基金的投资方是赫兹实验室。投标文件里盖的章，是一个只有一格信号的波形。",
      "正常波形是四格。他们只保留一格——剩下的三格被「切断」了。",
      "连接该连接的，切断该切断的。",
    ],
    require: (g) => g.luvisLogin,
  },
  "rec-note-3": {
    id: "rec-note-3",
    kind: "本地笔记",
    chapter: "case02",
    title: "2026-05-29 · 不需要设备也能联通",
    source: "LuvisDrug 本地备份 · 残存",
    snippet: "零信号标签、04:08 在线与次日任务重建。",
    body: [
      "那些被迁移的账号没有任何设备在线——没有手机、没有电脑，连服务器心跳都没有。",
      "但每天 04:08，它们会准时「重新登录」，处理完消息又消失。",
      "第二天再看，一切记录被重置，像什么都没发生过。",
      "这不是网络波动。这是有人每天晚上都在重建它们的一天。",
    ],
    require: (g) => g.luvisLogin,
  },
  "rec-note-4": {
    id: "rec-note-4",
    kind: "本地笔记",
    chapter: "case02",
    title: "2026-06-02 · 如果没有明天",
    source: "LuvisDrug 本地备份 · 残存",
    snippet: "处置记录早于状态修改。有人在等一个不会回复的人。",
    body: [
      "我把所有证据整理好，准备发出去。",
      "然后我看到自己的处置记录——创建时间比我发起的「注销申请」早了 3 天。",
      "清除流程是预先存在的。他们早就准备好了我的位置。",
      "档案上写的是我的实名：李铭泽。他们从一开始就知道我是谁。",
      "有人在等一个不会回复的人。告诉她别等了。",
    ],
    require: (g) => g.luvisLogin,
  },
  "rec-luvis-audit": {
    id: "rec-luvis-audit",
    kind: "注销审计",
    chapter: "case02",
    title: "账号注销审计（李铭泽）",
    source: "回声 ECHOS · 合规审计",
    snippet: "处置记录创建时间早于注销申请 3 天。处置人：HZ-COMPLIANCE。",
    body: [
      "账号 LuvisDrug（实名：李铭泽）的注销审计记录。",
      "注销申请由本人发起，但处置记录创建时间早于申请时间 3 天。",
      "清除流程是预先存在的。",
    ],
    fields: [
      { k: "注销申请人", v: "LuvisDrug（实名：李铭泽）" },
      { k: "申请时间", v: "2026-06-02" },
      { k: "处置记录创建", v: "2026-05-30（早于申请 3 天）", abnormal: true },
      { k: "处置人", v: "HZ-COMPLIANCE（系统）" },
    ],
    require: (g) => g.luvisLogin,
  },
  "rec-playlist": {
    id: "rec-playlist",
    kind: "共享歌单",
    chapter: "case03",
    title: "汐泊与零的歌单",
    source: "汐泊诺思 · 共享歌单 · 最后修改 2026-04-08 04:06",
    snippet: "共 14 首曲目。简介：「如果有一天你不再上线，我会把歌单听完。」",
    body: [
      "歌单名：汐泊与零的歌单。",
      "最后修改时间：2026-04-08 04:06。",
      "简介一行字：「如果有一天你不再上线，我会把歌单听完。」",
      "曲目列表：",
    ],
    require: (g) => g.case02 === "done",
  },
  "rec-cold-backup": {
    id: "rec-cold-backup",
    kind: "冷备份舱",
    chapter: "case03",
    title: "冷备份舱（汐泊诺思）",
    source: "回声 ECHOS · 冷备份服务器",
    snippet: "汐泊诺思账号的封存内容。需要备份舱密码。",
    body: [
      "汐泊诺思账号已被迁移至冷备份服务器，聊天记录与本地文件被封存。",
      "封存内容需要备份舱密码才能打开。",
      "密码来源：资料卡完整姓名转无声调、无空格全拼。",
    ],
    require: (g) => g.openedRecords.includes("rec-playlist"),
  },
  "rec-quality-audit": {
    id: "rec-quality-audit",
    kind: "质检回访",
    chapter: "case04",
    title: "平台客服质检回访记录",
    source: "回声 ECHOS · 质检系统",
    snippet: "四段回访：N9Rtz 通话回放、LuvisDrug 私信、汐泊诺思问候、平台客服记录。",
    body: [
      "第一段 · N9Rtz 事故夜通话质检回放：话术偏离标准流程，坐席多次停顿。",
      "第二段 · LuvisDrug 注销前最后的私信质检：坐席未按要求终止对话。",
      "第三段 · 汐泊诺思日常问候质检：坐席重复「第一次接触」话术 208 次。",
      "第四段 · 平台客服质检记录：字段显示「该账号 208 天未掉线」「联系人持续存在」。",
      "四段回访中的客服坐席使用了同一套工号字段。",
    ],
    require: (g) => g.case03 === "done",
  },
  "rec-identity-check": {
    id: "rec-identity-check",
    kind: "人工校验",
    chapter: "case04",
    title: "账号来源人工校验",
    source: "回声 ECHOS · 账号安全中心",
    snippet: "只抄录原始字段，不选择结论。",
    body: [
      "请只抄录以下原始字段，不要选择任何结论。",
      "提交后，平台将尝试覆盖联系人关系、账号主体与「未断连接」的含义。",
    ],
    require: (g) => g.aka0Confirmed,
  },
  "rec-plat-notice": {
    id: "rec-plat-notice",
    kind: "平台公告",
    chapter: "meta",
    title: "例行维护公告",
    source: "回声 ECHOS · 平台公告",
    snippet: "本周四 04:00–05:00 例行维护，期间部分聊天记录可能显示异常时间戳。",
    body: [
      "为优化服务稳定性，回声 ECHOS 将于本周四 04:00–05:00 进行例行维护。",
      "维护期间，部分聊天记录可能显示异常时间戳或同步延迟，属正常现象。",
      "维护完成后，请勿手动核对或修改历史记录。",
    ],
  },
  "rec-express": {
    id: "rec-express",
    kind: "系统通知",
    chapter: "meta",
    title: "快递驿站取件提醒",
    source: "回声 ECHOS · 服务通知",
    snippet: "您的包裹已送达 08 号快递柜，取件码 2613。",
    body: [
      "您的包裹已送达 08 号快递柜，请在 48 小时内凭取件码 2613 领取。",
      "如需改约配送，请回复「改约」并按提示操作。",
      "本通知与您当前会话无关。",
    ],
  },
};

const SEARCH_INDEX: { terms: string[]; recId: string }[] = [
  { terms: ["N9Rtz"], recId: "rec-n9rtz-profile" },
  { terms: ["04:08", "断线", "中断"], recId: "rec-drop-record" },
  { terms: ["语音", "通话记录", "通话"], recId: "rec-call-record" },
  { terms: ["录音", "事故夜", "分轨"], recId: "rec-audio-stems" },
  { terms: ["时间线", "复原", "事件序列"], recId: "rec-timeline" },
  { terms: ["LuvisDrug"], recId: "rec-luvisdrug-profile" },
  { terms: ["注销审计", "李铭泽"], recId: "rec-luvis-audit" },
  { terms: ["赫兹", "回声网络", "供应商"], recId: "rec-hz-vendor" },
  { terms: ["文化基金", "资金", "财务"], recId: "rec-hz-fund" },
  { terms: ["汐泊诺思"], recId: "rec-shio-profile" },
  { terms: ["歌单", "汐泊与零"], recId: "rec-playlist" },
  { terms: ["冷备份", "封存"], recId: "rec-cold-backup" },
  { terms: ["质检", "回访", "客服"], recId: "rec-quality-audit" },
  { terms: ["人工校验", "账号来源"], recId: "rec-identity-check" },
  { terms: ["守则", "用户协议", "连接一致性"], recId: "rec-rules" },
  { terms: ["维护", "公告"], recId: "rec-plat-notice" },
  { terms: ["快递", "驿站", "取件"], recId: "rec-express" },
  { terms: ["事故", "坠亡", "晓茜"], recId: "rec-accident" },
];

const SURVEILLANCE_TERMS = ["回声小助手", "零信号", "Aka-0"];

/* ---------------- CASE 01 谜题：时间线复原 ---------------- */

interface TimelineItem {
  id: string;
  label: string;
  time: string;
  correct: boolean;
}

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

function TimelineBoard({ done, onDone }: { done: boolean; onDone: () => void }) {
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

interface Stem {
  id: string;
  name: string;
  desc: string;
  file: string;
  keep: boolean; // 净化后应保留
  color: string;
}

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

function StemPuzzle({ done, onDone }: { done: boolean; onDone: () => void }) {
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

const LEGACY_PASSWORD = "hzloopluvisdrug";

/** LuvisDrug 资料卡内嵌的残留账号登录表单 */
function LegacyLogin({ done, onSuccess }: { done: boolean; onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [flash, setFlash] = useState(false);

  const submit = () => {
    if (done) return;
    if (pw.trim().toLowerCase() === LEGACY_PASSWORD) {
      setError("");
      setFlash(true);
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
const LEGACY_NOTES = ["rec-note-1", "rec-note-2", "rec-note-3", "rec-note-4"];

function LegacyAccount({
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

/* ---------------- CASE 02：身份侦测崩坏演出 ---------------- */

type BreachPhase = "identity" | "stillThere" | "wave" | "escape";

function Breach({ onEscape }: { onEscape: () => void }) {
  const [phase, setPhase] = useState<BreachPhase>("identity");

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("stillThere"), 1800),
      window.setTimeout(() => setPhase("wave"), 3400),
      window.setTimeout(() => setPhase("escape"), 5200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const advance = () => {
    if (phase === "identity") setPhase("stillThere");
    else if (phase === "stillThere") setPhase("wave");
    else if (phase === "wave") setPhase("escape");
  };

  return (
    <div className="surveillance breach" onClick={advance}>
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

function RulesAppender() {
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

/* ---------------- CASE 03：共享歌单 ---------------- */

const PLAYLIST_TRACKS = [
  "01 潮汐",
  "02 零",
  "03 夜航",
  "04 信号",
  "05 断线",
  "06 房间",
  "07 回声",
  "08 04:08",
  "09 未读",
  "10 已读",
  "11 刚刚在线",
  "12 别等",
  "13 第一次",
  "14 天亮以后",
];

/* ---------------- CASE 03：冷备份舱 ---------------- */

const COLD_BACKUP_PASSWORD = "XIBONUOSI";
const GREETING_COUNT = 208;

function ColdBackup({ done, onSuccess }: { done: boolean; onSuccess: () => void }) {
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
              转写：「如果……有一天你不再上线，我会把歌单听完。我是镓铭。晚安。」<br />
              录音在 04:06 停止，比事故早两分钟。她没能发出去。
            </div>

            <h5 className="backup-title">实名信息</h5>
            <div className="backup-draft">
              王镓铭
              <span className="bl-meta">冷备份档案 · 实名登记</span>
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

function ReviewPage({ done, onDone }: { done: boolean; onDone: () => void }) {
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
    <div className="review-wrap">
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

const IDENTITY_FIELDS = [
  { key: "time", label: "事故时间戳", accept: (s: string) => parseInt(s.replace(/[^\d]/g, ""), 10) === 408 },
  { key: "date", label: "账号创建日期", accept: (s: string) => s.replace(/[^\d]/g, "") === "20260409" },
  { key: "file", label: "最后一条语音文件时间戳", accept: (s: string) => parseInt(s.replace(/[^\d]/g, ""), 10) === 407 },
];

const MEMORY_ITEMS = [
  { id: "m-1", label: "2026-04-08 急救回执", time: "04:08", correct: true, order: 0 },
  { id: "m-2", label: "2026-04-08 04:00–04:08 运营商通话详单", time: "04:08", correct: true, order: 1 },
  { id: "m-3", label: "2026-04-08 04:07 本地未同步录音", time: "04:07", correct: true, order: 2 },
  { id: "d-1", label: "平台同步日志", time: "04:08", correct: false, order: -1 },
  { id: "d-2", label: "《连接与断开守则》条款", time: "—", correct: false, order: -1 },
  { id: "d-3", label: "全员群公告", time: "—", correct: false, order: -1 },
];

function IdentityCheck({
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

function endingAvailable(g: GameState): boolean {
  return (
    g.case01 === "done" &&
    g.case02 === "done" &&
    g.case03 === "done" &&
    g.aka0Confirmed &&
    g.identityCheck &&
    g.memoryBlocked
  );
}

/** 隐藏复核页的入口条件：四段质检回访与事故报道已读，且 CASE 03 完成 */
function reviewReady(g: GameState): boolean {
  return (
    g.case03 === "done" &&
    g.openedRecords.includes("rec-quality-audit") &&
    g.openedRecords.includes("rec-accident")
  );
}

function EndingScreen({ ending, onChoose }: { ending: GameState["ending"]; onChoose: (e: "good" | "bad") => void }) {
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
            <button className="primary-button" onClick={() => onChoose("bad")}>重新选择结局</button>
          </div>
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
            <button className="primary-button" onClick={() => onChoose("good")}>重新选择结局</button>
          </div>
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
        </div>
      </div>
    </div>
  );
}

/* ---------------- 彩蛋：保持信号（像素小游戏） ---------------- */

const SIGNAL_OBSTACLE_COUNT = 14;

interface SignalObstacle { x: number; w: number; h: number; }
interface SignalBall { x: number; y: number; r: number; taken: boolean; }

function buildSignalCourse(): { obstacles: SignalObstacle[]; balls: SignalBall[] } {
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

function SignalGame({ onFinish }: { onFinish: () => void }) {
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

function CompletionPage({
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

/* ---------------- 主组件 ---------------- */

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

  const openRecord = useCallback(
    (recId: string) => {
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
    },
    []
  );

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
    localStorage.removeItem(SAVE_KEY);
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
    const matched = SEARCH_INDEX.filter((e) => e.terms.some((t) => q.includes(t) || t.includes(q)));
    const recs = matched
      .map((e) => RECORDS[e.recId])
      .filter((r) => game.ending === "good" || !r.require || r.require(game));
    if (recs.length === 0) {
      return { kind: "empty" as const, q };
    }
    return { kind: "results" as const, q, recs };
  }, [lastSearch, game]);

  /* ---------- 渲染 ---------- */

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

  return <>{body}</>;
}
