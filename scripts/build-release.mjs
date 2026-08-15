// 发布打包：prepare + sealpack validate/pack → dist/<产物名>-<版本>.sealpack
// 版本号与插件信息全部来自 plugin.config.mjs（SSOT）。
// 用法：pnpm build && pnpm pack:release
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as rawPluginConfig from '../plugin.config.mjs'
import { normalizePluginConfig } from '../tools/config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pluginConfig = normalizePluginConfig(rawPluginConfig)

/**
 * @param {string} cmd
 * @param {string} cwd
 */
function run(cmd, cwd = root) {
  execSync(cmd, { stdio: 'inherit', cwd })
}

function main() {
  run('node scripts/prepare-sealpack.mjs')

  console.log('[build-release] 校验 sealpack...')
  run('pnpm exec sealpack validate sealpack')

  console.log('[build-release] 打包...')
  const bundles = fs.readdirSync(path.join(root, 'dist')).filter(f => f.endsWith('.js') && !f.endsWith('.js.map'))
  if (bundles.length !== 1) {
    console.error(`[build-release] dist/ 产物异常: ${bundles.join(', ') || '无产物'}`)
    process.exit(1)
  }
  const filename = bundles[0]
  const out = `dist/${filename.replace(/\.js$/, '')}-${pluginConfig.version}.sealpack`
  run(`pnpm exec sealpack pack sealpack --out "${out}"`)

  console.log(`[build-release] 完成：
  - dist/${filename}
  - ${out}`)
}

main()
