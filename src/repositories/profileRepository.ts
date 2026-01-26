import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import { UserProfileRow } from '@/types/database';
import { UserProfile } from '@/types/domain';
import { mapUserProfileRowToDomain } from '@/types/mappers';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
export type Sex = 'male' | 'female';
export type EatingStyle = 'flexible' | 'carb_focused' | 'fat_focused' | 'very_low_carb';
export type ProteinPriority = 'standard' | 'active' | 'athletic' | 'maximum';

export interface CreateProfileInput {
  sex?: Sex;
  dateOfBirth?: string;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  eatingStyle?: EatingStyle;
  proteinPriority?: ProteinPriority;
}

export interface UpdateProfileInput {
  sex?: Sex;
  dateOfBirth?: string;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  eatingStyle?: EatingStyle;
  proteinPriority?: ProteinPriority;
  hasCompletedOnboarding?: boolean;
  onboardingSkipped?: boolean;
}

const DEFAULT_PROFILE_ID = 'default-profile';

export const profileRepository = {
  async get(): Promise<UserProfile | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<UserProfileRow>(
      'SELECT * FROM user_profile WHERE id = ?',
      [DEFAULT_PROFILE_ID]
    );
    return row ? mapUserProfileRowToDomain(row) : null;
  },

  async getOrCreate(): Promise<UserProfile> {
    const existing = await this.get();
    if (existing) return existing;

    return this.create({});
  },

  async create(input: CreateProfileInput): Promise<UserProfile> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO user_profile (
        id, sex, date_of_birth, height_cm, activity_level,
        eating_style, protein_priority,
        has_completed_onboarding, onboarding_skipped, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEFAULT_PROFILE_ID,
        input.sex ?? null,
        input.dateOfBirth ?? null,
        input.heightCm ?? null,
        input.activityLevel ?? null,
        input.eatingStyle ?? 'flexible',
        input.proteinPriority ?? 'active',
        0,
        0,
        now,
        now,
      ]
    );

    const created = await this.get();
    if (!created) throw new Error('Failed to create user profile');
    return created;
  },

  async update(updates: UpdateProfileInput): Promise<UserProfile> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure profile exists
    await this.getOrCreate();

    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.sex !== undefined) {
      setClauses.push('sex = ?');
      values.push(updates.sex);
    }
    if (updates.dateOfBirth !== undefined) {
      setClauses.push('date_of_birth = ?');
      values.push(updates.dateOfBirth);
    }
    if (updates.heightCm !== undefined) {
      setClauses.push('height_cm = ?');
      values.push(updates.heightCm);
    }
    if (updates.activityLevel !== undefined) {
      setClauses.push('activity_level = ?');
      values.push(updates.activityLevel);
    }
    if (updates.eatingStyle !== undefined) {
      setClauses.push('eating_style = ?');
      values.push(updates.eatingStyle);
    }
    if (updates.proteinPriority !== undefined) {
      setClauses.push('protein_priority = ?');
      values.push(updates.proteinPriority);
    }
    if (updates.hasCompletedOnboarding !== undefined) {
      setClauses.push('has_completed_onboarding = ?');
      values.push(updates.hasCompletedOnboarding ? 1 : 0);
    }
    if (updates.onboardingSkipped !== undefined) {
      setClauses.push('onboarding_skipped = ?');
      values.push(updates.onboardingSkipped ? 1 : 0);
    }

    values.push(DEFAULT_PROFILE_ID);

    await db.runAsync(
      `UPDATE user_profile SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.get();
    if (!updated) throw new Error('User profile not found');
    return updated;
  },

  async completeOnboarding(): Promise<UserProfile> {
    return this.update({ hasCompletedOnboarding: true });
  },

  async skipOnboarding(): Promise<UserProfile> {
    return this.update({ onboardingSkipped: true });
  },

  async hasCompletedOnboarding(): Promise<boolean> {
    const profile = await this.get();
    return profile?.hasCompletedOnboarding ?? false;
  },

  async calculateAge(): Promise<number | null> {
    const profile = await this.get();
    if (!profile?.dateOfBirth) return null;

    const today = new Date();
    const birthDate = profile.dateOfBirth;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  },

  async reset(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM user_profile WHERE id = ?', [DEFAULT_PROFILE_ID]);
  },
};
