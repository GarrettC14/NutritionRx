/**
 * Goal Repository Tests
 * Tests for goal, weekly reflection, and daily metabolism data access
 */

import { goalRepository } from '@/repositories/goalRepository';

// Mock the database module
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('goalRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
  });

  describe('Goal methods', () => {
    const mockGoalRow = {
      id: 'goal-1',
      type: 'lose',
      target_weight_kg: 75,
      target_rate_percent: 0.5,
      start_date: '2024-01-01',
      start_weight_kg: 85,
      initial_tdee_estimate: 2500,
      initial_target_calories: 2000,
      initial_protein_g: 170,
      initial_carbs_g: 200,
      initial_fat_g: 67,
      current_tdee_estimate: 2450,
      current_target_calories: 1950,
      current_protein_g: 170,
      current_carbs_g: 195,
      current_fat_g: 65,
      is_active: 1,
      completed_at: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-10T00:00:00.000Z',
    };

    describe('findById', () => {
      it('returns goal when found', async () => {
        mockGetFirstAsync.mockResolvedValue(mockGoalRow);

        const result = await goalRepository.findById('goal-1');

        expect(result).not.toBeNull();
        expect(result!.id).toBe('goal-1');
        expect(result!.type).toBe('lose');
        expect(result!.targetWeightKg).toBe(75);
        expect(mockGetFirstAsync).toHaveBeenCalledWith(
          'SELECT * FROM goals WHERE id = ?',
          ['goal-1']
        );
      });

      it('returns null when not found', async () => {
        mockGetFirstAsync.mockResolvedValue(null);

        const result = await goalRepository.findById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getActiveGoal', () => {
      it('returns active goal when exists', async () => {
        mockGetFirstAsync.mockResolvedValue(mockGoalRow);

        const result = await goalRepository.getActiveGoal();

        expect(result).not.toBeNull();
        expect(result!.isActive).toBe(true);
        expect(mockGetFirstAsync).toHaveBeenCalledWith(
          expect.stringContaining('is_active = 1')
        );
      });

      it('returns null when no active goal', async () => {
        mockGetFirstAsync.mockResolvedValue(null);

        const result = await goalRepository.getActiveGoal();

        expect(result).toBeNull();
      });
    });

    describe('getAllGoals', () => {
      it('returns all goals', async () => {
        mockGetAllAsync.mockResolvedValue([
          mockGoalRow,
          { ...mockGoalRow, id: 'goal-2', is_active: 0 },
        ]);

        const result = await goalRepository.getAllGoals();

        expect(result).toHaveLength(2);
        expect(mockGetAllAsync).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM goals')
        );
      });

      it('returns empty array when no goals', async () => {
        mockGetAllAsync.mockResolvedValue([]);

        const result = await goalRepository.getAllGoals();

        expect(result).toHaveLength(0);
      });
    });

    describe('createGoal', () => {
      const createInput = {
        type: 'lose' as const,
        targetWeightKg: 75,
        targetRatePercent: 0.5,
        startDate: '2024-01-01',
        startWeightKg: 85,
        initialTdeeEstimate: 2500,
        initialTargetCalories: 2000,
        initialProteinG: 170,
        initialCarbsG: 200,
        initialFatG: 67,
      };

      it('creates goal and deactivates existing active goals', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue(mockGoalRow);

        const result = await goalRepository.createGoal(createInput);

        expect(result).not.toBeNull();
        // First call deactivates existing goals
        expect(mockRunAsync).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('UPDATE goals SET is_active = 0'),
          expect.any(Array)
        );
        // Second call inserts the new goal
        expect(mockRunAsync).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('INSERT INTO goals'),
          expect.arrayContaining([
            'test-uuid-1234',
            'lose',
            75,
            0.5,
          ])
        );
      });

      it('throws error when creation fails', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue(null);

        await expect(goalRepository.createGoal(createInput)).rejects.toThrow(
          'Failed to create goal'
        );
      });
    });

    describe('updateGoal', () => {
      it('updates goal fields', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue({
          ...mockGoalRow,
          current_target_calories: 1900,
        });

        const result = await goalRepository.updateGoal('goal-1', {
          currentTargetCalories: 1900,
        });

        expect(result.currentTargetCalories).toBe(1900);
        expect(mockRunAsync).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE goals SET'),
          expect.arrayContaining([1900, 'goal-1'])
        );
      });

      it('throws error when goal not found', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue(null);

        await expect(
          goalRepository.updateGoal('non-existent', { currentTargetCalories: 1900 })
        ).rejects.toThrow('Goal not found');
      });
    });

    describe('completeGoal', () => {
      it('marks goal as completed', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue({
          ...mockGoalRow,
          is_active: 0,
          completed_at: '2024-01-15T00:00:00.000Z',
        });

        const result = await goalRepository.completeGoal('goal-1');

        expect(result.isActive).toBe(false);
        expect(result.completedAt).not.toBeNull();
      });
    });

    describe('deleteGoal', () => {
      it('deletes goal and related reflections', async () => {
        mockRunAsync.mockResolvedValue(undefined);

        await goalRepository.deleteGoal('goal-1');

        // First delete reflections, then goal
        expect(mockRunAsync).toHaveBeenNthCalledWith(
          1,
          'DELETE FROM weekly_reflections WHERE goal_id = ?',
          ['goal-1']
        );
        expect(mockRunAsync).toHaveBeenNthCalledWith(
          2,
          'DELETE FROM goals WHERE id = ?',
          ['goal-1']
        );
      });
    });
  });

  describe('Weekly Reflection methods', () => {
    const mockReflectionRow = {
      id: 'reflection-1',
      goal_id: 'goal-1',
      week_number: 1,
      week_start_date: '2024-01-01',
      week_end_date: '2024-01-07',
      avg_calorie_intake: 2100,
      days_logged: 6,
      days_weighed: 4,
      start_trend_weight_kg: 85,
      end_trend_weight_kg: 84.5,
      weight_change_kg: -0.5,
      calculated_daily_burn: 2350,
      previous_tdee_estimate: 2500,
      previous_target_calories: 2000,
      new_tdee_estimate: 2400,
      new_target_calories: 1900,
      new_protein_g: 160,
      new_carbs_g: 190,
      new_fat_g: 63,
      was_accepted: null,
      user_notes: null,
      data_quality: 'good',
      created_at: '2024-01-08T00:00:00.000Z',
    };

    describe('findReflectionById', () => {
      it('returns reflection when found', async () => {
        mockGetFirstAsync.mockResolvedValue(mockReflectionRow);

        const result = await goalRepository.findReflectionById('reflection-1');

        expect(result).not.toBeNull();
        expect(result!.weekNumber).toBe(1);
        expect(result!.dataQuality).toBe('good');
      });

      it('returns null when not found', async () => {
        mockGetFirstAsync.mockResolvedValue(null);

        const result = await goalRepository.findReflectionById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getReflectionsForGoal', () => {
      it('returns reflections ordered by week number', async () => {
        mockGetAllAsync.mockResolvedValue([
          mockReflectionRow,
          { ...mockReflectionRow, id: 'reflection-2', week_number: 2 },
        ]);

        const result = await goalRepository.getReflectionsForGoal('goal-1');

        expect(result).toHaveLength(2);
        expect(mockGetAllAsync).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY week_number ASC'),
          ['goal-1']
        );
      });
    });

    describe('getLatestReflection', () => {
      it('returns most recent reflection', async () => {
        mockGetFirstAsync.mockResolvedValue({
          ...mockReflectionRow,
          week_number: 3,
        });

        const result = await goalRepository.getLatestReflection('goal-1');

        expect(result).not.toBeNull();
        expect(mockGetFirstAsync).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY week_number DESC LIMIT 1'),
          ['goal-1']
        );
      });
    });

    describe('getPendingReflection', () => {
      it('returns reflection with null was_accepted', async () => {
        mockGetFirstAsync.mockResolvedValue(mockReflectionRow);

        const result = await goalRepository.getPendingReflection('goal-1');

        expect(result).not.toBeNull();
        // wasAccepted is null in mockReflectionRow, which maps to undefined in domain
        expect(result!.wasAccepted).toBeUndefined();
        expect(mockGetFirstAsync).toHaveBeenCalledWith(
          expect.stringContaining('was_accepted IS NULL'),
          ['goal-1']
        );
      });

      it('returns null when no pending reflection', async () => {
        mockGetFirstAsync.mockResolvedValue(null);

        const result = await goalRepository.getPendingReflection('goal-1');

        expect(result).toBeNull();
      });
    });

    describe('createReflection', () => {
      it('creates weekly reflection', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue(mockReflectionRow);

        const result = await goalRepository.createReflection({
          goalId: 'goal-1',
          weekNumber: 1,
          weekStartDate: '2024-01-01',
          weekEndDate: '2024-01-07',
          avgCalorieIntake: 2100,
          daysLogged: 6,
          dataQuality: 'good',
        });

        expect(result).not.toBeNull();
        expect(mockRunAsync).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO weekly_reflections'),
          expect.arrayContaining(['test-uuid-1234', 'goal-1', 1])
        );
      });
    });

    describe('updateReflection', () => {
      it('updates reflection fields', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue({
          ...mockReflectionRow,
          was_accepted: 1,
          user_notes: 'Great week!',
        });

        const result = await goalRepository.updateReflection('reflection-1', {
          wasAccepted: true,
          userNotes: 'Great week!',
        });

        expect(result.wasAccepted).toBe(true);
        expect(result.userNotes).toBe('Great week!');
      });

      it('returns existing when no updates', async () => {
        mockGetFirstAsync.mockResolvedValue(mockReflectionRow);

        const result = await goalRepository.updateReflection('reflection-1', {});

        expect(result).not.toBeNull();
        expect(mockRunAsync).not.toHaveBeenCalled();
      });
    });

    describe('acceptReflection', () => {
      it('marks reflection as accepted with notes', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue({
          ...mockReflectionRow,
          was_accepted: 1,
          user_notes: 'Accepted',
        });

        const result = await goalRepository.acceptReflection('reflection-1', 'Accepted');

        expect(result.wasAccepted).toBe(true);
        expect(result.userNotes).toBe('Accepted');
      });
    });

    describe('declineReflection', () => {
      it('marks reflection as declined', async () => {
        mockRunAsync.mockResolvedValue(undefined);
        mockGetFirstAsync.mockResolvedValue({
          ...mockReflectionRow,
          was_accepted: 0,
        });

        const result = await goalRepository.declineReflection('reflection-1');

        expect(result.wasAccepted).toBe(false);
      });
    });
  });

  describe('Daily Metabolism methods', () => {
    const mockMetabolismRow = {
      id: 'metabolism-1',
      date: '2024-01-15',
      trend_weight_kg: 84.2,
      calorie_intake: 2100,
      estimated_daily_burn: 2400,
      data_quality: 'good',
      created_at: '2024-01-15T00:00:00.000Z',
      updated_at: '2024-01-15T00:00:00.000Z',
    };

    describe('findMetabolismByDate', () => {
      it('returns metabolism entry for date', async () => {
        mockGetFirstAsync.mockResolvedValue(mockMetabolismRow);

        const result = await goalRepository.findMetabolismByDate('2024-01-15');

        expect(result).not.toBeNull();
        expect(result!.date).toBe('2024-01-15');
        expect(result!.trendWeightKg).toBe(84.2);
      });

      it('returns null when not found', async () => {
        mockGetFirstAsync.mockResolvedValue(null);

        const result = await goalRepository.findMetabolismByDate('2024-01-20');

        expect(result).toBeNull();
      });
    });

    describe('getMetabolismForRange', () => {
      it('returns metabolism entries for date range', async () => {
        mockGetAllAsync.mockResolvedValue([
          mockMetabolismRow,
          { ...mockMetabolismRow, id: 'metabolism-2', date: '2024-01-16' },
        ]);

        const result = await goalRepository.getMetabolismForRange('2024-01-15', '2024-01-20');

        expect(result).toHaveLength(2);
        expect(mockGetAllAsync).toHaveBeenCalledWith(
          expect.stringContaining('BETWEEN ? AND ?'),
          ['2024-01-15', '2024-01-20']
        );
      });
    });

    describe('upsertMetabolism', () => {
      it('updates existing entry', async () => {
        mockGetFirstAsync
          .mockResolvedValueOnce(mockMetabolismRow) // existing check
          .mockResolvedValueOnce({ ...mockMetabolismRow, calorie_intake: 2200 }); // result
        mockRunAsync.mockResolvedValue(undefined);

        const result = await goalRepository.upsertMetabolism({
          date: '2024-01-15',
          calorieIntake: 2200,
        });

        expect(result.calorieIntake).toBe(2200);
        expect(mockRunAsync).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE daily_metabolism'),
          expect.any(Array)
        );
      });

      it('creates new entry when not exists', async () => {
        mockGetFirstAsync
          .mockResolvedValueOnce(null) // existing check
          .mockResolvedValueOnce(mockMetabolismRow); // result
        mockRunAsync.mockResolvedValue(undefined);

        const result = await goalRepository.upsertMetabolism({
          date: '2024-01-15',
          trendWeightKg: 84.2,
          calorieIntake: 2100,
        });

        expect(result).not.toBeNull();
        expect(mockRunAsync).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO daily_metabolism'),
          expect.any(Array)
        );
      });
    });

    describe('deleteMetabolismByDate', () => {
      it('deletes entry by date', async () => {
        mockRunAsync.mockResolvedValue(undefined);

        await goalRepository.deleteMetabolismByDate('2024-01-15');

        expect(mockRunAsync).toHaveBeenCalledWith(
          'DELETE FROM daily_metabolism WHERE date = ?',
          ['2024-01-15']
        );
      });
    });
  });
});
