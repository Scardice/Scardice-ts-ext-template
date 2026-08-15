import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { buildSync, context } from 'esbuild'
import * as rawPluginConfig from '../plugin.config.mjs'
import { build as buildConfig, dev as devConfig } from './build-config.mjs'
import { normalizePluginConfig } from './config.mjs'
import { renderHeader } from './header.mjs'
import { renderFilename } from './naming.mjs'
import { buildTime } from './time.mjs'

/**
 * 构建模式：CLI 显式参数，非法值 fail-fast（不借用语义宽泛的 NODE_ENV）
 * @returns {'production' | 'development'} 显式构建模式
 */
function resolveMode() {
  const index = process.argv.indexOf('--mode')
  const mode = index === -1 ? undefined : process.argv[index + 1]
  if (mode !== 'production' && mode !== 'development') {
    throw new Error(`[build] --mode 必须为 production 或 development，实际: "${mode}"`)
  }
  return mode
}

/**
 * @returns {Promise<void>} 一次性构建完成；watch 模式下挂起
 */
async function main() {
  const isWatch = process.argv.includes('--watch')
  const writeMeta = process.argv.includes('--metafile')
  const skipCheck = process.argv.includes('--no-check')
  if (isWatch && writeMeta) {
    throw new Error('[build] watch 模式不支持 --metafile（meta.json 仅在一次性分析构建中产出）')
  }

  const mode = resolveMode()
  // 单一事实源消费入口：raw 配置先经 normalization/validation，三处产物只吃规整值
  const pluginConfig = normalizePluginConfig(rawPluginConfig)
  const config = mode === 'production' ? buildConfig : devConfig
  const { outDir, ...buildOptions } = config
  const timerStart = Date.now()
  // 可重现构建：时间快照来自 SOURCE_DATE_EPOCH（UTC 基准）或当前系统时间
  const now = buildTime(process.env.SOURCE_DATE_EPOCH)

  // 产物文件名 SSOT：来自 plugin.config.mjs 的 filename
  const outfile = path.join(outDir, renderFilename(pluginConfig.filename, pluginConfig, now))
  // banner 由 esbuild 生成阶段注入，sourcemap/metafile 与实际产物一致
  const banner = { js: `${renderHeader(pluginConfig, now).trimEnd()}\n` }
  // 类型检查与 lint：一次性构建默认执行；--no-check 跳过（产物不受影响）
  if (!isWatch && !skipCheck) {
    const checkResult = spawnSync('pnpm', ['check'], { stdio: 'inherit' })
    if (checkResult.error) {
      throw new Error('[build] 无法执行 pnpm check（请通过 pnpm build 运行，或用 --no-check 跳过检查）')
    }
    if (checkResult.status !== 0) {
      process.exit(checkResult.status ?? 1)
    }
  }

  // 渲染完成后再清空产物目录：配置非法（fail-fast）时保留上一个可用产物
  fs.rmSync(outDir, { recursive: true, force: true })
  // 运行时身份信息与 header / 文件名来自同一个启动快照：
  // runtime.ts 不 import plugin.config.mjs，避免 watch 期间配置热更导致产物分裂。
  // 修改 plugin.config.mjs 后需重启 build / watch。
  const define = {
    'process.env.NODE_ENV': JSON.stringify(mode),
    '__PLUGIN_ID__': JSON.stringify(pluginConfig.id),
    '__PLUGIN_AUTHOR__': JSON.stringify(pluginConfig.author),
    '__PLUGIN_VERSION__': JSON.stringify(pluginConfig.version),
  }

  if (isWatch) {
    const ctx = await context({ ...buildOptions, define, outfile, banner })
    const stop = () => {
      ctx.dispose().then(() => process.exit(0))
    }
    process.on('SIGINT', stop)
    process.on('SIGTERM', stop)
    await ctx.watch()
    // watch() 不是初始构建完成的屏障，此处不声称构建耗时
    console.log('🔨 Watching for changes...')
    return
  }

  const result = buildSync({ ...buildOptions, define, metafile: writeMeta, outfile, banner })
  if (writeMeta) {
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(result.metafile, null, 2))
  }
  console.log(`🔨 Built in ${Date.now() - timerStart}ms.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
