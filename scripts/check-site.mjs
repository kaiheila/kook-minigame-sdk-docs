import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { assertPublicText } from './public-content.mjs'
import { base, pages, siteUrl } from './site-config.mjs'

const root = resolve('docs/.vitepress/dist')
const files = await readdir(root, { recursive: true })
let links = 0
for (const file of files.filter((name) => /\.(?:html|md|txt|js|css|json|svg|xml|map)$/.test(name))) {
  assert(!file.endsWith('.map'), `Unexpected source map: ${file}`)
  assertPublicText(await readFile(resolve(root, file), 'utf8'), file)
}
for (const file of files.filter((name) => /\.(?:html|md|txt)$/.test(name))) {
  const text = await readFile(resolve(root, file), 'utf8')
  const references = file.endsWith('.html')
    ? [...text.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1])
    : [...text.matchAll(/\]\(([^\s)]+)\)/g)].map((match) => match[1])
  for (const reference of references) {
    if (/^(?:data:|mailto:|#)/.test(reference)) continue
    const url = new URL(reference.replaceAll('&amp;', '&'), new URL(file, siteUrl))
    if (url.origin !== new URL(siteUrl).origin) continue
    assert(url.pathname.startsWith(base), `Outside base: ${file}: ${url.pathname}`)
    const path = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html'
    await access(resolve(root, path.endsWith('/') ? `${path}index.html` : path)).catch(() => {
      throw new Error(`Missing link: ${file} → ${path}`)
    })
    links++
  }
}
for (const [file] of pages) {
  const html = await readFile(resolve(root, file.replace(/\.md$/, '.html')), 'utf8')
  assert(
    html.includes('rel="describedby"') && html.includes('type="text/markdown"'),
    `Missing discovery links: ${file}`
  )
}
const llms = await readFile(resolve(root, 'llms.txt'), 'utf8')
assert(llms.startsWith('# KOOK 小游戏 SDK\n') && llms.includes('> '))
assert.equal((llms.match(/\.md\)/g) ?? []).length, pages.length)
console.log(
  `Verified ${pages.length} pages and ${links} local links/assets; Markdown discovery and content checks passed.`
)
