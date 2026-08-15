export const target = 'es2020'
/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  entryPoints: ['src/index.ts'],
  platform: 'browser',
  target,
  tsconfig: './tsconfig.json',
  treeShaking: true,
  logLevel: 'error',
  // process.env.NODE_ENV 的 define 已移至 build.mjs，由 --mode 显式注入
}

export const dev = {
  ...common,
  minify: false,
  outDir: 'dev',
  color: true,
  sourcemap: true,
}

export const build = {
  ...common,
  minify: true,
  outDir: 'dist',
  sourcemap: false,
}
