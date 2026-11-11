---
title: 将小游戏接入 KOOK
description: 游戏先运行，在需要 KOOK 身份和数据时申请用户授权。
---

# 将小游戏接入 KOOK

**文档版本：`@kookapp/kook-minigame-sdk@1.3.1`，已发布。更新于 2026-11-11。按[快速开始](./guide/quick-start.md)安装并接入。**

KOOK 小游戏 SDK 连接游戏页面与 KOOK 客户端，提供启动环境、用户授权入口、邀请弹窗、参与者和生命周期能力。游戏页面先运行，在需要 KOOK 身份或数据时申请授权。

## 最小连通示例

```ts
import { createKookClient } from '@kookapp/kook-minigame-sdk'

const client = createKookClient()
window.addEventListener('pagehide', () => client.destroy(), { once: true })

async function startGame() {
  const environment = await client.ready()
  document.body.append('KOOK 已连通：' + environment.instanceId)
  if (client.hasCapability('lifecycle.reportLoadResult')) {
    await client.lifecycle.reportLoadResult({ status: 'loaded' })
  }
}

startGame().catch(console.error)
```

游戏内容可用后上报加载结果，当前宿主默认等待 60 秒。测试来源配置见[快速开始](./guide/quick-start.md#test-host-origins)，退出与清理见[生命周期](./guide/lifecycle.md)。

<div class="launch-flow" aria-label="接入流程">
  <div class="launch-stage"><span class="launch-title">1. 创建客户端</span><span class="launch-description">调用 createKookClient()，SDK 自动接收并校验启动数据。</span></div>
  <div class="launch-stage"><span class="launch-title">2. 完成 ready</span><span class="launch-description">读取环境，展示可用内容并上报加载；此时不弹出 OAuth 授权。</span></div>
  <div class="launch-stage"><span class="launch-title">3. 按需授权</span><span class="launch-description">游戏发起 session.get，用户同意后由游戏后端换码并建立登录态。</span></div>
</div>

[从快速开始接入](./guide/quick-start.md) · [查看完整时序](./guide/authorization.md) · [查阅 API](./api/client.md)

## 先了解这三个边界

| 能力                                                        | 由谁负责          |
| ----------------------------------------------------------- | ----------------- |
| 启动校验、实例绑定、KOOK 原生界面                           | KOOK 客户端与平台 |
| 游戏页面与客户端通信、参数检查、状态事件                    | 小游戏 SDK        |
| 授权码交换、KOOK 凭据保管、按需上下文查询、游戏账号与登录态 | 游戏后端          |

需要账号时调用 `session.get()`，再由游戏后端换码并建立会话。数据查询所需的 OAuth 授权见[权限与能力](./guide/permissions.md)。

## 按你的接入目标阅读

- 先把页面跑起来：[快速开始](./guide/quick-start.md)、[生命周期](./guide/lifecycle.md)。
- 需要 KOOK 身份登录：[启动与授权](./guide/authorization.md)、[游戏后端登录](./guide/server-login.md)。
- 做多人社交：[权限与能力](./guide/permissions.md)、[邀请与参与者](./guide/social.md)。
- 做频道大厅、核验实例或邀请目标：[按需查询上下文](./guide/context.md)。
- 打开帮助、官网等网页：[打开外链](./api/business.md#ui-open-external-link)，保留 KOOK 的跳转提示与风险检查。
- 给游戏增加全屏按钮：[请求全屏](./api/business.md#ui-request-fullscreen)，直接从用户点击请求宿主承载全屏。
- 给游戏增加退出按钮：[主动离开游戏](./guide/lifecycle.md#主动离开游戏)，与 SDK 本地销毁分别处理。
- 已接入旧草案：[迁移说明](./guide/migration.md)。

## 文档版本

1.3.1 的 `allowedHostOrigins` 与默认来源合并、去重，配置测试来源时仍保留 `https://www.kookapp.cn`。升级步骤和历史变化见[版本说明](./releases.md)。

AI 编程工具可从 [llms.txt](/llms.txt) 读取索引，或使用 [完整 Markdown 文档](/llms-full.txt)。
