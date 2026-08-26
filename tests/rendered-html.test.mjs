import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/** 合并读取游戏源码（page + game 模块 + 音效模块），供内容契约断言 */
async function readGameSource() {
  const files = ["app/page.tsx", "app/game/types.ts", "app/game/data.ts", "app/game/components.tsx", "app/game/sound.ts"];
  const parts = [];
  for (const f of files) {
    parts.push(await readFile(new URL(`../${f}`, import.meta.url), "utf8"));
  }
  return parts.join("\n");
}

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
  const page = await readGameSource();

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
  const page = await readGameSource();

  // 时间线复原：五个正确事件按 03:00→04:09 排序
  assert.match(page, /TIMELINE_ANSWER = \["t-0300", "t-0406", "t-0407", "t-0408", "t-0409"\]/);
  assert.match(page, /证据不连续/);
  assert.match(page, /分轨净化/);
  assert.match(page, /stem-voice\.wav/);
  assert.match(page, /stem-crash\.wav/);
  assert.match(page, /LuvisDrug 资料卡/);
});

test("CASE 02 legacy account, notes and breach exist", async () => {
  const page = await readGameSource();

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
  const page = await readGameSource();

  assert.match(page, /COLD_BACKUP_PASSWORD = "XIBONUOSI"/);
  assert.match(page, /汐泊与零的歌单/);
  assert.match(page, /如果有一天你不再上线，我会把歌单听完/);
  assert.match(page, /潮汐/);
  assert.match(page, /天亮以后/);
  assert.match(page, /等我弄好信号就回来/);
  assert.match(page, /FRIEND-KEEP 策略提示：不得动用私情/);
  assert.match(page, /离线（用户主动）/);
  assert.match(page, /shio-farewell\.wav/);
  // 新内容：头像、噪音、干扰档案、告别转写、戏份深化
  assert.match(page, /avatars\/n9rtz\.svg/);
  assert.match(page, /avatars\/shio\.svg/);
  assert.match(page, /奶茶店第二杯半价/);
  assert.match(page, /例行维护公告/);
  assert.match(page, /取件码 2613/);
  // 噪音成员（干扰项）
  assert.match(page, /APXS/);
  assert.match(page, /Rtwyzz/);
  assert.match(page, /Roy/);
  // 主角实名线索允许出现
  assert.match(page, /茜，我该拉住你的/);
  assert.match(page, /晓茜/);
  // 其他人物真名在游戏内一律不揭示
  for (const name of ["巴印", "李铭泽", "王镓铭", "刘睿航", "李磊", "张贤德"]) {
    assert.doesNotMatch(page, new RegExp(name), `游戏源码不应出现真名：${name}`);
  }
  assert.match(page, /账号注销审计/);
  assert.doesNotMatch(page, /账号注销审计（李铭泽）/);
  assert.match(page, /HZ-COMPLIANCE/);
  assert.doesNotMatch(page, /我是巴印/);
  assert.match(page, /她每晚都在对不认识她的你说这句话/);
});

test("forget action clears all local game data", async () => {
  const page = await readGameSource();
  assert.match(page, /clearLocalData/);
  assert.match(page, /SAVE_PREFIX = "echos-"/);
  assert.match(page, /sessionStorage\.clear\(\)/);
  assert.match(page, /caches\.delete/);
});

test("cover image and avatars are shipped in public assets", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /cover\.png/);
  const cover = await import("node:fs/promises").then((fs) =>
    fs.stat(new URL("../public/cover.png", import.meta.url))
  );
  assert.ok(cover.size > 10000);
  const avatars = await import("node:fs/promises").then((fs) =>
    fs.readdir(new URL("../public/avatars", import.meta.url))
  );
  for (const name of ["n9rtz.svg", "shio.svg", "luvis.svg", "echo-assist.svg", "everyone.svg"]) {
    assert.ok(avatars.includes(name), `missing avatar ${name}`);
  }
});

test("CASE 04 identity check, memory block and endings exist", async () => {
  const page = await readGameSource();

  // 隐藏复核页三项结论
  assert.match(page, /Aka-0 是谁？/);
  assert.match(page, /晓茜/);
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
  const page = await readGameSource();

  assert.match(page, /SIGNAL_OBSTACLE_COUNT = 14/);
  assert.match(page, /保持信号/);
  assert.match(page, /04:09 · 信号恢复/);
  assert.match(page, /恭喜通关《AkaneRei Offline》/);
  assert.match(page, /最初的故事原稿/);
  assert.match(page, /创作者说/);
  assert.match(page, /#\/app\/completion/);
  // 音频分层
  assert.match(page, /AudioLayer/);
  assert.match(page, /background-suspense\.mp3/);
  assert.match(page, /background-horror\.mp3/);
  assert.match(page, /background-farewell\.mp3/);
  assert.match(page, /background-rain\.mp3/);
  assert.match(page, /bgmMuted/);
  // 音轨触发规则：farewell 覆盖 suspense（case03 后不再放悬疑曲）
  assert.match(page, /const farewell = game\.case03 === "done" \|\| game\.ending !== "none"/);
  assert.doesNotMatch(page, /case03 === "done" \|\| game\.case02 !== "none"/);
});

test("truth page is a separate static route with spoiler warning", async () => {
  const response = await render("/truth");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /全案真相/);
  assert.match(html, /完整剧透/);
  assert.match(html, /为了不断线而死/);
});

test("v0.4 flow gaps: welcome window, evidence confirm, Aka-0 archive, QA segments, camera, re-choice", async () => {
  const page = await readGameSource();

  // 首次登录信息窗（§0.6）：3 秒安静 → 消息提示音 → 摘要弹窗，仅全新存档
  assert.match(page, /welcomeShown/);
  assert.match(page, /WelcomeInfoWindow/);
  assert.match(page, /setShowWelcome\(true\), 3000/);
  assert.match(page, /ui-message\.wav/);

  // 新证据写入台账的低音确认提示（重复核验/刷新不播放）
  assert.match(page, /playEvidenceConfirm/);
  assert.match(page, /prev === null\) return; \/\/ 首次挂载（含刷新恢复）不播放/);
  assert.match(page, /ui-evidence\.wav/);

  // 零信号监视演出（§2.2）：返回按钮延迟出现、第二次点击低频噪音、第三次返回
  assert.match(page, /setShowEscape\(true\), 1400/);
  assert.match(page, /playSurveillanceNoise/);
  assert.match(page, /ui-surveillance-noise\.wav/);
  assert.match(page, /没有找到完全匹配的记录/);

  // Aka-0 暗线（§4.3）：确认后精确检索只返回只读归档
  assert.match(page, /Aka-0 账号身份复核归档/);
  assert.match(page, /hit === "Aka-0" && game\.aka0Confirmed/);

  // 四段质检回访随主线逐步开放
  for (const id of ["rec-qa-1", "rec-qa-2", "rec-qa-3", "rec-qa-4"]) {
    assert.match(page, new RegExp(id));
  }
  assert.match(page, /g\.case01 === "done"/); // 第一段：CASE 01 后
  assert.match(page, /该账号 208 天未掉线/);  // 第四段：冷备份解锁内容

  // 摄像头身份核验（§2.5）：拒绝/缺失/超时走历史特征回退，不阻断
  assert.match(page, /getUserMedia/);
  assert.match(page, /历史特征回退/);

  // 账号安全中心「账号来源与同名主体复核」（§4.1）
  assert.match(page, /账号来源与同名主体复核/);

  // 重新选择结局返回注销页（§5），而非直接切换另一结局
  assert.match(page, /onChoose\("none"\)/);

  // 默认全天候保留深夜雨声作为环境底噪；悬疑/惊悚/告别阶段才切换音轨
  assert.match(page, /return "rain";/);
  assert.match(page, /const suspense = game\.surveillanceSeen\["零信号"\] \|\| game\.case02 !== "none"/);
  assert.doesNotMatch(page, /return themed \? "rain" : "none"/);

  // N9Rtz 检索返回会话 + 资料卡（§1.2 / 检索范围表）
  assert.match(page, /N9Rtz 会话（事故夜后空白）/);

  // 软锁回归：CASE 02 完成后平台不再接受残留账号凭据（防止 case02 降级导致歌单/质检/事故门槛锁死）
  assert.match(page, /该残留账号已在身份侦测中断开/);
  assert.match(page, /r\.name === "legacy" && \(!game\.luvisLogin \|\| game\.case02 === "done"\)/);

  // 调试模式后门：搜索框输入调试码可跳关/触发结局
  assert.match(page, /APXS-NEXT/);
  assert.match(page, /APXS-END1/);
  assert.match(page, /APXS-END2/);
  assert.match(page, /debugNextCase/);
  assert.match(page, /debugEndGame/);

  // TEST-CAM：输入调试码后向浏览器请求摄像头权限
  assert.match(page, /TEST-CAM/);
  assert.match(page, /CameraTest/);
  assert.match(page, /getUserMedia\(\{ video: true, audio: false \}\)/);

  // 本地备份线索页（新窗口）：登录残留账号成功后弹窗，跨窗口同步写回存档
  assert.match(page, /legacyWindow/);
  assert.match(page, /#\/legacy/);
  assert.match(page, /onOpenLegacyWindow/);
  assert.match(page, /window\.open\(url, "_blank", "noopener"\)/);
  assert.match(page, /addEventListener\("storage"/);
  assert.match(page, /已找到线索 · 开启下一章节（CASE 03 冷备份）/);

  // 结局出口回归：结局页必须能返回首页（否则无法进入账号安全 → 遗忘重置）
  assert.match(page, /onBackHome/);
  assert.match(page, /返回首页/);
  assert.match(page, /想重新开始/);
});
