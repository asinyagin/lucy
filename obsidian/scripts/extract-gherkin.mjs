import { glob } from 'glob';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';

const docsDir = '../docs';
const outDir = 'features/generated';

mkdirSync(outDir, { recursive: true });

const files = await glob(`${docsDir}/**/*.md`, { ignore: `${docsDir}/.obsidian/**` });
let count = 0;

for (const file of files) {
  const blocks = readFileSync(file, 'utf8').matchAll(/```gherkin\n([\s\S]*?)```/g);
  let n = 0;
  for (const [, gherkin] of blocks) {
    const suffix = n === 0 ? '' : `-${n}`;
    const out = `${outDir}/${basename(file, '.md')}${suffix}.feature`;
    writeFileSync(out, `# source: ${file}\n${gherkin.trimEnd()}\n`);
    console.log(`${file} -> ${out}`);
    n++;
    count++;
  }
}

console.log(`extracted ${count} feature block(s) from ${files.length} doc(s)`);
