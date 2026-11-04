# 生命周期、离开与恢复

游戏资源加载、KOOK 连接和用户授权分别变化。使用对应事件更新界面，不要用心跳推断用户是否授权或游戏服务器是否健康。

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

按实际可用结果选择一个分支，每次加载尝试只提交一种确定结果；重复相同结果合并，相反结果返回 `STATE_CONFLICT`。失败原因限于 `game_login_failed`、`game_resource_failed`、`game_initialization_failed`。欢迎页或游客玩法已可用时可以先上报成功，不必等待所有可选授权；正常取消授权不属于资源加载失败。

`ready()` 只确认 SDK 就绪。当前 KOOK 宿主默认在 ready 后等待 60 秒加载报告；缺少报告会转为加载失败，停止连接并退出平台参与。应及时报告实际结果，不要把日志输出或拿到实例 ID 当作加载已上报。

## 主动离开游戏

SDK 1.2.0 提供 `client.lifecycle.leave()`，在 ready 后调用，无需 OAuth。退出按钮先完成游戏自己的退房、存档或会话清理，再请求 KOOK 离开当前游戏：

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

上例从按钮回调调用，将返回消息用于页面仍存在时的提示。KOOK 确认退出后关闭当前游戏承载，独立窗口也会关闭，因此不能依赖 await 之后执行重要业务。

并发调用合并，失败可重试；超时或连接中断时结果可能未知，断线恢复不会自动重放离开请求。接口只针对当前游戏，不接收目标参数；旧客户端未声明能力时展示提示。方法签名和错误边界见[业务 API](../api/business.md#lifecycle-leave)。

`destroy()` 只清理 SDK 本地资源，不会主动退出平台参与，也不会关闭游戏。页面卸载时照常调用它，但不要用它代替离开接口或当作退出成功。

## 生命周期与异常处理

SDK 连接、平台授权、OAuth code／token 和游戏自己的登录态分别维护。授权事件只有 `unauthorized/authorized/revoked`，没有 `expired`；code 到期不使 SDK 授权自动失效。平台结束绑定时，游戏自己的会话、WebSocket 和房间恢复逻辑仍需独立清理。

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

`onConnectionChanged()` 立即提供一次当前快照，返回同步取消监听函数。业务事件订阅则返回 Promise 和 `unsubscribe()` 句柄，两者不要混用。

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

恢复不会自动重放授权弹窗、邀请、加载上报、离开请求或游戏后端登录。旧 code 不自动复用。恢复后的实例绑定必须仍属于同一 `gameCode` 和 `instanceId`；发生变化会返回 `STALE_SESSION`。

宿主不支持可选心跳或恢复机制时，不妨碍最初建立连接，但游戏不能因此假定具备自动恢复能力。`connection.server` 观察的是 KOOK 服务链路，不是游戏自己的服务端。

## 清理

注销不再使用的事件监听，页面或组件卸载时调用 `destroy()`。它会取消启动等待及待处理请求、清理订阅和定时器，且可以重复调用。该实例随后不能复用；新启动创建新客户端。

登录或上下文请求在途中结束时还要作废游戏自己的事务，丢弃迟到响应。后端已经创建的会话不能只靠前端抛错清理，见[游戏登录事务](./server-login.md#游戏登录事务与浏览器会话)。
