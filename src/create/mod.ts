// deno-lint-ignore-file no-import-prefix
import { copy } from 'jsr:@std/fs@^1.0.19';
import { dirname, join } from 'jsr:@std/path@^1.1.2';

if (import.meta.main) {
  const [projectName] = Deno.args;
  if (!projectName || projectName === '-h' || projectName === '--help') {
    console.info(
      `Usage: create-html-props <project-name>\n\nScaffold a new html-props project in a directory.\n`,
    );
    Deno.exit(1);
  }

  // Use import.meta.resolve to support both local and remote (jsr) usage
  const templateUrl = import.meta.resolve('./template/');
  const url = new URL(templateUrl);
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

  // Fix for Windows: remove leading slash from /C:/... paths
  let templateDir = url.pathname;
  if (Deno.build.os === 'windows' && templateDir.match(/^\/[A-Za-z]:/)) {
    templateDir = templateDir.slice(1);
  }

  if (url.protocol !== 'file:') {
    // Remote: fetch each file and write to target
    for (const relPath of templateFiles) {
      const fileUrl = new URL(relPath, url);
      const destFilePath = join(targetDir, relPath);
      // Ensure parent directory exists
      await Deno.mkdir(dirname(destFilePath), { recursive: true });
      const resp = await fetch(fileUrl.href);
      if (!resp.ok) throw new Error(`Failed to fetch ${fileUrl.href}: ${resp.status} ${resp.statusText}`);
      const data = new Uint8Array(await resp.arrayBuffer());
      await Deno.writeFile(destFilePath, data);
    }
    console.info(`\n✔ Project created in ${targetDir}`);
    console.info('\nNext steps:');
    console.info(`  cd ${projectName}`);
    console.info(`  deno task dev`);
    console.info(`  Open http://localhost:8000/index.html in your browser`);
    Deno.exit(0);
  }

  try {
    await copy(templateDir, targetDir, { overwrite: false });
    console.info(`\n✔ Project created in ${targetDir}`);
    console.info('\nNext steps:');
    console.info(`  cd ${projectName}`);
    console.info(`  deno task dev`);
    console.info(`  Open http://localhost:8000/index.html in your browser`);
  } catch (err) {
    if (err instanceof Deno.errors.AlreadyExists) {
      console.error(`Error: Directory '${projectName}' already exists.`);
    } else {
      throw err;
    }
    Deno.exit(1);
  }
}
