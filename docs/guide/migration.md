# 迁移与常见问题

2026-10-22 接入契约正式采用“先开游戏，后授权”。从旧草案迁移时，请同时更新前端调用、宿主响应和业务状态判断。

## 迁移到 0.1.3

固定安装 `@kookapp/kook-minigame-sdk@0.1.3`，提交更新后的锁文件，并核对实际安装版本。同步以下变化：

- `Scope` 从两种名称的联合类型改为开放字符串；移除应用代码中照抄的通用白名单及 `availableScopes` 子集检查，按玩法申请所需权限。
- 显式 `scopes` 可以不含 `get_user_info`；当前 SDK 的用户数据查询仍要求它，不能因此删除所用查询的授权前置。
- `session.get()` 接受可选完整 HTTPS `redirectUri`，但目标宿主及 OAuth 后端还须允许；当前宿主固定回调的约束见[后端登录](./server-login.md#oauth-回调与换码)。
- 基础登录不强制查询上下文，也不禁止游戏查询；需要时申请 `mini_game.context`，由后端[按需查询](./context.md)。
- 频道不带 `roomId` 的邀请在已支持分流的宿主上走频道游戏邀请；传 roomId 仍指向固定实例／房间，私信省略时仅固定实例。SDK 包升级不能代替宿主上线。

公开参数名和授权成功／取消结果结构保持兼容；旧的 `profile.basic` 输入继续归一化为 `get_user_info`。类型快照以[0.1.3 API 类型](../api/types.md)为准。

## 移除 authenticate

删除 `client.authenticate({ accessToken })` 及对应前端 token 传递。新流程为：

```text
打开游戏 → ready → 游戏按需 session.get
→ 用户同意 → code 交游戏后端 → 后端建立游戏登录态
```

`AuthenticationResult`、`AuthenticateInput` 和 `CurrentUser` 已从公开类型移除。用户展示信息由游戏后端返回。`session.get()` 成功建立宿主确认的 SDK 授权，不需要追加一次 token 复审。

## 字段与状态变化

| 旧草案                                                  | 当前契约                                                  |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `ready.authorizedScopes`                                | `ready.availableScopes`，宿主观察到的可申请范围，仅供提示 |
| `session.get({ state })` 只取 code                      | 现在也是按需授权入口，可传 `scopes`                       |
| 无取消分支                                              | `SessionCodeResult` 按 `status` 区分成功与取消            |
| `authenticated / unauthenticated`                       | `authorized / unauthorized`                               |
| `AuthSnapshot.expiresAt`                                | 移除；不再用 token TTL 推断 SDK 权限                      |
| `NOT_AUTHENTICATED`                                     | `NOT_AUTHORIZED`                                          |
| `TOKEN_INVALID / TOKEN_EXPIRED / AUTH_CONTEXT_MISMATCH` | 移除；OAuth token 错误由游戏后端处理                      |
| 恢复后重新 authenticate                                 | 重新 ready，按新宿主授权快照决定是否需要主动授权          |

## ready 会弹授权框吗？

不会。它返回启动环境、能力和可申请权限。需要身份时游戏再调用 `session.get()`。已存在有效用户同意时，宿主也可能无需再次弹框。

## 取消授权必须关闭游戏吗？

不用。取消是正常结果，保留游戏页面。游戏可以继续无需身份的玩法，或展示登录入口。平台启动资格校验仍由 KOOK 在打开游戏前处理。

## code 过期后 SDK 权限也过期吗？

不是同一个生命周期。`expiresAt` 约束后端换码；SDK 授权由宿主状态与逐次请求校验控制，游戏会话由游戏后端控制。

## 为什么本地 hasScope 为 true，调用仍会失败？

本地值是最近一次宿主快照。权限、上下文或实例状态可以在调用前发生变化，宿主始终独立校验。处理请求错误并刷新界面。

## 接入需要 URL Mapping 吗？

当前接入无需配置 URL Mapping。按平台确认的游戏地址和网络配置对接即可。

## 能直接在普通网页演示所有能力吗？

SDK 通信需要 KOOK 嵌入上下文及可信启动参数。普通网页可以展示游戏本身；依赖平台身份、授权或实例的能力，需要在 KOOK 客户端中运行。

## 为什么照示例注册 startGame，仍收不到启动参数？

`startGame` 是游戏自己的函数，不是 KOOK 自动调用的固定全局入口。先按[快速开始](./quick-start.md#接收宿主启动绑定)接收宿主消息，校验来源，并在监听建立后请求重投；不要从 query、referrer 或随机值拼接绑定。

## SDK 接受自定义回调，为什么宿主仍拒绝？

SDK 只校验及转发参数。目标宿主和 OAuth 服务端决定允许的地址；当前已核对的宿主采用固定平台回调。授权和换码还须使用同一个值，不能仅修改后端环境变量。

## 为什么邀请返回 submitted，但发送人数是零？

成功复制链接不增加发送人数，可以返回 `submitted` 且两个计数均为零。正常取消返回 `cancelled`；有失败计数或 reject 时应展示失败。完整语义见[邀请与参与者](./social.md#邀请目标与结果)。
