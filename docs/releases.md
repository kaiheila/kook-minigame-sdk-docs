# 版本与支持范围

## 当前文档版本：1.2.0 开发版

本文档对应 SDK 最新源码 `1.2.0`，更新于 2026-11-04。该版本尚未发布到 npm，当前联调使用平台交付的同版验证包。发布后固定安装并提交锁文件：

```sh
pnpm add --save-exact @kookapp/kook-minigame-sdk@1.2.0
```

ESM 使用具名导入 `import { createKookClient } from '@kookapp/kook-minigame-sdk'`，CommonJS 从 `require(...)` 解构同名成员。更早版本的入口及权限行为可能不同，升级时对照[迁移指南](./guide/migration.md)。

## 1.2.0 新增主动离开

- `client.lifecycle.leave(): Promise<void>` 在 ready 后请求离开当前 KOOK 游戏，无需 OAuth。
- 调用前检查同名 capability，先完成游戏自己的退房或存档；KOOK 确认平台退出后关闭当前承载。
- 并发调用合并，失败可重试，断线恢复不自动重放。`destroy()` 仍只清理 SDK 本地资源。
- SDK 和 KOOK 的部署版本分别确认，旧客户端不声明能力时降级处理。详见[离开接口](./api/business.md#lifecycle-leave)。

## 1.1.0 已发布：SDK 内置启动通信

游戏直接 `createKookClient()` 并调用 `ready()`，SDK 接收启动数据、校验可信来源、请求重投并处理超时和清理。测试环境可配置 `KookAutoLaunchOptions`，已有显式绑定继续兼容。此版本不包含离开游戏接口。

## 保持兼容的接入契约

- 由 SDK 接收可信启动数据，完成 ready 后先展示可用内容，再按需 OAuth 授权；不调用 `authenticate()`。
- `Scope` 为开放字符串，名称及应用授权范围由服务端管理。默认申请 `get_user_info`，显式请求可只包含其他权限；`profile.basic` 兼容归一化。
- `availableScopes` 仅供提示，不是 SDK 的申请或授权事件白名单；实际授权以结果及事件为准。
- `session.get()` 接受可选完整 HTTPS `redirectUri`，其实际允许范围取决于宿主与 OAuth 后端，且必须与后端换码值一致。
- 基础登录不要求查询上下文。游戏可按需申请 `mini_game.context`，从后端查询实例、上下文及邀请目标。
- SDK 授权、授权码、OAuth token 和游戏登录态分别维护；撤销及终态连接不能靠再次 connect 复活。

## SDK 版本与宿主版本分别核对

| 行为                             | 需要确认什么                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| 开放 scope 与 `redirectUri` 参数 | 固定使用支持当前公开类型的 SDK；宿主和 OAuth 后端仍决定应用实际获准范围                           |
| 自定义 OAuth 回调                | 当前已核对的 KOOK 宿主仍采用固定平台回调；SDK 能转发其他 HTTPS 地址不代表部署环境已允许           |
| 频道不传 roomId 的邀请           | 目标宿主须已接入原生频道游戏邀请分流；仅检查 `ui.openInviteModal` capability 不足以识别旧默认行为 |
| 社交、频道和参与者查询           | 目标宿主声明对应 capability，并取得当前所需授权                                                   |
| 断线恢复                         | 目标宿主提供有效恢复许可并确认原关系；SDK 本身不保留平台参与关系                                  |
| 游戏主动离开                     | SDK 1.2.0，且 KOOK 声明 `lifecycle.leave` capability；仅销毁 SDK 不会主动退出游戏                 |

包发布不等于平台能力已在所有环境上线。真实验收分别记录 SDK 版本、宿主版本、环境和场景，不把模拟结果当作真实账号投递成功。

## 支持范围

当前源码覆盖 PC/Web 的自动启动、ready、授权码入口、本地能力及授权检查、候选与参与者查询、原生邀请及官方服务器弹框、加载上报、主动离开、固定事件和受控恢复。可选能力以目标宿主实际声明及行为为准。

发布包提供 ESM、CJS、浏览器全局构建及 TypeScript 类型，使用 ES2020 原生能力，不内置 polyfill。Node.js 版本要求针对开发工具；游戏及其依赖仍需在目标 KOOK 环境验证浏览器兼容性。

广告、支付、快捷键、Rich Presence 和移动端游戏启动不在本版 SDK 支持范围内；保留错误码不代表存在对应 API。当前接入不需要 URL Mapping。

完整接入按[快速开始](./guide/quick-start.md)、[后端登录](./guide/server-login.md)、[上下文](./guide/context.md)及[接入检查](./guide/checklist.md)逐步验证。后续不兼容变化同时更新 API、类型快照和迁移说明。
