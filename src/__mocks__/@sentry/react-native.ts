const mockScope = {
  setTag: jest.fn(),
  setExtra: jest.fn(),
  setContext: jest.fn(),
};

export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const captureEvent = jest.fn();
export const addBreadcrumb = jest.fn();
export const setTag = jest.fn();
export const setTags = jest.fn();
export const setExtra = jest.fn();
export const setExtras = jest.fn();
export const setUser = jest.fn();
export const setContext = jest.fn();
export const addEventProcessor = jest.fn();

export const init = jest.fn();
export const wrap = jest.fn((component: any) => component);
export const withScope = jest.fn((callback: any) => callback(mockScope));

export const reactNavigationIntegration = jest.fn(() => ({
  registerNavigationContainer: jest.fn(),
}));

export const ErrorBoundary = ({ children }: { children: React.ReactNode }) => children;

export const Scope = jest.fn();

export default {
  captureException,
  captureMessage,
  captureEvent,
  addBreadcrumb,
  setTag,
  setTags,
  setExtra,
  setExtras,
  setUser,
  setContext,
  addEventProcessor,
  init,
  wrap,
  withScope,
  reactNavigationIntegration,
  ErrorBoundary,
  Scope,
};
