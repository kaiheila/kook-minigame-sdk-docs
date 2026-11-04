import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { pages, sdkSummary, sdkVersion, siteUrl } from './site-config.mjs'

const output = resolve('docs/.vitepress/dist')
const full = [`# KOOK 小游戏 SDK 完整文档\n\n> ${sdkSummary}\n`]
const index = [
  '# KOOK 小游戏 SDK',
  `> ${sdkSummary}`,
  `固定安装：pnpm add --save-exact @kookapp/kook-minigame-sdk@${sdkVersion}。游戏校验 KOOK_MINI_GAME_BOOTSTRAP 消息的 parent Window、精确 HTTPS origin 和字段，监听晚于 load 时可发送 KOOK_MINI_GAME_BOOTSTRAP_REQUEST 请求重投。ready 后展示可用内容并上报加载；需要身份时按需 session.get，由后端核对 state、换码及创建游戏会话。默认申请 get_user_info，显式 scopes 可只含其他合法权限，不要求是 availableScopes 子集；profile.basic 兼容归一化。OAuth token 留在后端。redirectUri 可选，签发与换码值必须一致，允许地址取决于目标宿主及 OAuth 后端。`,
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
