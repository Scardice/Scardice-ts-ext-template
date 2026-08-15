// @ts-check
import antfu from '@antfu/eslint-config'
import sonarjs from 'eslint-plugin-sonarjs'

// 本地规则：SealDice 命令 solve 使用 async 会因框架支持不完备而异常，改用 sync solve + IIFE async
/** @type {import('eslint').Rule.RuleModule} */
const noAsyncSolve = {
  meta: {
    type: 'problem',
    docs: {
      description: 'SealDice 命令 solve 使用 async 会因框架支持不完备而异常，改用 sync solve + IIFE async',
    },
    messages: {
      asyncSolve:
        '命令 solve 不应是 async 函数：当前框架对 async solve 支持不完备，'
        + '建议改用 sync solve，内部用 IIFE async 包裹异步逻辑，并立即返回 CmdExecuteResult',
    },
    schema: [],
  },
  create(context) {
    /** @param {import('eslint').Rule.Node | null} node @returns {boolean} */
    const isAsyncFn = node =>
      node != null
      && (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression')
      && node.async === true

    return {
      'AssignmentExpression[operator="="]': function (node) {
        const left = node.left
        if (
          left.type === 'MemberExpression'
          && !left.computed
          && left.property.type === 'Identifier'
          && left.property.name === 'solve'
          && isAsyncFn(node.right)
        ) {
          context.report({ node: left.property, messageId: 'asyncSolve' })
        }
      },
      Property(node) {
        if (node.computed) {
          return
        }
        const key = node.key
        const isSolveKey = key.type === 'Identifier'
          ? key.name === 'solve'
          : key.type === 'Literal' && key.value === 'solve'
        if (isSolveKey && isAsyncFn(node.value)) {
          context.report({ node: key, messageId: 'asyncSolve' })
        }
      },
    }
  },
}

export default antfu(
  {
    // 关闭 Anthony 的个人偏好规则(顶层函数声明、单行 if 等)，
    // 其余 stylistic 规则均为可自动修复项，由 `pnpm lint:fix` 处理
    lessOpinionated: true,

    // 忽略构建产物、上游类型声明与声明存根
    ignores: [
      'build/**',
      'dev/**',
      'types/**',
    ],

    typescript: {
      // 开启 type-aware lint，基于 tsconfig.json 的 projectService
      tsconfigPath: 'tsconfig.json',
    },

    // pnpm-workspace.yaml 仅声明 allowBuilds，无 catalogs；关闭实验性 pnpm 规则
    pnpm: false,
  },

  {
    // 关闭 opinionated 规则：
    // 不限制 function vs arrow、不禁止 enum、不设命名审美/长度硬限制
    rules: {
      'prefer-arrow-callback': 'off',
      'no-restricted-syntax': 'off',
      // 无自动修复的 stylistic 规则，不保留（格式问题一律 --fix 处理）
      'style/max-statements-per-line': 'off',
    },
  },

  {
    // 构建/发布脚本：构建日志 + process 全局；
    // hasOwnProperty.call 而非 Object.hasOwn：tsconfig lib es2020 无 Object.hasOwn 类型（hasOwn 需 es2022）
    files: ['tools/**/*.mjs', 'scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'e18e/prefer-object-has-own': 'off',
    },
  },

  {
    // SonarJS maintainability：只 warn，不阻塞
    files: ['src/**/*.ts', 'tools/**/*.mjs', 'scripts/**/*.mjs'],
    plugins: { sonarjs },
    rules: {
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/max-switch-cases': ['warn', 10],
      'sonarjs/no-duplicated-branches': 'warn',
      'sonarjs/no-identical-conditions': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-redundant-boolean': 'warn',
      'sonarjs/no-inverted-boolean-check': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
    },
  },
  {
    // SealDice 本地规则：async solve 等框架支持不完备的写法（非阻塞 warn）
    files: ['src/**/*.ts'],
    plugins: {
      scardice: { rules: { 'no-async-solve': noAsyncSolve } },
    },
    rules: {
      'scardice/no-async-solve': 'warn',
    },
  },
)
