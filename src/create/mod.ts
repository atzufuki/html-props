// deno-lint-ignore-file no-import-prefix
import { copy } from 'jsr:@std/fs@^1.0.19';
import { join } from 'jsr:@std/path@^1.1.2';

if (import.meta.main) {
  const [projectName] = Deno.args;
  if (!projectName || projectName === '-h' || projectName === '--help') {
    console.info(
      `Usage: create-html-props <project-name>\n\nScaffold a new html-props project in a directory.\n`,
    );
    Deno.exit(1);
  }

  const templateDir = join(import.meta.dirname ?? '.', '../template');
  const targetDir = join(Deno.cwd(), projectName);

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
