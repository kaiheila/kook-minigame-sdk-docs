# 客户端与授权 API

所有公开对象、命名空间和返回快照都是只读的。不要修改返回数据；需要变化时复制到游戏自己的状态对象中。

## createKookClient(options)

```ts
import createKookClient from '@kookapp/kook-minigame-sdk'

const client = createKookClient(bootstrap)
```

| 参数                  | 类型      | 说明                                 |
| --------------------- | --------- | ------------------------------------ |
| `hostOrigin`          | `string`  | 可信 KOOK 宿主的精确 HTTPS origin    |
| `sessionId`           | `string`  | 本次启动的通信绑定，非 OAuth 凭据    |
| `generation`          | `number`  | 非负安全整数，启动代次               |
| `connectionTimeoutMs` | `number?` | 握手超时，100–30000 毫秒，默认 10000 |

创建时检查参数并保存不可变副本；不会立即建立通道。可以在 SSR 环境导入模块，实际连接需要受支持的浏览器嵌入环境。

## connect(): Promise&lt;void&gt;

仅建立与嵌入父窗口的通信。重复并发调用共享连接过程。成功不代表 OAuth 授权，也不代表游戏加载完成。通常直接调用 `ready()` 即可。

## ready(): Promise&lt;ReadyResult&gt;

必要时先连接，然后获取环境并建立宿主支持的授权及生命周期监听。并发调用合并；当前连接内成功结果缓存。不会弹出授权窗口。

| 返回字段               | 含义                                                    |
| ---------------------- | ------------------------------------------------------- |
| `contractVersion`      | 当前为 `1`                                              |
| `gameCode`             | 当前应用标识                                            |
| `instanceId`           | 平台游戏实例标识                                        |
| `platform`             | `pc` 或 `web`                                           |
| `capabilities`         | 此宿主支持的可选能力列表                                |
| `permissionVersion`    | 权限配置版本                                            |
| `availableScopes`      | 应用可申请的 scope；不表示用户已同意                    |
| `context.contextType`  | `text_channel / voice_channel / user_dm / mini_game_dm` |
| `context.launchSource` | `channel / appLauncher / invite`                        |
| `context.roomId?`      | 邀请入口携带的游戏房间参数，仅在 `invite` 场景出现      |

返回值不含当前用户、OAuth token、内部频道 ID 或服务器 ID。后端权限判断所需的可信身份和上下文由服务端接口获取。

## session.get(input): Promise&lt;SessionCodeResult&gt;

就绪后按需申请授权并获取短期 code。输入 `state` 为 16–256 字符的无空白事务标识，由游戏后端随机生成并绑定。`scopes` 可选，默认 `['profile.basic']`；必须包含基础 scope 且属于 `availableScopes` 子集。

```ts
const result = await client.session.get({
  state: transaction.state,
  scopes: ['profile.basic', 'friends.dms.read'],
})
if (result.status === 'authorized') {
  // result.code / state / expiresAt / scopes / revision
  await backend.completeLogin(result)
} else {
  // result.status === 'cancelled'；保留游戏页面。
}
```

| 成功字段    | 说明                                     |
| ----------- | ---------------------------------------- |
| `status`    | `authorized`                             |
| `code`      | 一次性短期授权码，交游戏后端处理         |
| `state`     | 原样对应请求事务；SDK 与游戏后端都需验证 |
| `expiresAt` | 授权码过期时间，Unix 毫秒                |
| `scopes`    | 宿主确认的当前有效授权集合               |
| `revision`  | 与授权事件共用的递增版本序号             |

取消只返回 `{ status: 'cancelled', state }`。取消不清除已有授权。授权弹窗与其他 SDK 弹窗互斥；本地最长等待 120 秒，超时后不会自动重试。

## hasCapability(name) / hasScope(scope)

均同步返回 `boolean`。不就绪、断线、销毁或终止时返回 `false`。前者判断宿主能力，后者判断当前宿主确认的授权。它们不能替代请求时的服务端检查。

## auth.onStateChanged(listener)

返回 `Promise<KookSubscription>`。宿主支持该能力时，SDK 在 `ready()` 阶段就会维护内部监听，即使游戏不注册回调也会处理撤销。

```ts
const subscription = await client.auth.onStateChanged((snapshot) => {
  if (snapshot.status === 'authorized') {
    console.log(snapshot.scopes)
  }
})
await subscription.unsubscribe()
```

状态为 `unauthorized`、`authorized`、`revoked`，均携带 `revision`。授权快照没有 OAuth token，也没有 token 过期时间。首次订阅取得快照；旧 revision 不覆盖新状态。

## 连接与清理

- `state`：当前连接状态。
- `connection`：包含 `state / epoch / monitoring / client / server / recovery / reason` 的只读快照。
- `onConnectionChanged(listener)`：同步注册并立即回调，返回取消监听函数；最多 32 个本地监听。
- `destroy()`：同步、终止性且幂等；清理通道、请求、订阅和定时器。

详见 [生命周期与恢复](../guide/lifecycle.md)。
