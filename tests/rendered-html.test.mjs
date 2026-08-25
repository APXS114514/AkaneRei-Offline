import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the ECHOS ARG opening performance", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>回声 ECHOS<\/title>/i);
  assert.match(html, /class="opening"/);
  assert.match(html, /人总以为，<b>连接<\/b>会一直在线/);
  assert.match(html, /跳过梦境/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("login screen exposes the ECHOS surface with locked credentials flow", async () => {
  const page = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
  );

  assert.match(page, /AkaneRei/);
  assert.match(page, /0408/);
  assert.match(page, /回声 ECHOS/);
  assert.match(page, /不要按顺序读。按你怀疑的内容去找/);
  assert.match(page, /遗忘 · 清除本机数据/);
  assert.match(page, /回声小助手/);
  assert.match(page, /汐泊诺思/);
  assert.match(page, /N9Rtz/);
  assert.match(page, /LuvisDrug/);
});

test("CASE 01 puzzles exist with locked answers", async () => {
  const page = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
  );

  // 时间线复原：五个正确事件按 03:00→04:09 排序
  assert.match(page, /TIMELINE_ANSWER = \["t-0300", "t-0406", "t-0407", "t-0408", "t-0409"\]/);
  assert.match(page, /证据不连续/);
  assert.match(page, /分轨净化/);
  assert.match(page, /stem-voice\.wav/);
  assert.match(page, /stem-crash\.wav/);
  assert.match(page, /LuvisDrug 资料卡/);
});

test("CASE 02 legacy account, notes and breach exist", async () => {
  const page = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
  );

  // 残留账号密码契约：波形 97.0 HZ + 摩斯 LOOP + 账号 ID
  assert.match(page, /LEGACY_PASSWORD = "hzloopluvisdrug"/);
  assert.match(page, /赫兹实验室 供应商备案/);
  assert.match(page, /赫兹文化基金 资金归拢/);
  assert.match(page, /第一个没有去向的好友/);
  assert.match(page, /钱归于一处去了/);
  assert.match(page, /不需要设备也能联通/);
  assert.match(page, /如果没有明天/);
  assert.match(page, /有人在等一个不会回复的人/);
  assert.match(page, /你是谁？/);
  assert.match(page, /你还在吗？/);
  assert.match(page, /快断开/);
  assert.match(page, /本文档没有终点/);
});

test("CASE 03 playlist and cold backup exist with locked password", async () => {
  const page = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
  );

  assert.match(page, /COLD_BACKUP_PASSWORD = "XIBONUOSI"/);
  assert.match(page, /汐泊与零的歌单/);
  assert.match(page, /如果有一天你不再上线，我会把歌单听完/);
  assert.match(page, /潮汐/);
  assert.match(page, /天亮以后/);
  assert.match(page, /等我弄好信号就回来/);
  assert.match(page, /FRIEND-KEEP 策略提示：不得动用私情/);
  assert.match(page, /离线（用户主动）/);
  assert.match(page, /shio-farewell\.wav/);
  // 角色实名契约
  assert.match(page, /实名.*巴印/);
  assert.match(page, /实名.*李铭泽/);
  assert.match(page, /王镓铭/);
});

test("CASE 04 identity check, memory block and endings exist", async () => {
  const page = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
  );

  // 隐藏复核页三项结论
  assert.match(page, /Aka-0 是谁？/);
  assert.match(page, /沈零/);
  assert.match(page, /紧急联系人/);
  // 身份核对原始字段
  assert.match(page, /事故时间戳/);
  assert.match(page, /账号创建日期/);
  assert.match(page, /最后一条语音文件时间戳/);
  // 记忆阻断：三份平台外记录
  assert.match(page, /急救回执/);
  assert.match(page, /运营商通话详单/);
  assert.match(page, /本地未同步录音/);
  assert.match(page, /CONNECTION-KEEP/);
  // 结局
  assert.match(page, /提交全部证据并注销账号/);
  assert.match(page, /晚安，不再是第一次见你/);
  assert.match(page, /今天也是第一次见你。/);
  assert.match(page, /重新选择结局/);
});

test("completion page and signal game exist", async () => {
  const page = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
  );

  assert.match(page, /SIGNAL_OBSTACLE_COUNT = 14/);
  assert.match(page, /保持信号/);
  assert.match(page, /04:09 · 信号恢复/);
  assert.match(page, /恭喜通关《AkaneRei 已离线》/);
  assert.match(page, /最初的故事原稿/);
  assert.match(page, /创作者说/);
  assert.match(page, /#\/app\/completion/);
});

test("truth page is a separate static route with spoiler warning", async () => {
  const response = await render("/truth");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /全案真相/);
  assert.match(html, /完整剧透/);
  assert.match(html, /为了不断线而死/);
});
