// 构建时间单一来源：SOURCE_DATE_EPOCH（Unix 秒，UTC 基准）或当前系统时间。
// header 与文件名共用本模块的 UTC 分量，保证同一 epoch 跨时区产物一致（可重现构建）。

/**
 * @param {string | undefined} epoch
 * @returns {Date} 由 epoch 构造的 UTC 基准时间；未设置时为当前时间
 */
export function buildTime(epoch) {
  if (epoch === undefined || epoch === '') {
    return new Date()
  }
  // 规范（reproducible-builds.org）：无符号、无小数、纯 ASCII 数字
  if (!/^\d+$/.test(epoch)) {
    throw new TypeError(`[build] SOURCE_DATE_EPOCH 非法: "${epoch}"（应为纯数字 Unix 秒）`)
  }
  const seconds = Number(epoch)
  if (!Number.isSafeInteger(seconds)) {
    throw new TypeError(`[build] SOURCE_DATE_EPOCH 非法: "${epoch}"（超出安全整数范围）`)
  }
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`[build] SOURCE_DATE_EPOCH 非法: "${epoch}"（超出 Date 可表示范围）`)
  }
  return date
}

/**
 * 文件名日期：YYYY-MM-DD（路径安全，UTC 分量）
 * @param {Date} now
 * @returns {string} YYYY-MM-DD 字符串
 */
export function filenameDate(now) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

/**
 * header 日期：yyyy/(m)m/(d)d（UTC 分量）
 * @param {Date} now
 * @returns {string} yyyy/(m)m/(d)d 字符串
 */
export function headerDate(now) {
  return `${now.getUTCFullYear()}/${now.getUTCMonth() + 1}/${now.getUTCDate()}`
}
