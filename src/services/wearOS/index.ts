/**
 * Wear OS Service Exports
 */

export {
  isWearOSAvailable,
  initWearSync,
  cleanupWearSync,
  checkWatchConnection,
  getConnectedWatch,
  syncToWatch,
  triggerWearSync,
} from './wearSyncService';

export type {
  WearDailySummary,
  WearRecentFood,
  WearAction,
  WearActionType,
  WearActionPayload,
  WearConnectionState,
  WearSyncStatus,
} from '@/types/wearOS';

export {
  WEAR_CAPABILITY,
  WEAR_DATA_PATH_DAILY_SUMMARY,
  WEAR_DATA_PATH_RECENT_FOODS,
  WEAR_MESSAGE_PATH_SYNC_COMPLETE,
  WEAR_MESSAGE_PATH_ACTION_CONFIRMED,
} from '@/types/wearOS';
