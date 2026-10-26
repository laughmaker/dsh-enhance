/**
 * Build the two halves of dsh-enhance with the DSH checkout's own toolchain.
 *
 * The browser half must be a `window.__ModuleLoader__.load({ id, factory })`
 * bundle whose factory receives the shared module table's `require`; that shape
 * is what the host's `/plugins` route serves and what the shell's module table
 * resolves `react`, `react-dom` and the Cordis baseline against. Everything
 * else is inlined, because a feature plugin may not request non-baseline
 * module-table rows.
 */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  'zod',
  '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

export default [
  {
    name: 'dsh-enhance',
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2022',
    dts: false,
    clean: true,
    outputOptions: { entryFileNames: 'index.js' },
  },
  {
    name: 'dsh-enhance (client)',
    entry: ['src/client/index.tsx'],
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    dts: false,
    clean: false,
    external: EXTERNALS,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-enhance", factory: (require) => {',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
]
