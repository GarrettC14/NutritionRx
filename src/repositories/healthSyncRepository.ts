import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';
import type { HealthSyncDirection, HealthSyncStatus } from '@/types/database';

interface LogHealthSyncParams {
  platform: 'apple_health' | 'health_connect';
  direction: HealthSyncDirection;
  data_type: string;
  local_record_id?: string | null;
  local_record_type?: string | null;
  external_id?: string | null;
  status: HealthSyncStatus;
  error_message?: string | null;
}

export async function logHealthSync(params: LogHealthSyncParams): Promise<string> {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO health_sync_log
      (id, platform, direction, data_type, local_record_id, local_record_type,
       external_id, status, error_message, synced_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.platform,
      params.direction,
      params.data_type,
      params.local_record_id ?? null,
      params.local_record_type ?? null,
      params.external_id ?? null,
      params.status,
      params.error_message ?? null,
      now,
      now,
    ]
  );

  return id;
}

export async function getLastSyncTimestamp(
  platform: string,
  direction: HealthSyncDirection,
  dataType?: string
): Promise<string | null> {
  const db = getDatabase();
  const query = dataType
    ? `SELECT MAX(synced_at) as last
       FROM health_sync_log
       WHERE platform = ? AND direction = ? AND data_type = ? AND status = 'success'`
    : `SELECT MAX(synced_at) as last
       FROM health_sync_log
       WHERE platform = ? AND direction = ? AND status = 'success'`;

  const params = dataType ? [platform, direction, dataType] : [platform, direction];
  const result = await db.getFirstAsync<{ last: string | null }>(query, params);
  return result?.last ?? null;
}

export async function hasExternalId(
  platform: string,
  dataType: string,
  externalId: string
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM health_sync_log WHERE platform = ? AND data_type = ? AND external_id = ?`,
    [platform, dataType, externalId]
  );
  return !!result;
}
