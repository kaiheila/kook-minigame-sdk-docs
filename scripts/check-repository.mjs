import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { lstat, readFile } from 'node:fs/promises'

import { assertPublicText } from './public-content.mjs'
import { pages } from './site-config.mjs'

const allowed = new Set([
  '.github/workflows/pages.yml',
  '.gitignore',
  '.npmrc',
  '.prettierignore',
  'README.md',
  'package.json',
  'pnpm-lock.yaml',
  'prettier.config.mjs',
  'docs/.vitepress/config.mts',
  'docs/.vitepress/theme/index.ts',
  'docs/.vitepress/theme/style.css',
  'docs/public/sequence.svg',
  'scripts/check-repository.mjs',
  'scripts/check-site.mjs',
  'scripts/export-markdown.mjs',
  'scripts/public-content.mjs',
  'scripts/site-config.mjs',
  ...pages.map(([file]) => `docs/${file}`),
])

const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
  ),
]
for (const file of files) {
  assert(allowed.has(file), `File not approved for this public repository: ${file}`)
  assert((await lstat(file)).isFile(), `Only regular files may be published: ${file}`)
  assertPublicText(await readFile(file, 'utf8'), file)
}
for (const file of allowed) assert(files.includes(file), `Missing public file: ${file}`)
console.log(`Verified ${files.length} public repository files.`)
