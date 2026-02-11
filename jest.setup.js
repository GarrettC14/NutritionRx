// Jest setup file
// Provide React Native-style dev global in node test runtime.
if (typeof global.__DEV__ === 'undefined') {
  global.__DEV__ = false;
}

// Mock expo-sqlite for unit tests
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    withTransactionAsync: jest.fn((callback) => callback()),
  })),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock @expo/vector-icons (ESM package not transformed by current Jest setup)
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const Icon = React.forwardRef((props, ref) => React.createElement('Icon', { ...props, ref }));
  Icon.displayName = 'Icon';

  const base = {
    __esModule: true,
    default: Icon,
    createIconSet: () => Icon,
    Ionicons: Icon,
    MaterialIcons: Icon,
    AntDesign: Icon,
    Feather: Icon,
    FontAwesome: Icon,
    Entypo: Icon,
  };

  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return Icon;
    },
  });
});

// Note: expo-file-system and expo-sharing are mocked via moduleNameMapper in jest.config.js
