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
