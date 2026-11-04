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
