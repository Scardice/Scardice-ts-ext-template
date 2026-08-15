import { nameList, sample } from './utils'

// 官方写法：业务代码直接使用 seal 全局（类型由 types/vendor/seal.d.ts 保证，严格检查）。
// 若使用到声明中缺失的新 API，请先更新 types/vendor/seal.d.ts。
// 插件身份信息由构建时注入（tools/build.mjs 的 esbuild define），
// 与产物 header / 文件名来自同一个 plugin.config.mjs 启动快照。
declare const __PLUGIN_ID__: string
declare const __PLUGIN_AUTHOR__: string
declare const __PLUGIN_VERSION__: string

let ext = seal.ext.find(__PLUGIN_ID__)
if (!ext) {
  ext = seal.ext.new(__PLUGIN_ID__, __PLUGIN_AUTHOR__, __PLUGIN_VERSION__)

  // 创建指令 .seal
  const cmdSeal = seal.ext.newCmdItemInfo()
  cmdSeal.name = 'seal'
  cmdSeal.help = '召唤一团余烬，可用.seal <名字> 命名'

  cmdSeal.solve = (ctx, msg, cmdArgs) => {
    const name = cmdArgs.getArgN(1)
    switch (name) {
      case 'help': {
        const ret = seal.ext.newCmdExecuteResult(true)
        ret.showHelp = true
        return ret
      }
      default: {
        // 命令为 .seal XXXX，取第一个参数为名字；无参数时随机取名
        seal.replyToSender(ctx, msg, `你收集到一团余烬！取名为${name || sample(nameList)}\n它的逃跑意愿为${Math.floor(Math.random() * 100) + 1}`)
        return seal.ext.newCmdExecuteResult(true)
      }
    }
  }

  // 注册命令与扩展
  ext.cmdMap.seal = cmdSeal
  seal.ext.register(ext)
}
