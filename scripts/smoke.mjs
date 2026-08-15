// 加载冒烟测试：用 seal 桩（Proxy 兜底）在 Node 中直接加载 dist 产物，
// 在无 SealDice 环境下提前发现加载期 ReferenceError/TypeError 与
// 扩展注册顺序错误（任何接收 ExtInfo 的 API 在 seal.ext.register(ext) 之前调用）。
// 用法：pnpm build && pnpm smoke
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')

/** @type {Array<Record<string, unknown>>} */
const registered = []

const noop = () => undefined
// 与 Go 实现（sealdice-core dice/dice_jsvm.go）对齐的注册顺序约束：
// seal.ext.register(ext) 之后 ext 才“存在且合法”（Go 侧 ext.dice 非 nil）。
// 任何接收 ExtInfo 的 API 在注册前调用均判非法，桩统一抛「请先完成此扩展的注册」。
// 例外说明：Go 侧 getConfig 未注册时返回 nil、unregisterConfig 未注册时静默返回，
// 两者在本桩中也按约定判非法（比 Go 更严格，用于捕获同类顺序错误）。
// 其余（register*Config / newConfigItem / registerConfig / registerTask / get*Config）
// Go 侧本身即返回 error / panic（goja 中均表现为 JS 异常），桩实现同语义。
/** @type {Set<Record<string, unknown>>} */
const registeredExts = new Set()

/** @type {WeakMap<Record<string, unknown>, Map<string, { type: string, value: unknown, defaultValue: unknown, description: string }>>} */
const configStore = new WeakMap()

/**
 * @param {Record<string, unknown>} ext
 * @param {string} api
 */
const requireRegistered = (ext, api) => {
  if (!registeredExts.has(ext)) {
    throw new Error(`seal.ext.${api}: 请先完成此扩展的注册（建议：先调用 seal.ext.register(ext) 注册扩展，再使用该 API）`)
  }
}

/**
 * @param {Record<string, unknown>} ext
 * @param {{ key: string, type: string, value: unknown, defaultValue: unknown, description: string }} item
 */
const setConfig = (ext, item) => {
  let map = configStore.get(ext)
  if (!map) {
    map = new Map()
    configStore.set(ext, map)
  }
  map.set(item.key, item)
}

/**
 * @param {Record<string, unknown>} ext
 * @param {string} key
 * @param {string} type
 * @param {string} api
 */
const getTypedConfig = (ext, key, type, api) => {
  const item = registeredExts.has(ext) ? configStore.get(ext)?.get(key) : undefined
  if (!item || item.type !== type) {
    throw new Error(`seal.ext.${api}: 配置不存在或类型不匹配`)
  }
  return item.value
}

// 桩覆盖模板示例实际用到的 seal API；其余成员由 Proxy 兜底为 noop，
// 保证加载期任何 seal.* 顶层访问都不会抛错。
/** @type {Record<string, unknown>} */
const sealStub = {
  ext: {
    find: () => undefined,
    /**
     * @param {string} name
     * @param {string} author
     * @param {string} version
     */
    new: (name, author, version) => ({ name, author, version, cmdMap: {} }),
    /** @param {Record<string, unknown>} ext */
    register: (ext) => {
      registered.push(ext)
      registeredExts.add(ext)
    },
    newCmdItemInfo: () => ({ name: '', help: '', solve: noop }),
    newCmdExecuteResult: () => ({}),
    // ===== 配置项 API（语义对齐 dice_jsvm.go；注册顺序错误在此被捕获）=====
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     * @param {string} defaultValue
     * @param {string} desc
     * @param {string} _group
     */
    registerStringConfig: (ext, key, defaultValue, desc, _group) => {
      requireRegistered(ext, 'registerStringConfig')
      setConfig(ext, { key, type: 'string', value: defaultValue, defaultValue, description: desc })
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     * @param {number} defaultValue
     * @param {string} desc
     * @param {string} _group
     */
    registerIntConfig: (ext, key, defaultValue, desc, _group) => {
      requireRegistered(ext, 'registerIntConfig')
      setConfig(ext, { key, type: 'int', value: defaultValue, defaultValue, description: desc })
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     * @param {boolean} defaultValue
     * @param {string} desc
     * @param {string} _group
     */
    registerBoolConfig: (ext, key, defaultValue, desc, _group) => {
      requireRegistered(ext, 'registerBoolConfig')
      setConfig(ext, { key, type: 'bool', value: defaultValue, defaultValue, description: desc })
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     * @param {number} defaultValue
     * @param {string} desc
     * @param {string} _group
     */
    registerFloatConfig: (ext, key, defaultValue, desc, _group) => {
      requireRegistered(ext, 'registerFloatConfig')
      setConfig(ext, { key, type: 'float', value: defaultValue, defaultValue, description: desc })
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     * @param {string[]} defaultValue
     * @param {string} desc
     * @param {string} _group
     */
    registerTemplateConfig: (ext, key, defaultValue, desc, _group) => {
      requireRegistered(ext, 'registerTemplateConfig')
      setConfig(ext, { key, type: 'template', value: defaultValue, defaultValue, description: desc })
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     * @param {string} defaultValue
     * @param {string[]} _option
     * @param {string} desc
     * @param {string} _group
     */
    registerOptionConfig: (ext, key, defaultValue, _option, desc, _group) => {
      requireRegistered(ext, 'registerOptionConfig')
      setConfig(ext, { key, type: 'option', value: defaultValue, defaultValue, description: desc })
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     * @param {unknown} defaultValue
     * @param {string} desc
     */
    newConfigItem: (ext, key, defaultValue, desc) => {
      requireRegistered(ext, 'newConfigItem')
      // Go 侧 NewConfigItem 不设置 Type；带空 Type 的项会被类型化 getter 拒绝，保持同语义
      return { key, type: '', value: defaultValue, defaultValue, description: desc }
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {Array<{ key: string, type?: string, value: unknown, defaultValue: unknown, description: string }>} configs
     */
    registerConfig: (ext, ...configs) => {
      requireRegistered(ext, 'registerConfig')
      for (const item of configs) {
        setConfig(ext, {
          key: item.key,
          type: item.type ?? '',
          value: item.value ?? item.defaultValue,
          defaultValue: item.defaultValue,
          description: item.description,
        })
      }
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     */
    getConfig: (ext, key) => {
      requireRegistered(ext, 'getConfig')
      return configStore.get(ext)?.get(key) ?? null
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     */
    getStringConfig: (ext, key) => getTypedConfig(ext, key, 'string', 'getStringConfig'),
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     */
    getIntConfig: (ext, key) => getTypedConfig(ext, key, 'int', 'getIntConfig'),
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     */
    getBoolConfig: (ext, key) => getTypedConfig(ext, key, 'bool', 'getBoolConfig'),
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     */
    getFloatConfig: (ext, key) => getTypedConfig(ext, key, 'float', 'getFloatConfig'),
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     */
    getTemplateConfig: (ext, key) => getTypedConfig(ext, key, 'template', 'getTemplateConfig'),
    /**
     * @param {Record<string, unknown>} ext
     * @param {string} key
     */
    getOptionConfig: (ext, key) => getTypedConfig(ext, key, 'option', 'getOptionConfig'),
    /**
     * @param {Record<string, unknown>} ext
     * @param {string[]} keys
     */
    unregisterConfig: (ext, ...keys) => {
      requireRegistered(ext, 'unregisterConfig')
      // Go 侧已注册时删除配置项；删除后 get*Config 同样抛「配置不存在」
      const map = configStore.get(ext)
      if (map) {
        for (const key of keys) {
          map.delete(key)
        }
      }
    },
    /**
     * @param {Record<string, unknown>} ext
     * @param {unknown} _taskType
     * @param {unknown} _value
     * @param {unknown} _fn
     * @param {unknown} _key
     * @param {unknown} _desc
     * @param {unknown} _group
     */
    registerTask: (ext, _taskType, _value, _fn, _key, _desc, _group) => {
      requireRegistered(ext, 'registerTask')
      return {}
    },
  },
  replyToSender: noop,
  replyPerson: noop,
  replyGroup: noop,
  /** @param {unknown} _ctx @param {unknown} text */
  format: (_ctx, text) => String(text ?? ''),
  /** @param {unknown} _ctx @param {unknown} text */
  formatTmpl: (_ctx, text) => String(text ?? ''),
  /** @param {unknown} s */
  base64ToImage: s => s,
  /** @param {unknown} c */
  getCtxProxyFirst: c => c,
  /** @param {unknown} c */
  getCtxProxyAtPos: c => c,
  newMessage: () => ({}),
  createTempCtx: () => ({}),
  vars: {},
  deck: {},
  coc: {},
  ban: {},
  gameSystem: {},
}

// 兜底：访问任何未定义属性时返回 noop 函数
// 注意：用 Reflect.set 而非 Object.defineProperty/直接赋值——
// 后者在 checkJs 下会覆盖全局 seal 的类型（declare namespace seal），
// 导致业务代码（src/index.ts）的类型检查被桩形状污染。
Reflect.set(globalThis, 'seal', new Proxy(sealStub, {
  get(t, p) {
    return typeof p === 'string' && p in t ? t[p] : noop
  },
  set(t, p, v) {
    if (typeof p === 'string') {
      t[p] = v
    }
    return true
  },
}))

const bundles = readdirSync(distDir).filter(f => f.endsWith('.js') && !f.endsWith('.js.map'))
if (bundles.length === 0) {
  console.error('[smoke] dist/ 无构建产物，请先执行 pnpm build')
  process.exit(1)
}
if (bundles.length > 1) {
  console.error(`[smoke] dist/ 存在多个产物，无法确定加载对象: ${bundles.join(', ')}`)
  process.exit(1)
}

try {
  await import(pathToFileURL(path.join(distDir, bundles[0])).href)

  const checks = {
    '扩展已通过 seal.ext.register 注册': registered.length > 0,
    '扩展名非空': registered.length > 0 && typeof registered[0].name === 'string' && registered[0].name.length > 0,
    '注册了至少一个指令': registered.length > 0 && Object.keys(registered[0].cmdMap ?? {}).length > 0,
  }
  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name)

  if (failed.length > 0) {
    console.error(`[smoke] FAIL: ${failed.join(', ')}`)
    process.exit(1)
  }

  const ext = registered[0]
  const cmdNames = Object.keys(ext.cmdMap ?? {}).join(', ')
  console.log(`[smoke] OK: 插件加载无异常，已注册扩展 <${String(ext.name)}>，指令: ${cmdNames}`)
}
catch (error) {
  console.error('[smoke] FAIL:', error instanceof Error ? error.message : String(error))
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
}
