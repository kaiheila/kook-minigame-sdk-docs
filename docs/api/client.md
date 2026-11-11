# 客户端与授权 API

先创建一个客户端并复用它。返回快照为只读数据，需要修改时复制到游戏自己的状态。

## createKookClient(options?) {#create-client}

```ts
import { createKookClient } from '@kookapp/kook-minigame-sdk'

const client = createKookClient()
const environment = await client.ready()
```

在 KOOK 游戏 iframe 中调用。省略参数使用自动启动，首次 `ready()`／`connect()` 时开始连接。

自动模式的可选参数为 `KookAutoLaunchOptions`：

| 参数                  | 类型                 | 说明                                                                                        |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `allowedHostOrigins`  | `readonly string[]?` | 追加的精确 HTTPS 来源；传入非空列表，最多 16 项，与默认 `https://www.kookapp.cn` 合并、去重 |
| `bootstrapTimeoutMs`  | `number?`            | 等待启动数据的超时，100–30000 毫秒，默认 10000                                              |
| `connectionTimeoutMs` | `number?`            | 随后的握手超时，100–30000 毫秒，默认 10000                                                  |

`allowedHostOrigins` 在 1.3.1 起与默认来源合并、去重。例如传入 `['https://localhost:3000']`，仍信任 `https://www.kookapp.cn`，兼容打包 PC 的固定 HTTPS 承载。传入项数上限为 16，重复项也计数；加上默认来源后最多 17 个不同来源。仅用默认来源时省略字段，传 `[]` 返回 `INVALID_ARGUMENT`。

来源须由游戏配置提供，格式为精确 HTTPS origin，不含路径或尾斜线；不要从消息、query 或 referrer 推导。测试示例见[快速开始](../guide/quick-start.md#test-host-origins)。

### 兼容显式启动绑定

已有集成可传入完整的 `hostOrigin: string`、`sessionId: string`、`generation: number` 和可选 `connectionTimeoutMs`，值均来自本次可信启动。此模式只信任绑定的 `hostOrigin`，与自动模式参数不可混用。新接入使用自动模式即可。

## connect(): Promise&lt;void&gt;

建立连接，并发调用合并。通常直接调用 `ready()`，由它完成连接。

## ready(): Promise&lt;ReadyResult&gt;

完成连接并返回启动环境。并发调用合并，当前连接内成功结果缓存。

| 返回字段               | 含义                                                               |
| ---------------------- | ------------------------------------------------------------------ |
| `contractVersion`      | 当前为 `1`                                                         |
| `gameCode`             | 当前应用标识                                                       |
| `instanceId`           | 平台游戏实例标识                                                   |
| `platform`             | `pc` 或 `web`                                                      |
| `capabilities`         | 此宿主支持的可选能力列表                                           |
| `permissionVersion`    | 权限配置版本                                                       |
| `availableScopes`      | 宿主观察到的可申请 scope，仅供提示；可能为空或过时，不是申请白名单 |
| `context.contextType`  | `text_channel / voice_channel / user_dm / mini_game_dm`            |
| `context.launchSource` | `channel / appLauncher / invite`                                   |
| `context.roomId?`      | 邀请入口携带的游戏房间参数，仅在 `invite` 场景出现                 |

需要用户资料时接入[游戏后端登录](../guide/server-login.md)；需要频道大厅或邀请目标校验时，由后端[查询上下文](../guide/context.md)。

## session.get(input): Promise&lt;SessionCodeResult&gt;

申请 OAuth 授权并取得短期 code，随后交游戏后端换码。

| 参数          | 说明                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `state`       | 必填，游戏后端生成并绑定的随机事务标识，16–256 字符，无空白                                                          |
| `scopes`      | 可选，默认 `['get_user_info']`；显式传入非空、无重复的权限列表，实际可用范围由平台决定                               |
| `redirectUri` | 可选完整 HTTPS 回调，须与后端换码值一致；省略使用宿主默认值，见[回调配置](../guide/server-login.md#oauth-回调与换码) |

`Scope` 为字符串，显式申请不受 `availableScopes` 列表限制。`profile.basic` 是 `get_user_info` 的兼容别名。

```ts
const result = await client.session.get({
  state: transaction.state,
  scopes: ['get_user_info'],
})
if (result.status === 'authorized') {
  // result.code / state / expiresAt / scopes / revision
  await backend.completeLogin(result)
} else {
  // result.status === 'cancelled'；保留游戏页面。
}
```

| 成功字段    | 说明                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| `status`    | `authorized`                                                                                 |
| `code`      | 一次性短期授权码，交游戏后端处理                                                             |
| `state`     | 原样对应请求事务；SDK 与游戏后端都需验证                                                     |
| `expiresAt` | 授权码过期时间，Unix 毫秒                                                                    |
| `scopes`    | 宿主确认的本次有效授权，是本次请求中获批的权限；显式请求其他权限时不保证包含 `get_user_info` |
| `revision`  | 与授权事件共用的递增版本序号                                                                 |

取消返回 `{ status: 'cancelled', state }`，保留页面供用户重试。授权弹窗与其他弹窗互斥，最长等待 120 秒。

## hasCapability(name) / hasScope(scope)

均同步返回 `boolean`。`hasCapability()` 用于决定是否显示或启用功能；`hasScope()` 用于检查当前用户授权。未就绪或断线时返回 false，实际调用仍应捕获错误。`hasScope('profile.basic')` 与 `hasScope('get_user_info')` 等价。

## auth.onStateChanged(listener)

监听用户授权变化，返回 `Promise<KookSubscription>`：

```ts
const subscription = await client.auth.onStateChanged((snapshot) => {
  if (snapshot.status === 'authorized') {
    console.log(snapshot.scopes)
  }
})
await subscription.unsubscribe()
```

状态为 `unauthorized / authorized / revoked`，均携带递增的 `revision`；`authorized` 额外包含 `scopes`。SDK 自动处理撤销，游戏在回调中更新界面即可。

## 连接与清理

- `state`：当前连接状态。
- `connection`：包含 `state / epoch / monitoring / client / server / recovery / reason` 的只读快照。
- `onConnectionChanged(listener)`：同步注册并立即回调，返回取消监听函数；最多 32 个本地监听。
- `destroy()`：同步、终止性且幂等；取消启动等待，清理通道、请求、订阅和定时器；不会主动退出平台参与或关闭游戏。

主动离开使用 [`lifecycle.leave()`](./business.md#lifecycle-leave)，不要用销毁 SDK 代替游戏退出。

详见 [生命周期与恢复](../guide/lifecycle.md)。
