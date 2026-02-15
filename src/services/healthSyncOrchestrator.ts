import { useWeightStore } from '@/stores/weightStore';
import { getHealthSyncService } from './healthSyncService';

let syncing = false;

export async function performAppOpenHealthSync(): Promise<void> {
  if (syncing) return;
  syncing = true;

  try {
    const service = getHealthSyncService();
    if (!service?.isConnected()) return;

    // Weight import with 3-layer dedup
    await useWeightStore.getState().importFromHealthKit();

    // Read today's activity metrics (for future TDEE adjustment)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeCalories, steps] = await Promise.all([
      service.readActiveCalories(startOfToday.toISOString(), now.toISOString()),
      service.readSteps(startOfToday.toISOString(), now.toISOString()),
    ]);

    if (__DEV__) {
      console.log(
        `[HealthSync] platform=${service.getPlatformName()} ` +
        `activeCalories=${activeCalories} steps=${steps}`
      );
    }

    // Activity values stored when TDEE feature is built (post-launch)
  } catch (error) {
    if (__DEV__) console.warn('[HealthSyncOrchestrator] app-open sync failed', error);
  } finally {
    syncing = false;
  }
}
