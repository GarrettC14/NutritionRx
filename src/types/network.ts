/**
 * Network connectivity types for offline UX
 */

/** Three-state connectivity model */
export type ConnectivityState = 'online' | 'offline' | 'unknown';

/** Service identifiers for scoped health tracking */
export type ServiceId = 'ai' | 'food-data' | 'sync' | 'premium';

/** Service health states (state machine: healthy → degraded → down) */
export type ServiceHealth = 'healthy' | 'degraded' | 'down';

/** Tracked health info per service */
export interface ServiceHealthInfo {
  service: ServiceId;
  health: ServiceHealth;
  lastChecked: number; // timestamp
  consecutiveFailures: number;
}

/** Network store state */
export interface NetworkState {
  /** Current device connectivity */
  connectivity: ConnectivityState;

  /** Whether the device was previously offline and just reconnected */
  justReconnected: boolean;

  /** Per-service health status */
  serviceHealth: Record<ServiceId, ServiceHealthInfo>;
}

/** Thresholds for service health transitions */
export const SERVICE_HEALTH_THRESHOLDS = {
  /** Failures before marking as degraded */
  DEGRADED_AFTER: 2,
  /** Failures before marking as down */
  DOWN_AFTER: 5,
  /** Seconds of success before marking healthy again */
  RECOVERY_WINDOW_MS: 30_000,
} as const;
