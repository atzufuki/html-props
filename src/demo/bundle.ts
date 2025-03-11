import * as esbuild from 'npm:esbuild';
import { denoPlugins } from 'jsr:@luca/esbuild-deno-loader';

await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ['./src/demo/static/app.tsx'],
  outfile: './src/demo/static/app.js',
  bundle: true,
  format: 'esm',
  jsxFactory: 'JSX.createElement',
  jsxImportSource: '@html-props/jsx',
  inject: ['@html-props/jsx/jsx-runtime'],
});

esbuild.stop();
