# Scardice TS 插件模板

开箱即用、现代、默认安全的 Scardice TypeScript 插件模板。clone 后执行 `pnpm install && pnpm build`，即可得到可直接装入余烬的插件单文件；类型声明、代码检查、格式化全部内置，无需任何配置。

## 特性

### 开箱即用

- 零配置构建：一条命令产出最终插件，无需配置打包器或 lint 规则
- 内置 API 类型声明（`types/vendor/seal.d.ts`，以 sealdice-core Go 源码为事实基准对齐，头部记录上游 SHA 与本地修正清单），IDE 补全与类型检查开箱即有；声明未覆盖的 API 建议补充到 `seal.d.ts`（见下文「开发」）
- 开发 / 生产双构建模式

### 现代

- pnpm workspace，Node.js >= 24.15.0（24 LTS）
- esbuild 打包：毫秒级构建、tree-shaking，开发构建带 sourcemap；`pnpm build:analyze` 可选产出 `dist/meta.json` 体积分析文件
- TypeScript `strict` + `moduleResolution: bundler` + `isolatedModules`，构建目标固定 `es2020`（tsc 仅类型检查，esbuild 负责转译），构建前自动类型检查（`tsc --noEmit`）
- ESLint flat config（`@antfu/eslint-config`）：type-aware lint，JS / TS / JSON / YAML / Markdown 统一检查


### 默认安全

- `strict: true` 严格类型检查
- correctness 规则大多为 `error`：未处理 Promise、错误 async/await、unsafe 类型操作、未使用变量 / import、不可达代码、错误 switch / equality、import/export 错误等，有错即失败；`ts/no-unsafe-*` 全局启用，业务代码直接使用 `seal` 全局也在严格类型检查之下
- type-aware lint：基于 tsconfig 的类型感知规则，抓取类型层面的错误
- 禁止 `eval`、`new Function`、`no-implied-eval` 等危险用法
- maintainability 规则仅 `warn`（SonarJS 精选：cognitive complexity、重复条件、布尔表达式等），只提醒、不阻塞开发
- 产物头部由 `plugin.config.mjs` 生成注入（Userscript 元数据），支持 `{{timestamp}}` / `{{date}}` 等占位符；未知占位符构建失败（fail-fast），字段值自动单行化

## 快速开始

前置：Node.js >= 24.15.0（推荐 24 LTS，见 `.node-version`），pnpm（推荐通过 corepack 启用）。

> 第一次接触余烬插件开发？请先阅读 [新手引导（Getting Started）](docs/getting-started.md)。

```bash
pnpm install
pnpm build
```

构建产物为 `dist/模板项目[作者名]_1_0_0.js`（文件名格式可配置，见下文「产物命名」），直接装入余烬核心测试即可使用。


## 最小示例

`src/index.ts` 已包含一个可运行的最小插件：按官方写法直接使用 `seal` 全局注册扩展与指令 `.seal`（id / 作者 / 版本由构建时从 `plugin.config.mjs` 注入，单一事实源）。

## 开发

```bash
pnpm typecheck         # 类型检查（tsc --noEmit）
pnpm build-dev         # 一次性开发构建
pnpm build-dev:watch   # 监听变更，增量重建（长驻进程）
pnpm build:analyze     # 生产构建 + dist/meta.json 体积分析
pnpm smoke             # 加载冒烟：用 seal 桩在 Node 中加载 dist 产物，验证加载期无异常
```

- 开发构建输出 `dev/` 下的插件文件（不压缩、带 sourcemap），文件名随 `plugin.config.mjs` 中的信息变化；watch 模式下修改 `plugin.config.mjs` 后需重启（身份信息在启动时快照，避免产物分裂）
- 示例入口依赖 `seal` 全局（由余烬运行时注入），不会在 Node 中直接运行；纯逻辑请独立成模块，用 Node 调试该模块。若用到 `seal.d.ts` 缺失的新 API，请先更新 `types/vendor/seal.d.ts`；应急可用 `pnpm build --no-check` 跳过类型检查直接产出
- 冒烟测试用 seal 桩（未覆盖的 `seal.*` 自动兜底为 noop）在 Node 中加载构建产物，能提前暴露加载期 ReferenceError/TypeError，无需 SealDice 环境
- 开发与生产构建保持相同的语法目标（`es2020`），避免验证结果与线上不一致

## 产物命名

产物文件名由 `plugin.config.mjs` 中的 `filename` 控制（单一事实源），默认格式：

```js
export const filename = '{{name}}[{{author}}]_{{version}}.js'
```

插件名、作者、版本号取自 `plugin.config.mjs` 的 `name`、`author`、`version`，支持以下占位符：

| 占位符 | 说明 |
| --- | --- |
| `{{name}}` | 插件名，去除非法 / break 字符 |
| `{{author}}` | 作者，去除非法 / break 字符 |
| `{{version}}` | 版本号：`.` 与 `-` 替换为 `_`，中文符号转为英文符号 |
| `{{timestamp}}` | 构建时间戳（Unix 秒） |
| `{{date}}` | 构建日期（`YYYY-MM-DD`，路径安全） |

格式末尾不含 `.js` 时自动补全。未知占位符、渲染结果含非法字符（`/ \ : * ? " < > |`、NUL、残余 `{{...}}`）或命中 Windows 保留设备名（`CON` / `PRN` / `AUX` / `NUL` / `COM1`–`COM9` / `LPT1`–`LPT9`）时构建直接失败，不会产出奇怪文件名。

`plugin.config.mjs` 的 `id` / `name` / `author` / `version` / `description` / `license` / `homepage` / `filename` / `header` 均为必填非空字段，缺失或为空时构建直接失败；所有消费方（产物文件名 / 产物头部 / 运行时注册）使用同一份 normalization 后的配置，不会出现语义分叉。

注意：header 中的 `{{date}}` 与文件名中的 `{{date}}` 语义不同——header 保持 `yyyy/(m)m/(d)d`，文件名使用路径安全的 `YYYY-MM-DD`；两者均基于 UTC（配合 `SOURCE_DATE_EPOCH` 可跨时区可重现）。

## 代码检查

```bash
pnpm lint        # 检查
pnpm lint:fix    # 检查并自动修复
```

- `error` → 命令失败；`warn` 仅提醒，不阻塞
- 单双引号、分号、import 排序、空格、换行等格式问题全部可用 `lint:fix` 自动处理，无需手工排版

## 目录结构

```text
.
├── src/                # 插件源码
│   ├── index.ts        # 入口：业务逻辑（直接使用 seal 全局，全量类型检查）
│   └── utils.ts        # 示例工具（零依赖）
├── tools/              # 构建脚本（ESM）
│   ├── build.mjs
│   ├── build-config.mjs # 构建目标（bundle/minify/sourcemap/outDir）
│   ├── config.mjs      # 配置 normalization / validation（SSOT 消费入口）
│   ├── header.mjs      # 产物头部渲染（fail-fast + 单行化）
│   ├── naming.mjs      # 占位符渲染与文件名清洗（含 Windows 保留名检查）
│   └── time.mjs        # 构建时间（SOURCE_DATE_EPOCH + UTC 分量）
├── scripts/            # 发布与冒烟工具（ESM，checkJs 检查）
│   ├── smoke.mjs       # 加载冒烟（seal 桩 + Proxy 兜底）
│   ├── prepare-sealpack.mjs # sealpack 源准备（SSOT 同步）
│   └── build-release.mjs    # sealpack validate/pack 发布
├── sealpack/           # SealRepo 豹包源（info.toml / assets / README）
│   └── scripts/main.js # 打包时由 prepare-sealpack.mjs 生成（gitignore）
├── types/
│   └── vendor/
│       └── seal.d.ts   # Seal API 类型声明（Go 源事实对齐，头部记录上游 SHA 与修正清单）
├── plugin.config.mjs   # 插件单一事实源（id/name/author/version/header/产物名；JSDoc 内联类型 + checkJs）
├── docs/
│   └── getting-started.md # 新手引导（README「快速开始」引用）
├── eslint.config.mjs   # ESLint flat config（antfu + SonarJS）
├── tsconfig.json
├── .node-version       # 推荐 Node 版本
├── dist/               # 生产构建产物（gitignore；meta.json 仅 build:analyze 生成；.sealpack 发布包）
└── dev/                # 开发构建产物（gitignore）
```

## 发布与分享

1. `pnpm build` 生成 `dist/` 下的插件文件（需要体积分析时用 `pnpm build:analyze`，额外产出 `meta.json`）
2. 可重现构建：`SOURCE_DATE_EPOCH=<unix 秒> pnpm build`，header / 文件名中的时间戳与日期基于 UTC 固定
3. `pnpm smoke`：seal 桩加载冒烟，验证产物加载期无异常
4. 分享单文件：直接分享 `dist/模板项目[作者名]_1_0_0.js`
5. SealRepo 豹包发布：`pnpm pack:release`（校验并打包 → `dist/<产物名>-<版本>.sealpack`；发布前先改 `sealpack/info.toml` 的 `id`，其余信息自动从 `plugin.config.mjs` 同步）

## 鸣谢

本项目基于 [sealdice/sealdice-js-ext-template](https://github.com/sealdice/sealdice-js-ext-template) 开发，感谢 sealdice 项目的开源工作与上游模板。

## AI 使用声明

本项目采用 DeepSeek V4 Flash 和 Gemini 3.1 Pro 进行了注释和文档编写工作。

## License

MIT
