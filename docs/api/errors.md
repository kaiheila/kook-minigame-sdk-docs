# 错误处理

SDK 拒绝的 Promise 返回带固定 `code` 的 `KookClientError`。`message` 与 `code` 相同，不透传宿主的自由文本、凭据或内部错误。授权和弹窗取消通过正常结果返回。

```ts
// SDK_MODULE 为导入路径占位符，实际导入方式以发布说明为准。
import type { KookClientError } from 'SDK_MODULE'

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

| code                    | 含义与处理                                            |
| ----------------------- | ----------------------------------------------------- |
| `NOT_AUTHORIZED`        | 当前没有有效 SDK 授权；等待用户请求授权               |
| `SCOPE_MISSING`         | 请求或操作所需 scope 不可用；检查可申请集合和当前授权 |
| `PERMISSION_DENIED`     | 宿主拒绝操作；不要循环重试                            |
| `AUTH_REVOKED`          | 授权撤销，当前绑定终止；从 KOOK 重新打开              |
| `STALE_SESSION`         | 启动绑定失效或被接管；从 KOOK 重新打开                |
| `CONTEXT_NOT_SUPPORTED` | 当前入口不支持操作，例如私聊中查询频道成员            |
| `INSTANCE_UNAVAILABLE`  | 当前实例或其上下文不可用                              |

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

| code                                                            | 含义与处理                               |
| --------------------------------------------------------------- | ---------------------------------------- |
| `HANDSHAKE_TIMEOUT`、`CONNECTION_FAILED`                        | 连接未建立；核对启动绑定和环境           |
| `INVALID_SOURCE`                                                | 消息来源不匹配；不放宽 origin 校验       |
| `UNSUPPORTED_PROTOCOL`、`METHOD_NOT_ALLOWED`                    | 宿主通信协议或方法不匹配                 |
| `REQUEST_TIMEOUT`                                               | 请求超时；写操作结果可能未知，不自动重放 |
| `ABORTED`                                                       | 请求因状态变化被取消；按当前状态重新决策 |
| `CHANNEL_CLOSED`                                                | 通道中断；观察恢复状态                   |
| `DESTROYED`                                                     | 客户端已销毁；不能复用                   |
| `HANDLER_ERROR`、`INVALID_MESSAGE`                              | 宿主处理或消息格式异常                   |
| `RECOVERY_UNSUPPORTED`、`RECOVERY_REJECTED`、`RECOVERY_TIMEOUT` | 当前绑定恢复失败；引导重新打开           |
| `SERVER_UNREACHABLE`                                            | KOOK 服务链路不可达；观察状态并提示重试  |

## 超时与重试规则

普通业务请求最长等待 5 秒；授权和原生弹窗最长 120 秒；订阅确认与首次快照共享 5 秒预算。本地最多 16 个待处理业务请求。

只读查询可在确认仍就绪、授权有效后有限重试。授权、邀请、加载上报和后端换码不自动重放；先确认业务结果或让用户明确发起新操作。错误对象不会公开宿主返回的 `retryAfterMs` 或内部追踪信息。
