export const base = '/kook-minigame-sdk-docs/'
export const siteUrl = `https://kaiheila.github.io${base}`
export const sdkVersion = '0.1.3'
export const updatedAt = '2026-11-04'
export const sdkSummary = `@kookapp/kook-minigame-sdk@${sdkVersion} 已发布，采用 createKookClient 具名入口。Scope 为开放字符串，权限名称与应用范围由服务端管理，availableScopes 仅供提示。基础加载和身份登录不强制查询上下文；游戏可按需申请 mini_game.context，由后端查询。频道邀请分流与自定义回调还需目标宿主支持。更新于 ${updatedAt}。`
export const pages = [
  ['index.md', '概览', 'SDK 的职责与接入路径'],
  ['guide/quick-start.md', '快速开始', '正式包名、版本选择与接入流程'],
  ['guide/authorization.md', '启动与授权时序', '先开游戏、后授权；授权取消与服务端换码'],
  ['guide/server-login.md', '游戏后端登录', 'state、redirect_uri、OAuth 凭据和游戏登录态'],
  ['guide/context.md', '按需查询上下文', '可信实例、频道大厅、邀请目标和游戏房间准入'],
  ['guide/permissions.md', '权限与能力', 'availableScopes、用户授权与 capability 的区别'],
  ['guide/lifecycle.md', '生命周期与恢复', '加载上报、连接变化、终止与重新就绪'],
  ['guide/social.md', '邀请与参与者', '原生弹窗、候选身份、分页与参与者变化'],
  ['api/client.md', '客户端与授权 API', '创建、ready、session.get 与授权事件'],
  ['api/business.md', '业务 API', '社交、频道、实例、官方服务器及生命周期'],
  ['api/types.md', '类型定义', '公开 TypeScript 类型'],
  ['api/errors.md', '错误处理', '错误码、超时和重试边界'],
  ['guide/checklist.md', '接入检查', '联调与上线前的行为验收'],
  ['guide/migration.md', '迁移与常见问题', '移除 authenticate 和旧字段'],
  ['releases.md', '版本与支持范围', '0.1.3 已发布、开放 scope、宿主兼容与接入要求'],
]
