import { filenameDate } from './time.mjs'

const ILLEGAL_FILENAME_CHARS = '\\/:*?"<>|'

/**
 * @param {unknown} value
 * @returns {string} 清洗后的值
 */
function sanitizeFilenamePart(value) {
  return Array.from(String(value ?? ''))
    .filter(char => !ILLEGAL_FILENAME_CHARS.includes(char) && char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) !== 0x7F)
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
}

/**
 * @param {unknown} version
 * @returns {string} 文件名安全版本号
 */
function formatVersion(version) {
  return sanitizeFilenamePart(String(version ?? '').normalize('NFKC'))
    .replace(/\./g, '_')
    .replace(/-/g, '_')
}

/**
 * @param {unknown} value
 * @returns {boolean} 是否含非法字符
 */
function hasIllegalChars(value) {
  return Array.from(String(value)).some(char => ILLEGAL_FILENAME_CHARS.includes(char) || char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7F)
}

const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

/**
 * @param {string} filename
 * @param {string} format
 * @returns {void} 校验失败时抛错
 */
function validateFilename(filename, format) {
  if (filename === '.' || filename === '..' || hasIllegalChars(filename)) {
    throw new Error(`[build] 文件名格式 "${format}" 渲染出非法文件名: "${filename}"`)
  }
  if (filename.includes('{{')) {
    throw new Error(`[build] 文件名格式 "${format}" 含未识别的占位符: "${filename}"`)
  }
  const stem = filename.slice(0, filename.indexOf('.')).toUpperCase()
  if (WINDOWS_RESERVED_NAMES.has(stem)) {
    throw new Error(`[build] 文件名格式 "${format}" 渲染出 Windows 保留设备名: "${filename}"`)
  }
}

/**
 * @param {string} format
 * @param {{ name: string, author: string, version: string }} config
 * @param {Date} now
 * @returns {string} 渲染并校验后的文件名
 */
export function renderFilename(format, { name, author, version }, now) {
  /** @type {Record<string, string>} */
  const values = {
    name: sanitizeFilenamePart(name),
    author: sanitizeFilenamePart(author),
    version: formatVersion(version),
    timestamp: String(Math.floor(now.getTime() / 1000)),
    date: filenameDate(now),
  }
  // 配置已由 config.mjs 保证非空；清洗后为空（如 name = '///'）同样 fail-fast，
  // 不再静默回退（fallback 语义只应存在于 normalization 层）
  for (const [key, value] of Object.entries(values)) {
    if (value === '') {
      throw new Error(`[build] 文件名占位符 {{${key}}} 对应值清洗后为空，请检查 plugin.config.mjs 的 "${key}"`)
    }
  }
  let filename = format.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key]
    }
    throw new Error(`[build] 未知文件名占位符 "{{${key}}}"`)
  })
  if (!filename.endsWith('.js')) {
    filename += '.js'
  }
  validateFilename(filename, format)
  return filename
}
