// deno-lint-ignore-file no-import-prefix
import { dirname, join } from 'jsr:@std/path@^1.1.2';

if (import.meta.main) {
  const [projectName] = Deno.args;
  if (!projectName || projectName === '-h' || projectName === '--help') {
    console.info(
      `Usage: create-html-props <project-name>\n\nScaffold a new html-props project in a directory.\n`,
    );
    Deno.exit(1);
  }

  const targetDir = join(Deno.cwd(), projectName);
  // Use URL to support both local and remote (jsr) execution
  const templateBaseUrl = new URL('template/', import.meta.url);

  // List of all files in the template (relative to template root)
  const templateFiles = [
    'deno.json',
    'dev_server.ts',
    'hmr_client.ts',
    'public/html-props.svg',
    'public/index.html',
    'public/typescript.svg',
    'src/App.css',
    'src/App.ts',
    'src/index.css',
    'src/main.ts',
  ];

  await Promise.all(templateFiles.map(async (relPath) => {
    const srcUrl = new URL(relPath, templateBaseUrl);
    const destFilePath = join(targetDir, relPath);
    // Ensure parent directory exists
    await Deno.mkdir(dirname(destFilePath), { recursive: true });
    let data;
    if (srcUrl.protocol === 'file:') {
      data = await Deno.readFile(srcUrl);
    } else {
      const resp = await fetch(srcUrl.href);
      if (!resp.ok) throw new Error(`Failed to fetch ${srcUrl.href}`);
      data = new Uint8Array(await resp.arrayBuffer());
    }
    await Deno.writeFile(destFilePath, data);
  }));

  console.info(`\n✔ Project created in ${targetDir}`);
  console.info('\nNext steps:');
  console.info(`  cd ${projectName}`);
  console.info(`  deno task dev`);
  console.info(`  Open http://localhost:8000/index.html in your browser`);
  Deno.exit(0);
}
