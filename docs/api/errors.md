# 错误处理

SDK 拒绝的 Promise 返回带固定 `code` 的 `KookClientError`。`message` 与 `code` 相同，不透传宿主的自由文本、凭据或内部错误。授权和弹窗取消通过正常结果返回。

```ts
import type { KookClientError } from '@kookapp/kook-minigame-sdk'

try {
  const page = await client.instance.getParticipants()
} catch (error: unknown) {
  const { code } = error as KookClientError
  if (code === 'NOT_AUTHORIZED') {
    // 显示登录入口，等待用户主动操作。
  } else if (code === 'SNAPSHOT_EXPIRED') {
    // 丢弃旧 cursor，重新读取第一页。
  } else {
    // 记录固定错误码并提供可恢复的界面。
  }
}
```

## 输入、契约与能力

| code                      | 含义与处理                                       |
| ------------------------- | ------------------------------------------------ |
| `INVALID_ARGUMENT`        | 参数格式、字段、范围不合法；修正调用             |
| `PAYLOAD_TOO_LARGE`       | 请求数据过大；减小内容                           |
| `NOT_READY`               | 尚未完成就绪或需重新就绪；调用 `ready()`         |
| `UNSUPPORTED_ENVIRONMENT` | 当前运行环境不支持连接                           |
| `UNSUPPORTED_CONTRACT`    | 业务契约版本不匹配；对齐 SDK 和宿主              |
| `CAPABILITY_UNAVAILABLE`  | 宿主没有提供该能力；降级界面                     |
| `INVALID_RESPONSE`        | 响应结构或语义不可信；停止使用结果并反馈版本信息 |
| `RESOURCE_LIMIT`          | 并发请求或监听达到限制；合并和清理调用           |

## 授权与上下文

| code                    | 含义与处理                                                                      |
| ----------------------- | ------------------------------------------------------------------------------- |
| `NOT_AUTHORIZED`        | 当前没有有效 SDK 授权；等待用户请求授权                                         |
| `SCOPE_MISSING`         | 操作所需授权不可用；检查当前授权，按需申请，不把 availableScopes 当成硬性白名单 |
| `PERMISSION_DENIED`     | 宿主拒绝操作；不要循环重试                                                      |
| `AUTH_REVOKED`          | 授权撤销，当前绑定终止；从 KOOK 重新打开                                        |
| `STALE_SESSION`         | 启动绑定失效或被接管；从 KOOK 重新打开                                          |
| `CONTEXT_NOT_SUPPORTED` | 当前入口不支持操作，例如私聊中查询频道成员                                      |
| `INSTANCE_UNAVAILABLE`  | 当前实例或其上下文不可用                                                        |

## 业务状态

| code                                       | 含义与处理                             |
| ------------------------------------------ | -------------------------------------- |
| `INVALID_CURSOR`                           | cursor 不合法或不适用；重新读取第一页  |
| `SNAPSHOT_EXPIRED`                         | 数据版本已变化；丢弃旧分页后重取       |
| `USER_GESTURE_REQUIRED`                    | 需要用户明确操作触发                   |
| `MODAL_BUSY`                               | 已有弹窗处理中；等待其结束             |
| `NOT_FOREGROUND`                           | 游戏不在前台；等待恢复可见             |
| `OFFICIAL_SERVER_UNAVAILABLE`              | 官方服务器配置或操作不可用             |
| `RATE_LIMITED`                             | 调用过于频繁；退避并减少频次           |
| `STATE_CONFLICT`                           | 当前状态与提交冲突，如加载结果相反     |
| `SERVICE_UNAVAILABLE`、`INTERNAL_ERROR`    | 平台临时异常；保留界面并按业务提供重试 |
| `AD_PLACEMENT_INVALID`、`AD_SCENE_INVALID` | 保留业务错误码；当前版本没有广告 API   |

## 通信与恢复

| code                                                            | 含义与处理                                             |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| `HANDSHAKE_TIMEOUT`、`CONNECTION_FAILED`                        | 连接未建立；核对启动绑定和环境                         |
| `BOOTSTRAP_TIMEOUT`                                             | 未及时收到可信启动数据；确认从 KOOK 打开及测试来源配置 |
| `INVALID_SOURCE`                                                | 消息来源不匹配；不放宽 origin 校验                     |
| `UNSUPPORTED_PROTOCOL`、`METHOD_NOT_ALLOWED`                    | 宿主通信协议或方法不匹配                               |
| `REQUEST_TIMEOUT`                                               | 请求超时；写操作结果可能未知，不自动重放               |
| `ABORTED`                                                       | 请求因状态变化被取消；按当前状态重新决策               |
| `CHANNEL_CLOSED`                                                | 通道中断；观察恢复状态                                 |
| `DESTROYED`                                                     | 客户端已销毁；不能复用                                 |
| `HANDLER_ERROR`、`INVALID_MESSAGE`                              | 宿主处理或消息格式异常                                 |
| `RECOVERY_UNSUPPORTED`、`RECOVERY_REJECTED`、`RECOVERY_TIMEOUT` | 当前绑定恢复失败；引导重新打开                         |
| `SERVER_UNREACHABLE`                                            | KOOK 服务链路不可达；观察状态并提示重试                |

## 超时与重试规则

自动启动的数据等待与随后的握手分别默认 10 秒，可各自通过 `bootstrapTimeoutMs/connectionTimeoutMs` 配置为 100–30000 毫秒。可信来源发来错误启动数据时返回 `INVALID_RESPONSE`，需要重新打开游戏；不要放宽来源校验。

普通业务请求（包括打开外链和请求全屏）最长等待 5 秒；`lifecycle.leave()` 最长 10 秒；授权和原生弹窗最长 120 秒；订阅确认与首次快照共享 5 秒预算。本地最多 16 个待处理业务请求。

只读查询可在确认就绪且授权有效后有限重试。邀请、外链、全屏、加载上报、离开和换码等操作超时后先确认结果，再让用户决定是否重试。离开失败且连接仍有效时，保留客户端供用户重试。

`cancelled` 仅表示正常取消，不是所有错误的统称；邀请复制成功可以返回 `submitted` 且发送人数为零。上下文查询属于游戏后端 HTTP 调用，失败只阻止依赖它的功能，应保留已完成的基础登录，见[上下文错误处理](../guide/context.md#错误与重试)。
