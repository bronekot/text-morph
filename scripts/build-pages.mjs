import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(rootDir, 'dist');
const siteDir = join(rootDir, 'site');
const packageJson = JSON.parse(
  await readFile(join(rootDir, 'package.json'), 'utf8'),
);
const version = `v${packageJson.version}`;

await rm(siteDir, { recursive: true, force: true });
await mkdir(siteDir, { recursive: true });
await cp(distDir, siteDir, { recursive: true });

const versionDir = join(siteDir, version);
await mkdir(versionDir, { recursive: true });
await cp(distDir, versionDir, { recursive: true });

await writeFile(
  join(siteDir, 'index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>text-morph</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        max-width: 760px;
        margin: 0 auto;
        padding: 48px 24px;
        line-height: 1.55;
      }

      code {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      }

      a {
        color: inherit;
      }
    </style>
  </head>
  <body>
    <h1>text-morph ${version}</h1>
    <p>Framework-independent JavaScript text morph utilities.</p>
    <h2>ESM</h2>
    <pre><code>import { createTextMorphSteps } from 'https://bronekot.github.io/text-morph/${version}/text-morph.js';</code></pre>
    <h2>Files</h2>
    <ul>
      <li><a href="./text-morph.js">Latest ESM bundle</a></li>
      <li><a href="./text-morph.umd.js">Latest UMD bundle</a></li>
      <li><a href="./${version}/text-morph.js">${version} ESM bundle</a></li>
      <li><a href="./${version}/text-morph.umd.js">${version} UMD bundle</a></li>
    </ul>
    <p><a href="https://github.com/bronekot/text-morph">GitHub repository</a></p>
  </body>
</html>
`,
);
