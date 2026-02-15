import { seedProfile, seedUserSettings, seedGoals } from '../profileGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('seedProfile', () => {
  it('returns 1 after updating profile', async () => {
    const db = createMockDb() as any;
    const result = await seedProfile(db, false);
    expect(result).toBe(1);
  });

  it('calls UPDATE on user_profile', async () => {
    const db = createMockDb() as any;
    await seedProfile(db, false);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.runAsync.mock.calls[0][0];
    expect(sql).toContain('UPDATE user_profile');
    expect(sql).toContain("id = 'singleton'");
  });

  it('sets expected profile fields', async () => {
    const db = createMockDb() as any;
    await seedProfile(db, false);
    const sql: string = db.runAsync.mock.calls[0][0];
    expect(sql).toContain("sex = 'male'");
    expect(sql).toContain("date_of_birth = '1990-05-15'");
    expect(sql).toContain('height_cm = 178');
    expect(sql).toContain("activity_level = 'moderately_active'");
    expect(sql).toContain('has_completed_onboarding = 1');
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedProfile(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Updated user profile'));
    spy.mockRestore();
  });
});

describe('seedUserSettings', () => {
  it('returns the number of settings inserted (7)', async () => {
    const db = createMockDb() as any;
    const result = await seedUserSettings(db, false);
    expect(result).toBe(7);
  });

  it('inserts 7 settings into user_settings', async () => {
    const db = createMockDb() as any;
    await seedUserSettings(db, false);
    expect(db.runAsync).toHaveBeenCalledTimes(7);
    for (const call of db.runAsync.mock.calls) {
      expect(call[0]).toContain('INSERT OR REPLACE INTO user_settings');
    }
  });

  it('includes expected setting keys', async () => {
    const db = createMockDb() as any;
    await seedUserSettings(db, false);
    const keys = db.runAsync.mock.calls.map((call: unknown[]) => (call[1] as unknown[])[0]);
    expect(keys).toContain('weight_unit');
    expect(keys).toContain('theme');
    expect(keys).toContain('daily_calorie_goal');
    expect(keys).toContain('daily_protein_goal');
    expect(keys).toContain('daily_carbs_goal');
    expect(keys).toContain('daily_fat_goal');
    expect(keys).toContain('has_seen_onboarding');
  });
});

describe('seedGoals', () => {
  it('returns count of 2 and an activeGoalId', async () => {
    const db = createMockDb() as any;
    const result = await seedGoals(db, false);
    expect(result.count).toBe(2);
    expect(typeof result.activeGoalId).toBe('string');
    expect(result.activeGoalId.length).toBeGreaterThan(0);
  });

  it('inserts 2 goals (1 completed, 1 active)', async () => {
    const db = createMockDb() as any;
    await seedGoals(db, false);
    expect(db.runAsync).toHaveBeenCalledTimes(2);
    for (const call of db.runAsync.mock.calls) {
      expect(call[0]).toContain('INSERT OR REPLACE INTO goals');
    }
  });

  it('first goal has is_active = 0 (completed)', async () => {
    const db = createMockDb() as any;
    await seedGoals(db, false);
    const params1: unknown[] = db.runAsync.mock.calls[0][1];
    // is_active is at index 18 in the params array
    expect(params1[18]).toBe(0);
  });

  it('second goal has is_active = 1 (active)', async () => {
    const db = createMockDb() as any;
    await seedGoals(db, false);
    const params2: unknown[] = db.runAsync.mock.calls[1][1];
    expect(params2[18]).toBe(1);
  });

  it('active goal id starts with "goal-active-"', async () => {
    const db = createMockDb() as any;
    const result = await seedGoals(db, false);
    expect(result.activeGoalId).toMatch(/^goal-active-/);
  });
});
