# 业务 API

下列 API 均要求 `ready()` 完成，且对应 capability 可用。返回类型完整定义见 [类型参考](./types.md)。

## 数据查询

| 方法                               | 返回类型                         | scope / 场景                      |
| ---------------------------------- | -------------------------------- | --------------------------------- |
| `social.getFriendsAndDms(input?)`  | `Promise<Page<SocialCandidate>>` | `get_user_info`                   |
| `channel.getMembers(input?)`       | `Promise<Page<Candidate>>`       | `get_user_info`；仅文字或语音频道 |
| `instance.getParticipants(input?)` | `Promise<Page<Participant>>`     | `get_user_info`                   |
| `officialServer.getStatus()`       | `Promise<OfficialServerStatus>`  | `get_user_info`                   |

前三个方法的 `input` 为 `{ cursor?: string, limit?: number }`。默认 limit 为 50，最大 100。返回 `{ items, revision, nextCursor }`，`nextCursor: null` 表示结束。查询绑定当前启动上下文，不接受游戏自行指定其他频道、实例、用户或官方服务器 ID。

SDK 同时检查 `get_user_info` 用户授权和对应 capability。授权不保证业务能力可用，宿主仍逐次校验访问权限。

### 候选人与参与者

`Candidate` 包含 `identity`、`username`、`avatarUrl`。头像可能为空；身份是以下二选一：

```ts
type CandidateIdentity =
  | { readonly kind: 'app_user'; readonly userOpenCode: string }
  | { readonly kind: 'temporary'; readonly temporaryId: string }
```

`SocialCandidate` 增加 `sources: ('friend' | 'dm')[]`，用于识别同一候选人来自哪些列表。`Participant` 增加 `joinedAt`（Unix 毫秒）和 `joinOrder`（非负整数，页内递增）。

### 官方服务器状态

未配置时返回 `{ configured: false }`；配置后返回 `configured: true`、`name`、`iconUrl` 和 `membership`。加入状态为 `joined / not_joined / pending`。

## 原生弹窗

### ui.openInviteModal(input?)

输入 `{ roomId?: string }`，返回 `Promise<InviteResult>`：

```ts
{
  status: 'submitted' | 'cancelled'
  sentCount: number
  failedCount: number
}
```

取消时两个数量均为 0。`roomId` 仅允许字母、数字、下划线、连字符，最大 128 字符。

| 打开上下文           | roomId   | 邀请目标                                                                             |
| -------------------- | -------- | ------------------------------------------------------------------------------------ |
| 文字／语音频道       | 省略     | 已支持该分流的宿主打开原生频道游戏邀请，与承载区左下角一致；接收者打开目标频道的游戏 |
| 任意支持邀请的上下文 | 显式传入 | 固定当前实例，并携带游戏房间目标；后端检查存在、容量与准入                           |
| 普通／游戏应用私信   | 省略     | 固定当前实例，不指定游戏房间，由游戏展示首页／大厅                                   |

成功复制链接也返回 `submitted`，复制不增加人数，因此 `sentCount` 与 `failedCount` 可同时为 0；仅生成链接不算提交。`submitted` 不代表对方已接受或入房。频道无权不回退到私信，链接设置由原生 UI 管理；旧宿主是否支持频道分流需单独确认，不能仅凭 capability 推断。

正常关闭后返回聚合结果；错误、超时或绑定失效也可能 reject。全部失败时处理返回的失败计数或错误，不显示发送成功。SDK 不返回邀请码、邀请 URL 或收件人明细。完整使用示例见[邀请目标与结果](../guide/social.md#邀请目标与结果)。

### ui.openOfficialServerModal()

无参数，返回 `Promise<{ status: 'opened' | 'joined' | 'pending' | 'cancelled' }>`。以返回状态为准，不把弹窗打开当成已加入。

两个原生弹窗都可在 OAuth 授权前调用，宿主负责校验绑定、可见性、用户操作和平台权限；从用户按钮交互触发。它们与授权弹窗互斥，并共用原生业务弹窗的本地 10 秒节流。

## ui.openExternalLink(input) {#ui-open-external-link}

SDK 1.3.0 新增，签名为 `client.ui.openExternalLink(input: ExternalLinkInput): Promise<void>`。要求 ready、前台状态和 `ui.openExternalLink` capability，无需 OAuth；从用户点击帮助、官网等按钮时调用。

```ts
if (client.hasCapability('ui.openExternalLink')) {
  await client.ui.openExternalLink({ url: 'https://game.example/help?source=kook#faq' })
}
```

```ts
interface ExternalLinkInput {
  readonly url: string
}
```

- 只接受完整 HTTP/HTTPS 地址；输入和规范化后的 URL 均不超过 2048 字符。
- 不允许用户名密码、空白／控制字符、反斜杠、相对地址或其他协议。SDK 校验后传递规范化地址。
- 不接受 `skipRedirect`、窗口配置或其他字段；游戏不能跳过宿主安全检查或借此执行内部路由。

宿主沿用消息列表普通外链的安全跳转流程：允许的目标可直接跳转，风险网站被拦截，其余显示“继续访问”；安全查询失败仍保留原有提示。Web 在隔离的新标签页打开，PC 交给系统浏览器，均不导航当前游戏页面。

Promise 成功只表示宿主已发起打开，不保证浏览器未阻止新标签、用户已确认继续或目标页加载成功。SDK 和宿主绑定分别限制每秒一次；普通请求上限为 5 秒，超时或恢复后不会自动重放，避免重复开页。

| 错误                                    | 处理                                           |
| --------------------------------------- | ---------------------------------------------- |
| `INVALID_ARGUMENT`／`PAYLOAD_TOO_LARGE` | 修正 URL、长度或额外参数后再提交               |
| `CAPABILITY_UNAVAILABLE`                | 当前宿主不支持，隐藏或禁用按钮                 |
| `NOT_FOREGROUND`                        | 回到游戏前台后由用户重试                       |
| `RATE_LIMITED`                          | 至少间隔一秒，避免连续提交                     |
| `REQUEST_TIMEOUT`／连接错误             | 结果可能未知，先查看是否已打开，再决定是否重试 |

## ui.requestFullscreen() {#ui-request-fullscreen}

SDK 1.3.0 新增，无参数，返回 `Promise<void>`。要求 ready、前台状态和 `ui.requestFullscreen` capability，无需 OAuth；直接在用户点击处理函数中调用，请求前不要先等待网络、定时器或其他异步工作。

```ts
const fullscreenButton = document.querySelector<HTMLButtonElement>('#fullscreen')
fullscreenButton?.addEventListener('click', async () => {
  if (!client.hasCapability('ui.requestFullscreen')) return
  try {
    await client.ui.requestFullscreen()
  } catch (error) {
    console.error('请求全屏失败', error)
  }
})
```

整个当前游戏承载区进入全屏，与宿主全屏按钮共用状态和布局处理。内嵌／小窗保留游戏页面，独立窗口仅全屏自身承载，不全屏源页面占位，也不重开游戏。成功应答在浏览器全屏完成并同步宿主状态后返回；失败不提前标记全屏。

并发请求合并，当前承载已全屏时重复请求幂等，不解释为取消。取消仍使用 Esc 或宿主“取消全屏”，按宿主原有布局和路由规则恢复。接口不接收 DOM、选择器、窗口或 options 参数，也不提供游戏侧取消全屏方法。

普通请求上限为 5 秒，恢复后不自动重放。超时或会话切换后的迟到结果不能改写新游戏状态；需要再次操作时由用户重新点击。

| 错误                     | 处理                                       |
| ------------------------ | ------------------------------------------ |
| `CAPABILITY_UNAVAILABLE` | 旧宿主或当前承载不支持，隐藏或禁用按钮     |
| `USER_GESTURE_REQUIRED`  | 直接从用户点击发起，移除调用前的异步等待   |
| `NOT_FOREGROUND`         | 回到当前游戏前台再点击                     |
| `MODAL_BUSY`             | 等待授权、邀请等宿主弹框结束               |
| `PERMISSION_DENIED`      | 浏览器拒绝；保留宿主全屏按钮或允许用户重试 |
| `STATE_CONFLICT`         | 其他内容正在全屏，先退出该全屏             |
| `INVALID_ARGUMENT`       | 不传任何参数                               |

## 事件

### instance.onParticipantsChanged(listener)

回调收到 `{ revision: number }`，需要基础授权。事件提示名单应刷新，不携带完整名单。取得新快照后再更新游戏界面。

### lifecycle.onStateChanged(listener)

回调收到 `LifecycleSnapshot`，包含 `revision`、`visibility`、`presentation` 和 `status`。`status: 'closed'` 时额外含 `reason`：

`user_exit / taken_over / permission_revoked / context_unavailable / host_closed`。

业务事件都返回 `Promise<KookSubscription>`；注册完成需要订阅确认和首次有效快照。调用 `await handle.unsubscribe()` 结束监听，重复取消安全。游戏回调抛错不会影响其他回调，但游戏应自行处理回调中的异步错误。

## lifecycle.reportLoadResult(input)

无用户授权前置。输入只允许下列之一，返回 `Promise<void>`：

```ts
type LoadResultInput =
  | { status: 'loaded' }
  | {
      status: 'failed'
      reasonCode: 'game_login_failed' | 'game_resource_failed' | 'game_initialization_failed'
    }
```

真实可用后上报 `loaded`。同一绑定重复相同结果合并；冲突结果返回 `STATE_CONFLICT`。失败或断线后不会自动重放写操作。

## lifecycle.leave() {#lifecycle-leave}

SDK 1.2.0 新增，无参数，返回 `Promise<void>`。前置条件为 `ready()` 成功且 `hasCapability('lifecycle.leave')` 为 true，无需 OAuth。

```ts
if (client.hasCapability('lifecycle.leave')) {
  await client.lifecycle.leave()
}
```

请求只作用于当前 KOOK 游戏，不接收实例、房间、窗口或用户参数。游戏应先完成自己的退房、存档和会话清理；KOOK 确认平台退出后关闭当前承载，并以 `closed/user_exit` 结束生命周期。页面可能卸载，不要依赖调用之后继续执行游戏业务。

同一次退出的并发调用合并，失败后允许用户重试。等待上限为 10 秒；超时或连接中断可能使结果未知，SDK 不会在恢复后自动重放。缺少能力返回 `CAPABILITY_UNAVAILABLE`，尚未 ready 返回 `NOT_READY`；平台临时失败和连接错误按[错误说明](./errors.md)处理。

`client.destroy()` 只清理本地连接与资源，不会主动退出 KOOK 游戏，不能作为离开成功的凭据。
