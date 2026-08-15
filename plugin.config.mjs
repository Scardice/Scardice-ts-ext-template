// 插件单一事实源：运行时注册（构建时注入）、产物头部、产物文件名均由本文件派生。
// 修改后无需其他同步；header 与 filename 使用 {{占位符}}，见 README「产物命名」。
// 本文件属于构建配置：build / watch 运行期间修改后需重启（身份信息在启动时快照）。
// 类型由本文件内联 JSDoc 声明，经 tsconfig checkJs 检查，无手工声明镜像文件。

/** @type {string} */
export const id = 'your-plugin-id'
/** @type {string} */
export const name = '模板项目'
/** @type {string} */
export const author = '作者名'
/** @type {string} */
export const version = '1.0.0'
/** @type {string} */
export const description = '这是余烬的js扩展模板项目，请自行修改信息'
/** @type {string} */
export const license = 'MIT'
/** @type {string} */
export const homepage = 'https://github.com/Scardice/Scardice-ts-ext-template'
/** @type {string} */
export const filename = '{{name}}[{{author}}]_{{version}}.js'
/** @type {string} */
export const header = [
  '// ==UserScript==',
  '// @name         {{name}}',
  '// @author       {{author}}',
  '// @version      {{version}}',
  '// @description  {{description}}',
  '// @timestamp    {{timestamp}}',
  '// {{date}}',
  '// @license      {{license}}',
  '// @homepageURL  {{homepage}}',
  '// ==/UserScript==',
].join('\n')
