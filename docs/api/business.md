# 业务 API

先完成 `await client.ready()`，调用前用 `client.hasCapability('方法名')` 检查支持情况。完整返回类型见[类型参考](./types.md)。

## 数据查询

| 方法                               | 返回类型                         | OAuth 授权 / 场景                 |
| ---------------------------------- | -------------------------------- | --------------------------------- |
| `social.getFriendsAndDms(input?)`  | `Promise<Page<SocialCandidate>>` | `get_user_info`                   |
| `channel.getMembers(input?)`       | `Promise<Page<Candidate>>`       | `get_user_info`；仅文字或语音频道 |
| `instance.getParticipants(input?)` | `Promise<Page<Participant>>`     | `get_user_info`                   |
| `officialServer.getStatus()`       | `Promise<OfficialServerStatus>`  | `get_user_info`                   |

以上查询需先取得 `get_user_info` 授权。前三个方法的 `input` 为 `{ cursor?: string, limit?: number }`，limit 默认 50、范围 1–100；返回 `{ items, revision, nextCursor }`，`nextCursor: null` 表示结束。查询使用当前启动上下文。

```ts
if (client.hasCapability('instance.getParticipants') && client.hasScope('get_user_info')) {
  const page = await client.instance.getParticipants({ limit: 50 })
  console.log(page.items, page.nextCursor)
}
```

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

`submitted` 表示已提交；人数均为 0 时可表示链接已复制。部分失败显示 `failedCount`，`cancelled` 表示用户取消；请求失败或超时进入 catch。完整示例和接收端处理见[邀请目标与结果](../guide/social.md#邀请目标与结果)。

### ui.openOfficialServerModal()

无参数，返回 `Promise<{ status: 'opened' | 'joined' | 'pending' | 'cancelled' }>`。以返回状态为准，不把弹窗打开当成已加入。

```ts
const result = await client.ui.openOfficialServerModal()
console.log(result.status)
```

两个原生弹窗从按钮点击触发，与授权弹窗互斥，共用 10 秒调用间隔，取消也计入。

## ui.openExternalLink(input) {#ui-open-external-link}

传入 `{ url: string }`，返回 `Promise<void>`。从游戏前台的按钮点击调用：

```ts
if (client.hasCapability('ui.openExternalLink')) {
  await client.ui.openExternalLink({ url: 'https://game.example/help?source=kook#faq' })
}
```

URL 必须为完整 HTTP/HTTPS 地址，长度不超过 2048 字符，不含凭据、空白或反斜杠；仅传 `url` 字段。Web 打开新标签页，PC 使用系统浏览器，保留 KOOK 的外链提示和风险检查。

最多每秒一次，5 秒超时。成功表示已发起打开；超时后先确认是否已经打开，再决定重试。

## ui.requestFullscreen() {#ui-request-fullscreen}

无参数，返回 `Promise<void>`。直接在游戏前台的点击处理函数中调用；调用前不要等待网络或定时器：

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

当前游戏承载区进入全屏，游戏页面保持原状态；重复调用保持全屏，使用 Esc 或宿主按钮取消。并发调用合并，5 秒超时。

出现 `USER_GESTURE_REQUIRED` 时移除调用前的异步等待；`MODAL_BUSY` 时等待弹框关闭；`PERMISSION_DENIED` 时提示用户重试。其他错误见[错误处理](./errors.md)。

## 事件

### instance.onParticipantsChanged(listener)

需先取得 `get_user_info` OAuth 授权。回调收到 `{ revision: number }` 后，重新调用 `instance.getParticipants()` 更新名单。

### lifecycle.onStateChanged(listener)

回调收到 `LifecycleSnapshot`，包含 `revision`、`visibility`、`presentation` 和 `status`。`status: 'closed'` 时额外含 `reason`：

`user_exit / taken_over / permission_revoked / context_unavailable / host_closed`。

事件返回 `Promise<KookSubscription>`，业务结束时调用 `await handle.unsubscribe()`。回调内的异步请求自行捕获错误。

```ts
const handle = await client.lifecycle.onStateChanged((snapshot) => {
  console.log(snapshot.status, snapshot.visibility)
})
await handle.unsubscribe()
```

## lifecycle.reportLoadResult(input)

输入为以下结果之一，返回 `Promise<void>`：

```ts
type LoadResultInput =
  | { status: 'loaded' }
  | {
      status: 'failed'
      reasonCode: 'game_login_failed' | 'game_resource_failed' | 'game_initialization_failed'
    }
```

真实可用后上报 `loaded`。同一绑定重复相同结果合并；冲突结果返回 `STATE_CONFLICT`。失败或断线后不会自动重放写操作。

```ts
await client.lifecycle.reportLoadResult({ status: 'loaded' })
```

## lifecycle.leave() {#lifecycle-leave}

无参数，返回 `Promise<void>`。先完成游戏自己的退房、存档和会话清理，再调用：

```ts
if (client.hasCapability('lifecycle.leave')) {
  await client.lifecycle.leave()
}
```

KOOK 确认退出后关闭当前游戏页面，不要把存档等重要操作放在调用之后。并发调用合并，最长等待 10 秒；失败可由用户重试，恢复后不自动重放。页面卸载时仍调用 `client.destroy()` 清理本地资源。
