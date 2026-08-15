// Seal JS API 类型声明（vendored，按 Go 实现事实对齐）
// - 事实基准: https://github.com/sealdice/sealdice-core (master 755c106, 2026-08-10)
//   - seal 对象注册: dice/dice_jsvm.go:126-669
//   - struct 定义: dice/dice.go / dice/im_session.go / dice/cmd_parse.go /
//     dice/dice_ban.go / dice/config.go / dice/ext_coc7.go / model/group_info.go /
//     message/message.go / dice/events/*.go（字段名以 `jsbind` tag 为准；
//     无 jsbind tag 的字段不暴露（goja tagFieldNameMapper 语义）；Go nil 指针在 JS 侧为 null）
// - 交叉参考: https://raw.githubusercontent.com/sealdice/sealdice-js-ext-template/master/types/seal.d.ts
//   （master b3a52a9, 2026-08-08；仅作注释参考，签名与字段一律以 Go 源为准）
// - 交叉核对: 上游 PR sealdice/sealdice-js-ext-template#12（对齐 v1.6.0 e3b6c81）方向核对，
//   ValueMap 方法集 / segment 元素 / EndPointInfo 字段提升等经 dicescript c4c99fe 与 goja 源码证实后并入
// - 文档参考: https://docs.sealdice.com/advanced/js_api_list.html
//   （抓取时点 sha256:5a8becfe421a61f65cc4398fb92236a462775f26d6ebf6d5088669490aae0e07）
// - 同步日期: 2026-08-16
// - 同步流程:
//   1. 对照 dice/dice_jsvm.go 的 seal 注册块与相关 struct 的 jsbind tag 核对/修改
//   2. 更新本头部的事实基准 SHA 与同步日期
// - 本地补丁/修正（相对上游 js-ext-template 声明）:
//   1. ext.find / ban.getUser / ext.getConfig 返回类型补 `| null`（Go nil → JS null）
//   2. seal.vars 补 computedGet/computedSet；seal.deck 补 reload（上游声明缺失）
//   3. register*Config / registerConfig / registerTask 按 Go 签名修正（group 参数、错误语义、taskCtx 回调）
//   4. EndPointInfo：goja 提升嵌入结构体字段到顶层，同时保留 baseInfo（字段相同）
//   5. ValueMap 按 dicescript c4c99fe 实际方法集重写（load/store/delete/…，原 get/set/del 已过时）
//   6. Message.segment 具型为 8 种消息段元素；Sender/AtInfo 补 isRobot；GroupInfo 补 enteredTime/inviteUserId
//   7. 删除不存在的 storageGetRaw/storageSetRaw；补 storageClose
//   8. 增加全局 atob/btoa（dice/dice_jsvm.go:622-637）
//   9. 删除多写字段：messageType / groupName / valueMapTemp / matched / adapter
//      （Go 侧存在但无 jsbind tag，运行时并不暴露给 JS）
// - 注意: 运行时 Object.freeze(seal 及 deck/coc/ext/vars)（dice_jsvm.go:669），不可 monkey-patch
declare namespace seal {
  // ===== 消息与上下文 =====

  /** 信息上下文（dice/im_session.go:804） */
  export interface MsgContext {
    /** 当前群信息；私聊或非群场景为 null */
    group: GroupInfo | null;
    /** 当前群的玩家数据；可能为 null */
    player: GroupPlayerInfo | null;
    /** 通信端点 */
    endPoint: EndPointInfo;
    /** 当前群内是否启用bot（注:强制@时这个值也是true，此项是给特殊指令用的） */
    isCurGroupBotOn: boolean;
    /** 是否私聊 */
    isPrivate: boolean;
    /** 暗骰来源群号 */
    commandHideFlag: string;
    /** 权限等级 -30禁止 40邀请者 50管理 60群主 70信任 100master */
    privilegeLevel: number;
    /** 代骰附加文本 */
    delegateText: string;
    /** 向通知列表发送消息（dice/im_session.go:2700） */
    notice(txt: string, ...noticeTypes: string[]): void;
  }

  /** 群信息（dice/im_session.go:77） */
  export interface GroupInfo {
    /** 是否在群内开启（过渡为象征意义） */
    active: boolean;
    groupId: string;
    guildId: string;
    channelId: string;
    groupName: string;
    /** COC规则序号 */
    cocRuleIndex: number;
    /** 当前log名字，若未开启为空 */
    logCurName: string;
    /** 当前log是否开启 */
    logOn: boolean;
    /** 最近骰子发送时间(时间戳) */
    recentDiceSendTime: number;
    /** 是否显示入群迎新信息 */
    showGroupWelcome: boolean;
    /** 入群迎新文本 */
    groupWelcomeMessage: string;
    /** 入群时间(时间戳) */
    enteredTime: number;
    /** 邀请人ID */
    inviteUserId: string;
  }

  /** 群内玩家数据（model/group_info.go:21） */
  export interface GroupPlayerInfo {
    /** 用户昵称 */
    name: string;
    /** 用户ID */
    userId: string;
    /** 上次执行指令时间 */
    lastCommandTime: number;
    /** 名片模板 */
    autoSetNameTemplate: string;
  }

  /**
   * 键值对数据表（dicescript.ValueMap，valuemap.go c4c99fe）。
   * 值类型为 VMValue 的 JS 暴露形态，无法静态刻画，用 unknown 表示。
   * 注意：当前没有公开 API 返回该类型，保留定义以便未来使用。
   */
  export interface ValueMap {
    /** 读取 key；[值, 是否存在] */
    load(key: string): [unknown, boolean];
    /** 写入 key=value */
    store(key: string, value: unknown): void;
    /** 删除 key */
    delete(key: string): void;
    /** 数据数量 */
    length(): number;
    /** 清空全部数据 */
    clear(): void;
    /** 遍历全部键值；回调返回 false 时停止遍历 */
    range(fn: (key: string, value: unknown) => boolean): void;
    /** 若 key 存在则返回其值，否则写入并返回 value；第二个返回值为是否已存在 */
    loadOrStore(key: string, value: unknown): [unknown, boolean];
    /** 若 key 存在则返回其值，否则返回 null */
    mustLoad(key: string): unknown;
    /** 删除并返回原值；第二个返回值为是否存在 */
    loadAndDelete(key: string): [unknown, boolean];
    /** 序列化为 JSON 字符串 */
    toJSON(): string;
  }

  /** 消息详情（dice/im_session.go:49） */
  export interface Message {
    /** 发送时间 */
    time: number;
    /** 群消息/私聊消息 */
    messageType: 'group' | 'private';
    /** 群ID */
    groupId: string;
    /** 服务器ID */
    guildId: string;
    /** 频道ID（discord/kook/dodo 等平台） */
    channelId: string;
    /** 发送者信息 */
    sender: Sender;
    /** 消息内容 */
    message: string;
    /** 原始ID，用于撤回等情况 */
    rawId: string | number;
    /** 当前平台，如QQ */
    platform: string;
    /** 消息段（富文本元素），部分平台（如 Milky）支持，其余为空数组 */
    segment: MessageSegment[];
  }

  /** 消息段元素类型编号（message/message.go ElementType） */
  export type MessageElementType =
    | 0 // 文本 Text
    | 1 // 艾特 At
    | 2 // 文件 File
    | 3 // 图片 Image
    | 4 // 文字转语音 TTS
    | 5 // 回复 Reply
    | 6 // 语音 Record
    | 7 // 表情 Face
    | 8 // 戳一戳 Poke
    | -1; // Default 兜底（不认识的类型）

  /** 消息段元素联合（各元素通过 type() 方法区分） */
  export type MessageSegment =
    | TextElement
    | AtElement
    | FileElement
    | ImageElement
    | TTSElement
    | ReplyElement
    | RecordElement
    | FaceElement
    | PokeElement;

  /** 文本元素 */
  export interface TextElement {
    content: string;
    type(): MessageElementType;
  }

  /** 艾特元素 */
  export interface AtElement {
    target: string;
    isRobot: boolean;
    type(): MessageElementType;
  }

  /** 文件元素 */
  export interface FileElement {
    contentType: string;
    /** 本地临时文件路径 */
    file: string;
    url: string;
    type(): MessageElementType;
  }

  /** 图片元素 */
  export interface ImageElement {
    /** URL 形式时可能为 null */
    file: FileElement | null;
    url: string;
    type(): MessageElementType;
  }

  /** 文字转语音元素 */
  export interface TTSElement {
    content: string;
    type(): MessageElementType;
  }

  /** 回复元素 */
  export interface ReplyElement {
    /** 回复的目标消息ID */
    replySeq: string;
    /** 回复的目标消息发送者ID */
    sender: string;
    /** 回复群聊消息时的群号 */
    groupID: string;
    /** 回复的消息内容 */
    elements: MessageSegment[];
    type(): MessageElementType;
  }

  /** 语音元素 */
  export interface RecordElement {
    /** URL 形式时可能为 null */
    file: FileElement | null;
    type(): MessageElementType;
  }

  /** 表情元素 */
  export interface FaceElement {
    faceID: string;
    type(): MessageElementType;
  }

  /** 戳一戳元素 */
  export interface PokeElement {
    target: string;
    type(): MessageElementType;
  }

  /** 发送者信息（dice/im_session.go:37） */
  export interface Sender {
    nickname: string;
    userId: string;
    /** 是否机器人 */
    isRobot: boolean;
  }

  /**
   * 通信端点（dice/im_session.go:440）。
   * goja 将嵌入的 EndPointInfoBase 字段提升到顶层，同时保留 baseInfo 嵌套对象（字段相同）。
   */
  export interface EndPointInfo {
    id: string;
    /** 昵称 */
    nickname: string;
    /** 状态 0 断开 1已连接 2连接中 3连接失败 */
    state: number;
    /** 用户id */
    userId: string;
    /** 拥有群数 */
    groupNum: number;
    /** 命令执行数量 */
    cmdExecutedNum: number;
    /** 最后命令执行时间 */
    cmdExecutedLastTime: number;
    /** 在线时长 */
    onlineTotalTime: number;
    /** 平台 */
    platform: string;
    /** 是否启用 */
    enable: boolean;
    /** 嵌套的基础信息对象（与顶层字段相同） */
    baseInfo: {
      id: string;
      nickname: string;
      state: number;
      userId: string;
      groupNum: number;
      cmdExecutedNum: number;
      cmdExecutedLastTime: number;
      onlineTotalTime: number;
      platform: string;
      enable: boolean;
    };
  }

  // ===== 指令解析 =====

  export interface AtInfo {
    userId: string;
    /** 是否机器人 */
    isRobot: boolean;
    /** 昵称 */
    name: string;
  }

  export interface Kwarg {
    /** 名称 */
    name: string;
    /** 是否存在value */
    valueExists: boolean;
    /** value的值 */
    value: string;
    /** 将value转换为bool，如'0' ''等会自动转为false */
    asBool: boolean;
  }

  /** 指令参数（dice/cmd_parse.go:97） */
  export interface CmdArgs {
    /** 当前命令，与指令的name相对，例如.ra时，command为ra */
    command: string;
    /** 指令参数，如“.ra 力量 测试”时，参数1为“力量”，参数2为“测试” */
    args: string[];
    /** 关键字参数 */
    kwargs: Kwarg[];
    /** 当前被at的有哪些 */
    at: AtInfo[];
    /** 参数的原始文本 */
    rawArgs: string;
    /** 我被at了 */
    amIBeMentioned: boolean;
    /** 同上，但要求是第一个被at的 */
    amIBeMentionedFirst: boolean;
    /** 一种格式化后的参数，也就是中间所有分隔符都用一个空格替代 */
    cleanArgs: string;
    /** 特殊的执行次数，对应 3# 这种语法 */
    specialExecuteTimes: number;
    /** 原始命令文本 */
    rawText: string;
    /** 获取关键字参数；不存在时返回 null */
    getKwarg(key: string): Kwarg | null;
    /** 获取第N个参数，从1开始，如“.ra 力量50 推门” 参数1为“力量50”，参数2是“推门” */
    getArgN(n: number): string;
    /** 分离前缀 如 `.stdel力量` => [del,力量] ，直接修改 argv 属性 */
    chopPrefixToArgsWith(...s: string[]): boolean;
    /** 吃掉前缀并去除复数空格 `set xxx  xxx` => `xxx xxx`，返回修改后的字符串和是否修改成功的布尔值 */
    eatPrefixWith(...s: string[]): [string, boolean];
    /** 将第 n 个参数及之后参数用空格拼接起来; 如指令 `send to qq x1 x2`,n=3返回 `x1 x2` */
    getRestArgsFrom(n: number): string;
    /** 检查第N项参数是否为某个字符串，n从1开始，若没有第n项参数也视为失败 */
    isArgEqual(n: number, ...s: string[]): boolean;
    /** 撤销执行次数解析 */
    revokeExecuteTimesParse(ctx: MsgContext, msg: Message): void;
  }

  // ===== 扩展与指令 =====

  export interface CmdItemInfo {
    solve: (ctx: MsgContext, msg: Message, cmdArgs: CmdArgs) => CmdExecuteResult;

    /** 指令名称 */
    name: string;
    /** 长帮助，带换行的较详细说明 */
    help: string;
    /** 函数形式帮助，存在时优先于其他 */
    helpFunc?: (isShort: boolean) => string;
    /** 允许代骰 */
    allowDelegate: boolean;
    /** 私聊不可用 */
    disabledInPrivate: boolean;
    /** 启用执行次数解析，也就是解析 3# 这样的文本 */
    enableExecuteTimesParse: boolean;

    /** 高级模式。默认模式下行为是：需要在当前群/私聊开启，或@自己时生效(需要为第一个@目标)。一般不建议使用 */
    raw: boolean;
    /** 是否检查当前可用状况，包括群内可用和是私聊两种方式，如失败不进入solve */
    checkCurrentBotOn: boolean;
    /** 是否检查@了别的骰子，如失败不进入solve */
    checkMentionOthers: boolean;
  }

  export interface CmdExecuteResult {
    /** 是否顺利完成执行 */
    solved: boolean;
    /** 是否返回帮助信息 */
    showHelp: boolean;
  }

  export interface PokeEvent {
    groupId: string;
    senderId: string;
    targetId: string;
    isPrivate: boolean;
  }

  export interface GroupLeaveEvent {
    groupId: string;
    userId: string;
    operatorId: string;
  }

  export interface ExtInfo {
    /** 名字 */
    name: string;
    /** 别名 */
    aliases: string[];
    /** 版本 */
    version: string;
    /** 作者 */
    author: string;
    /** 是否自动开启 */
    autoActive: boolean;
    /** 指令映射 */
    cmdMap: { [key: string]: CmdItemInfo };
    /** 跟随开关：当指定扩展开启或关闭时，本扩展也会同步 */
    activeWith: string[];
    /** 是否加载完成 */
    isLoaded: boolean;
    /** 匹配非指令消息 */
    onNotCommandReceived?: (ctx: MsgContext, msg: Message) => void;
    /** 监听 收到指令 事件 */
    onCommandReceived?: (ctx: MsgContext, msg: Message, cmdArgs: CmdArgs) => void;
    /** 监听 收到消息 事件，如 log 模块记录收到文本 */
    onMessageReceived?: (ctx: MsgContext, msg: Message) => void;
    /** 监听 发送消息 事件，如 log 模块记录指令文本 */
    onMessageSend?: (ctx: MsgContext, msg: Message, flag: string) => void;
    /** 监听 消息撤回 事件 */
    onMessageDeleted?: (ctx: MsgContext, msg: Message) => void;
    /** 监听 消息编辑 事件 */
    onMessageEdit?: (ctx: MsgContext, msg: Message) => void;
    /** 监听 入群 事件 */
    onGroupJoined?: (ctx: MsgContext, msg: Message) => void;
    /** 监听 群成员加入 事件 */
    onGroupMemberJoined?: (ctx: MsgContext, msg: Message) => void;
    /** 监听 加入服务器 事件 */
    onGuildJoined?: (ctx: MsgContext, msg: Message) => void;
    /** 监听 成为好友 事件 */
    onBecomeFriend?: (ctx: MsgContext, msg: Message) => void;
    /** 监听 戳一戳 事件 */
    onPoke?: (ctx: MsgContext, event: PokeEvent) => void;
    /** 监听 群成员被踢出 事件 */
    onGroupLeave?: (ctx: MsgContext, event: GroupLeaveEvent) => void;
    /** 获取扩展介绍文本 */
    getDescText(): string;
    /** 监听 加载时 事件 */
    onLoad(): void;
    /** 存放数据（写入失败时抛出异常） */
    storageSet(key: string, value: string): void;
    /** 取数据；不存在时返回空字符串 */
    storageGet(key: string): string;
    /** 初始化数据，读写数据时会自动调用 */
    storageInit(): void;
    /** 关闭存储 */
    storageClose(): void;
  }

  type BanRankType = number
  /*
    禁止等级
    BanRankBanned = -30
    警告等级
    BanRankWarn = -10
    常规等级
    BanRankNormal = 0
    信任等级
    BanRankTrust = 30
  */
  export interface BanListInfoItem {
    /** 对象 ID */
    id: string;
    /** 对象名称 */
    name: string;
    /** 怒气值。 */
    score: number;
    /** 0 正常，-10 警告，-30 禁止，30 信任 */
    rank: number;
    /** 历史记录时间戳 */
    times: number[];
    /** 拉黑原因记录 */
    reasons: string[];
    /** 事发会话记录 */
    places: string[];
    /** 首次记录时间 */
    banTime: number;
  }

  export interface ConfigItem {
    key: string;
    type: string;
    /** 配置分组 */
    group: string;
    defaultValue: unknown;
    value: unknown;
    option: unknown;
    deprecated: boolean;
    description: string;
  }

  type TimeOutTaskType = 'cron' | 'daily'

  /** 定时任务回调上下文（dice/dice_jsvm.go:1532） */
  export interface JsScriptTaskCtx {
    /** 触发时间(Unix 秒) */
    now: number;
    /** 任务名称 */
    key: string;
  }

  /** 定时任务对象（内部字段不对外暴露） */
  export interface JsScriptTask {
  }

  /** 黑名单操作（dice/dice_jsvm.go:137-169） */
  export const ban: {
    /** 拉黑指定 ID */
    addBan(ctx: MsgContext, id: string, place: string, reason: string): void;
    /** 信任指定 ID */
    addTrust(ctx: MsgContext, id: string, place: string, reason: string): void;
    /** 将用户从名单中删除 */
    remove(ctx: MsgContext, id: string): void;
    /** 获取名单全部用户 */
    getList(): BanListInfoItem[];
    /** 获取指定 ID 的黑名单记录，不存在时返回 null */
    getUser(id: string): BanListInfoItem | null;
  };

  /** 扩展管理（dice/dice_jsvm.go:171-519） */
  export const ext: {
    /** 新建一个扩展 */
    new: (name: string, author: string, version: string) => ExtInfo;

    /** 创建指令结果对象 */
    newCmdExecuteResult(success: boolean): CmdExecuteResult;

    /** 注册一个扩展（"help" 与 "all" 为保留名） */
    register(ext: ExtInfo): unknown;

    /** 按名字查找扩展对象，不存在时返回 null */
    find(name: string): ExtInfo | null;

    /** 创建指令对象 */
    newCmdItemInfo(): CmdItemInfo;

    /** 注册字符串配置项 */
    registerStringConfig(ext: ExtInfo, key: string, defaultValue: string, desc: string, group?: string): void;
    /** 注册整型配置项 */
    registerIntConfig(ext: ExtInfo, key: string, defaultValue: number, desc: string, group?: string): void;
    /** 注册布尔配置项 */
    registerBoolConfig(ext: ExtInfo, key: string, defaultValue: boolean, desc: string, group?: string): void;
    /** 注册浮点数配置项 */
    registerFloatConfig(ext: ExtInfo, key: string, defaultValue: number, desc: string, group?: string): void;
    /** 注册 template 配置项 */
    registerTemplateConfig(ext: ExtInfo, key: string, defaultValue: string[], desc: string, group?: string): void;
    /** 注册 option 配置项 */
    registerOptionConfig(ext: ExtInfo, key: string, defaultValue: string, option: string[], desc: string, group?: string): void;
    /** 创建一个新的配置项 */
    newConfigItem(ext: ExtInfo, key: string, defaultValue: unknown, desc: string): ConfigItem;
    /** 注册配置 */
    registerConfig(ext: ExtInfo, ...configs: ConfigItem[]): void;
    /** 获取配置项对象，不存在时返回 null */
    getConfig(ext: ExtInfo, key: string): ConfigItem | null;
    /** 获取字符串配置项；不存在或类型不匹配时 panic（抛异常） */
    getStringConfig(ext: ExtInfo, key: string): string;
    /** 获取整型配置项；不存在或类型不匹配时 panic（抛异常） */
    getIntConfig(ext: ExtInfo, key: string): number;
    /** 获取布尔配置项；不存在或类型不匹配时 panic（抛异常） */
    getBoolConfig(ext: ExtInfo, key: string): boolean;
    /** 获取浮点数配置项；不存在或类型不匹配时 panic（抛异常） */
    getFloatConfig(ext: ExtInfo, key: string): number;
    /** 获取 template 配置项；不存在或类型不匹配时 panic（抛异常） */
    getTemplateConfig(ext: ExtInfo, key: string): string[];
    /** 获取 option 配置项；不存在或类型不匹配时 panic（抛异常） */
    getOptionConfig(ext: ExtInfo, key: string): string;
    /** 卸载对应名称的配置项 */
    unregisterConfig(ext: ExtInfo, ...keys: string[]): void;

    /** 注册定时任务；taskType 为 cron（5位cron表达式）或 daily（如 8:30） */
    registerTask(
      ext: ExtInfo,
      taskType: TimeOutTaskType,
      value: string,
      fn: (taskCtx: JsScriptTaskCtx) => void,
      key?: string,
      desc?: string,
      group?: string,
    ): JsScriptTask;
  };

  // ===== COC 规则 =====

  export interface CocRuleInfo {
    /** 序号 */
    index: number;
    /** .setcoc key */
    key: string;
    /** 已切换至规则 Name: Desc */
    name: string;
    /** 规则描述 */
    desc: string;
    /** 检定函数 */
    check(ctx: MsgContext, d100: number, checkValue: number, difficultyRequired: number): CocRuleCheckRet;
  }

  export interface CocRuleCheckRet {
    /** 成功级别，失败小于0，成功大于0。大失败-2 失败-1 成功1 困难成功2 极难成功3 大成功4 */
    successRank: number;
    /** 大成功数值 */
    criticalSuccessValue: number;
  }

  export const coc: {
    newRule(): CocRuleInfo;
    newRuleCheckResult(): CocRuleCheckRet;
    registerRule(rule: CocRuleInfo): boolean;
  };

  // ===== 顶层函数（dice/dice_jsvm.go:552-640） =====

  /** 回复发送者(发送者私聊即私聊回复，群内即群内回复) */
  export function replyToSender(ctx: MsgContext, msg: Message, text: string): void;
  /** 回复发送者(私聊回复，典型应用场景如暗骰) */
  export function replyPerson(ctx: MsgContext, msg: Message, text: string): void;
  /** 回复发送者(群内回复，私聊时无效) */
  export function replyGroup(ctx: MsgContext, msg: Message, text: string): void;
  /** 禁言 */
  export function memberBan(ctx: MsgContext, groupID: string, userID: string, duration: number): void;
  /** 踢人 */
  export function memberKick(ctx: MsgContext, groupID: string, userID: string): void;
  /** 格式化文本 等价于 `text` 指令 */
  export function format(ctx: MsgContext, text: string): string;
  /** 格式化模板文本 */
  export function formatTmpl(ctx: MsgContext, text: string): string;
  /** 代骰模式下，获取被代理人信息（at 列表第一人） */
  export function getCtxProxyFirst(ctx: MsgContext, cmdArgs: CmdArgs): MsgContext;
  /** 代骰模式下，获取被代理人信息（at 列表第 pos 人） */
  export function getCtxProxyAtPos(ctx: MsgContext, cmdArgs: CmdArgs, pos: number): MsgContext;
  /** 新建一条消息 */
  export function newMessage(): Message;
  /** 创建一个临时Context */
  export function createTempCtx(ep: EndPointInfo, msg: Message): MsgContext;
  /** 应用名片模板，返回值为格式化完成的名字。此时已经设置好名片(如有权限) */
  export function applyPlayerGroupCardByTemplate(ctx: MsgContext, tmpl: string): string;
  /** 设置玩家群名片（失败时抛异常） */
  export function setPlayerGroupCard(ctx: MsgContext, tmpl: string): string;
  /** 通过base64返回图像临时地址（非法值抛异常） */
  export function base64ToImage(base64: string): string;

  export interface VersionDetailsType {
    /** 内部版本号，新版本的版本号永远比旧版本的大 */
    versionCode: number;
    /** 版本号+日期 如 1.4.6+20240810 */
    version: string;
    /** 版本号 如 1.4.6 */
    versionSimple: string;
    versionDetail: {
      major: number;
      minor: number;
      patch: number;
      prerelease: string;
      /** 创建日期 如 20240810 */
      buildMetaData: string;
    };
  }

  /** 获取版本信息 */
  export function getVersion(): VersionDetailsType;
  /** 获取骰娘的EndPoints */
  export function getEndPoints(): EndPointInfo[];

  /** 获取/修改 VM 变量（dice/dice_jsvm.go:128-135） */
  export const vars: {
    /** VM 中存在 key 且类型正确 返回 `[number,true]` ，否则返回 `[0,false]` */
    intGet(ctx: MsgContext, key: string): [number, boolean];
    /** 赋值 key 为 value 等价于指令 `text {key=value}` value 类型为数字 */
    intSet(ctx: MsgContext, key: string, value: number): void;
    /** VM 中存在 key 且类型正确 返回 `[string,true]` ，否则返回 `['',false]` */
    strGet(ctx: MsgContext, key: string): [string, boolean];
    /** 赋值 key 为 value 等价于指令 `text {key=value}` value 类型为字符串 */
    strSet(ctx: MsgContext, key: string, value: string): void;
    /** 获取计算变量（如表达式变量） */
    computedGet(ctx: MsgContext, key: string): [string, boolean];
    /** 赋值计算变量 */
    computedSet(ctx: MsgContext, key: string, value: string): void;
  };

  export const gameSystem: {
    /** 添加一个规则模板，需要是JSON文本格式（失败抛异常） */
    newTemplate(data: string): unknown;
    /** 添加一个规则模板，需要是YAML文本格式（失败抛异常） */
    newTemplateByYaml(data: string): unknown;
  };

  /** deck（dice/dice_jsvm.go:534-550） */
  export interface deckResult {
    /** 是否存在 */
    exists: boolean;
    /** 错误信息 */
    err: string;
    /** 抽牌结果（Go 侧为 string 值类型，恒为字符串） */
    result: string;
  }

  export const deck: {
    /** 抽牌函数 */
    draw(ctx: MsgContext, name: string, isShuffle: boolean): deckResult;
    /** 重载牌堆 */
    reload(): void;
  };
}

/** VM 内置 atob（dice/dice_jsvm.go:622-632）；非法 base64 抛异常 */
declare function atob(s: string): string;
/** VM 内置 btoa（dice/dice_jsvm.go:634-637） */
declare function btoa(s: string): string;
