# KOOK 小游戏 SDK 文档

对外开发者文档，使用 VitePress 1.6.4 和 GitHub Pages。本仓库只包含文档、示例片段和站点构建配置。

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm preview
```

Node.js >=22.18，pnpm 10.26.0。页面源文件位于 `docs/`。发布目标为 [GitHub Pages 文档站](https://kaiheila.github.io/kook-minigame-sdk-docs/)。

GitHub 仓库 Settings → Pages 的 Source 选择 GitHub Actions。`main` 推送触发构建和部署；PR 只执行构建。站点基础路径由 `scripts/site-config.mjs` 统一维护。

构建时从同一份 Markdown 源文件输出各页 `.md`、`llms.txt`、`llms-full.txt`，并校验内部链接和站点资源。`api/types.md` 是公开类型的文档快照，修改契约时应与 SDK 类型同步。

当前文档对应已发布 SDK `0.1.3`，更新于 `2026-11-04`。版本号、更新时间和 AI 导出摘要统一维护在 `scripts/site-config.mjs`；修改正文时同时核对首页、版本页、API 类型和相关示例。新增页面加入 `pages` 清单及站点导航，构建会同步输出 Markdown、AI 索引、搜索及站点资源。

`pnpm check` 同时检查仓库文件白名单和公开内容。新增页面或资源时更新对应清单；本地工具配置、内部材料和凭据不应加入本仓库。
