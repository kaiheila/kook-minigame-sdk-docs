import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { pages, siteUrl } from './site-config.mjs'

const output = resolve('docs/.vitepress/dist')
const full = [
  '# KOOK 小游戏 SDK 完整文档\n\n> 文档已发布，SDK 尚未发布。0.1.0-alpha.0 接入契约预览，更新于 2026-10-22。\n',
]
const index = [
  '# KOOK 小游戏 SDK',
  '> @kookapp/kook-minigame-sdk 接入文档：截至 2026-10-22，文档已发布，SDK 尚未发布，暂不提供安装命令或下载包。SDK 计划发布至 npmjs。',
  '文档预览目标版本为 0.1.0-alpha.0。游戏先运行并完成 ready，再按需通过 session.get 请求 OAuth 授权；前端不调用 authenticate，不传入 OAuth token。游戏后端校验 state、换码并建立自己的登录态。availableScopes 是可申请集合，不是用户同意记录。平台上下文接口及其 scope 尚待对接确认，不应自行推断。',
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
