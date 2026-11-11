# 权限与能力

需要用户资料或平台数据时，先申请对应 OAuth scope；调用可选 API 前，用 capability 判断客户端是否支持。

## 三类检查

| 检查项                                      | 说明                                       | 用法                                               |
| ------------------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| `hasCapability(name)`                       | 当前 SDK 与宿主支持的可选能力              | 决定是否提供对应按钮；支持不代表用户一定有权操作   |
| `ready().availableScopes`                   | 宿主观察到的应用可申请范围，可能为空或过时 | 用于提示，不是授权申请的硬性白名单                 |
| `hasScope(name)`／授权结果及事件的 `scopes` | 当前启动绑定上宿主确认的授权               | 控制依赖用户授权的功能；实际请求仍由宿主／后端校验 |

## 按需申请 scope

`Scope` 类型为 `string`。`scopes` 默认 `['get_user_info']`，也可显式申请玩法所需的权限；`availableScopes` 仅供提示，不用它过滤申请。

| 示例权限                               | 用途                                          | 何时申请                                                 |
| -------------------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| `get_user_info`                        | 读取可信用户资料；当前 SDK 数据查询的基础授权 | 需要账号、资料或平台列表时                               |
| `mini_game.context`                    | 游戏后端按需查询可信实例、上下文与邀请目标    | 需要频道大厅或邀请核验等玩法时                           |
| 其他合法 scope，例如 `get_user_guilds` | 对应平台开放 API                              | 按接口文档及应用获批范围决定；名称示例不保证该应用已获准 |

传入非空、无重复的列表，每项为 1–256 字符的 OAuth scope token。`profile.basic` 兼容映射为 `get_user_info`。

在登录交互中调用，`state` 由游戏后端创建并绑定：

```ts
import type { KookClient, Scope } from '@kookapp/kook-minigame-sdk'

export async function requestGameAuthorization(client: KookClient, state: string, needsContext: boolean) {
  await client.ready()
  const scopes: Scope[] = ['get_user_info']
  if (needsContext) scopes.push('mini_game.context')
  return client.session.get({ state, scopes })
}
```

检查 `session.get()` 的返回状态；授权成功后将 code 交游戏后端换码，取消则保留重试入口，见[后端登录](./server-login.md)。

## 需要授权的 SDK 数据接口

| 能力                                                         | 前置授权／场景                                |
| ------------------------------------------------------------ | --------------------------------------------- |
| `social.getFriendsAndDms`                                    | `get_user_info`                               |
| `channel.getMembers`                                         | `get_user_info`；当前打开位置是文字／语音频道 |
| `instance.getParticipants`、`instance.onParticipantsChanged` | `get_user_info`                               |
| `officialServer.getStatus`                                   | `get_user_info`                               |

以上接口同时检查同名 capability。`mini_game.context` 用于游戏后端的[上下文查询](./context.md)，频道成员查询仍要求 `get_user_info`。

## 授权变化

通过 `auth.onStateChanged()` 更新界面。授权缩减时暂停对应数据读取，`revoked` 时引导用户重新打开游戏；恢复连接后重新 `ready()`，再检查授权。详见[生命周期](./lifecycle.md)。
