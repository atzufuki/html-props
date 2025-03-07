import * as esbuild from 'npm:esbuild';
import { denoPlugins } from 'jsr:@luca/esbuild-deno-loader';

await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ['./src/demo/static/app.ts'],
  outfile: './src/demo/static/app.js',
  bundle: true,
  format: 'esm',
});

esbuild.stop();
