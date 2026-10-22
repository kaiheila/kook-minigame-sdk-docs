# 邀请与参与者

游戏房间和 KOOK 实例是不同标识。`instanceId` 由平台分配和维护；`roomId` 是游戏自己理解的房间参数，用于把邀请落到正确玩法入口。

## 打开邀请弹窗

```ts
if (client.hasCapability('ui.openInviteModal')) {
  const result = await client.ui.openInviteModal({ roomId: 'room_42' })
  if (result.status === 'submitted') {
    console.log(result.sentCount, result.failedCount)
  }
}
```

从用户明确点击邀请按钮的交互中调用。`roomId` 可省略，若传入仅支持字母、数字、下划线和连字符，长度不超过 128。SDK 不接受任意跳转 URL、路由或其他用户的实例 ID。

`cancelled` 表示用户取消；`submitted` 只表示邀请提交结果，不保证对方已经加入游戏。授权弹窗、邀请弹窗和官方服务器弹窗互斥；原生业务弹窗共用 10 秒本地节流，宿主还可能有自己的限流。

## 分页读取候选人与参与者

```ts
const firstPage = await client.instance.getParticipants({ limit: 50 })
if (firstPage.nextCursor !== null) {
  const nextPage = await client.instance.getParticipants({
    cursor: firstPage.nextCursor,
    limit: 50,
  })
}
```

默认每页 50，范围 1–100。cursor 是不透明值，不要拆解或复用于其他实例、查询和授权状态。快照过期时丢弃旧分页，从第一页开始读取；不要把不同 revision 的页面拼成同一份名单。

候选人 `identity` 是联合类型：已关联应用用户使用 `userOpenCode`；未关联用户使用仅供当前能力处理的 `temporaryId`。临时标识不是账号 ID，不能用它建立游戏账号或推导 KOOK 内部 ID。

参与者额外包含 `joinedAt`（Unix 毫秒）和 `joinOrder`。参与者列表不是游戏内实时房间成员的替代品，游戏自己的进房和退房由游戏服务端维护。

## 监听名单变化

```ts
const handle = await client.instance.onParticipantsChanged(({ revision }) => {
  // 将 revision 标记为待刷新，由游戏的数据层合并频繁刷新。
})
await handle.unsubscribe()
```

事件只发 revision，不携带完整名单。首次订阅会收到快照；SDK 忽略旧版本通知。当读取结果落后于已观察事件时，读取返回 `SNAPSHOT_EXPIRED`，应重新拉取。

## 官方服务器

`officialServer.getStatus()` 读取配置及当前用户加入状态，需要基础授权。`ui.openOfficialServerModal()` 打开 KOOK 原生界面，由宿主处理加入操作。不要自行拼接 KOOK 跳转协议或假定用户点击后已经加入。
