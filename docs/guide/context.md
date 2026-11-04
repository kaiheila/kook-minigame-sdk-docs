# 按需查询上下文

基础启动和身份登录不要求查询上下文。需要按频道组织大厅、关联实例或核验邀请目标时，游戏方可以申请 `mini_game.context`，由游戏后端使用 OAuth token 查询。

## 启动环境与可信上下文

| 信息                                        | 用途                                                                |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `ready().context.contextType`               | 游戏当前打开位置的环境展示，文字、语音、普通私信或游戏应用私信      |
| `ready().instanceId`／可选 `context.roomId` | 前端展示、查询选择器或邀请目标提示，不能单独作为后端准入凭证        |
| HTTP 上下文结果                             | 平台按同一 OAuth 用户身份核验应用、实例和邀请，供游戏后端作业务判断 |
| 游戏房间状态                                | 游戏后端维护的容量、成员和规则，平台上下文不代替游戏自己的房间引擎  |

平台实例、实例创建／归属空间、用户当前打开空间和消息投递位置可能不同。例如从游戏应用私信接受频道来源的定向邀请，不能据实例归属推断当前用户打开位置。玩法需要哪种空间，就读取接口明确提供的对应字段。

## 请求与权限

先按[授权流程](./server-login.md)取得包含 `mini_game.context` 的 OAuth 授权。当前接口由游戏后端请求：

```http
GET /api/v3/mini-game/context?game_code=游戏编号&instance_id=实例选择参数
Authorization: Bearer 后端持有的OAuthToken
```

`instance_id` 可以取前端提供的 `ready().instanceId` 作为选择器；平台仍按同一 token 核验用户、游戏及资格。不要因为参数来自 SDK 就直接信任它，也不要把 OAuth token 交给游戏前端或 SDK。

上下文查询不改变 SDK 的自动启动流程，也不新增浏览器 `context.get()` 或通用请求 API。平台内部的实名、成年及实例维护由 KOOK 管理。游戏需要主动退出时调用 SDK 的 `lifecycle.leave()`，无需直接对接平台生命周期 HTTP 接口。

## 返回字段与校验

以下是当前对接的嵌套结构示例，用于说明关系；完整字段和错误码以目标环境接口定义为准：

```json
{
  "code": 0,
  "data": {
    "game_code": "game-code",
    "instance": {
      "instance_id": "instance-code",
      "state": "active",
      "context_type": 1,
      "context_id": "channel-code"
    },
    "invite": { "status": "joined_by_invite" },
    "room": { "room_source": "invite", "room_id": "room_42" }
  }
}
```

| 字段                                    | 后端如何使用                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `data.game_code`                        | 核对本游戏，不仅检查 HTTP 成功                                                 |
| `data.instance.instance_id/state`       | 核对所查实例及有效状态                                                         |
| `data.instance.context_type/context_id` | 实例创建／归属空间；`1` 文字频道、`2` 语音频道、`3` 普通私信、`4` 游戏应用私信 |
| `data.invite.status`                    | 判断平台是否确认用户经定向邀请加入                                             |
| `data.room.room_source/room_id`         | 区分游戏房间目标与平台实例回退值                                               |

## 邀请目标与房间准入

- `invite.status=joined_by_invite` 且 `room.room_source=invite`：`room.room_id` 是发送时游戏指定的目标，检查房间存在、容量及资格后加入。
- `room.room_source=instance`：`room.room_id` 是平台实例回退值，不能当成游戏房间号；显示游戏首页、大厅或执行匹配流程。
- 目标不存在、满员、已结束或无权：展示具体原因及游戏定义的返回入口，不使用失效邀请悄悄创建替代实例。

原生频道游戏邀请打开目标频道的游戏，不固定具体游戏房间；游戏可按可信上下文实现大厅或匹配。点灯的“同上下文优先填满、其他上下文只读”属于游戏规则，不是其他游戏必须采用的 SDK 限制。发送方式见[邀请目标与结果](./social.md#邀请目标与结果)。

## 错误与重试

缺少 `mini_game.context` 或查询失败时，只阻止依赖该结果的功能，保留已完成的基本身份登录并提供重试入口。不要用浏览器自报的频道号、房间号或旧平铺字段补齐可信响应。

退出、切号或切换启动绑定期间的迟到响应不能恢复旧目标。日志记录查询阶段和非敏感错误，不打印 OAuth 凭据。发布前分别验证普通打开、频道游戏邀请、指定房间邀请及房满／失效场景。
