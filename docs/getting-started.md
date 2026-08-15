# 新手引导（Getting Started）

面向第一次接触插件开发、已掌握基础 JS/TS 与 pnpm 的开发者。本模板不需要任何额外配置，按本引导走完即可产出可运行的插件。

## 三个心智模型

### ① 产物模型：你交付的是"单文件插件"

你写的不是 `src/` 目录，而是一个**单文件 `.js`**（esbuild 打包，带 Userscript 元数据头），装进余烬核心运行。产物 = 元数据头（`@name`/`@author`/`@version`…）+ 打包后的业务代码。

### ② 运行时模型：`seal` 全局直接使用

余烬运行时注入全局对象 `seal`（`seal.ext`、`seal.replyToSender`、`seal.deck`…）。`types/vendor/seal.d.ts` 提供完整类型（按 sealdice-core Go 源码逐字段对齐：字段名、可空性、参数顺序均为运行时真实形态），IDE 补全与严格类型检查开箱即有。

### ③ 身份模型：`plugin.config.mjs` 是唯一事实源

`id`/`name`/`author`/`version`/`description`/`license`/`homepage`/`filename`/`header` **9 个字段全部必填**，缺失或为空构建直接失败。产物文件名、header 内容、运行时注册的扩展身份全部由此派生（构建时注入），改一处全变，没有第二处需要同步。

## 首次运行（10 分钟）

```bash
git clone https://github.com/Scardice/Scardice-ts-ext-template.git my-plugin
cd my-plugin
pnpm install
pnpm build        # 自动先跑 typecheck + lint，产出 dist/ 下的插件文件
pnpm smoke        # seal 桩加载冒烟：确认产物在 Node 中加载无异常
```

把 `dist/` 里的插件文件丢进余烬，即可看到 `.seal` 指令（`src/index.ts` 的最小示例）。

开发期常用命令：

```bash
pnpm build-dev        # 不压缩 + sourcemap，产物在 dev/
pnpm build-dev:watch  # 修改 src 后增量重建（长驻）
pnpm check            # typecheck + lint，提交前必跑
pnpm lint:fix         # 格式问题一键自动修复
```

注意：插件依赖 `seal` 全局，**不能在 Node 中直接运行**；纯逻辑请拆成独立模块，用 Node 调试该模块。

## 第一个任务：改造成"我的插件"并加一条指令

### 第 1 步：改身份

编辑 `plugin.config.mjs` 的 `id`/`name`/`author`/`version`（9 个字段都必填）。产物名、header、运行时注册自动跟着变。

### 第 2 步：加指令

`src/index.ts` 按官方写法：

```ts
let ext = seal.ext.find(__PLUGIN_ID__)
if (!ext) {
  ext = seal.ext.new(__PLUGIN_ID__, __PLUGIN_AUTHOR__, __PLUGIN_VERSION__)

  const cmdHello = seal.ext.newCmdItemInfo()
  cmdHello.name = 'hello'
  cmdHello.help = '打声招呼'
  cmdHello.solve = (ctx, msg, cmdArgs) => {
    seal.replyToSender(ctx, msg, '你好呀')
    return seal.ext.newCmdExecuteResult(true)
  }

  ext.cmdMap.hello = cmdHello
  seal.ext.register(ext)
}
```

`__PLUGIN_ID__` / `__PLUGIN_AUTHOR__` / `__PLUGIN_VERSION__` 是构建时注入的常量（来自 `plugin.config.mjs`），不要手写。

### 第 3 步：构建与测试

```bash
pnpm build && pnpm smoke
```

把 `dist/` 产物装进余烬，发送 `.hello` 验证。

### 第 4 步：发布

- **分享单文件**：直接分享 `dist/模板项目[作者名]_1_0_0.js`
- **SealRepo 豹包**：先修改 `sealpack/info.toml` 的 `id`（`namespace/package` 格式，`namespace` 是你的商店命名空间，需手填一次；其余信息自动从 `plugin.config.mjs` 同步），然后：

```bash
pnpm pack:release      # 校验并打包 → dist/<产物名>-<版本>.sealpack
```

## 会被机器强制的规则（不是建议）

| 规则 | 形式 |
| --- | --- |
| config 9 字段必填非空 | 构建 fail-fast |
| filename / header 占位符拼错（如 `{{versoin}}`） | 构建 fail-fast |
| 文件名含非法字符或 Windows 保留名（CON/PRN/…） | 构建 fail-fast |
| `strict` + `ts/no-unsafe-*` 全项目生效（含 seal 调用） | tsc / lint error |
| seal API 字段与可空性以 Go 源码为准 | 类型系统保证 |

**遇到声明里没有的新 API**：优先更新 `types/vendor/seal.d.ts`（参考其头部同步说明）；应急可用 `pnpm build --no-check` 跳过类型检查直接产出（不影响产物本身）。

## 常见坑

1. **改了 `plugin.config.mjs` 但 watch 产物没变** → 重启 watch（身份信息在启动时快照，设计如此）
2. **装的是旧产物** → 确认加载的是 `dist/` 或 `dev/` 里的文件，不是 `src/`
3. **访问 `ctx.player.xxx` 报 null 错误** → `MsgContext.group` / `player` 运行时可能为 null（类型已标注 `| null`），记得判空

## 学习顺序建议

1. 通读 `src/index.ts` 与 `src/utils.ts`（共约 40 行，模板全部示例代码）
2. 浏览 `types/vendor/seal.d.ts` 的类型清单（比文档网页精确，字段注释齐全）
3. 故意拼错一个 header 占位符、故意访问一个 null 字段——亲眼看 fail-fast 和类型检查如何拦截
4. 之后再看 `tools/` 与 `scripts/`（均有 JSDoc 且被 tsc 检查）
