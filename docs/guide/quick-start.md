# 快速开始

更新：2026-11-11，对应 SDK **1.3.1**。创建客户端、完成 ready，再按玩法调用 API。

## 接入前准备

- 在 KOOK 配置可访问的 HTTPS 游戏页面；游戏运行在 KOOK 的 iframe 中，PC 独立窗口也通过可信承载页嵌入。
- 默认信任 `https://www.kookapp.cn`；测试环境通过 `allowedHostOrigins` 追加平台提供的精确 HTTPS origin，默认来源仍然保留。
- 需要身份或存档时，再准备 OAuth 应用和游戏后端；无需登录的玩法可先完成基础接入。

SDK 1.3.1 已发布，固定安装并提交锁文件：

```sh
pnpm add --save-exact @kookapp/kook-minigame-sdk@1.3.1
```

ESM 使用具名导入；CommonJS 从 `require(...)` 解构 `createKookClient`；无打包器时使用 `window.KOOKMiniGame.createKookClient`。版本差异见[版本说明](../releases.md)。

## 最小连通示例

在 KOOK 游戏 iframe 中运行：

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

后续调用复用同一个 `client`。测试环境按下文配置 `allowedHostOrigins`。

## 页面加载与清理

欢迎页或玩法可操作后上报 `loaded`，初始化失败时上报失败原因；页面卸载时调用 `destroy()`。当前宿主默认在 ready 后等待 60 秒加载结果，超时未报告会结束连接。示例和失败原因见[生命周期](./lifecycle.md#上报加载结果)。

启动失败时在页面展示重试提示。`UNSUPPORTED_ENVIRONMENT` 表示没有 KOOK 嵌入环境，`BOOTSTRAP_TIMEOUT` 表示未收到可信启动数据，见[错误处理](../api/errors.md)。

## 测试环境配置（按需） {#test-host-origins}

```ts
const client = createKookClient({
  // 自动与默认 https://www.kookapp.cn 合并，无需重复添加。
  allowedHostOrigins: ['https://localhost:3000'],
  bootstrapTimeoutMs: 10000,
  connectionTimeoutMs: 10000,
})
const environment = await client.ready()
```

`allowedHostOrigins` 与默认来源合并、去重，上例同时信任 `https://www.kookapp.cn` 和 `https://localhost:3000`。打包 PC 可能使用默认 HTTPS 父页面，测试配置中不用重复添加它。

追加列表须非空、最多 16 项，每项为精确 HTTPS origin。只使用默认来源时省略字段。配置来自游戏自己的环境配置，修改后重新构建发布；参数边界见[客户端 API](../api/client.md#create-client)。

两个超时参数分别用于等待启动数据和握手，默认均为 10000 毫秒。

## 按需加入账号与上下文

需要身份时，在用户点击登录按钮后：

1. 游戏后端签发随机 state，并把它绑定到当前浏览器登录事务。
2. 调用 `client.session.get({ state, scopes: ['get_user_info'] })`；需要上下文时再申请 `mini_game.context`。
3. `cancelled` 时保留页面；`authorized` 时把 code、state 发给游戏后端。
4. 后端校验事务、换码、读用户身份，返回游戏自己的会话。
5. 根据玩法由后端查询上下文，创建／加入游戏房间。

OAuth 回调、游戏会话和取消事务的处理见[游戏后端接入](./server-login.md)。

## 按需加入邀请

在按钮点击回调中调用，并捕获错误：

```ts
import type { KookClient } from '@kookapp/kook-minigame-sdk'

async function inviteFromGame(client: KookClient, roomId?: string): Promise<string> {
  if (!client.hasCapability('ui.openInviteModal')) return '当前宿主暂不支持邀请'
  try {
    // 频道不指定房间时使用频道游戏邀请；传 roomId 时使用固定房间邀请。
    const result = await client.ui.openInviteModal(roomId === undefined ? undefined : { roomId })
    if (result.status === 'cancelled') return '已取消邀请'
    if (result.failedCount) return `已发送 ${result.sentCount} 人，失败 ${result.failedCount} 人`
    return result.sentCount ? `已发送 ${result.sentCount} 人` : '邀请链接已复制'
  } catch (error) {
    const code = (error as { code?: string }).code
    return code === 'PERMISSION_DENIED' ? '没有邀请权限' : `邀请未完成：${code ?? 'UNKNOWN'}`
  }
}
```

此函数需要使用已完成 `ready()` 的客户端。频道、私信、指定房间和复制结果的完整规则见[邀请目标与结果](./social.md#邀请目标与结果)；旧宿主是否支持频道分流须按部署版本验证。

## 打开外链与请求全屏

在 `ready()` 完成后，将游戏按钮接入这两个可选能力：

```ts
const helpButton = document.querySelector<HTMLButtonElement>('#help')
helpButton?.addEventListener('click', async () => {
  if (!client.hasCapability('ui.openExternalLink')) return
  try {
    await client.ui.openExternalLink({ url: 'https://game.example/help' })
  } catch (error) {
    console.error('打开外链失败', error)
  }
})

const fullscreenButton = document.querySelector<HTMLButtonElement>('#fullscreen')
fullscreenButton?.addEventListener('click', async () => {
  if (!client.hasCapability('ui.requestFullscreen')) return
  try {
    await client.ui.requestFullscreen()
  } catch (error) {
    console.error('请求全屏失败', error)
  }
})
```

全屏请求前不要等待网络或定时器；重复调用保持全屏，Esc 或宿主按钮取消。外链保留 KOOK 的跳转提示和风险检查。

正式界面在能力缺失时隐藏或禁用按钮，并把错误转换为可理解的提示。详细规则见[打开外链](../api/business.md#ui-open-external-link)与[请求全屏](../api/business.md#ui-request-fullscreen)。

## 主动离开游戏

游戏先完成自己的退房、存档或会话清理，再在退出按钮中调用：

```ts
if (client.hasCapability('lifecycle.leave')) {
  await client.lifecycle.leave()
}
```

KOOK 确认退出后会关闭游戏页面；失败时提示用户重试。完整行为见[生命周期说明](./lifecycle.md#主动离开游戏)。

## 首次验收

在 KOOK 中依次验证页面打开、ready、加载上报，再验证游戏用到的登录、上下文和邀请，见[接入检查](./checklist.md)。
