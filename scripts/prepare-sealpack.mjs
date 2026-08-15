// 准备 sealpack 打包源目录（sealpack/）：
// 1. 从 plugin.config.mjs（SSOT）读取 name/author/version/description
// 2. 扫描 dist/ 定位实际构建产物（产物名可能含日期等占位符）
// 3. 复制产物为 sealpack/scripts/main.js
// 4. 同步 sealpack/info.toml 的 name/authors/version/description
// 用法：pnpm build && pnpm pack:prepare
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as rawPluginConfig from '../plugin.config.mjs'
import { normalizePluginConfig } from '../tools/config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pluginConfig = normalizePluginConfig(rawPluginConfig)
const sealpackDir = path.join(root, 'sealpack')
const mainJs = path.join(sealpackDir, 'scripts', 'main.js')
const infoToml = path.join(sealpackDir, 'info.toml')

const bundles = fs.readdirSync(path.join(root, 'dist')).filter(f => f.endsWith('.js') && !f.endsWith('.js.map'))
if (bundles.length === 0) {
  console.error('[prepare-sealpack] dist/ 无构建产物，请先执行 pnpm build')
  process.exit(1)
}
if (bundles.length > 1) {
  console.error(`[prepare-sealpack] dist/ 存在多个产物，无法确定打包对象: ${bundles.join(', ')}`)
  process.exit(1)
}

fs.mkdirSync(path.dirname(mainJs), { recursive: true })
fs.copyFileSync(path.join(root, 'dist', bundles[0]), mainJs)

// 同步 info.toml（信息全部来自 plugin.config.mjs，保持单一事实源）
const toml = fs.readFileSync(infoToml, 'utf8')
  .replace(/^(name\s*=\s*)"[^"]*"$/m, `$1"${pluginConfig.name}"`)
  .replace(/^(authors\s*=\s*)\[[^\]]*\]$/m, `$1[ "${pluginConfig.author}" ]`)
  .replace(/^(version\s*=\s*)"[^"]*"$/m, `$1"${pluginConfig.version}"`)
  .replace(/^(description\s*=\s*)"[^"]*"$/m, `$1"${pluginConfig.description}"`)
fs.writeFileSync(infoToml, toml)

console.log(`[prepare-sealpack] 已同步 info.toml（${pluginConfig.name} ${pluginConfig.version}）`)
console.log(pluginConfig.version)
