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

  const meta = await fetch('https://jsr.io/@html-props/create/meta.json').then((r) => r.json());
  const jsrBase = `https://jsr.io/@html-props/create/${meta.latest}/template/`;
  const targetDir = join(Deno.cwd(), projectName);

  // List of all files in the template (relative to template root)
  const templateFiles = [
    'deno.json',
    'public/html-props.svg',
    'public/index.html',
    'public/typescript.svg',
    'src/App.css',
    'src/App.ts',
    'src/html.ts',
    'src/index.css',
    'src/main.ts',
  ];

  await Promise.all(templateFiles.map(async (relPath) => {
    const fileUrl = jsrBase + relPath;
    const destFilePath = join(targetDir, relPath);
    // Ensure parent directory exists
    await Deno.mkdir(dirname(destFilePath), { recursive: true });
    const resp = await fetch(fileUrl);
    if (!resp.ok) throw new Error(`Failed to fetch ${fileUrl}: ${resp.status} ${resp.statusText}`);
    const data = new Uint8Array(await resp.arrayBuffer());
    await Deno.writeFile(destFilePath, data);
  }));

  console.info(`\n✔ Project created in ${targetDir}`);
  console.info('\nNext steps:');
  console.info(`  cd ${projectName}`);
  console.info(`  deno task dev`);
  console.info(`  Open http://localhost:8000/index.html in your browser`);
  Deno.exit(0);
}
