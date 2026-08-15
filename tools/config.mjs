// 配置 normalization / validation：raw plugin.config.mjs → 规整后的配置。
// 产物文件名、产物头部、runtime define 必须只消费本层输出，
// 保证三处 identity 语义一致（此前 fallback 仅存在于文件名 renderer，
// 同一 raw 值在不同消费者处会产生不同解释）。

const REQUIRED_FIELDS = [
  'id',
  'name',
  'author',
  'version',
  'description',
  'license',
  'homepage',
  'filename',
  'header',
]

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ id: string, name: string, author: string, version: string, description: string, license: string, homepage: string, filename: string, header: string }} 规整后的配置对象
 */
export function normalizePluginConfig(raw) {
  /** @type {Record<string, string>} */
  const normalized = {}
  for (const key of REQUIRED_FIELDS) {
    const value = raw[key]
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`[build] plugin.config.mjs 字段 "${key}" 缺失或为空（必填非空字符串）`)
    }
    normalized[key] = value.trim()
  }
  return /** @type {{ id: string, name: string, author: string, version: string, description: string, license: string, homepage: string, filename: string, header: string }} */ (normalized)
}
