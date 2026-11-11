import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { pages, sdkSummary, sdkVersion, siteUrl } from './site-config.mjs'

const output = resolve('docs/.vitepress/dist')
const full = [`# KOOK 小游戏 SDK 完整文档\n\n> ${sdkSummary}\n`]
const index = [
  '# KOOK 小游戏 SDK',
  `> ${sdkSummary}`,
  `固定安装：pnpm add --save-exact @kookapp/kook-minigame-sdk@${sdkVersion}。需要账号时调用 session.get({ state, scopes })，由游戏后端换码并建立会话；数据查询检查所需授权。上下文查询由后端使用 mini_game.context 权限调用。参数、返回值和示例按以下页面查阅。`,
  '## 接入文档',
]

for (const [file, title, description] of pages) {
  const source = await readFile(resolve('docs', file), 'utf8')
  const url = new URL(file, siteUrl)
  const markdown = source
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .replace(/<div class="launch-flow"[\s\S]*?<\/div>\s*<\/div>/, '')
    .replace(/\]\(([^\s)]+)\)/g, (match, target) => {
      if (/^(?:https?:|mailto:|#)/.test(target)) return match
      const absolute = target.startsWith('/')
        ? new URL(
            target.startsWith('/kook-minigame-sdk-docs/')
              ? target.slice('/kook-minigame-sdk-docs/'.length)
              : target.slice(1),
            siteUrl
          )
        : new URL(target, url)
      return `](${absolute.href})`
    })
    .trim()
  if (/<(?:script|div|span)\b/.test(markdown)) throw new Error(`Unexported HTML in ${file}`)
  await mkdir(dirname(resolve(output, file)), { recursive: true })
  await writeFile(resolve(output, file), `${markdown}\n`)
  index.push(`- [${title}](${url.href}): ${description}`)
  full.push(`<!-- Source: ${url.href} -->\n\n${markdown}\n`)
}
index.push('## Optional', `- [完整文档](${siteUrl}llms-full.txt): 全部页面的 Markdown 合集`)
await writeFile(resolve(output, 'llms.txt'), `${index.join('\n\n')}\n`)
await writeFile(resolve(output, 'llms-full.txt'), `${full.join('\n---\n\n')}\n`)
await writeFile(resolve(output, '.nojekyll'), '')
console.log(`Exported ${pages.length} Markdown pages, llms.txt and llms-full.txt.`)
