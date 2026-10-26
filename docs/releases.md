# 版本与支持范围

## 版本状态（2026-10-26）

正式包名为 [`@kookapp/kook-minigame-sdk`](https://www.npmjs.com/package/@kookapp/kook-minigame-sdk)。`0.1.0-alpha.0` 已于 2026-10-22 发布到 npmjs，该版本仍使用默认导出。

本文档采用 `createKookClient` 具名入口，对应修订版 `0.1.0-alpha.1`，该版本待发布。修订版发布后，按[快速开始](./guide/quick-start.md)固定版本安装，并将 ESM 改为 `import { createKookClient } from '@kookapp/kook-minigame-sdk'`；CommonJS 从 `require(...)` 解构同名成员。不要将 `0.1.0-alpha.0` 与具名导入示例混用。

本次文档说明的接入契约：

- 采用先启动游戏、完成 `ready()`、再按需 OAuth 授权的顺序。
- 移除 `authenticate()` 和前端 OAuth token 输入。
- `availableScopes` 表示可申请集合；`session.get()` 支持 scope 子集及取消分支。
- SDK 授权与授权码有效期、游戏后端会话分开维护。
- 允许静态游戏无需 OAuth 运行；恢复后读取宿主新快照。

## 本文档覆盖的能力

PC/Web 嵌入通信、就绪信息、授权码入口、能力与 scope 检查、社交候选、频道成员、实例参与者、邀请与官方服务器原生弹窗、加载上报、生命周期和授权事件、可选心跳与受控恢复。

发布包提供 ESM、CJS、浏览器全局构建及 TypeScript 类型，使用 ES2020 原生能力，不内置 polyfill。游戏仍需在支持小游戏的 KOOK 客户端中验证自己的代码和依赖。

## 接入配置与准备

`bootstrap` 初始数据由 KOOK 客户端直接传入。使用 OAuth 登录时，在开发者后台配置 `redirect_uri`；开发者后台目前仍在开发中。应用凭据与 OAuth 换码地址按平台提供的接入信息配置。

游戏方可依据文档中的 API、类型和示例准备开发，使用与导入方式匹配的 SDK 版本接入，再按[接入检查](./guide/checklist.md)在支持小游戏的 KOOK 客户端中验证完整流程。

广告、支付、快捷键、Rich Presence 和移动端游戏启动不在本版本 SDK 支持范围内。当前接入无需配置 URL Mapping。可调用的方法以本版本 API 文档为准。

后续不兼容变更会在本页和迁移指南说明，接入时固定使用经过双方确认的版本。
