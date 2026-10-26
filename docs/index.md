---
title: 将小游戏接入 KOOK
description: 游戏先运行，在需要 KOOK 身份和数据时申请用户授权。
---

# 将小游戏接入 KOOK

**发布状态（2026-10-26）：正式包名为 `@kookapp/kook-minigame-sdk`。npm 已发布 `0.1.0-alpha.0`；本文档采用具名入口，对应待发布的 `0.1.0-alpha.1`。请先查看[版本说明](./releases.md)，避免将旧包与新版导入方式混用。**

KOOK 小游戏 SDK 连接游戏页面与 KOOK 客户端，提供启动环境、用户授权入口、邀请弹窗、参与者和生命周期能力。游戏页面先运行，在需要 KOOK 身份或数据时申请授权。

<div class="launch-flow" aria-label="接入流程">
  <div class="launch-stage"><span class="launch-title">1. 打开游戏</span><span class="launch-description">KOOK 完成启动前校验，创建实例并加载游戏页面。</span></div>
  <div class="launch-stage"><span class="launch-title">2. 完成 ready</span><span class="launch-description">读取环境与可申请权限，展示游戏。此时不弹出 OAuth 授权。</span></div>
  <div class="launch-stage"><span class="launch-title">3. 按需授权</span><span class="launch-description">游戏发起 session.get，用户同意后由游戏后端换码并建立登录态。</span></div>
</div>

[从快速开始接入](./guide/quick-start.md) · [查看完整时序](./guide/authorization.md) · [查阅 API](./api/client.md)

## 先了解这三个边界

| 能力                                        | 由谁负责          |
| ------------------------------------------- | ----------------- |
| 启动校验、实例绑定、KOOK 原生界面           | KOOK 客户端与平台 |
| 游戏页面与客户端通信、参数检查、状态事件    | 小游戏 SDK        |
| 授权码交换、KOOK 凭据保管、游戏账号与登录态 | 游戏后端          |

`ready()` 不代表用户已经授权。`session.get()` 授权成功后可以使用相应 SDK 数据能力，但游戏自己的登录仍由游戏后端完成。前端不向 SDK 提交 OAuth access token。

## 按你的接入目标阅读

- 先把页面跑起来：[快速开始](./guide/quick-start.md)、[生命周期](./guide/lifecycle.md)。
- 需要 KOOK 身份登录：[启动与授权](./guide/authorization.md)、[游戏后端登录](./guide/server-login.md)。
- 做多人社交：[权限与能力](./guide/permissions.md)、[邀请与参与者](./guide/social.md)。
- 已接入旧草案：[迁移说明](./guide/migration.md)。

## 文档版本

本文档对应 **KOOK 小游戏 SDK 0.1.0-alpha.1** 的具名入口，更新于 **2026-10-26**；该修订版待发布。可选能力仍需通过运行时检查，实际可用范围取决于 KOOK 客户端支持的能力。[查看发布状态与接入要求](./releases.md)。

AI 编程工具可从 [llms.txt](/llms.txt) 读取索引，或使用 [完整 Markdown 文档](/llms-full.txt)。
