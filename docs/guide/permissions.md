# 权限与能力

更新于 2026-11-04，对应 SDK 0.1.3。区分宿主能力、应用可申请范围和当前用户授权，分别决定功能展示、提示和受保护调用。

## 三类检查

| 检查项                                      | 说明                                       | 用法                                               |
| ------------------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| `hasCapability(name)`                       | 当前 SDK 与宿主支持的可选能力              | 决定是否提供对应按钮；支持不代表用户一定有权操作   |
| `ready().availableScopes`                   | 宿主观察到的应用可申请范围，可能为空或过时 | 用于提示，不是授权申请的硬性白名单                 |
| `hasScope(name)`／授权结果及事件的 `scopes` | 当前启动绑定上宿主确认的授权               | 控制依赖用户授权的功能；实际请求仍由宿主／后端校验 |

`ready()` 和 `session.get()` 是基础契约，不通过 capability 开关控制。没有可选 capability 时可继续基础加载和登录。

## 按需申请 scope

`Scope` 类型为 `string`。省略 `scopes` 时默认申请 `get_user_info`；显式传入时可只包含游戏需要的其他权限，不强制包含用户信息权限，也不要求属于 `availableScopes`。

| 示例权限                               | 用途                                          | 何时申请                                                 |
| -------------------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| `get_user_info`                        | 读取可信用户资料；当前 SDK 数据查询的基础授权 | 需要账号、资料或平台列表时                               |
| `mini_game.context`                    | 游戏后端按需查询可信实例、上下文与邀请目标    | 需要频道大厅或邀请核验等玩法时                           |
| 其他合法 scope，例如 `get_user_guilds` | 对应平台开放 API                              | 按接口文档及应用获批范围决定；名称示例不保证该应用已获准 |

SDK 不维护名称白名单，实际范围由宿主及 OAuth 服务端管理。SDK 检查列表非空、同名不重复，每项 1–256 字符，符合 OAuth scope token 格式（排除空白、控制字符、双引号、反斜线和非 ASCII 字符）。`profile.basic` 兼容映射为 `get_user_info`；正式名称和别名同时传入时合并，其他合法名称不改写。

下面的函数从登录交互调用，`state` 由游戏后端创建并绑定；不要先用 `availableScopes.includes()` 拦住申请：

```ts
import type { KookClient, Scope } from '@kookapp/kook-minigame-sdk'

export async function requestGameAuthorization(client: KookClient, state: string, needsContext: boolean) {
  await client.ready()
  const scopes: Scope[] = ['get_user_info']
  if (needsContext) scopes.push('mini_game.context')
  return client.session.get({ state, scopes })
}
```

`session.get()` 成功返回本次获批权限，显式请求其他权限时不保证包含 `get_user_info`。失败处理 `SCOPE_MISSING`、`PERMISSION_DENIED` 等结果，不要把应用声明当成用户同意。新 scope 不会自动增加 SDK 方法；其他开放 API 的访问由游戏后端凭 OAuth token 执行。

## capability 与当前查询要求

| 能力                                                                            | 前置授权／场景                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `social.getFriendsAndDms`                                                       | `get_user_info`                                     |
| `channel.getMembers`                                                            | `get_user_info`；当前打开位置是文字／语音频道       |
| `instance.getParticipants`、`instance.onParticipantsChanged`                    | `get_user_info`                                     |
| `officialServer.getStatus`                                                      | `get_user_info`                                     |
| `ui.openInviteModal`、`ui.openOfficialServerModal`                              | 不以 OAuth 为前置，宿主校验当前绑定、用户操作及权限 |
| `lifecycle.reportLoadResult`、`lifecycle.onStateChanged`、`auth.onStateChanged` | ready 且宿主支持                                    |

`mini_game.context` 不等于频道成员读取权限。获取授权不会使宿主没有实现的能力自动可用；能力存在也不能代替用户授权。

## 授权变化

SDK 维护 `unauthorized / authorized / revoked` 快照，没有 `expired` 状态。code 的 `expiresAt`、OAuth token 有效期和游戏自己的会话期限分别维护。

授权集合缩减时，在旧授权下进行的受保护读取可能以 `SCOPE_MISSING` 结束；撤销、断线或启动绑定失效时不能继续使用旧权限。`hasScope()` 反映当前观察值，实际调用仍可能被宿主拒绝，须处理 Promise 拒绝。

`revision` 是同一授权流的版本号，不是时间戳，也不与参与者流或其他绑定的版本比较。恢复后重新 `ready()` 并读取新授权，不循环自动弹窗。详情见[生命周期](./lifecycle.md)。
