/**
 * 流程走查验证（对照 docs/游戏流程.md）：
 *
 * 1) 密码契约与值契约断言（残留账号密码、冷备份密码、三项复核结论、账号来源校验
 *    兼容值、记忆覆盖阻断顺序、歌单 14 首、小游戏 14 障碍、时间线答案、分轨净化）。
 * 2) 检索范围表断言（入口词 → 允许返回的记录；require 门限约束）。
 * 3) 单调不动点闭包：从清空存档（initialGame）出发，反复打开所有满足 require 的档案
 *    并推进章节标志，直到稳定。断言：两种结局可选、隐藏复核页可达、全部档案可打开
 *    （即不存在任何记录被自身门槛永久锁死）。
 * 4) 按《游戏流程.md》顺序、用真实检索词进行贪心走查，逐步断言前置条件与检索命中，
 *    证明文档给出的路线本身走得通。
 *
 * 运行：npm run verify:flow
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { initialGame } from "../app/game/types";
import type { GameState } from "../app/game/types";
import {
  RECORDS,
  SEARCH_INDEX,
  SURVEILLANCE_TERMS,
  reviewReady,
  endingAvailable,
  PLAYLIST_TRACKS,
} from "../app/game/data";
import {
  LEGACY_PASSWORD,
  COLD_BACKUP_PASSWORD,
  IDENTITY_FIELDS,
  MEMORY_ITEMS,
  SIGNAL_OBSTACLE_COUNT,
  LEGACY_NOTES,
} from "../app/game/components";

const HERE = dirname(fileURLToPath(import.meta.url));
const clone = (s: GameState): GameState => ({
  ...s,
  openedRecords: [...s.openedRecords],
  luvisNotes: [...s.luvisNotes],
  surveillanceSeen: { ...s.surveillanceSeen },
});

const CASE01_MATERIALS = ["rec-drop-record", "rec-call-record", "rec-audio-stems"];

/** 检索词 → 命中的档案 id（与 app/page.tsx 的 searchResults 一致，大小写不敏感） */
function searchHit(q: string): string[] {
  const lower = q.toLowerCase();
  return SEARCH_INDEX.filter((e) => e.terms.some((t) => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower))).map((e) => e.recId);
}

/** 按真实 UI 打开档案：检索命中 + require 门限 + 监视词路由 */
function openViaSearch(s: GameState, q: string, expectedId: string): void {
  const hit = SURVEILLANCE_TERMS.find((t) => q.includes(t));
  if (hit) {
    if (hit === "Aka-0" && s.aka0Confirmed) {
      // 确认后：精确检索 Aka-0 只返回只读归档
    } else {
      assert.fail(`检索词「${q}」应触发监视演出，不应作为普通档案入口`);
    }
  }
  const ids = searchHit(q);
  assert.ok(ids.includes(expectedId), `检索「${q}」应命中 ${expectedId}（实际：${ids.join(", ")}）`);
  const rec = RECORDS[expectedId];
  assert.ok(!rec.require || rec.require(s), `档案 ${expectedId} 的 require 门槛未满足`);
  if (!s.openedRecords.includes(expectedId)) s.openedRecords.push(expectedId);
}

/** 打开档案后派生状态升级（与 app/page.tsx openRecord / 章节推进一致） */
function applyDerived(s: GameState): void {
  if (
    s.case01 === "none" &&
    CASE01_MATERIALS.every((id) => s.openedRecords.includes(id))
  ) {
    s.case01 = "puzzles";
  }
}

/* ---------------- 1) 密码契约与值契约 ---------------- */

const comp = readFileSync(resolve(HERE, "../app/game/components.tsx"), "utf8");
const page = readFileSync(resolve(HERE, "../app/page.tsx"), "utf8");
const src = comp + page;

// §5 密码契约表 + 隐藏复核页三项结论
assert.equal(LEGACY_PASSWORD, "hzloopluvisdrug", "残留账号密码契约");
assert.equal(COLD_BACKUP_PASSWORD, "XIBONUOSI", "冷备份舱密码契约");
assert.equal(SIGNAL_OBSTACLE_COUNT, 14, "小游戏 14 个断线障碍");
assert.equal(PLAYLIST_TRACKS.length, 14, "歌单 14 首曲目");
assert.match(
  comp,
  /who\.trim\(\) === "晓茜" && status === "已死亡" && relation\.trim\(\) === "紧急联系人"/,
  "隐藏复核页三项结论：晓茜 / 已死亡 / 紧急联系人"
);
assert.match(comp, /onChoose\("none"\)/, "重新选择结局返回注销页");

// §4.4 账号来源校验兼容值
const field = (key: string) => {
  const f = IDENTITY_FIELDS.find((x) => x.key === key);
  assert.ok(f, `缺少字段 ${key}`);
  return f!;
};
for (const v of ["04:08", "4:08", "4:08 AM"]) assert.equal(field("time").accept(v), true, `事故时间戳兼容 ${v}`);
for (const v of ["2026-04-09", "20260409", "2026/04/09"]) assert.equal(field("date").accept(v), true, `账号创建日期兼容 ${v}`);
assert.equal(field("file").accept("04:07"), true, "最后一条语音文件时间戳 04:07");

// §4.5 记忆覆盖阻断顺序：急救回执 → 运营商通话详单 → 本地未同步录音
const memOrder = MEMORY_ITEMS.filter((m) => m.correct).sort((a, b) => a.order - b.order).map((m) => m.id);
assert.deepEqual(memOrder, ["m-1", "m-2", "m-3"], "记忆覆盖阻断三份平台外记录按时序");

// §1.3 事故夜时间线答案；§1.4 录音净化规则
assert.match(src, /TIMELINE_ANSWER = \["t-0300", "t-0406", "t-0407", "t-0408", "t-0409"\]/, "时间线答案契约");
assert.match(src, /stem-voice\.wav", keep: true/, "通话人声保留");
assert.match(src, /stem-ambient\.wav", keep: false/, "环境底噪静音");
assert.match(src, /stem-ui\.wav", keep: false/, "平台提示音静音");
assert.match(src, /stem-crash\.wav", keep: true/, "断裂与撞击保留");
// 分轨颜色统一（不泄露「保留/静音」答案）；时间排序候选统一（干扰项不再灰色）
assert.doesNotMatch(src, /color: "#2f7cf6"|color: "#b03a3a"/, "分轨不应以颜色区分 keep/drop");
assert.doesNotMatch(src, /distractor/, "时间排序干扰项不应有特殊样式");

/* ---------------- 2) 检索范围表（对照流程文档「检索词 → 允许返回的最大范围」） ---------------- */

for (const e of SEARCH_INDEX) {
  assert.ok(RECORDS[e.recId], `检索索引指向不存在的记录：${e.recId}`);
}

const scopeN9Rtz = searchHit("N9Rtz");
assert.ok(scopeN9Rtz.includes("rec-n9rtz-conv") && scopeN9Rtz.includes("rec-n9rtz-profile"), "N9Rtz → 会话 + 资料卡");
assert.ok(!scopeN9Rtz.includes("rec-audio-stems"), "N9Rtz 不提前返回事故夜录音");
assert.ok(searchHit("04:08").includes("rec-drop-record"), "04:08 → 断线记录");
assert.ok(!searchHit("04:08").includes("rec-accident"), "04:08 不提前返回事故报道");
assert.ok(searchHit("LuvisDrug").includes("rec-luvisdrug-profile"), "LuvisDrug → 资料卡");
assert.ok(SURVEILLANCE_TERMS.includes("零信号"), "零信号只触发监视演出，不授予证据");
assert.ok(searchHit("汐泊诺思").includes("rec-shio-profile"), "汐泊诺思 → 资料卡");
assert.ok(searchHit("Aka-0").includes("rec-aka0-archive"), "Aka-0 → 只读归档（确认后）");
assert.ok(SURVEILLANCE_TERMS.includes("Aka-0"), "Aka-0 确认前触发监视演出");
assert.ok(searchHit("事故").includes("rec-accident") && searchHit("坠亡").includes("rec-accident"), "事故/坠亡 → 公开报道");
assert.ok(searchHit("冷备份").includes("rec-cold-backup"), "冷备份 → 冷备份舱");

const gEmpty = clone(initialGame);
assert.equal(RECORDS["rec-accident"].require?.(gEmpty) ?? true, false, "事故报道：CASE 02 完成前不返回");
assert.equal(RECORDS["rec-luvisdrug-profile"].require?.(gEmpty) ?? true, false, "LuvisDrug 资料卡：CASE 01 完成前不返回");
assert.equal(RECORDS["rec-n9rtz-conv"].require?.(gEmpty) ?? true, true, "N9Rtz 会话开档即可见");
assert.equal(RECORDS["rec-timeline"].require?.(gEmpty) ?? true, false, "时间线谜题需要三份材料后解锁");

/* ---------------- 3) 单调不动点闭包：完整通关无死锁 ---------------- */

// 两阶段模型：
//  - 内层循环：开档案 ↔ 推进解锁类标志（谜题完成、登录残留账号、破拆冷备份、复核、
//    身份校验、记忆阻断），直到本轮不再有新进展。这样「登录残留账号」解锁的档案
//    （注销审计、四篇笔记）会在同一轮内被打开，不会跳过 luvisLogin 窗口。
//  - 外层终态：内层稳定后，读笔记并触发崩坏演出收束（luvisLogin=false, case02=done）。
// 关键约束（与真实 UI 一致）：CASE 02 完成后平台不再接受残留账号凭据；时间线谜题
// 必须先打开 rec-timeline 档案才能提交。
const s = clone(initialGame) as GameState;
let progress = true;
let guard = 0;
while (progress) {
  progress = false;
  guard += 1;
  assert.ok(guard < 200, "不动点迭代未收敛（可能循环依赖）");

  // 内层：开档案 ↔ 解锁标志，直到稳定
  let inner = true;
  while (inner) {
    inner = false;
    for (const rec of Object.values(RECORDS)) {
      if (!s.openedRecords.includes(rec.id) && (!rec.require || rec.require(s))) {
        s.openedRecords.push(rec.id);
        inner = true;
        progress = true;
      }
    }
    applyDerived(s);

    if (s.case01 === "puzzles" && !s.case01Timeline && s.openedRecords.includes("rec-timeline")) {
      s.case01Timeline = true; inner = true; progress = true;
    }
    if (s.case01 === "puzzles" && !s.case01Stems && s.openedRecords.includes("rec-audio-stems")) {
      s.case01Stems = true; inner = true; progress = true;
    }
    if (s.case01 === "puzzles" && s.case01Timeline && s.case01Stems) {
      s.case01 = "done"; inner = true; progress = true;
    }
    if (s.case01 === "done" && s.case02 !== "done" && !s.luvisLogin && s.openedRecords.includes("rec-luvisdrug-profile")) {
      s.luvisLogin = true; s.case02 = "partial"; inner = true; progress = true;
    }
    if (s.case03 !== "done" && s.openedRecords.includes("rec-cold-backup")) {
      s.case03 = "done"; inner = true; progress = true;
    }
    if (!s.aka0Confirmed && reviewReady(s)) { s.aka0Confirmed = true; inner = true; progress = true; }
    if (s.aka0Confirmed && !s.identityCheck && s.openedRecords.includes("rec-identity-check")) {
      s.identityCheck = true; inner = true; progress = true;
    }
    if (s.identityCheck && !s.memoryBlocked) { s.memoryBlocked = true; inner = true; progress = true; }
  }

  // 外层终态：读笔记并触发崩坏演出收束（在内层稳定后执行）
  if (s.luvisLogin) {
    for (const note of LEGACY_NOTES) {
      if (!s.luvisNotes.includes(note)) {
        s.luvisNotes.push(note);
        if (!s.openedRecords.includes(note)) s.openedRecords.push(note);
        progress = true;
      }
    }
    if (LEGACY_NOTES.every((x) => s.luvisNotes.includes(x)) && s.case02 !== "done") {
      s.luvisLogin = false; // 崩坏演出 → 快断开
      s.case02 = "done";
      progress = true;
    }
  }
}

const missing = Object.keys(RECORDS).filter((id) => !s.openedRecords.includes(id));
console.log("\n【不动点闭包】从清空存档出发，反复打开全部满足门槛的档案：");
console.log(`  迭代收敛：${guard} 轮`);
console.log(`  全部 ${Object.keys(RECORDS).length} 份档案已打开：${missing.length === 0 ? "是 ✅" : `否 ❌ ${missing.join(", ")}`}`);
console.log(`  隐藏复核页（reviewReady）可达：${reviewReady(s) ? "是 ✅" : "否 ❌"}`);
console.log(`  好/坏结局（endingAvailable）可达：${endingAvailable(s) ? "是 ✅" : "否 ❌"}`);
console.log(`  CASE 状态：01=${s.case01} 02=${s.case02} 03=${s.case03} Aka-0=${s.aka0Confirmed} 身份=${s.identityCheck} 记忆=${s.memoryBlocked}`);
assert.equal(missing.length, 0, `存在不可达档案：${missing.join(", ")}`);
assert.ok(reviewReady(s), "隐藏复核页必须可达");
assert.ok(endingAvailable(s), "好结局必须可达");

/* ---------------- 4) 按文档顺序、用真实检索词的贪心走查 ---------------- */

function docOrder(): string[] {
  const g = clone(initialGame) as GameState;
  const steps: string[] = [];
  const act = (label: string, fn: (n: GameState) => void) => {
    fn(g);
    steps.push(label);
  };

  // §1 CASE 01：按文档检索词打开三份材料
  act("检索「04:08」→ 通话中断记录", (n) => { openViaSearch(n, "04:08", "rec-drop-record"); applyDerived(n); });
  act("检索「语音」→ 2026-04-08 通话记录", (n) => { openViaSearch(n, "语音", "rec-call-record"); applyDerived(n); });
  act("检索「录音」→ 04-08 夜间录音（四轨分轨）", (n) => { openViaSearch(n, "录音", "rec-audio-stems"); applyDerived(n); });
  act("检索「N9Rtz」→ 会话（事故夜后空白）", (n) => { openViaSearch(n, "N9Rtz", "rec-n9rtz-conv"); });
  act("检索「N9Rtz」→ 资料卡", (n) => { openViaSearch(n, "N9Rtz", "rec-n9rtz-profile"); });
  act("检索「时间线」→ 事件时间线复原（三份材料已齐，解锁 puzzles）", (n) => {
    assert.equal(n.case01, "puzzles", "三份材料打开后应进入谜题阶段");
    openViaSearch(n, "时间线", "rec-timeline");
  });
  act("提交时间线：03:00→04:06→04:07→04:08→04:09", (n) => { n.case01Timeline = true; });
  act("提交分轨净化：静音底噪/提示音，保留人声/断裂撞击", (n) => { n.case01Stems = true; });
  act("CASE 01 完成：N9Rtz 开口「茜，我该拉住你的」，台账揭示「已读不回」", (n) => { n.case01 = "done"; });

  // §2 CASE 02
  act("检索「LuvisDrug」→ 资料卡（已注销 + 仍在写入）", (n) => { openViaSearch(n, "LuvisDrug", "rec-luvisdrug-profile"); });
  act("登录残留账号：LuvisDrug / hzloopluvisdrug", (n) => { n.luvisLogin = true; n.case02 = "partial"; });
  act("残留会话期间检索「注销审计」→ 账号注销审计（HZ-COMPLIANCE）", (n) => { openViaSearch(n, "注销审计", "rec-luvis-audit"); });
  for (const note of LEGACY_NOTES) {
    act(`残留账号内读笔记：${RECORDS[note].title}`, (n) => {
      assert.ok(n.luvisLogin, "笔记只在残留账号内可读");
      assert.ok(!RECORDS[note].require || RECORDS[note].require(n), "笔记 require 门槛");
      n.luvisNotes.push(note);
      n.openedRecords.push(note);
    });
  }
  act("四篇读完 → 身份侦测崩坏演出（摄像头核验→你是谁→你还在吗→快断开）", (n) => {
    assert.equal(n.luvisNotes.length, 4, "四篇笔记应全部读完");
    n.luvisLogin = false;
    n.case02 = "done";
  });
  // §2.5 快断开后必须返回登录页重新登录 AkaneRei，而非直接回消息页
  act("点击「快断开」→ 断开残留账号并登出 AkaneRei，返回登录页", (n) => {
    assert.equal(n.luvisLogin, false, "残留账号应已断开");
    n.loggedIn = false;
  });
  act("重新登录 AkaneRei（0408）→ 首页出现《连接与断开守则》待办与汐泊诺思迁移公告", (n) => {
    n.loggedIn = true;
    // 守则待办点击即可打开（不要求先检索）；汐泊诺思公告指向其会话
    openViaSearch(n, "守则", "rec-rules");
  });
  act("检索「赫兹」→ 赫兹实验室供应商备案", (n) => { openViaSearch(n, "赫兹", "rec-hz-vendor"); });
  act("检索「文化基金」→ 赫兹文化基金资金归拢", (n) => { openViaSearch(n, "文化基金", "rec-hz-fund"); });
  act("打开《连接与断开守则》（CASE 02 后首页待办）", (n) => { openViaSearch(n, "守则", "rec-rules"); });

  // §3 CASE 03
  act("检索「汐泊诺思」→ 资料卡（姓名掩码汐○）", (n) => { openViaSearch(n, "汐泊诺思", "rec-shio-profile"); });
  act("检索「歌单」→ 汐泊与零的歌单（14 首）", (n) => { openViaSearch(n, "歌单", "rec-playlist"); });
  act("歌单解锁后资料卡解除掩码：汐泊诺思 → XIBONUOSI", (n) => {
    assert.ok(n.openedRecords.includes("rec-playlist"), "歌单须先解锁");
  });
  act("检索「冷备份」→ 冷备份舱（汐泊诺思）", (n) => { openViaSearch(n, "冷备份", "rec-cold-backup"); });
  act("破拆冷备份舱：XIBONUOSI → CASE 03 完成「冷备份」", (n) => { n.case03 = "done"; });

  // §4 CASE 04
  act("检索「质检」→ 第一段：N9Rtz 事故夜通话回放", (n) => { openViaSearch(n, "质检", "rec-qa-1"); });
  act("检索「质检」→ 第二段：LuvisDrug 注销前私信", (n) => { openViaSearch(n, "质检", "rec-qa-2"); });
  act("检索「质检」→ 第三段：汐泊诺思日常问候", (n) => { openViaSearch(n, "质检", "rec-qa-3"); });
  act("检索「质检」→ 第四段：平台客服记录（冷备份解锁）", (n) => { openViaSearch(n, "质检", "rec-qa-4"); });
  act("检索「事故」→ 4·08 坠亡事故通报（死者晓茜，紧急联系人汐○）", (n) => { openViaSearch(n, "事故", "rec-accident"); });
  act("四段质检 + 事故 + 守则 + CASE 03 → reviewReady 复核通知出现", (n) => {
    assert.ok(reviewReady(n), "隐藏复核页入口条件应满足");
  });
  act("隐藏复核页提交：晓茜 / 已死亡 / 紧急联系人", (n) => { n.aka0Confirmed = true; });
  act("确认后检索「Aka-0」→ 只返回《Aka-0 账号身份复核归档》", (n) => {
    const ids = searchHit("Aka-0").filter((id) => !RECORDS[id].require || RECORDS[id].require(n));
    assert.deepEqual(ids, ["rec-aka0-archive"], "确认后精确检索 Aka-0 只返回归档");
    n.openedRecords.push("rec-aka0-archive");
  });
  act("检索「人工校验」→ 账号来源人工校验", (n) => { openViaSearch(n, "人工校验", "rec-identity-check"); });
  act("提交原始字段：04:08 / 2026-04-09 / 04:07", (n) => { n.identityCheck = true; });
  act("阻断记忆覆盖：急救回执 → 运营商通话详单 → 本地未同步录音", (n) => { n.memoryBlocked = true; });

  // §5 结局
  act("好结局「已离线」：提交全部证据并注销账号", (n) => {
    assert.ok(endingAvailable(n), "好结局前置（CASE 01-03 + Aka-0 + 记忆阻断）应满足");
    n.ending = "good";
  });
  act("重新选择结局 → 返回注销页 → 坏结局「重新登录」", (n) => { n.ending = "none"; n.ending = "bad"; });
  return steps;
}

console.log("\n【文档顺序走查】按《游戏流程.md》步骤、用真实检索词逐步推进：");
docOrder().forEach((step, i) => console.log(`  ${String(i + 1).padStart(2, "0")}. ${step}`));

console.log("\n✅ 验证完成：从清空存档可按流程文档完整通关（好/坏结局均可选，全部档案可达，检索词与门槛一致）。");
