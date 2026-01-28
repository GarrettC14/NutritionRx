// Mock for react-native
export const Platform = {
  OS: 'ios',
  select: jest.fn((options: Record<string, any>) => options.ios ?? options.default),
};

export const StyleSheet = {
  create: jest.fn((styles: any) => styles),
  flatten: jest.fn((style: any) => {
    if (Array.isArray(style)) {
      return style.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    }
    return style || {};
  }),
};

export const NativeModules = {
  ShortcutsBridge: {
    donateShortcut: jest.fn().mockResolvedValue({ success: true }),
  },
};

export const Animated = {
  Value: jest.fn().mockImplementation((value) => ({
    _value: value,
    setValue: jest.fn(),
    interpolate: jest.fn().mockReturnThis(),
  })),
  View: 'Animated.View',
  Text: 'Animated.Text',
  timing: jest.fn().mockReturnValue({
    start: jest.fn((callback) => callback?.()),
  }),
  spring: jest.fn().mockReturnValue({
    start: jest.fn((callback) => callback?.()),
  }),
  parallel: jest.fn().mockReturnValue({
    start: jest.fn((callback) => callback?.()),
  }),
};

export const View = 'View';
export const Text = 'Text';
export const Dimensions = {
  get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
};

export const Linking = {
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
};

export const AppState = {
  currentState: 'active',
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
};

export type TextStyle = Record<string, any>;
export type ViewStyle = Record<string, any>;

export default {
  Platform,
  StyleSheet,
  NativeModules,
  Animated,
  View,
  Text,
  Dimensions,
  Linking,
  AppState,
};
