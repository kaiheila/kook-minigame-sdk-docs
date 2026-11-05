import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { pages, sdkSummary, sdkVersion, siteUrl } from './site-config.mjs'

const output = resolve('docs/.vitepress/dist')
const full = [`# KOOK 小游戏 SDK 完整文档\n\n> ${sdkSummary}\n`]
const index = [
  '# KOOK 小游戏 SDK',
  `> ${sdkSummary}`,
  `固定安装：pnpm add --save-exact @kookapp/kook-minigame-sdk@${sdkVersion}。createKookClient() → ready() → 展示可用内容 → reportLoadResult()；启动消息接收、来源校验、重投和清理由 SDK 完成，游戏不再编写宿主接线代码。正式来源默认可信，测试环境配置 allowedHostOrigins。主动退出调用 lifecycle.leave()，要求 ready 与同名 capability，无需 OAuth；先完成游戏自己的退房或存档，失败可重试，断线恢复不自动重放，destroy() 仅清理本地。需要身份时按需 session.get，由游戏后端校验 state、换码并建立自己的会话。OAuth token 留在后端，按需查询上下文。`,
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
