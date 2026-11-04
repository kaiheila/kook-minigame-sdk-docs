---
title: 将小游戏接入 KOOK
description: 游戏先运行，在需要 KOOK 身份和数据时申请用户授权。
---

# 将小游戏接入 KOOK

**文档版本：`@kookapp/kook-minigame-sdk@1.2.0` 开发版，尚未发布。更新于 2026-11-04。SDK 自动处理与 KOOK 的启动通信，新增 `lifecycle.leave()`。当前联调使用同版验证包，发布后按[快速开始](./guide/quick-start.md)固定版本安装。**

KOOK 小游戏 SDK 连接游戏页面与 KOOK 客户端，提供启动环境、用户授权入口、邀请弹窗、参与者和生命周期能力。游戏页面先运行，在需要 KOOK 身份或数据时申请授权。

## 最小连通示例

```ts
import { createKookClient } from '@kookapp/kook-minigame-sdk'

const client = createKookClient()
const environment = await client.ready()
console.log('KOOK 已连通', environment.instanceId)
```

游戏无需复制启动消息监听或重投代码。默认支持正式 KOOK 来源，测试环境按需配置 `allowedHostOrigins`。内容实际可用后再上报加载结果；主动离开见[生命周期说明](./guide/lifecycle.md#主动离开游戏)。

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

`ready()` 不代表用户已经授权。`session.get()` 授权成功后可以使用相应 SDK 数据能力，但游戏自己的登录仍由游戏后端完成。前端不向 SDK 提交 OAuth access token。

## 按你的接入目标阅读

- 先把页面跑起来：[快速开始](./guide/quick-start.md)、[生命周期](./guide/lifecycle.md)。
- 需要 KOOK 身份登录：[启动与授权](./guide/authorization.md)、[游戏后端登录](./guide/server-login.md)。
- 做多人社交：[权限与能力](./guide/permissions.md)、[邀请与参与者](./guide/social.md)。
- 做频道大厅、核验实例或邀请目标：[按需查询上下文](./guide/context.md)。
- 给游戏增加退出按钮：[主动离开游戏](./guide/lifecycle.md#主动离开游戏)，与 SDK 本地销毁分别处理。
- 已接入旧草案：[迁移说明](./guide/migration.md)。

## 文档版本

本文档对应 **KOOK 小游戏 SDK 1.2.0 开发版**。1.1.0 已支持自动启动；1.2.0 新增离开接口，需 KOOK 同步提供 `lifecycle.leave` capability。开放 scope 不会自动增加 SDK 方法；`availableScopes` 仅供提示，实际授权以结果及事件为准。[查看发布状态与接入要求](./releases.md)。

AI 编程工具可从 [llms.txt](/llms.txt) 读取索引，或使用 [完整 Markdown 文档](/llms-full.txt)。
