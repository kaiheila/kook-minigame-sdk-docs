export const base = '/kook-minigame-sdk-docs/'
export const siteUrl = `https://kaiheila.github.io${base}`
export const sdkVersion = '1.2.0'
export const sdkReleaseStatus = '已发布'
export const updatedAt = '2026-11-05'
export const sdkSummary = `@kookapp/kook-minigame-sdk@${sdkVersion}（${sdkReleaseStatus}）。游戏直接 createKookClient() → ready()，SDK 内置启动数据接收、校验和重投。新增 lifecycle.leave()，ready 后检查同名 capability 即可请求离开，无需 OAuth；destroy() 只清理本地资源。Scope 由服务端管理，availableScopes 仅供提示；上下文按玩法从游戏后端查询。更新于 ${updatedAt}。`
export const pages = [
  ['index.md', '概览', 'SDK 的职责与接入路径'],
  ['guide/quick-start.md', '快速开始', '正式包名、版本选择与接入流程'],
  ['guide/authorization.md', '启动与授权时序', '先开游戏、后授权；授权取消与服务端换码'],
  ['guide/server-login.md', '游戏后端登录', 'state、redirect_uri、OAuth 凭据和游戏登录态'],
  ['guide/context.md', '按需查询上下文', '可信实例、频道大厅、邀请目标和游戏房间准入'],
  ['guide/permissions.md', '权限与能力', 'availableScopes、用户授权与 capability 的区别'],
  ['guide/lifecycle.md', '生命周期、离开与恢复', '加载上报、主动离开、连接变化与资源清理'],
  ['guide/social.md', '邀请与参与者', '原生弹窗、候选身份、分页与参与者变化'],
  ['api/client.md', '客户端与授权 API', '创建、ready、session.get 与授权事件'],
  ['api/business.md', '业务 API', '社交、频道、实例、官方服务器及生命周期'],
  ['api/types.md', '类型定义', '公开 TypeScript 类型'],
  ['api/errors.md', '错误处理', '错误码、超时和重试边界'],
  ['guide/checklist.md', '接入检查', '联调与上线前的行为验收'],
  ['guide/migration.md', '迁移与常见问题', '移除游戏启动接线代码、接入 leave 与兼容旧版本'],
  ['releases.md', '版本与支持范围', '1.2.0 已发布、自动启动及可选离开能力'],
]
