// Mock for react-native
export const Platform = {
  OS: 'ios',
  select: jest.fn((options: Record<string, any>) => options.ios ?? options.default),
};

export const StyleSheet = {
  create: jest.fn((styles: any) => styles),
};

export type TextStyle = Record<string, any>;
export type ViewStyle = Record<string, any>;

export default {
  Platform,
  StyleSheet,
};
