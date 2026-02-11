import { SQLiteDatabase } from 'expo-sqlite';
import { Paths } from 'expo-file-system';
import {
  generateId, daysAgo, nowISO,
  batchInsert,
} from './helpers';

const PHOTO_DIR = Paths.document.uri + 'progress-photos/';

// ─── Picsum image IDs per category (800×1200 portrait) ─────────
const SEED_IMAGES: Array<{
  picsumId: number;
  category: 'front' | 'side' | 'back';
}> = [
  // Front (4)
  { picsumId: 237,  category: 'front' },
  { picsumId: 1025, category: 'front' },
  { picsumId: 169,  category: 'front' },
  { picsumId: 1015, category: 'front' },
  // Side (4)
  { picsumId: 10,   category: 'side' },
  { picsumId: 1003, category: 'side' },
  { picsumId: 1074, category: 'side' },
  { picsumId: 200,  category: 'side' },
  // Back (4)
  { picsumId: 20,   category: 'back' },
  { picsumId: 1024, category: 'back' },
  { picsumId: 152,  category: 'back' },
  { picsumId: 118,  category: 'back' },
];

// Distribute 12 photos over ~90 days, cycling front/side/back
const PHOTO_SCHEDULE: Array<{
  daysAgoValue: number;
  imageIndex: number;
  weightKg: number;
  isPrivate: boolean;
  notes: string | null;
}> = [
  { daysAgoValue: 90, imageIndex: 0,  weightKg: 82.0, isPrivate: true,  notes: 'Starting photo — day one' },
  { daysAgoValue: 82, imageIndex: 4,  weightKg: 81.8, isPrivate: true,  notes: null },
  { daysAgoValue: 75, imageIndex: 8,  weightKg: 81.5, isPrivate: true,  notes: 'Feeling good about consistency' },
  { daysAgoValue: 67, imageIndex: 1,  weightKg: 81.2, isPrivate: true,  notes: null },
  { daysAgoValue: 59, imageIndex: 5,  weightKg: 81.0, isPrivate: true,  notes: 'Tough week but staying on track' },
  { daysAgoValue: 52, imageIndex: 9,  weightKg: 80.7, isPrivate: false, notes: null },
  { daysAgoValue: 44, imageIndex: 2,  weightKg: 80.4, isPrivate: true,  notes: 'Noticed some changes today' },
  { daysAgoValue: 37, imageIndex: 6,  weightKg: 80.2, isPrivate: true,  notes: null },
  { daysAgoValue: 29, imageIndex: 10, weightKg: 80.0, isPrivate: true,  notes: 'One month in — proud of the progress' },
  { daysAgoValue: 21, imageIndex: 3,  weightKg: 79.8, isPrivate: true,  notes: null },
  { daysAgoValue: 14, imageIndex: 7,  weightKg: 79.7, isPrivate: false, notes: 'Two weeks to go' },
  { daysAgoValue: 7,  imageIndex: 11, weightKg: 79.5, isPrivate: true,  notes: 'Really happy with how things are going' },
];

// ID prefix used to identify seeded photos for cleanup
const SEED_ID_PREFIX = 'seed-photo';

/**
 * Downloads an image from picsum.photos and saves it to the app's
 * progress-photos directory, matching capture.tsx naming convention.
 */
async function downloadImage(
  picsumId: number,
  timestamp: number,
): Promise<{ localUri: string; thumbnailUri: string }> {
  const { downloadAsync, getInfoAsync, makeDirectoryAsync } = await import('expo-file-system');

  // Ensure directory exists
  const dirInfo = await getInfoAsync(PHOTO_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }

  const filename = `photo_${timestamp}.jpg`;
  const thumbFilename = `thumb_${timestamp}.jpg`;
  const localUri = PHOTO_DIR + filename;
  const thumbnailUri = PHOTO_DIR + thumbFilename;

  // Download full-size image (800×1200 portrait)
  const fullUrl = `https://picsum.photos/id/${picsumId}/800/1200`;
  await downloadAsync(fullUrl, localUri);

  // Download smaller thumbnail (200×300)
  const thumbUrl = `https://picsum.photos/id/${picsumId}/200/300`;
  await downloadAsync(thumbUrl, thumbnailUri);

  return { localUri, thumbnailUri };
}

export async function seedProgressPhotos(
  db: SQLiteDatabase,
  _monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  const now = nowISO();

  const columns = [
    'id', 'local_uri', 'thumbnail_uri', 'date', 'timestamp',
    'category', 'notes', 'weight_kg', 'is_private', 'created_at', 'updated_at',
  ];
  const rows: unknown[][] = [];

  if (verbose) console.log(`[seed] Downloading ${PHOTO_SCHEDULE.length} progress photos from picsum.photos…`);

  for (let i = 0; i < PHOTO_SCHEDULE.length; i++) {
    const entry = PHOTO_SCHEDULE[i];
    const image = SEED_IMAGES[entry.imageIndex];
    const date = daysAgo(entry.daysAgoValue);
    const timestamp = new Date(date + 'T12:00:00').getTime() + i; // +i to ensure unique timestamps

    try {
      const { localUri, thumbnailUri } = await downloadImage(image.picsumId, timestamp);

      rows.push([
        `${SEED_ID_PREFIX}-${i}`,
        localUri,
        thumbnailUri,
        date,
        timestamp,
        image.category,
        entry.notes,
        entry.weightKg,
        entry.isPrivate ? 1 : 0,
        now,
        now,
      ]);

      if (verbose) console.log(`[seed]   ${i + 1}/${PHOTO_SCHEDULE.length} — ${image.category} (${date})`);
    } catch (error) {
      console.warn(`[seed] Failed to download photo ${i + 1} (picsum id ${image.picsumId}):`, error);
    }
  }

  if (rows.length > 0) {
    await batchInsert(db, 'progress_photos', columns, rows);
  }

  if (verbose) console.log(`[seed] Inserted ${rows.length} progress photos with real images`);
  return rows.length;
}

export async function seedPhotoComparisons(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  const now = nowISO();

  // Get existing photos
  const photos = await db.getAllAsync<{ id: string; date: string }>(
    `SELECT id, date FROM progress_photos ORDER BY date ASC`
  );

  if (photos.length < 2) return 0;

  const columns = ['id', 'photo1_id', 'photo2_id', 'comparison_type', 'created_at'];
  const rows: unknown[][] = [];

  // Create 2-4 comparisons between first/last and some intermediate
  const comparisons = Math.min(4, Math.floor(photos.length / 2));
  for (let i = 0; i < comparisons; i++) {
    const photo1 = photos[i];
    const photo2 = photos[photos.length - 1 - i];
    if (photo1.id === photo2.id) continue;

    rows.push([
      generateId('comp'),
      photo1.id,
      photo2.id,
      'side_by_side',
      now,
    ]);
  }

  await batchInsert(db, 'photo_comparisons', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} photo comparisons`);
  return rows.length;
}

/**
 * Cleanup: deletes all seeded progress photos (both DB records and image files).
 */
export async function clearSeedProgressPhotos(
  db: SQLiteDatabase,
  verbose: boolean = false
): Promise<void> {
  const { deleteAsync } = await import('expo-file-system');

  // Find all seeded photo records
  const photos = await db.getAllAsync<{ id: string; local_uri: string; thumbnail_uri: string | null }>(
    `SELECT id, local_uri, thumbnail_uri FROM progress_photos WHERE id LIKE '${SEED_ID_PREFIX}%'`
  );

  // Delete image files
  for (const photo of photos) {
    try {
      await deleteAsync(photo.local_uri, { idempotent: true });
      if (photo.thumbnail_uri) {
        await deleteAsync(photo.thumbnail_uri, { idempotent: true });
      }
    } catch {
      // File may already be gone
    }
  }

  // Delete DB records
  await db.runAsync(`DELETE FROM photo_comparisons WHERE photo1_id LIKE '${SEED_ID_PREFIX}%' OR photo2_id LIKE '${SEED_ID_PREFIX}%'`);
  await db.runAsync(`DELETE FROM progress_photos WHERE id LIKE '${SEED_ID_PREFIX}%'`);

  if (verbose) console.log(`[seed] Cleared ${photos.length} seeded progress photos + files`);
}
