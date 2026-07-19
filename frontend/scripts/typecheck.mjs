import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
if (!config.type || config.type !== 'module') throw new Error('Frontend must remain an ES module.');
for (const file of ['src/main.jsx', 'src/App.jsx']) await readFile(new URL(`../${file}`, import.meta.url));
console.log('JavaScript typecheck: configuration and entrypoints OK (no TypeScript sources).');
