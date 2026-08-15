export const nameList = ['氪豹', '林冲'] as const

// 模板自带的最小抽样实现：默认模板应为 0 运行时依赖（不为此引入 lodash-es）
export function sample<T>(values: readonly T[]): T | undefined {
  if (values.length === 0) {
    return undefined
  }
  return values[Math.floor(Math.random() * values.length)]
}
