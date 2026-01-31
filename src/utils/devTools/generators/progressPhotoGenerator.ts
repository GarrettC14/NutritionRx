import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, nowISO,
  randomPick, randomBetween, round, batchInsert,
} from './helpers';

const PHOTO_CATEGORIES = ['front', 'side', 'back'] as const;

export async function seedProgressPhotos(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  const now = nowISO();

  const columns = [
    'id', 'local_uri', 'thumbnail_uri', 'date', 'timestamp',
    'category', 'notes', 'weight_kg', 'is_private', 'created_at', 'updated_at',
  ];
  const rows: unknown[][] = [];

  // ~2 photos per month
  const totalMonths = monthsOfHistory;
  for (let month = 0; month < totalMonths; month++) {
    const daysInMonth = 30;
    const monthStart = totalMonths * 30 - month * daysInMonth;

    // Photo 1: around day 1 of the month
    const day1 = monthStart - Math.floor(Math.random() * 5);
    const date1 = daysAgo(Math.max(0, day1));
    const category1 = randomPick(PHOTO_CATEGORIES);
    const weight1 = round(88 - month * 0.8 + randomBetween(-0.5, 0.5), 1);

    rows.push([
      generateId('photo'),
      `file:///placeholder/progress_${date1}_${category1}.jpg`,
      `file:///placeholder/thumb_${date1}_${category1}.jpg`,
      date1,
      new Date(date1).getTime(),
      category1,
      month === 0 ? 'Starting photo' : null,
      weight1,
      1,
      now,
      now,
    ]);

    // Photo 2: around day 15
    const day2 = monthStart - 15 - Math.floor(Math.random() * 5);
    if (day2 < 0) continue;
    const date2 = daysAgo(day2);
    const category2 = randomPick(PHOTO_CATEGORIES);
    const weight2 = round(88 - month * 0.8 - 0.4 + randomBetween(-0.5, 0.5), 1);

    rows.push([
      generateId('photo'),
      `file:///placeholder/progress_${date2}_${category2}.jpg`,
      `file:///placeholder/thumb_${date2}_${category2}.jpg`,
      date2,
      new Date(date2).getTime(),
      category2,
      null,
      weight2,
      1,
      now,
      now,
    ]);
  }

  await batchInsert(db, 'progress_photos', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} progress photos`);
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
