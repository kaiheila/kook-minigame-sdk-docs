# 邀请与参与者

平台 `instanceId` 与游戏 `roomId` 不同，一个平台实例可以承载多个游戏房间。游戏自己负责房间容量、成员、准备和对局；平台邀请用于把用户带到正确的入口。

## 邀请目标与结果

在 ready 后从邀请按钮点击调用。可选参数 `roomId` 只允许字母、数字、下划线和连字符，长度 1–128。

| 打开上下文           | 调用                             | 目标                                                                                 |
| -------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| 文字／语音频道       | `ui.openInviteModal()`           | 已支持分流的宿主打开原生频道游戏邀请，与承载区左下角一致；接收者进入目标频道打开游戏 |
| 任意支持邀请的上下文 | `ui.openInviteModal({ roomId })` | 当前实例的固定邀请，携带游戏房间目标，游戏后端校验准入                               |
| 普通／游戏应用私信   | `ui.openInviteModal()`           | 当前实例的固定邀请，不指定游戏房间，由游戏安排首页／大厅                             |

需要受邀玩家直接加入游戏房间时传 `roomId`。旧宿主的频道分流行为需在目标环境验证。

```ts
import type { KookClient } from '@kookapp/kook-minigame-sdk'

export async function inviteFriends(client: KookClient, roomId?: string): Promise<string> {
  if (!client.hasCapability('ui.openInviteModal')) return '当前环境不支持邀请'
  try {
    const result = await client.ui.openInviteModal(roomId === undefined ? undefined : { roomId })
    if (result.status === 'cancelled') return '已取消邀请'
    if (result.failedCount) return `已发送 ${result.sentCount} 人，失败 ${result.failedCount} 人`
    return result.sentCount ? `已发送 ${result.sentCount} 人` : '邀请链接已复制'
  } catch (error) {
    const code = (error as { code?: string }).code
    return code === 'PERMISSION_DENIED' ? '没有邀请权限' : `邀请未完成：${code ?? 'UNKNOWN'}`
  }
}
```

`cancelled` 表示用户取消；`submitted` 且两项计数均为 0 可表示链接复制成功。部分失败显示真实计数；请求失败进入 catch。接收端处理见[上下文与入房](./context.md#邀请目标与房间准入)。

弹窗共用 10 秒调用间隔，取消也计入；超时后由用户决定是否重试。

## 分页读取候选人与参与者

需先取得 `get_user_info` OAuth 授权：

```ts
import type { KookClient } from '@kookapp/kook-minigame-sdk'

export async function readFirstParticipants(client: KookClient) {
  if (!client.hasCapability('instance.getParticipants') || !client.hasScope('get_user_info')) return null
  const firstPage = await client.instance.getParticipants({ limit: 50 })
  return firstPage
}
```

默认每页 50，范围 1–100。继续读取返回的 `nextCursor`，直到为 null。cursor 不透明，不拆解或复用于其他查询和授权状态；revision 变化时丢弃旧汇总，从第一页重新读取，不能把不同快照拼成名单。

候选人身份是联合类型：已关联应用用户使用 `userOpenCode`，未关联用户使用当前会话的 `temporaryId`。临时 ID 不能用作游戏账号、联系方式或 KOOK 内部用户编号。参与者额外包含 `joinedAt`（Unix 毫秒）和 `joinOrder`，平台参与者不等于游戏自己的房间成员。

## 监听名单变化

先取得 `get_user_info` OAuth 授权。`instance.onParticipantsChanged()` 返回异步订阅句柄，回调收到 revision 后重新读取名单；`SNAPSHOT_EXPIRED` 时从第一页重取。

业务结束时调用 `await handle.unsubscribe()`。合并频繁刷新，处理每个异步读取的拒绝，避免旧绑定的迟到响应写回新页面。

## 官方服务器

`officialServer.getStatus()` 读取配置和用户加入状态，需先取得 `get_user_info` OAuth 授权。`ui.openOfficialServerModal()` 打开原生界面，按返回的 `opened / joined / pending / cancelled` 更新状态。
