import { defineConfig } from 'vitepress'

import { base, siteUrl } from '../../scripts/site-config.mjs'

export default defineConfig({
  lang: 'zh-CN',
  title: 'KOOK 小游戏 SDK',
  description: '从启动游戏到按需授权，接入 KOOK 小游戏的开发者文档。',
  base,
  cleanUrls: false,
  markdown: {
    config(md) {
      for (const name of ['th_open', 'td_open']) {
        md.renderer.rules[name] = (tokens, index, options, _environment, renderer) => {
          tokens[index].attrJoin('class', 'sdk-table-cell')
          return renderer.renderToken(tokens, index, options)
        }
      }
    },
  },
  lastUpdated: false,
  head: [['link', { rel: 'describedby', href: `${base}llms.txt`, type: 'text/plain' }]],
  transformHead({ pageData }) {
    if (pageData.relativePath === '404.md') return []
    return [['link', { rel: 'alternate', type: 'text/markdown', href: `${base}${pageData.relativePath}` }]]
  },
  sitemap: { hostname: siteUrl },
  themeConfig: {
    siteTitle: 'KOOK / 小游戏 SDK',
    nav: [
      { text: '开始接入', link: '/guide/quick-start' },
      { text: 'API', link: '/api/client' },
      { text: '版本说明', link: '/releases' },
      { text: 'llms.txt', link: `${base}llms.txt` },
    ],
    sidebar: [
      {
        text: '接入指南',
        items: [
          { text: '概览', link: '/' },
          { text: '快速开始', link: '/guide/quick-start' },
          { text: '启动与授权时序', link: '/guide/authorization' },
          { text: '游戏后端登录', link: '/guide/server-login' },
          { text: '权限与能力', link: '/guide/permissions' },
          { text: '生命周期与恢复', link: '/guide/lifecycle' },
          { text: '邀请与参与者', link: '/guide/social' },
        ],
      },
      {
        text: 'API 参考',
        items: [
          { text: '客户端与授权', link: '/api/client' },
          { text: '业务 API', link: '/api/business' },
          { text: '类型定义', link: '/api/types' },
          { text: '错误处理', link: '/api/errors' },
        ],
      },
      {
        text: '交付与迁移',
        items: [
          { text: '接入检查', link: '/guide/checklist' },
          { text: '迁移与常见问题', link: '/guide/migration' },
          { text: '版本与支持范围', link: '/releases' },
        ],
      },
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '未找到相关内容',
                resetButtonTitle: '清空搜索',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
      },
    },
    outline: { level: [2, 3], label: '本页内容' },
    docFooter: { prev: '上一页', next: '下一页' },
    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    footer: { message: '文档已发布 · SDK 尚未发布 · 2026-10-22' },
  },
})
