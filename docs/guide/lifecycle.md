# 生命周期与恢复

游戏资源加载、KOOK 连接和用户授权分别变化。使用对应事件更新界面，不要用心跳推断用户是否授权或游戏服务器是否健康。

## 上报加载结果

```ts
await client.lifecycle.reportLoadResult({ status: 'loaded' })
// 或者在加载确定失败时：
await client.lifecycle.reportLoadResult({
  status: 'failed',
  reasonCode: 'game_resource_failed',
})
```

两个结果是互斥示例。每个启动绑定只提交一种确定结果；重复相同结果会合并，相反结果返回 `STATE_CONFLICT`。失败原因限于 `game_login_failed`、`game_resource_failed`、`game_initialization_failed`。不要把用户正常取消授权当作资源加载失败。

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

恢复不会自动重放授权弹窗、邀请、加载上报或游戏后端登录。旧 code 不自动复用。恢复后的实例绑定必须仍属于同一 `gameCode` 和 `instanceId`；发生变化会返回 `STALE_SESSION`。

宿主不支持可选心跳或恢复机制时，不妨碍最初建立连接，但游戏不能因此假定具备自动恢复能力。`connection.server` 观察的是 KOOK 服务链路，不是游戏自己的服务端。

## 清理

注销不再使用的事件监听，页面结束时调用 `destroy()`。它会取消待处理请求、清理订阅及定时器，且可以重复调用。
