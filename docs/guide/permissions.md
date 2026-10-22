# 权限与能力

SDK 有三层检查：宿主是否支持能力、应用是否可申请权限、用户是否授权。后两者不能合并成一个列表。

## scope

| scope                  | 用途                                     | 申请要求                       |
| ---------------------- | ---------------------------------------- | ------------------------------ |
| `profile.basic`        | 基础用户授权、实例参与者和官方服务器状态 | 每次授权请求必须包含           |
| `friends.dms.read`     | 好友与私聊候选列表                       | 按玩法需要选择                 |
| `channel.members.read` | 当前频道成员                             | 按玩法需要选择；只支持频道场景 |

`ready().availableScopes` 是当前应用已获准申请的集合，可以为空。调用 `session.get()` 的 `scopes` 必须为其子集；未知 scope、重复值或缺少基础权限属于无效参数。

```ts
const ready = await client.ready()
if (ready.availableScopes.includes('friends.dms.read')) {
  const grant = await client.session.get({
    state: loginTransaction.state,
    scopes: ['profile.basic', 'friends.dms.read'],
  })
  if (grant.status === 'authorized' && client.hasScope('friends.dms.read')) {
    const page = await client.social.getFriendsAndDms()
  }
}
```

示例中的 `loginTransaction` 由游戏后端创建。返回的 `scopes` 才是本次有效授权集合，可能少于请求集合；以结果和后续授权事件为准。

## capability

可选功能先检查 `hasCapability()`。同一版本 SDK 在不同客户端版本中可能得到不同结果。

| 能力                                                                            | 所需用户授权                             |
| ------------------------------------------------------------------------------- | ---------------------------------------- |
| `social.getFriendsAndDms`                                                       | `profile.basic` + `friends.dms.read`     |
| `channel.getMembers`                                                            | `profile.basic` + `channel.members.read` |
| `instance.getParticipants`、`instance.onParticipantsChanged`                    | `profile.basic`                          |
| `officialServer.getStatus`                                                      | `profile.basic`                          |
| `ui.openInviteModal`、`ui.openOfficialServerModal`                              | 不以 OAuth 为前置；宿主校验原生操作权限  |
| `lifecycle.reportLoadResult`、`lifecycle.onStateChanged`、`auth.onStateChanged` | 就绪后可用                               |

`session.get()` 和 `ready()` 属于基础契约，不通过 capability 开关控制。当前没有广告 API；不要根据保留错误码推断该能力已可用。

## 授权变化

SDK 会维护宿主确认的授权快照。撤销、缩减权限或断线时，本地检查会阻止继续使用旧权限。`hasScope()` 只是当前观察值，调用仍可能被宿主拒绝，因此必须处理 Promise 拒绝。

授权变化的 `revision` 是宿主版本序号。不要把它当时间戳，也不要从一个启动实例复制到另一个实例。
