import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  triggerHaptic,
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticWarning,
  hapticError,
  hapticSelection,
} from '../haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

jest.mock('@/types/voiceAssistant', () => ({}));

describe('haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
  });

  // ============================================================
  // triggerHaptic
  // ============================================================
  describe('triggerHaptic', () => {
    it('calls impactAsync(Light) for waterAdded', async () => {
      await triggerHaptic('waterAdded');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('calls notificationAsync(Success) for waterGoalReached', async () => {
      await triggerHaptic('waterGoalReached');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      );
    });

    it('calls notificationAsync(Success) for quickAddComplete', async () => {
      await triggerHaptic('quickAddComplete');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      );
    });

    it('calls impactAsync(Light) for queryResponse', async () => {
      await triggerHaptic('queryResponse');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('calls notificationAsync(Success) for weightLogged', async () => {
      await triggerHaptic('weightLogged');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      );
    });

    it('calls notificationAsync(Error) for error', async () => {
      await triggerHaptic('error');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error,
      );
    });

    it('calls impactAsync(Light) for unknown type (default case)', async () => {
      await triggerHaptic('someUnknownType' as any);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('does not call any haptic functions on web', async () => {
      (Platform as any).OS = 'web';
      await triggerHaptic('waterAdded');
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });

    it('silently catches errors from haptic calls', async () => {
      (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('Haptic failed'));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(triggerHaptic('waterAdded')).resolves.toBeUndefined();

      warnSpy.mockRestore();
    });

    it('schedules a delayed impactAsync(Medium) for waterGoalReached', async () => {
      jest.useFakeTimers();

      await triggerHaptic('waterGoalReached');

      // First call is notificationAsync(Success)
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
      // impactAsync not called yet (it's in setTimeout)
      expect(Haptics.impactAsync).not.toHaveBeenCalled();

      // Advance timers to trigger the setTimeout
      jest.advanceTimersByTime(100);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);

      jest.useRealTimers();
    });
  });

  // ============================================================
  // hapticLight
  // ============================================================
  describe('hapticLight', () => {
    it('calls impactAsync(Light) on iOS', async () => {
      await hapticLight();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('does not call impactAsync on web', async () => {
      (Platform as any).OS = 'web';
      await hapticLight();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // hapticMedium
  // ============================================================
  describe('hapticMedium', () => {
    it('calls impactAsync(Medium) on iOS', async () => {
      await hapticMedium();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('does not call impactAsync on web', async () => {
      (Platform as any).OS = 'web';
      await hapticMedium();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // hapticHeavy
  // ============================================================
  describe('hapticHeavy', () => {
    it('calls impactAsync(Heavy) on iOS', async () => {
      await hapticHeavy();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });

    it('does not call impactAsync on web', async () => {
      (Platform as any).OS = 'web';
      await hapticHeavy();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // hapticSuccess
  // ============================================================
  describe('hapticSuccess', () => {
    it('calls notificationAsync(Success) on iOS', async () => {
      await hapticSuccess();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      );
    });

    it('does not call notificationAsync on web', async () => {
      (Platform as any).OS = 'web';
      await hapticSuccess();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // hapticWarning
  // ============================================================
  describe('hapticWarning', () => {
    it('calls notificationAsync(Warning) on iOS', async () => {
      await hapticWarning();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning,
      );
    });

    it('does not call notificationAsync on web', async () => {
      (Platform as any).OS = 'web';
      await hapticWarning();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // hapticError
  // ============================================================
  describe('hapticError', () => {
    it('calls notificationAsync(Error) on iOS', async () => {
      await hapticError();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error,
      );
    });

    it('does not call notificationAsync on web', async () => {
      (Platform as any).OS = 'web';
      await hapticError();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // hapticSelection
  // ============================================================
  describe('hapticSelection', () => {
    it('calls selectionAsync on iOS', async () => {
      await hapticSelection();
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });

    it('does not call selectionAsync on web', async () => {
      (Platform as any).OS = 'web';
      await hapticSelection();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });
  });
});
