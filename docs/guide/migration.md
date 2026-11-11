# 迁移与常见问题

本文对应已发布的 1.3.1。基础启动继续使用“先开游戏，后授权”；从旧版升级时更新 SDK 调用及业务状态判断，无需自行实现与 KOOK 的通信。

## 从 1.3.0 升级到 1.3.1 {#upgrade-1-3-1}

固定安装 `@kookapp/kook-minigame-sdk@1.3.1` 并提交锁文件。自动模式的 `allowedHostOrigins` 从覆盖默认列表改为与默认来源合并、去重，始终保留 `https://www.kookapp.cn`：

```ts
const client = createKookClient({
  allowedHostOrigins: ['https://localhost:3000'],
})
// 实际信任 https://www.kookapp.cn 和 https://localhost:3000。
await client.ready()
```

打包 PC 的正式和测试环境均可能使用默认 HTTPS 父页面，因此保留它可兼容两种环境。游戏自己的来源过滤也应同步；追加列表仍非空且最多 16 项。完整显式绑定只使用其 `hostOrigin`，行为不变。

现有 API 调用保持兼容。更新依赖和锁文件后重新构建、发布游戏前端。

## 从 1.2.0 升级到 1.3.0

固定安装 `@kookapp/kook-minigame-sdk@1.3.0` 并提交锁文件，按玩法增加两个可选 API：

- 帮助／官网等外链按钮使用 `client.ui.openExternalLink({ url })`；由宿主保留消息外链安全跳转，不增加跳过检查的参数。
- 全屏按钮直接调用 `client.ui.requestFullscreen()`；不要先等待其他异步操作，成功后按宿主全屏表现使用，取消通过 Esc 或宿主按钮。
- 分别检查同名 capability，并处理前台、用户点击及失败重试。

已有初始化、授权、邀请和 `lifecycle.leave()` 调用保持兼容，新增 API 不要求改变游戏后端。详见[打开外链](../api/business.md#ui-open-external-link)、[请求全屏](../api/business.md#ui-request-fullscreen)和[类型定义](../api/types.md)。

## 迁移到 1.2.0

1.2.0 已发布，固定安装 `@kookapp/kook-minigame-sdk@1.2.0` 并提交锁文件。

1. 删除游戏侧的 `waitForKookLaunch`／`kook-launch.ts`、启动消息监听、重投和绑定缓存，改为 `createKookClient()` → `ready()`。
2. 正式环境省略启动参数；测试环境把旧来源白名单作为 `allowedHostOrigins` 交给 SDK，不再自己处理消息校验。
3. 在页面／组件卸载时调用 `destroy()`，取消 SDK 正在等待的启动、握手和请求；新启动创建新客户端。
4. 退出按钮先完成游戏清理，再检查 `lifecycle.leave` capability 并调用 `client.lifecycle.leave()`；处理失败和旧客户端不支持的情况。

1.1.0 已支持自动启动，升级至 1.2.0 时只需按玩法增加离开接口。已有完整显式绑定仍兼容；自动配置与显式绑定参数不能混用。公开声明见[最新 API 类型](../api/types.md)。

## 0.1.3 的兼容变化

从 0.1.3 以前升级时，还需核对以下权限与上下文行为：

- `Scope` 从两种名称的联合类型改为开放字符串；移除应用代码中照抄的通用白名单及 `availableScopes` 子集检查，按玩法申请所需权限。
- 显式 `scopes` 可以不含 `get_user_info`；当前 SDK 的用户数据查询仍要求它，不能因此删除所用查询的授权前置。
- `session.get()` 接受可选完整 HTTPS `redirectUri`，但目标宿主及 OAuth 后端还须允许；当前宿主固定回调的约束见[后端登录](./server-login.md#oauth-回调与换码)。
- 基础登录不强制查询上下文，也不禁止游戏查询；需要时申请 `mini_game.context`，由后端[按需查询](./context.md)。
- 频道不带 `roomId` 的邀请在已支持分流的宿主上走频道游戏邀请；传 roomId 仍指向固定实例／房间，私信省略时仅固定实例。SDK 包升级不能代替宿主上线。

这些行为在最新版本保持兼容；旧的 `profile.basic` 输入继续归一化为 `get_user_info`。

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

## 还需要注册 startGame 或接收启动消息吗？

`startGame` 是游戏自己的初始化函数，不是 KOOK 自动调用的固定全局入口。游戏加载后直接创建 SDK 并调用 `ready()`，SDK 自行接收可信启动数据。无需注册全局函数、监听启动消息或请求重投；测试来源交给 `allowedHostOrigins`，不要从 query、referrer 或随机值拼接绑定。

## destroy 会关闭游戏吗？

`destroy()` 只清理 SDK 本地连接和监听。主动离开 KOOK 游戏调用 `lifecycle.leave()`，由 KOOK 处理平台退出和承载关闭；游戏自己的退房或存档应先完成。旧客户端不支持 leave 时展示提示，不用本地销毁模拟成功。

## SDK 接受自定义回调，为什么宿主仍拒绝？

SDK 只校验及转发参数。目标宿主和 OAuth 服务端决定允许的地址；当前已核对的宿主采用固定平台回调。授权和换码还须使用同一个值，不能仅修改后端环境变量。

## 为什么邀请返回 submitted，但发送人数是零？

成功复制链接不增加发送人数，可以返回 `submitted` 且两个计数均为零。正常取消返回 `cancelled`；有失败计数或 reject 时应展示失败。完整语义见[邀请与参与者](./social.md#邀请目标与结果)。
