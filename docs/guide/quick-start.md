# 快速开始

正式包名为 `@kookapp/kook-minigame-sdk`，发布到 npmjs。以下示例采用 `createKookClient` 具名导入，对应待发布的 `0.1.1`。接入目标是先展示游戏，再根据游戏需要触发登录授权；纯静态体验可以不申请 OAuth 权限。

## 1. 安装 SDK

`0.1.1` 尚未发布，目标标签为 `next`。待公开 registry 提供该版本后，再执行以下固定版本安装命令；`alpha.2` 不包含本次 scope 修订：

```sh
pnpm add @kookapp/kook-minigame-sdk@0.1.1
```

旧版本的入口与 scope 差异见[版本说明](../releases.md)。

发布包提供 ESM、CommonJS、浏览器全局构建和 TypeScript 类型。常规前端项目使用 ESM；无需直接依赖底层 bridge。构建产物不要求游戏增加 polyfill。

## 2. 创建客户端并运行游戏

`bootstrap` 初始数据由 KOOK 客户端直接传入游戏的初始化入口。游戏接收后，将它传给 `createKookClient`；下面的 `startGame` 是游戏侧初始化函数示例。不要自行生成启动绑定，或从任意 query 参数拼出宿主来源。

```ts
import { createKookClient } from '@kookapp/kook-minigame-sdk'
import type { KookClientOptions } from '@kookapp/kook-minigame-sdk'

export async function startGame(bootstrap: KookClientOptions) {
  const client = createKookClient(bootstrap)
  const environment = await client.ready()

  // 在这里渲染游戏，并加载游戏自身的资源。
  // instanceId 是平台实例标识；邀请中的 roomId 是游戏自己的房间参数。
  console.log(environment.platform, environment.context.launchSource)

  if (client.hasCapability('lifecycle.reportLoadResult')) {
    await client.lifecycle.reportLoadResult({ status: 'loaded' })
  }

  return client
}
```

客户端传入的必需启动参数是 `hostOrigin`、`sessionId`、`generation`。`hostOrigin` 必须是单一 HTTPS origin，不能带路径或使用 `*`。`connectionTimeoutMs` 可选。不要把凭据放进这些参数。

只有游戏真正可用后才上报 `loaded`。如果游戏必须登录才能可用，将该上报移到游戏后端登录和资源初始化完成之后。

## 3. 在登录交互中申请授权

以下 `backend` 是游戏自己实现的接口适配器，不是 SDK 提供的对象。准备登录事务可以提前完成，授权弹窗应由明确的用户交互触发。

使用 OAuth 登录时，在开发者后台配置 `redirect_uri`。开发者后台目前仍在开发中。配置与服务端处理要求见[游戏后端登录](./server-login.md)。

```ts
import type { KookClient, SessionCodeResult } from '@kookapp/kook-minigame-sdk'

interface GameBackend {
  beginLogin(): Promise<{ state: string }>
  completeLogin(code: Extract<SessionCodeResult, { status: 'authorized' }>): Promise<void>
}

export async function login(client: KookClient, backend: GameBackend) {
  const { state } = await backend.beginLogin()
  const result = await client.session.get({ state })
  if (result.status === 'cancelled') return

  // 后端校验 state、交换 code、取得可信身份并建立游戏登录态。
  await backend.completeLogin(result)
  // 此后进入游戏的已登录界面；无需再向 SDK 传入 access token。
}
```

取消授权属于正常结果。保持游戏页面，并让用户在需要时主动重试。授权码不能在前端交换，OAuth token 和应用密钥保留在游戏后端。

## 4. 按能力和权限调用

```ts
if (client.hasCapability('instance.getParticipants') && client.hasScope('get_user_info')) {
  const page = await client.instance.getParticipants({ limit: 50 })
  console.log(page.items)
}
```

`hasCapability` 表示宿主实现了能力，`hasScope` 表示当前 SDK 持有宿主确认的用户授权。客户端会对每一次请求重新检查。页面卸载或结束使用时调用 `client.destroy()`。

完整返回值见 [客户端 API](../api/client.md)，超时和拒绝处理见 [错误处理](../api/errors.md)。
