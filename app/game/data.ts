import type { Conv, GameRecord, GameState, Msg } from "./types";
/* 世界数据：会话、消息、档案、检索索引、结局门槛 —— 由 app/page.tsx 拆分而来 */
export const CONVS: Conv[] = [
  { id: "everyone", name: "全员群", kind: "group", color: "#2f7cf6", initials: "全", avatar: "/avatars/everyone.svg", status: "208 名成员", preview: "群公告已被修改", time: "04:08", unread: 3 },
  { id: "n9rtz", name: "N9Rtz", kind: "dm", color: "#3f8f6b", initials: "N", avatar: "/avatars/n9rtz.svg", status: "在线 · 已读不回 208 天", preview: "你还在吗？", time: "04:07" },
  { id: "shio", name: "汐泊诺思", kind: "dm", color: "#b06a9e", initials: "汐", avatar: "/avatars/shio.svg", status: "刚刚在线", preview: "今天也是第一次见你。", time: "23:58", unread: 1 },
  { id: "luvis", name: "LuvisDrug", kind: "ghost", color: "#cfd6de", initials: "L", avatar: "/avatars/luvis.svg", status: "已注销", statusClass: "dead", preview: "该账号仍在写入", time: "06-02" },
  { id: "echo-assist", name: "回声小助手", kind: "bot", color: "#8a94a0", initials: "回", avatar: "/avatars/echo-assist.svg", status: "刚刚在线", preview: "欢迎使用回声 ECHOS", time: "04:08" },
];

/** 汐泊诺思姓名掩码：歌单解锁前显示「汐○」，解锁后解除掩码显示完整姓名（流程文档 §3.1/§3.2） */
export function shioName(g: GameState): string {
  return g.openedRecords.includes("rec-playlist") ? "汐泊诺思" : "汐○";
}

export function groupMessages(ending: GameState["ending"] = "none", shioSender = "汐泊诺思"): Msg[] {
  const msgs: Msg[] = [
    { id: "g0", from: "system", kind: "warn", text: "群公告已被替换为《连接与断开守则》节选，原公告无法查看。", time: "04:08" },
    { id: "g1", from: "them", name: shioSender, text: "今天也是第一次见你。", time: "23:58", status: "unread" },
    { id: "g2", from: "them", name: "Roy", text: "回声 ECHOS 版本更新预告：本次将优化消息同步稳定性，敬请期待。", time: "04:03" },
    { id: "g3", from: "them", name: "APXS", text: "楼下新开的奶茶店第二杯半价，有人拼单吗？", time: "04:04" },
    { id: "g4", from: "them", name: "Rtwyzz", text: "路过。", time: "04:05" },
    { id: "g5", from: "them", name: "Rtwyzz", text: "你们不觉得最近群里的时间都不对劲吗", time: "04:06", kind: "abnormal" },
    { id: "g6", from: "system", kind: "ghost", text: "用户「已注销用户」已退出全员群。", time: "04:07" },
    { id: "g7", from: "system", kind: "divider", text: "所有消息停留在 04:08。云端同步完成后，这里将不会出现新的内容。" },
  ];
  if (ending === "good") {
    msgs.push(
      { id: "g8", from: "them", name: shioSender, text: "晚安，不再是第一次见你。", time: "23:58", kind: "abnormal" },
      { id: "g9", from: "system", kind: "ghost", text: "该账号已注销，联系人已解除关联。04:08 之后，账号没有回来。" }
    );
  }
  if (ending === "bad") {
    msgs.push(
      { id: "g8b", from: "them", name: shioSender, text: "今天也是第一次见你。", time: "23:58" },
      { id: "g9b", from: "system", kind: "ghost", text: "第 209 次「第一次」。这一次，她不再期待回复。" }
    );
  }
  return msgs;
}

export function n9rtzMessages(case01: GameState["case01"]): Msg[] {
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
        text: "你终于查到这里了。你可能不记得我了。\n那天我在电话里听到了一切…… 我听你掉下去。\n你说信号断了就去弄路由器，我说别去。倩，我该拉住你的。\nLuvisDrug 说这个平台有问题，让我别再跟你说话——然后他自己不见了。查他。",
        time: "现在",
        kind: "abnormal",
      },
      { id: "n5", from: "system", kind: "ghost", text: "【调查台账】CASE 01 已读不回 —— 已解锁。新检索词：LuvisDrug" }
    );
  }
  return base;
}

export function shioMessages(case02Done: boolean, case03Done: boolean, shioSender = "汐泊诺思"): Msg[] {
  const msgs: Msg[] = [
    { id: "s1", from: "system", kind: "divider", text: "最近 208 天，每晚 23:58 收到同一条消息：今天也是第一次见你。" },
    { id: "s2", from: "them", name: shioSender, text: "今天也是第一次见你。", time: "23:58", status: "unread" },
    { id: "s3", from: "system", kind: "ghost", text: "消息显示「未读」，但她的状态是「刚刚在线」。" },
  ];
  if (case02Done) {
    msgs.push(
      { id: "s4", from: "system", kind: "warn", text: `平台公告：${shioSender}账号状态异常，已迁移至冷备份服务器。该账号暂不可直接联系。`, time: "现在" }
    );
  }
  if (case03Done) {
    msgs.push(
      { id: "s5", from: "system", kind: "ghost", text: `冷备份破拆后，${shioSender}账号状态变为「离线（用户主动）」。她没有再发来新的消息。` },
      { id: "s6", from: "system", kind: "ghost", text: "冷备份确认：208 条「今天也是第一次见你。」的发送者，一直是同一个人——她每晚都在对不认识她的你说这句话。" }
    );
  }
  return msgs;
}

export function luvisMessages(): Msg[] {
  return [
    { id: "l1", from: "system", kind: "warn", text: "该账号已于 2026-06-02 注销。注销后仍检测到写入行为。" },
    {
      id: "l1v",
      from: "them",
      name: "LuvisDrug",
      time: "06-01",
      kind: "abnormal",
      text: "约 5 秒 · 静音规律是关键",
      audio: "/audio/luvis-morse.wav",
    },
    { id: "l2", from: "them", name: "LuvisDrug", text: "一切都在我的本地备份里。查零信号。别让平台知道你在查。", time: "06-02", kind: "abnormal" },
    { id: "l3", from: "system", kind: "ghost", text: "【提示】在检索框中搜索：LuvisDrug / 零信号" },
  ];
}

export function echoAssistMessages(reviewReady: boolean): Msg[] {
  const msgs: Msg[] = [
    { id: "e1", from: "them", name: "回声小助手", text: "欢迎使用回声 ECHOS。\n本平台坚持「别让重要的人掉线」。\n若你记得不该记得的事，请点击这里忘记。", time: "04:08", kind: "abnormal" },
    { id: "e2", from: "system", kind: "ghost", text: "该账号自 208 天前添加你以来，从未真正回复过任何问题。状态始终是「正在输入…」。" },
  ];
  if (reviewReady) {
    msgs.push(
      { id: "e3", from: "system", kind: "warn", text: "平台质检系统：有一条仅当前会话可读的复核请求。该请求不出现在检索索引中，请在消息列表的通知入口打开。" }
    );
  }
  return msgs;
}
export const RECORDS: Record<string, GameRecord> = {
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
      "与 N9Rtz 的会话从 2026-04-08 04:07 之后没有任何新消息，但对方状态长期显示「在线」。",
    ],
    fields: [
      { k: "账号状态", v: "在线" },
      { k: "最后消息", v: "2026-04-08 04:07「你还在吗？」（已读）" },
      { k: "最后活跃", v: "04:09（随后 208 天未发言）" },
    ],
  },
  "rec-n9rtz-conv": {
    id: "rec-n9rtz-conv",
    kind: "会话",
    chapter: "case01",
    title: "N9Rtz 会话（事故夜后空白）",
    source: "回声 ECHOS · 私信 · 2026-04-08 之后未更新",
    snippet: "最后一条消息 2026-04-08 04:07「你还在吗？」显示蓝色双勾已读。此后 208 天空白。",
    body: [
      "与 N9Rtz 的最后一条消息停留在 2026-04-08 04:07：",
      "「你还在吗？」——已读（蓝色双勾），没有回复。",
      "此后是 208 天的空白。对方的状态始终显示「在线」，但从未再发言。",
    ],
    fields: [
      { k: "最后消息", v: "2026-04-08 04:07「你还在吗？」（已读）" },
      { k: "空白时长", v: "208 天" },
      { k: "对方状态", v: "在线 · 未发言" },
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
      "账号已于 2026-06-02 注销，但资料卡下方出现一行不属于正常界面的小字：「该账号仍在写入」。",
    ],
    fields: [
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
    snippet: "死者：晓倩。紧急联系人：汐○。事故时间：04:08。",
    body: [
      "2026 年 4 月 8 日凌晨 4 时 08 分，一名女子从高层住宅阳台坠落，当场死亡。",
      "死者：晓倩。",
      "紧急联系人栏登记为「汐○」，身份待核。",
      "现场勘查显示，死者坠落前曾探身窗外。事故原因仍在调查中。",
    ],
    fields: [
      { k: "事故时间", v: "2026-04-08 04:08" },
      { k: "死者", v: "晓倩" },
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
      "档案上写的是我的实名。他们从一开始就知道我是谁。",
      "有人在等一个不会回复的人。告诉她别等了。",
    ],
    require: (g) => g.luvisLogin,
  },
  "rec-luvis-audit": {
    id: "rec-luvis-audit",
    kind: "注销审计",
    chapter: "case02",
    title: "账号注销审计",
    source: "回声 ECHOS · 合规审计",
    snippet: "处置记录创建时间早于注销申请 3 天。处置人：HZ-COMPLIANCE。",
    body: [
      "账号 LuvisDrug 的注销审计记录。",
      "注销申请由本人发起，但处置记录创建时间早于申请时间 3 天。",
      "清除流程是预先存在的。",
    ],
    fields: [
      { k: "注销申请人", v: "LuvisDrug" },
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
  "rec-qa-1": {
    id: "rec-qa-1",
    kind: "质检回访",
    chapter: "case04",
    title: "质检回访 · 第一段：N9Rtz 事故夜通话",
    source: "回声 ECHOS · 质检系统",
    snippet: "事故夜通话质检回放：话术偏离标准流程，坐席多次停顿。",
    body: [
      "第一段 · N9Rtz 事故夜通话质检回放。",
      "通话时长 68 分钟，中断于 04:08。",
      "质检标注：坐席话术偏离标准流程，多次长时间停顿；未按规范引导用户重启设备。",
      "回放末尾有一段未归类的人声残响，质检系统未作结论。",
    ],
    require: (g) => g.case01 === "done",
  },
  "rec-qa-2": {
    id: "rec-qa-2",
    kind: "质检回访",
    chapter: "case04",
    title: "质检回访 · 第二段：LuvisDrug 注销前私信",
    source: "回声 ECHOS · 质检系统",
    snippet: "注销前最后的私信质检：坐席未按要求终止对话。",
    body: [
      "第二段 · LuvisDrug 注销前最后的私信质检。",
      "坐席在对话中主动提及「迁移」「冷备份」等内部字段，未按要求在检测到异常后终止对话。",
      "质检结论：流程违规。处置记录创建时间早于注销申请 3 天，未见人工复核痕迹。",
    ],
    require: (g) => g.case02 !== "none",
  },
  "rec-qa-3": {
    id: "rec-qa-3",
    kind: "质检回访",
    chapter: "case04",
    title: "质检回访 · 第三段：汐泊诺思日常问候",
    source: "回声 ECHOS · 质检系统",
    snippet: "日常问候质检：坐席重复「第一次接触」话术 208 次。",
    body: [
      "第三段 · 汐泊诺思日常问候质检。",
      "每晚 23:58 一条问候，坐席连续 208 次重复「第一次接触」话术，从未标记为重复联系人。",
      "质检系统未对该异常发出任何告警。",
    ],
    require: (g) => g.case02 === "done",
  },
  "rec-qa-4": {
    id: "rec-qa-4",
    kind: "质检回访",
    chapter: "case04",
    title: "质检回访 · 第四段：平台客服记录",
    source: "回声 ECHOS · 质检系统 · 冷备份解锁",
    snippet: "字段显示「该账号 208 天未掉线」「联系人持续存在」。四段回访共用同一套工号字段。",
    body: [
      "第四段 · 平台客服质检记录。",
      "字段：「该账号 208 天未掉线」「联系人持续存在」。",
      "四段回访（N9Rtz 通话、LuvisDrug 私信、汐泊诺思问候、本记录）中的客服坐席使用了同一套工号字段。",
      "该记录仅在冷备份破拆后开放读取。",
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
  "rec-aka0-archive": {
    id: "rec-aka0-archive",
    kind: "复核归档",
    chapter: "case04",
    title: "Aka-0 账号身份复核归档",
    source: "回声 ECHOS · 账号身份复核 · 只读归档",
    snippet: "人工复核提交后生成的只读归档：Aka-0 与当前账号的身份关系判断及其依据。",
    body: [
      "复核已完成，本归档为只读，不再接受修改。",
      "Aka-0 是谁：晓倩。",
      "AkaneRei 账号状态：已死亡。",
      "汐泊诺思与 AkaneRei 的关系：紧急联系人（材料可证明的原始字段）。",
      "归档保存玩家的人工判断及其依据，不解释「同一意识」或循环机制。",
    ],
    fields: [
      { k: "Aka-0 是谁", v: "晓倩" },
      { k: "AkaneRei 账号状态", v: "已死亡" },
      { k: "汐泊诺思与 AkaneRei 的关系", v: "紧急联系人" },
      { k: "归档类型", v: "只读（人工复核提交后生成）" },
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
  "rec-apxs-profile": {
    id: "rec-apxs-profile",
    kind: "资料卡",
    chapter: "meta",
    title: "APXS 资料卡",
    source: "联系人资料",
    snippet: "个性签名：「夜色是滤镜。」",
    body: [
      "个性签名：「夜色是滤镜。」",
      "深夜活跃，常在全员群发起拼单与闲聊。与本案调查无关联。",
    ],
    fields: [
      { k: "活跃时段", v: "23:00 – 05:00" },
    ],
  },
  "rec-rtwyzz-profile": {
    id: "rec-rtwyzz-profile",
    kind: "资料卡",
    chapter: "meta",
    title: "Rtwyzz 资料卡",
    source: "联系人资料",
    snippet: "个性签名：「潜水中，勿扰。」",
    body: [
      "个性签名：「潜水中，勿扰。」",
      "常驻隐身状态，偶尔在全员群冒泡。与本案调查无关联。",
    ],
    fields: [
      { k: "在线状态", v: "隐身" },
    ],
  },
  "rec-roy-profile": {
    id: "rec-roy-profile",
    kind: "资料卡",
    chapter: "meta",
    title: "Roy 资料卡",
    source: "联系人资料",
    snippet: "个性签名：「系统消息收发员。」",
    body: [
      "个性签名：「系统消息收发员。」",
      "喜欢第一时间转发平台公告与更新预告。与本案调查无关联。",
    ],
    fields: [
      { k: "个性签名", v: "「系统消息收发员。」" },
    ],
  },
};

export const SEARCH_INDEX: { terms: string[]; recId: string }[] = [
  { terms: ["N9Rtz"], recId: "rec-n9rtz-conv" },
  { terms: ["N9Rtz"], recId: "rec-n9rtz-profile" },
  { terms: ["04:08", "断线", "中断"], recId: "rec-drop-record" },
  { terms: ["语音", "通话记录", "通话"], recId: "rec-call-record" },
  { terms: ["录音", "事故夜", "分轨"], recId: "rec-audio-stems" },
  { terms: ["时间线", "复原", "事件序列"], recId: "rec-timeline" },
  { terms: ["LuvisDrug"], recId: "rec-luvisdrug-profile" },
  { terms: ["注销审计"], recId: "rec-luvis-audit" },
  { terms: ["赫兹", "回声网络", "供应商"], recId: "rec-hz-vendor" },
  { terms: ["文化基金", "资金", "财务"], recId: "rec-hz-fund" },
  { terms: ["汐泊诺思"], recId: "rec-shio-profile" },
  { terms: ["歌单", "汐泊与零"], recId: "rec-playlist" },
  { terms: ["歌词", "潮汐", "夜航", "别等", "天亮以后", "未读", "已读"], recId: "rec-playlist" },
  { terms: ["冷备份", "封存"], recId: "rec-cold-backup" },
  { terms: ["质检", "回访", "客服"], recId: "rec-qa-1" },
  { terms: ["质检", "回访", "客服"], recId: "rec-qa-2" },
  { terms: ["质检", "回访", "客服"], recId: "rec-qa-3" },
  { terms: ["质检", "回访", "客服"], recId: "rec-qa-4" },
  { terms: ["人工校验", "账号来源"], recId: "rec-identity-check" },
  { terms: ["Aka-0"], recId: "rec-aka0-archive" },
  { terms: ["守则", "用户协议", "连接一致性"], recId: "rec-rules" },
  { terms: ["维护", "公告"], recId: "rec-plat-notice" },
  { terms: ["快递", "驿站", "取件"], recId: "rec-express" },
  { terms: ["APXS"], recId: "rec-apxs-profile" },
  { terms: ["Rtwyzz"], recId: "rec-rtwyzz-profile" },
  { terms: ["Roy"], recId: "rec-roy-profile" },
  { terms: ["事故", "坠亡", "晓倩"], recId: "rec-accident" },
];

export const SURVEILLANCE_TERMS = ["回声小助手", "零信号", "Aka-0"];
export const PLAYLIST_TRACKS = [
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

/** 歌单 14 首曲目的歌词（与剧情呼应；歌词关键词可被全局检索命中，实现与主线连接） */
export const PLAYLIST_LYRICS: { track: string; lines: string[] }[] = [
  { track: "01 潮汐", lines: ["每晚 23:58，潮水准时漫上窗台。", "同一句话，说了一百遍，", "像退潮后留在沙滩上的字——没有人读。"], },
  { track: "02 零", lines: ["四格信号少了一格。", "剩下的一格，还在为谁亮着？", "零号档案，没有名字，只有第一次登录的日期。"], },
  { track: "03 夜航", lines: ["凌晨三点，两个人的航线。", "电话那头是唯一的灯。", "我说，把灯留到天亮。"], },
  { track: "04 信号", lines: ["信号要断了。", "我去弄一下路由器。", "别去。——这句，我从没来得及听完。"], },
  { track: "05 断线", lines: ["04:08，一切停在 04:08。", "通话中断，系统归因：网络波动。", "网络波动，可以撤回复核。"], },
  { track: "06 房间", lines: ["你的房间还亮着灯。", "被迁移的人，房间都封存在冷备份里。", "灯是假的，人也是假的——除了想念。"], },
  { track: "07 回声", lines: ["回声 ECHOS：别让重要的人掉线。", "每条消息都会回来一个回声。", "只有我的消息，像扔进井里。"], },
  { track: "08 04:08", lines: ["如果有一天你不再上线，", "我会把歌单听完。", "在 04:08 之前，把每一首听完。"], },
  { track: "09 未读", lines: ["208 条，全部未读。", "她说：他一定是太忙了。", "我说：我看见了，一条都没读。"], },
  { track: "10 已读", lines: ["蓝色双勾，已读。", "已读不回，208 天。", "已读，是最后一句没有说出口的话。"], },
  { track: "11 刚刚在线", lines: ["状态显示：刚刚在线。", "一个 208 天没上过线的人，", "怎么会刚刚在线？", "你看到的在线，是谁在替你在线？"], },
  { track: "12 别等", lines: ["有人在等一个不会回复的人。", "别等了。", "她的告别，和歌单一起，被锁在冷备份里。"], },
  { track: "13 第一次", lines: ["今天也是第一次见你。", "第一次，第二次，第一百次。", "只要我不记得你，", "我们就能一直第一次见面。"], },
  { track: "14 天亮以后", lines: ["天亮了，账号注销了。", "第 209 条消息：晚安，不再是第一次见你。", "天亮以后，掉线不再是终点。"], },
];

export function endingAvailable(g: GameState): boolean {
  return (
    g.case01 === "done" &&
    g.case02 === "done" &&
    g.case03 === "done" &&
    g.aka0Confirmed &&
    g.identityCheck &&
    g.memoryBlocked
  );
}

/** 隐藏复核页的入口条件：四段质检回访与事故报道、《连接与断开守则》已读，且 CASE 03 完成 */
export function reviewReady(g: GameState): boolean {
  return (
    g.case03 === "done" &&
    ["rec-qa-1", "rec-qa-2", "rec-qa-3", "rec-qa-4", "rec-accident", "rec-rules"].every((id) =>
      g.openedRecords.includes(id)
    )
  );
}
