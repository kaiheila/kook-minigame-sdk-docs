# 类型定义

以下为 SDK 预览目标版本 0.1.0-alpha.0 的公开类型快照（2026-10-22），该版本尚未发布。SDK 发布后将补充这些类型的实际导入方式，无需复制到项目中。

```ts
/** Route binding supplied by the trusted launcher; never an authorization credential. */
export interface KookClientOptions {
  readonly hostOrigin: string
  readonly sessionId: string
  readonly generation: number
  readonly connectionTimeoutMs?: number
}

export type KookClientState = 'idle' | 'connecting' | 'connected' | 'recovering' | 'disconnected' | 'destroyed'

export type KookConnectivity = 'unknown' | 'reachable' | 'unreachable'

/** Observed connectivity only. Never proof of authentication, membership, or game-server health. */
export interface KookConnectionStatus {
  readonly state: KookClientState
  /** Increments after initial connection or confirmed recovery; re-read business state after recovery. */
  readonly epoch: number
  readonly monitoring: 'unknown' | 'supported' | 'unsupported' | 'unavailable'
  readonly client: KookConnectivity
  readonly server: KookConnectivity
  readonly recovery: 'unavailable' | 'available' | 'recovering' | 'failed'
  readonly reason: KookClientErrorCode | null
}

export type KookBusinessErrorCode =
  | 'INVALID_ARGUMENT'
  | 'PAYLOAD_TOO_LARGE'
  | 'NOT_READY'
  | 'NOT_AUTHORIZED'
  | 'UNSUPPORTED_CONTRACT'
  | 'CAPABILITY_UNAVAILABLE'
  | 'AUTH_REVOKED'
  | 'STALE_SESSION'
  | 'SCOPE_MISSING'
  | 'PERMISSION_DENIED'
  | 'CONTEXT_NOT_SUPPORTED'
  | 'INSTANCE_UNAVAILABLE'
  | 'INVALID_CURSOR'
  | 'SNAPSHOT_EXPIRED'
  | 'USER_GESTURE_REQUIRED'
  | 'MODAL_BUSY'
  | 'NOT_FOREGROUND'
  | 'OFFICIAL_SERVER_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'STATE_CONFLICT'
  | 'AD_PLACEMENT_INVALID'
  | 'AD_SCENE_INVALID'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export type KookClientErrorCode =
  | KookBusinessErrorCode
  | 'INVALID_ARGUMENT'
  | 'UNSUPPORTED_ENVIRONMENT'
  | 'DESTROYED'
  | 'HANDSHAKE_TIMEOUT'
  | 'INVALID_SOURCE'
  | 'UNSUPPORTED_PROTOCOL'
  | 'ABORTED'
  | 'CHANNEL_CLOSED'
  | 'RESOURCE_LIMIT'
  | 'CONNECTION_FAILED'
  | 'INVALID_RESPONSE'
  | 'RECOVERY_UNSUPPORTED'
  | 'RECOVERY_REJECTED'
  | 'RECOVERY_TIMEOUT'
  | 'SERVER_UNREACHABLE'
  | 'METHOD_NOT_ALLOWED'
  | 'REQUEST_TIMEOUT'
  | 'HANDLER_ERROR'
  | 'INVALID_MESSAGE'

export interface KookClientError extends Error {
  readonly code: KookClientErrorCode
}

export type Scope = 'profile.basic' | 'friends.dms.read' | 'channel.members.read'

/** Implemented optional abilities. Availability still depends on the current host. */
export type KookCapability =
  | 'social.getFriendsAndDms'
  | 'channel.getMembers'
  | 'instance.getParticipants'
  | 'ui.openInviteModal'
  | 'officialServer.getStatus'
  | 'ui.openOfficialServerModal'
  | 'lifecycle.reportLoadResult'
  | 'auth.onStateChanged'
  | 'lifecycle.onStateChanged'
  | 'instance.onParticipantsChanged'

export interface LaunchContext {
  readonly contextType: 'text_channel' | 'voice_channel' | 'user_dm' | 'mini_game_dm'
  readonly launchSource: 'channel' | 'appLauncher' | 'invite'
  readonly roomId?: string
}

export interface ReadyResult {
  readonly contractVersion: 1
  readonly gameCode: string
  readonly instanceId: string
  readonly platform: 'pc' | 'web'
  readonly capabilities: readonly KookCapability[]
  readonly permissionVersion: string
  /** Approved scopes the game may request; this is not a user consent record. */
  readonly availableScopes: readonly Scope[]
  readonly context: LaunchContext
}

export interface SessionCodeInput {
  readonly state: string
  /** A subset of ready().availableScopes. Defaults to profile.basic. */
  readonly scopes?: readonly Scope[]
}

export type SessionCodeResult =
  | {
      readonly status: 'authorized'
      readonly code: string
      readonly state: string
      /** Authorization-code expiry, in Unix milliseconds. Not the SDK grant lifetime. */
      readonly expiresAt: number
      readonly scopes: readonly Scope[]
      /** Shares the revision sequence with auth.onStateChanged. */
      readonly revision: number
    }
  | { readonly status: 'cancelled'; readonly state: string }

export interface PageInput {
  readonly cursor?: string
  readonly limit?: number
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly revision: number
  readonly nextCursor: string | null
}

export type CandidateIdentity =
  | { readonly kind: 'app_user'; readonly userOpenCode: string }
  | { readonly kind: 'temporary'; readonly temporaryId: string }

export interface Candidate {
  readonly identity: CandidateIdentity
  readonly username: string
  readonly avatarUrl: string | null
}

export interface SocialCandidate extends Candidate {
  readonly sources: ReadonlyArray<'friend' | 'dm'>
}

export interface Participant extends Candidate {
  readonly joinedAt: number
  readonly joinOrder: number
}

export interface ParticipantsChanged {
  readonly revision: number
}

export interface InviteInput {
  readonly roomId?: string
}

export interface InviteResult {
  readonly status: 'submitted' | 'cancelled'
  readonly sentCount: number
  readonly failedCount: number
}

export type OfficialServerStatus =
  | { readonly configured: false }
  | {
      readonly configured: true
      readonly name: string
      readonly iconUrl: string | null
      readonly membership: 'joined' | 'not_joined' | 'pending'
    }

export interface OfficialServerResult {
  readonly status: 'opened' | 'joined' | 'pending' | 'cancelled'
}

export type LoadResultInput =
  | { readonly status: 'loaded' }
  | {
      readonly status: 'failed'
      readonly reasonCode: 'game_login_failed' | 'game_resource_failed' | 'game_initialization_failed'
    }

export type AuthSnapshot =
  | { readonly revision: number; readonly status: 'unauthorized' }
  | {
      readonly revision: number
      readonly status: 'authorized'
      readonly scopes: readonly Scope[]
    }
  | { readonly revision: number; readonly status: 'revoked' }

export type LifecycleSnapshot = {
  readonly revision: number
  readonly visibility: 'visible' | 'hidden'
  readonly presentation: 'embedded' | 'floating' | 'standalone'
} & (
  | { readonly status: 'active' }
  | {
      readonly status: 'closed'
      readonly reason: 'user_exit' | 'taken_over' | 'permission_revoked' | 'context_unavailable' | 'host_closed'
    }
)

export interface KookSubscription {
  /** Idempotent local removal and best-effort transport cleanup. */
  readonly unsubscribe: () => Promise<void>
}

export interface KookClient {
  readonly state: KookClientState
  readonly connection: KookConnectionStatus
  /** Local observation only, immediately called with the current frozen snapshot. Limit: 32 listeners. */
  readonly onConnectionChanged: (listener: (status: KookConnectionStatus) => void) => () => void
  /** Connect only to the embedding parent. Success is not OAuth or instance registration. */
  readonly connect: () => Promise<void>
  /** Connects if necessary. Does not open the OAuth consent modal or report game loading success. */
  readonly ready: () => Promise<ReadyResult>
  readonly hasCapability: (name: KookCapability) => boolean
  /** Checks the current client-confirmed SDK grant. The host independently enforces every request. */
  readonly hasScope: (scope: Scope) => boolean
  readonly session: {
    readonly get: (input: SessionCodeInput) => Promise<SessionCodeResult>
  }
  readonly social: {
    readonly getFriendsAndDms: (input?: PageInput) => Promise<Page<SocialCandidate>>
  }
  readonly channel: {
    readonly getMembers: (input?: PageInput) => Promise<Page<Candidate>>
  }
  readonly instance: {
    readonly getParticipants: (input?: PageInput) => Promise<Page<Participant>>
    readonly onParticipantsChanged: (listener: (value: ParticipantsChanged) => void) => Promise<KookSubscription>
  }
  readonly ui: {
    readonly openInviteModal: (input?: InviteInput) => Promise<InviteResult>
    readonly openOfficialServerModal: () => Promise<OfficialServerResult>
  }
  readonly officialServer: {
    readonly getStatus: () => Promise<OfficialServerStatus>
  }
  readonly lifecycle: {
    readonly reportLoadResult: (input: LoadResultInput) => Promise<void>
    readonly onStateChanged: (listener: (value: LifecycleSnapshot) => void) => Promise<KookSubscription>
  }
  readonly auth: {
    readonly onStateChanged: (listener: (value: AuthSnapshot) => void) => Promise<KookSubscription>
  }
  /** Terminal and idempotent; a new launch binding requires a new client instance. */
  readonly destroy: () => void
}
```
