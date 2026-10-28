# 权限与能力

SDK 有三层检查：宿主是否支持能力、应用是否可申请权限、用户是否授权。后两者不能合并成一个列表。

## scope

当前只有一个 scope：

| scope           | 用途             | 申请要求                       |
| --------------- | ---------------- | ------------------------------ |
| `get_user_info` | 允许读取用户信息 | `session.get()` 默认申请此权限 |

`profile.basic` 是 `get_user_info` 的兼容别名，不是独立权限。已有代码可以继续传入该名称，SDK 会在请求发送前自动映射为 `get_user_info`。`ready().availableScopes`、授权结果和授权事件中的 `scopes` 均统一使用 `get_user_info`；`hasScope('profile.basic')` 与 `hasScope('get_user_info')` 结果相同。

`ready().availableScopes` 是当前应用已获准申请的集合，可以为 `[]` 或 `['get_user_info']`。调用 `session.get()` 时，省略 `scopes` 等同于传入 `['get_user_info']`，且该权限必须在可申请集合中。未知名称、同名重复值或空数组属于无效参数；正式名称与别名同时传入时合并为一个权限。

```ts
const ready = await client.ready()
if (ready.availableScopes.includes('get_user_info')) {
  const grant = await client.session.get({
    state: loginTransaction.state,
    scopes: ['get_user_info'],
  })
  if (grant.status === 'authorized' && client.hasCapability('instance.getParticipants')) {
    const page = await client.instance.getParticipants()
  }
}
```

示例中的 `loginTransaction` 由游戏后端创建。授权成功时 `scopes` 为 `['get_user_info']`；应用获准申请此权限不代表用户已同意，以授权结果和后续授权事件为准。

## capability

可选功能先检查 `hasCapability()`。同一版本 SDK 在不同客户端版本中可能得到不同结果。

| 能力                                                                            | 所需用户授权                            |
| ------------------------------------------------------------------------------- | --------------------------------------- |
| `social.getFriendsAndDms`                                                       | `get_user_info`                         |
| `channel.getMembers`                                                            | `get_user_info`；仅文字或语音频道       |
| `instance.getParticipants`、`instance.onParticipantsChanged`                    | `get_user_info`                         |
| `officialServer.getStatus`                                                      | `get_user_info`                         |
| `ui.openInviteModal`、`ui.openOfficialServerModal`                              | 不以 OAuth 为前置；宿主校验原生操作权限 |
| `lifecycle.reportLoadResult`、`lifecycle.onStateChanged`、`auth.onStateChanged` | 就绪后可用                              |

`session.get()` 和 `ready()` 属于基础契约，不通过 capability 开关控制。当前没有广告 API；不要根据保留错误码推断该能力已可用。

用户授权与 capability 必须分别检查。拥有 `get_user_info` 不代表宿主一定提供某项业务能力；宿主会对每次请求独立校验访问权限。

## 授权变化

SDK 会维护宿主确认的授权快照。失去授权、撤销或断线时，本地检查会阻止继续使用旧权限。`hasScope()` 只是当前观察值，调用仍可能被宿主拒绝，因此必须处理 Promise 拒绝。

授权变化的 `revision` 是宿主版本序号。不要把它当时间戳，也不要从一个启动实例复制到另一个实例。
