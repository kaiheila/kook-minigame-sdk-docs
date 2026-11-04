# 快速开始

更新：2026-11-04。目标是先在 KOOK 内显示可交互页面并完成加载上报，然后按需接入账号、上下文和邀请。本文使用 npm 包的公开 API，不要求接入者克隆 SDK 源码或实现 bridge。

## 接入前准备

| 准备项               | 说明                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| HTTPS 游戏地址       | 在平台配置审核通过的实际页面；静态资源、API 和 WSS 可被该 iframe 访问                                                                      |
| 可信宿主 origin      | 从平台取得 PC/Web、正式／测试环境的精确 HTTPS origin，包含实际端口；作为游戏配置固定，不从 URL 或 referrer 猜测                            |
| OAuth 应用（按需）   | 需要账号或开放 API 时配置应用及 scope；平台 gameCode 与 OAuth client ID 分别保存                                                           |
| 回调地址（按需）     | 授权与后端换码使用完全相同的值；见[当前宿主约束](./server-login.md#oauth-回调与换码)                                                       |
| 游戏登录方案（按需） | 跨站 iframe 的第三方 Cookie 可能不可用；准备绑定同一浏览器事务的内存会话方案，见[游戏后端接入](./server-login.md#游戏登录事务与浏览器会话) |

游戏运行在 KOOK 承载页的 iframe 内；PC 独立窗口也由可信承载页嵌入 iframe。直接在浏览器地址栏打开游戏页面不会收到 KOOK 启动绑定。

在游戏项目固定安装已发布的 `0.1.3`，并提交锁文件。本文档按该版本更新于 2026-11-04；SDK 包版本与目标宿主部署版本分别核对：

```sh
pnpm add --save-exact @kookapp/kook-minigame-sdk@0.1.3
```

游戏方无需单独安装底层通信依赖，SDK 发布包已包含传输实现。无打包器时可加载发布包的 `index.global.js`，使用 `window.KOOKMiniGame.createKookClient`；ESM 项目使用下面的具名导入。CommonJS 使用 `const { createKookClient } = require('@kookapp/kook-minigame-sdk')`。模块可在 SSR／构建工具中导入，实际连接需在游戏 iframe 内运行。

## 接收宿主启动绑定

宿主向游戏 iframe 投递：

```ts
{
  type: 'KOOK_MINI_GAME_BOOTSTRAP',
  bootstrap: { hostOrigin, sessionId, generation }
}
```

游戏监听可能晚于 iframe load。注册监听后向可信 parent 发送 `{ type: 'KOOK_MINI_GAME_BOOTSTRAP_REQUEST' }`，当前宿主会重投相同绑定。`sessionId/generation` 由宿主分配，不能用 `instanceId`、用户 ID 或随机值代替。

把下面的示例保存到游戏项目的 `kook-launch.ts`。这是游戏侧接收函数，不是 npm 包的内建导出；每次页面启动调用一次。它校验 parent Window、精确来源和字段，并在成功、取消或超时后清理监听。

```ts
import type { KookClientOptions } from '@kookapp/kook-minigame-sdk'

export function waitForKookLaunch(allowedOrigins: readonly string[], signal: AbortSignal): Promise<KookClientOptions> {
  if (signal.aborted) return Promise.reject(new Error('游戏初始化已取消'))
  if (window.parent === window) return Promise.reject(new Error('请从 KOOK 打开游戏'))
  if (
    !allowedOrigins.length ||
    allowedOrigins.some((origin) => {
      try {
        const url = new URL(origin)
        return url.protocol !== 'https:' || url.origin !== origin
      } catch {
        return true
      }
    })
  ) {
    return Promise.reject(new Error('请配置精确的可信 KOOK 宿主 HTTPS origin'))
  }

  const allowed = new Set(allowedOrigins)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('KOOK 启动参数超时，请从宿主重新打开'))
    }, 10000)

    function cleanup(): void {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      window.removeEventListener('message', receive)
    }

    function abort(): void {
      cleanup()
      reject(new Error('游戏初始化已取消'))
    }

    function receive(event: MessageEvent): void {
      if (event.source !== window.parent || !allowed.has(event.origin)) return
      if (event.data?.type !== 'KOOK_MINI_GAME_BOOTSTRAP') return
      const options = event.data.bootstrap
      if (
        !options ||
        options.hostOrigin !== event.origin ||
        typeof options.sessionId !== 'string' ||
        !options.sessionId.length ||
        options.sessionId.length > 256 ||
        /[\s\u0000-\u001f\u007f]/u.test(options.sessionId) ||
        !Number.isSafeInteger(options.generation) ||
        options.generation < 0
      ) {
        return
      }
      cleanup()
      resolve({ hostOrigin: event.origin, sessionId: options.sessionId, generation: options.generation })
    }

    signal.addEventListener('abort', abort, { once: true })
    window.addEventListener('message', receive)
    for (const origin of allowed) {
      window.parent.postMessage({ type: 'KOOK_MINI_GAME_BOOTSTRAP_REQUEST' }, origin)
    }
  })
}
```

来源校验通过后只接受本次绑定；后续新 iframe 或接管由宿主发起新启动。启动绑定用于路由连接，不是游戏后端判断用户身份、房间归属或准入的凭证。

## ready 与加载上报

页面先提供 id 为 `app` 的根容器，初始内容为“正在打开游戏…”。下面是免登录页面的完整启动示例，可信 origin 数组须替换成平台给本游戏的实际配置：

```ts
import { createKookClient } from '@kookapp/kook-minigame-sdk'

import { waitForKookLaunch } from './kook-launch'

async function startGame(): Promise<void> {
  const root = document.getElementById('app')!
  const lifetime = new AbortController()
  window.addEventListener('pagehide', () => lifetime.abort(), { once: true })
  try {
    const binding = await waitForKookLaunch(['https://www.kookapp.cn'], lifetime.signal)
    const client = createKookClient(binding)
    lifetime.signal.addEventListener('abort', () => client.destroy(), { once: true })
    const ready = await client.ready()
    if (lifetime.signal.aborted) return

    // 在真实游戏中替换为欢迎页、游客玩法或可操作的登录入口。
    root.textContent = `游戏已就绪：${ready.context.contextType}`
    if (client.hasCapability('lifecycle.reportLoadResult')) {
      await client.lifecycle.reportLoadResult({ status: 'loaded' })
    }
  } catch (error) {
    if (!lifetime.signal.aborted) {
      root.textContent = error instanceof Error ? error.message : '游戏初始化失败，请重新打开'
    }
  }
}

void startGame()
```

`ready()` 会连接传输并读取环境，不会自动请求用户同意。`loaded` 表示本次游戏加载内容实际可用，不代表身份登录或后端准入完成。当前最小示例只演示启动与页面卸载；正式游戏还需按[生命周期说明](./lifecycle.md#生命周期与异常处理)处理关闭、撤销及恢复，并关闭自己的 WebSocket／会话。

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

## 首次验收

先确认从 KOOK 能打开、只建立一次绑定、欢迎页可用并成功上报加载；然后按实际使用的可选功能验证登录、上下文和邀请。普通浏览器直开、缺少 OAuth、没有某项可选 capability 都应有清晰提示。使用模拟宿主时记录它是受控环境；真实上线按[接入检查](./checklist.md)完成平台账号验收。
