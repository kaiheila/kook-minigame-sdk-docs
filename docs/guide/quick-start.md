# 快速开始

更新：2026-11-04，对应 SDK **1.2.0 开发版**。游戏直接调用 SDK；启动数据接收、来源校验、重投和清理均由 SDK 完成，无需编写消息监听或下载启动适配文件。

## 接入前准备

- 在 KOOK 配置可访问的 HTTPS 游戏页面；游戏运行在 KOOK 的 iframe 中，PC 独立窗口也通过可信承载页嵌入。
- 正式环境默认信任 `https://www.kookapp.cn`；测试环境才需要配置平台提供的精确 HTTPS origin。
- 需要身份或存档时，再准备 OAuth 应用和游戏后端；无需登录的玩法可先完成基础接入。

1.2.0 尚未发布到 npm，当前联调使用平台交付的同版验证包。发布后固定安装并提交锁文件：

```sh
pnpm add --save-exact @kookapp/kook-minigame-sdk@1.2.0
```

已发布的 1.1.0 支持自动启动，但不包含 `lifecycle.leave()`。版本及能力差异见[版本说明](../releases.md)。SDK 包已包含通信实现，无需单独安装 bridge 或克隆 SDK 项目。ESM 使用具名导入；CommonJS 从 `require(...)` 解构 `createKookClient`；无打包器时使用 `window.KOOKMiniGame.createKookClient`。

## 最小连通示例

在正式 KOOK 的游戏 iframe 中运行下面的代码即可连通，无需传入启动参数或注册宿主消息监听：

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

示例显示实例 ID 后上报加载完成，卸载时销毁客户端；后续复用这个 `client` 调用所需能力。基础连通不要求 OAuth。使用 `async` 函数兼容 ES2020 构建目标；测试 KOOK 来源按下文配置 `allowedHostOrigins`。

## 页面加载与清理

最小示例以一段可见文字作为演示页面，真实游戏应在自己的欢迎页或玩法可用后上报 `loaded`。当前 KOOK 宿主默认在 ready 后等待 60 秒加载结果；一直不报告会结束本次连接并显示加载失败。`ready()` 本身不会自动上报。

下面的完整示例增加页面内错误提示，可替换上面的最小示例；同一次启动复用一个客户端。页面提供 id 为 `app` 的容器：

```ts
import { createKookClient } from '@kookapp/kook-minigame-sdk'

async function startGame(): Promise<void> {
  const root = document.getElementById('app')!
  const client = createKookClient()
  let disposed = false
  window.addEventListener(
    'pagehide',
    () => {
      disposed = true
      client.destroy()
    },
    { once: true }
  )

  try {
    const environment = await client.ready()
    if (disposed) return
    // 替换为游戏欢迎页、游客玩法或可操作的登录入口。
    root.textContent = `游戏已就绪：${environment.context.contextType}`
    if (client.hasCapability('lifecycle.reportLoadResult')) {
      await client.lifecycle.reportLoadResult({ status: 'loaded' })
    }
  } catch (error) {
    if (!disposed) root.textContent = error instanceof Error ? error.message : '游戏初始化失败，请重新打开'
  }
}

void startGame()
```

SDK 在首次 `ready()`／`connect()` 时开始接收启动数据，同一客户端的并发初始化会合并。`ready()` 不会请求 OAuth，也不会自动上报游戏加载成功。内容实际可交互后才上报 `loaded`；欢迎页或游客体验可先于登录完成。

无需维护 `kook-launch.ts`、手动 `postMessage` 或启动绑定缓存。普通浏览器直开返回 `UNSUPPORTED_ENVIRONMENT`；等不到可信启动数据返回 `BOOTSTRAP_TIMEOUT`。模块可在 SSR／构建环境导入，实际连接在 KOOK 游戏 iframe 内运行。

## 测试环境配置（按需）

```ts
const client = createKookClient({
  allowedHostOrigins: ['https://localhost:3000'],
  bootstrapTimeoutMs: 10000,
  connectionTimeoutMs: 10000,
})
const environment = await client.ready()
```

`allowedHostOrigins` 覆盖默认列表，最多 16 项，只接受精确 HTTPS origin，不接受通配符、HTTP、路径或尾斜线。列表来自游戏的可信配置，不从消息、URL 参数或 referrer 推导。

`bootstrapTimeoutMs` 等待启动数据，`connectionTimeoutMs` 等待随后的握手；两者分别默认 10000，范围 100–30000 毫秒。SDK 负责来源与字段校验，可信启动数据错误时终止初始化。更多参数见[客户端 API](../api/client.md#create-client)。

## 按需加入账号与上下文

需要身份时，在用户点击登录按钮后：

1. 游戏后端签发随机 state，并把它绑定到当前浏览器登录事务。
2. 调用 `client.session.get({ state, scopes: ['get_user_info'] })`；需要上下文时再申请 `mini_game.context`。
3. `cancelled` 时保留页面；`authorized` 时把 code、state 发给游戏后端。
4. 后端校验事务、换码、读用户身份，返回游戏自己的会话。
5. 根据玩法由后端查询上下文，创建／加入游戏房间。

OAuth 回调、Cookie 受限、取消事务及迟到回包的处理见[游戏后端接入](./server-login.md)。不要把 OAuth token 放到游戏前端，也不要把 `availableScopes` 当作不能申请其他权限的本地白名单。

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

## 主动离开游戏

游戏先完成自己的退房、存档或会话清理，再在退出按钮中调用：

```ts
if (client.hasCapability('lifecycle.leave')) {
  await client.lifecycle.leave()
}
```

该方法在 `ready()` 后可用，无需 OAuth。KOOK 确认平台退出后关闭当前游戏，页面可能卸载，业务清理要放在调用前。按钮回调需捕获错误并提供重试；旧客户端缺少能力时展示不支持提示。`destroy()` 仍用于本地清理，不表示退出成功。完整行为见[生命周期说明](./lifecycle.md#主动离开游戏)。

## 首次验收

先确认从 KOOK 能打开、只建立一次绑定、欢迎页可用并成功上报加载；然后按实际使用的可选功能验证登录、上下文和邀请。普通浏览器直开、缺少 OAuth、没有某项可选 capability 都应有清晰提示。使用模拟宿主时记录它是受控环境；真实上线按[接入检查](./checklist.md)完成平台账号验收。
