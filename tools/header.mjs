import { headerDate } from './time.mjs'

// header 占位符渲染：与 naming.mjs（文件名）策略一致——
// 未知占位符 fail-fast；所有值强制单行，避免破坏 // 注释结构。

/**
 * 单行化：CR/LF 之外，U+2028 / U+2029 同为 JS line terminator，一并归一
 * @param {unknown} value
 * @returns {string} 单行化后的字符串
 */
export function singleLine(value) {
  return String(value).replace(/[\r\n\u2028\u2029]+/g, ' ').trim()
}

/**
 * @param {string} text
 * @param {Record<string, string>} values
 * @returns {string} 渲染并校验后的模板
 */
export function renderMarkers(text, values) {
  const rendered = text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      throw new Error(`[build] header 含未知占位符 "{{${key}}}"`)
    }
    return singleLine(values[key])
  })
  // 与 naming.mjs 一致：未被正则匹配的残余占位符（如 {{ date }}）同样 fail-fast
  if (rendered.includes('{{')) {
    throw new Error('[build] header 含无法解析的占位符（占位符内不允许空格）')
  }
  return rendered
}

/**
 * @param {{ name: string, author: string, version: string, description: string, license: string, homepage: string, header: string }} config
 * @param {Date} now
 * @returns {string} 渲染完成的 header 文本
 */
export function renderHeader(config, now) {
  const values = {
    name: config.name,
    author: config.author,
    version: config.version,
    description: config.description,
    license: config.license,
    homepage: config.homepage,
    timestamp: String(Math.floor(now.getTime() / 1000)),
    date: headerDate(now),
  }
  return renderMarkers(config.header, values)
}
