# 生命周期、离开与恢复

游戏内容可用时上报加载结果；页面状态和连接变化通过事件更新，卸载时清理 SDK。

## 上报加载结果

```ts
import type { KookClient } from '@kookapp/kook-minigame-sdk'

export async function reportGameLoad(client: KookClient, usable: boolean) {
  if (!client.hasCapability('lifecycle.reportLoadResult')) return
  if (usable) {
    await client.lifecycle.reportLoadResult({ status: 'loaded' })
  } else {
    await client.lifecycle.reportLoadResult({ status: 'failed', reasonCode: 'game_resource_failed' })
  }
}
```

内容可用时上报 `loaded`，失败时选择 `game_login_failed / game_resource_failed / game_initialization_failed`。同一加载尝试只提交一种结果，相反结果返回 `STATE_CONFLICT`。当前 KOOK 宿主默认在 ready 后等待 60 秒，超时未报告会结束本次连接。

## 主动离开游戏

退出按钮先完成游戏自己的退房、存档或会话清理，再调用 `client.lifecycle.leave()`：

```ts
import type { KookClient } from '@kookapp/kook-minigame-sdk'

export async function leaveFromGame(client: KookClient, cleanupGame: () => Promise<void>): Promise<string> {
  if (!client.hasCapability('lifecycle.leave')) return '当前 KOOK 版本暂不支持从游戏内退出'
  try {
    await cleanupGame()
    await client.lifecycle.leave()
    return '离开请求已确认'
  } catch {
    return '离开未完成，请重试；连接已结束时请从 KOOK 重新打开'
  }
}
```

KOOK 确认退出后会关闭当前游戏页面，因此将重要业务放在调用之前。失败可由用户重试；10 秒超时，恢复后不自动重放，见[业务 API](../api/business.md#lifecycle-leave)。

页面卸载时调用 `destroy()` 清理本地资源，主动退出使用 `leave()`。

## 生命周期与异常处理

授权变化通过 `auth.onStateChanged()` 处理。平台绑定结束时，清理游戏自己的会话、WebSocket 和房间状态。

## 监听生命周期

```ts
const subscription = await client.lifecycle.onStateChanged((snapshot) => {
  if (snapshot.status === 'closed') {
    // 停止当前实例的游戏交互。
    return
  }
  // 按 snapshot.visibility 暂停或恢复非必要渲染。
})
// 页面业务结束时：
await subscription.unsubscribe()
```

状态包含可见性 `visible / hidden` 和展示形态 `embedded / floating / standalone`。关闭原因包括用户退出、被接管、权限撤销、上下文失效和宿主关闭。

## 观察连接

`onConnectionChanged()` 立即提供当前快照，返回同步取消监听函数：

```ts
const stop = client.onConnectionChanged((connection) => {
  console.log(connection.state, connection.epoch)
})
stop()
```

| state                | 游戏处理                                 |
| -------------------- | ---------------------------------------- |
| `idle`、`connecting` | 等待就绪，不发业务请求                   |
| `connected`          | 完成 `ready()` 后按能力调用              |
| `recovering`         | 暂停依赖 KOOK 的交互，旧请求已结束       |
| `disconnected`       | 当前绑定不可继续，按错误原因提示重新打开 |
| `destroyed`          | 客户端已销毁，不能复用                   |

## 恢复后重新读取

连接恢复成功时 `epoch` 递增。由游戏的恢复逻辑调用一次 `ready()`，重新读取能力和新授权快照。若宿主确认授权仍有效，已保留的参与者监听会恢复；否则等待用户再次发起授权。

恢复后由用户重新发起邀请、授权或退出等操作，旧 code 不重复提交。`STALE_SESSION` 表示绑定已变化，引导重新打开游戏。

## 清理

注销不再使用的事件监听，页面或组件卸载时调用 `destroy()`。它会取消启动等待及待处理请求、清理订阅和定时器，且可以重复调用。该实例随后不能复用；新启动创建新客户端。

登录或上下文请求在途中结束时还要作废游戏自己的事务，丢弃迟到响应。后端已经创建的会话不能只靠前端抛错清理，见[游戏登录事务](./server-login.md#游戏登录事务与浏览器会话)。
