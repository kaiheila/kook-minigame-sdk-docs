import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { pages, siteUrl } from './site-config.mjs'

const output = resolve('docs/.vitepress/dist')
const full = [
  '# KOOK 小游戏 SDK 完整文档\n\n> @kookapp/kook-minigame-sdk：0.1.0-alpha.3 已发布到 npmjs 的 next 标签；采用 createKookClient 具名入口，公开 scope 为 get_user_info 和 mini_game.context，兼容 profile.basic 别名。更新于 2026-10-28。\n',
]
const index = [
  '# KOOK 小游戏 SDK',
  '> KOOK 小游戏 SDK 接入文档：正式包名为 @kookapp/kook-minigame-sdk。0.1.0-alpha.3 已于 2026-10-28 发布到 npmjs 的 next 标签，使用 createKookClient 具名导入。',
  '固定版本安装：pnpm add @kookapp/kook-minigame-sdk@0.1.0-alpha.3。公开 scope 为 get_user_info 和 mini_game.context，profile.basic 兼容映射为 get_user_info；默认只申请 get_user_info，可显式追加 mini_game.context。bootstrap 初始数据由 KOOK 客户端直接传入。游戏先运行并完成 ready，再按需通过 session.get 请求 OAuth 授权；前端不调用 authenticate，不传入 OAuth token。游戏后端校验 state、换码并建立自己的登录态。redirect_uri 在开发者后台配置，开发者后台目前仍在开发中。availableScopes 是可申请集合，不是用户同意记录。',
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
