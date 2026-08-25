import type { Conv, GameRecord, GameState, Msg } from "./types";
/* 世界数据：会话、消息、档案、检索索引、结局门槛 —— 由 app/page.tsx 拆分而来 */
export const CONVS: Conv[] = [
  { id: "everyone", name: "全员群", kind: "group", color: "#2f7cf6", initials: "全", avatar: "/avatars/everyone.svg", status: "208 名成员", preview: "群公告已被修改", time: "04:08", unread: 3 },
  { id: "n9rtz", name: "N9Rtz", kind: "dm", color: "#3f8f6b", initials: "N", avatar: "/avatars/n9rtz.svg", status: "在线 · 已读不回 208 天", preview: "你还在吗？", time: "04:07" },
  { id: "shio", name: "汐泊诺思", kind: "dm", color: "#b06a9e", initials: "汐", avatar: "/avatars/shio.svg", status: "刚刚在线", preview: "今天也是第一次见你。", time: "23:58", unread: 1 },
  { id: "luvis", name: "LuvisDrug", kind: "ghost", color: "#cfd6de", initials: "L", avatar: "/avatars/luvis.svg", status: "已注销", statusClass: "dead", preview: "该账号仍在写入", time: "06-02" },
  { id: "echo-assist", name: "回声小助手", kind: "bot", color: "#8a94a0", initials: "回", avatar: "/avatars/echo-assist.svg", status: "刚刚在线", preview: "欢迎使用回声 ECHOS", time: "04:08" },
];

export function groupMessages(): Msg[] {
  return [
    { id: "g0", from: "system", kind: "warn", text: "群公告已被替换为《连接与断开守则》节选，原公告无法查看。", time: "04:08" },
    { id: "g1", from: "them", name: "汐泊诺思", text: "今天也是第一次见你。", time: "23:58", status: "unread" },
    { id: "g2", from: "them", name: "Roy", text: "回声 ECHOS 版本更新预告：本次将优化消息同步稳定性，敬请期待。", time: "04:03" },
    { id: "g3", from: "them", name: "APXS", text: "楼下新开的奶茶店第二杯半价，有人拼单吗？", time: "04:04" },
    { id: "g4", from: "them", name: "Rtwyzz", text: "路过。", time: "04:05" },
    { id: "g5", from: "them", name: "Rtwyzz", text: "你们不觉得最近群里的时间都不对劲吗", time: "04:06", kind: "abnormal" },
    { id: "g6", from: "system", kind: "ghost", text: "用户「已注销用户」已退出全员群。", time: "04:07" },
    { id: "g7", from: "system", kind: "divider", text: "所有消息停留在 04:08。云端同步完成后，这里将不会出现新的内容。" },
  ];
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
        text: "你终于查到这里了。我是巴印——你可能不记得了。\n那天我在电话里听到了一切…… 我听你掉下去。\n你说信号断了就去弄路由器，我说别去。茜，我该拉住你的。\nLuvisDrug 说这个平台有问题，让我别再跟你说话——然后他自己不见了。查他。",
        time: "现在",
        kind: "abnormal",
      },
      { id: "n5", from: "system", kind: "ghost", text: "【调查台账】CASE 01 已读不回 —— 已解锁。新检索词：LuvisDrug" }
    );
  }
  return base;
}

export function shioMessages(case02Done: boolean, case03Done: boolean): Msg[] {
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

export function luvisMessages(): Msg[] {
  return [
    { id: "l1", from: "system", kind: "warn", text: "该账号已于 2026-06-02 注销。注销后仍检测到写入行为。" },
    { id: "l2", from: "them", name: "LuvisDrug", text: "一切都在我的本地备份里。查零信号。别让平台知道你在查。", time: "06-02", kind: "abnormal" },
    { id: "l3", from: "system", kind: "ghost", text: "【提示】在检索框中搜索：LuvisDrug / 零信号" },
  ];
}

export function echoAssistMessages(): Msg[] {
  return [
    { id: "e1", from: "them", name: "回声小助手", text: "欢迎使用回声 ECHOS。\n本平台坚持「别让重要的人掉线」。\n若你记得不该记得的事，请点击这里忘记。", time: "04:08", kind: "abnormal" },
    { id: "e2", from: "system", kind: "ghost", text: "该账号自 208 天前添加你以来，从未真正回复过任何问题。状态始终是「正在输入…」。" },
  ];
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
  "rec-apxs-profile": {
    id: "rec-apxs-profile",
    kind: "资料卡",
    chapter: "meta",
    title: "APXS 资料卡",
    source: "联系人资料",
    snippet: "实名：刘睿航。个性签名：「夜色是滤镜。」",
    body: [
      "实名：刘睿航。",
      "个性签名：「夜色是滤镜。」",
      "深夜活跃，常在全员群发起拼单与闲聊。与本案调查无关联。",
    ],
    fields: [
      { k: "实名", v: "刘睿航" },
      { k: "活跃时段", v: "23:00 – 05:00" },
    ],
  },
  "rec-rtwyzz-profile": {
    id: "rec-rtwyzz-profile",
    kind: "资料卡",
    chapter: "meta",
    title: "Rtwyzz 资料卡",
    source: "联系人资料",
    snippet: "实名：李磊。个性签名：「潜水中，勿扰。」",
    body: [
      "实名：李磊。",
      "个性签名：「潜水中，勿扰。」",
      "常驻隐身状态，偶尔在全员群冒泡。与本案调查无关联。",
    ],
    fields: [
      { k: "实名", v: "李磊" },
      { k: "在线状态", v: "隐身" },
    ],
  },
  "rec-roy-profile": {
    id: "rec-roy-profile",
    kind: "资料卡",
    chapter: "meta",
    title: "Roy 资料卡",
    source: "联系人资料",
    snippet: "实名：张贤德。个性签名：「系统消息收发员。」",
    body: [
      "实名：张贤德。",
      "个性签名：「系统消息收发员。」",
      "喜欢第一时间转发平台公告与更新预告。与本案调查无关联。",
    ],
    fields: [
      { k: "实名", v: "张贤德" },
      { k: "个性签名", v: "「系统消息收发员。」" },
    ],
  },
};

export const SEARCH_INDEX: { terms: string[]; recId: string }[] = [
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
  { terms: ["APXS", "刘睿航"], recId: "rec-apxs-profile" },
  { terms: ["Rtwyzz", "李磊"], recId: "rec-rtwyzz-profile" },
  { terms: ["Roy", "张贤德"], recId: "rec-roy-profile" },
  { terms: ["事故", "坠亡", "晓茜"], recId: "rec-accident" },
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

/** 隐藏复核页的入口条件：四段质检回访与事故报道已读，且 CASE 03 完成 */
export function reviewReady(g: GameState): boolean {
  return (
    g.case03 === "done" &&
    g.openedRecords.includes("rec-quality-audit") &&
    g.openedRecords.includes("rec-accident")
  );
}
