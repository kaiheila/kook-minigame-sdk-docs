# 客户端与授权 API

所有公开对象、命名空间和返回快照都是只读的。不要修改返回数据；需要变化时复制到游戏自己的状态对象中。

## createKookClient(options?) {#create-client}

```ts
import { createKookClient } from '@kookapp/kook-minigame-sdk'

const client = createKookClient()
```

省略参数时使用自动启动模式。创建客户端不会立即监听或连接；首次 `ready()`／`connect()` 时，SDK 自动接收并校验 KOOK 启动数据，按需请求重投。游戏无需编写宿主通信代码。模块可在 SSR／构建工具中导入，实际连接在 KOOK 的游戏 iframe 内运行。

自动模式的可选参数为 `KookAutoLaunchOptions`：

| 参数                  | 类型                 | 说明                                                               |
| --------------------- | -------------------- | ------------------------------------------------------------------ |
| `allowedHostOrigins`  | `readonly string[]?` | 精确 HTTPS origin，最多 16 项；默认仅信任 `https://www.kookapp.cn` |
| `bootstrapTimeoutMs`  | `number?`            | 等待启动数据的超时，100–30000 毫秒，默认 10000                     |
| `connectionTimeoutMs` | `number?`            | 随后的握手超时，100–30000 毫秒，默认 10000                         |

显式来源列表覆盖默认列表，不接受通配符、HTTP、路径、尾斜线或非规范 origin。配置来自游戏的可信环境配置，不从消息、query 或 referrer 获取。SDK 固定接受一组启动绑定；新启动创建新客户端。取得数据、超时、失败或销毁后，SDK 清理临时监听。

### 兼容显式启动绑定

已有集成可继续传入 `KookClientOptions`：`hostOrigin: string`、`sessionId: string`、`generation: number` 和可选 `connectionTimeoutMs`。三个绑定字段必须完整、来自本次可信启动；不能使用用户或实例编号代替。这组参数与自动模式的 `allowedHostOrigins/bootstrapTimeoutMs` 不可混用。新接入优先使用无参数自动模式。

## connect(): Promise&lt;void&gt;

按需等待可信启动数据，然后建立与嵌入父窗口的通信。重复并发调用共享连接过程。成功不代表 OAuth 授权，也不代表游戏加载完成。通常直接调用 `ready()` 即可。

## ready(): Promise&lt;ReadyResult&gt;

必要时先连接，然后获取环境并建立宿主支持的授权及生命周期监听。并发调用合并；当前连接内成功结果缓存。不会弹出授权窗口。

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

返回值不含当前用户、OAuth token、内部频道 ID 或服务器 ID。环境信息用于页面展示和入口处理；可信用户身份由游戏后端通过平台服务端接口取得，游戏业务权限由游戏后端校验。

需要按频道组织大厅或核验邀请目标时，游戏后端可以[按需查询上下文](../guide/context.md)；不要求所有游戏登录都查询。用户当前打开位置与实例创建／归属上下文可能不同，不能用前端环境代替后端准入校验。

## session.get(input): Promise&lt;SessionCodeResult&gt;

就绪后按需申请授权并获取短期 code。输入 `state` 为 16–256 字符的无空白事务标识，由游戏后端随机生成并绑定，随机性至少 128 bit。`scopes` 可选，默认 `['get_user_info']`；显式传入时可以仅申请其他合法权限，不要求包含用户信息权限或属于 `availableScopes`。`Scope` 为 `string`，名称及应用授权范围由服务端管理。空列表、同名重复值或无效 OAuth scope token 会被拒绝；`profile.basic` 归一化为 `get_user_info`，正式名称与别名同时传入时合并。

`redirectUri` 可选，SDK 支持完整 HTTPS URL（含路径及查询参数，不允许片段或凭据）的校验及转发。实际允许的回调由目标宿主及 OAuth 后端决定，且须与游戏后端换码值一致；省略时使用宿主默认值。当前 KOOK 宿主实现使用固定平台回调，具体见[回调配置](../guide/server-login.md#oauth-回调与换码)。

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

取消只返回 `{ status: 'cancelled', state }`。取消不清除已有授权。授权弹窗与其他 SDK 弹窗互斥；本地最长等待 120 秒，超时后不会自动重试。

## hasCapability(name) / hasScope(scope)

均同步返回 `boolean`。不就绪、断线、销毁或终止时返回 `false`。前者判断宿主能力，后者判断当前宿主确认的授权。它们不能替代请求时的服务端检查。

`hasScope('get_user_info')` 与 `hasScope('profile.basic')` 等价。`hasScope('mini_game.context')` 检查当前上下文授权；也可查询其他合法 scope，未授权时返回 false。返回的 scope 名称只归一化兼容别名，不限制为两种权限。`hasScope` 不是服务端访问凭证。

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
- `destroy()`：同步、终止性且幂等；取消启动等待，清理通道、请求、订阅和定时器；不会主动退出平台参与或关闭游戏。

主动离开使用 [`lifecycle.leave()`](./business.md#lifecycle-leave)，不要用销毁 SDK 代替游戏退出。

详见 [生命周期与恢复](../guide/lifecycle.md)。
