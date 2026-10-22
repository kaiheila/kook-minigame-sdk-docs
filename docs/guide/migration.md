# 迁移与常见问题

2026-10-22 接入契约正式采用“先开游戏，后授权”。从旧草案迁移时，请同时更新前端调用、宿主响应和业务状态判断。

## 移除 authenticate

删除 `client.authenticate({ accessToken })` 及对应前端 token 传递。新流程为：

```text
打开游戏 → ready → 游戏按需 session.get
→ 用户同意 → code 交游戏后端 → 后端建立游戏登录态
```

`AuthenticationResult`、`AuthenticateInput` 和 `CurrentUser` 已从公开类型移除。用户展示信息由游戏后端返回。`session.get()` 成功建立宿主确认的 SDK 授权，不需要追加一次 token 复审。

## 字段与状态变化

| 旧草案                                                  | 当前契约                                         |
| ------------------------------------------------------- | ------------------------------------------------ |
| `ready.authorizedScopes`                                | `ready.availableScopes`，表示可申请集合          |
| `session.get({ state })` 只取 code                      | 现在也是按需授权入口，可传 `scopes`              |
| 无取消分支                                              | `SessionCodeResult` 按 `status` 区分成功与取消   |
| `authenticated / unauthenticated`                       | `authorized / unauthorized`                      |
| `AuthSnapshot.expiresAt`                                | 移除；不再用 token TTL 推断 SDK 权限             |
| `NOT_AUTHENTICATED`                                     | `NOT_AUTHORIZED`                                 |
| `TOKEN_INVALID / TOKEN_EXPIRED / AUTH_CONTEXT_MISMATCH` | 移除；OAuth token 错误由游戏后端处理             |
| 恢复后重新 authenticate                                 | 重新 ready，按新宿主授权快照决定是否需要主动授权 |

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
