# 邀请与参与者

平台 `instanceId` 与游戏 `roomId` 不同，一个平台实例可以承载多个游戏房间。游戏自己负责房间容量、成员、准备和对局；平台邀请用于把用户带到正确的入口。

## 邀请目标与结果

从用户点击邀请按钮的交互调用。参数 `roomId` 可省略；传入时只允许字母、数字、下划线和连字符，长度 1–128。游戏不能传接收人、频道 ID、正文、邀请类型或任意 URL。

| 打开上下文           | 调用                             | 目标                                                                                 |
| -------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| 文字／语音频道       | `ui.openInviteModal()`           | 已支持分流的宿主打开原生频道游戏邀请，与承载区左下角一致；接收者进入目标频道打开游戏 |
| 任意支持邀请的上下文 | `ui.openInviteModal({ roomId })` | 当前实例的固定邀请，携带游戏房间目标，游戏后端校验准入                               |
| 普通／游戏应用私信   | `ui.openInviteModal()`           | 当前实例的固定邀请，不指定游戏房间，由游戏安排首页／大厅                             |

由游戏按玩法选择是否传 `roomId`。频道缺少邀请权限时明确拒绝，不静默回退私信。频道链接的时长／次数由原生弹框管理，固定实例邀请期限由平台管理。旧宿主可能尚未实现不带 roomId 的频道分流；相同 capability 不能保证该行为，接入目标环境时需核对部署版本。

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

函数使用已完成 ready 的客户端。`cancelled` 时两项计数均为 0；成功复制链接也返回 `submitted`，不增加人数，因此 `submitted` 且两项人数为 0 可以表示复制成功。仅生成链接不算提交，`submitted` 也不代表对方已接受或入房。

用户关闭弹框后返回聚合结果。部分失败展示真实计数；全部失败时可能返回失败计数或 reject，不能提示成功。超时、绑定失效和退出也可能 reject，不一律解释为取消。SDK 不返回邀请链接、邀请码或收件人明细；处理接收端目标见[上下文与入房](./context.md#邀请目标与房间准入)。

授权、邀请和官方服务器弹框互斥，原生业务弹框共用 10 秒本地节流，取消也计入。不要自动重弹或重发超时的邀请。

## 分页读取候选人与参与者

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

`instance.onParticipantsChanged()` 返回异步订阅句柄，首个快照建立后再读取分页。事件只携带 revision，不携带完整名单；SDK 会拒绝落后于已观察通知的分页结果，以 `SNAPSHOT_EXPIRED` 提醒重新读取。

业务结束时调用 `await handle.unsubscribe()`。合并频繁刷新，处理每个异步读取的拒绝，避免旧绑定的迟到响应写回新页面。

## 官方服务器

`officialServer.getStatus()` 读取配置及用户加入状态，需要基础授权和 capability。`ui.openOfficialServerModal()` 打开原生界面，不以 OAuth 为前置，由宿主校验并处理加入操作。按返回的 `opened/joined/pending/cancelled` 判断结果，不把弹框打开当成已加入，不自行拼接平台路由。
