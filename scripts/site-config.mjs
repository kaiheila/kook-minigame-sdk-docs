export const base = '/kook-minigame-sdk-docs/'
export const siteUrl = `https://kaiheila.github.io${base}`
export const pages = [
  ['index.md', '概览', 'SDK 的职责与接入路径'],
  ['guide/quick-start.md', '快速开始', '正式包名、版本选择与接入流程'],
  ['guide/authorization.md', '启动与授权时序', '先开游戏、后授权；授权取消与服务端换码'],
  ['guide/server-login.md', '游戏后端登录', 'state、redirect_uri、OAuth 凭据和游戏登录态'],
  ['guide/permissions.md', '权限与能力', 'availableScopes、用户授权与 capability 的区别'],
  ['guide/lifecycle.md', '生命周期与恢复', '加载上报、连接变化、终止与重新就绪'],
  ['guide/social.md', '邀请与参与者', '原生弹窗、候选身份、分页与参与者变化'],
  ['api/client.md', '客户端与授权 API', '创建、ready、session.get 与授权事件'],
  ['api/business.md', '业务 API', '社交、频道、实例、官方服务器及生命周期'],
  ['api/types.md', '类型定义', '公开 TypeScript 类型'],
  ['api/errors.md', '错误处理', '错误码、超时和重试边界'],
  ['guide/checklist.md', '接入检查', '联调与上线前的行为验收'],
  ['guide/migration.md', '迁移与常见问题', '移除 authenticate 和旧字段'],
  ['releases.md', '版本与支持范围', '已发布 alpha.3、两个公开 scope 与接入要求'],
]
