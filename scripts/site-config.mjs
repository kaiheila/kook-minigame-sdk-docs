export const base = '/kook-minigame-sdk-docs/'
export const siteUrl = `https://kaiheila.github.io${base}`
export const sdkVersion = '1.3.1'
export const sdkReleaseStatus = '已发布'
export const updatedAt = '2026-11-11'
export const sdkSummary = `@kookapp/kook-minigame-sdk@${sdkVersion}（${sdkReleaseStatus}），更新于 ${updatedAt}。createKookClient() → ready() → 展示游戏 → reportLoadResult()。自动模式的 allowedHostOrigins 与默认来源合并、去重，保留 https://www.kookapp.cn；追加列表非空且最多 16 项。可选方法先检查 capability；用户数据查询先取得 get_user_info OAuth 授权。按钮调用 ui.openExternalLink({ url })、ui.requestFullscreen() 或 lifecycle.leave()；退出前先存档或退房，卸载时 destroy()。`
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
  ['api/business.md', '业务 API', '社交、频道、实例、外链、全屏及生命周期'],
  ['api/types.md', '类型定义', '公开 TypeScript 类型'],
  ['api/errors.md', '错误处理', '错误码、超时和重试边界'],
  ['guide/checklist.md', '接入检查', '联调与上线前的行为验收'],
  ['guide/migration.md', '迁移与常见问题', '升级 1.3.1、默认来源合并及旧宿主兼容'],
  ['releases.md', '版本与支持范围', '1.3.1 默认来源合并、历史版本与支持范围'],
]
