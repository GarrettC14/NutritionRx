// Mock for react-native-apple-llm

export const isFoundationModelsEnabled = jest.fn().mockResolvedValue('unavailable');

export class AppleLLMSession {
  configure = jest.fn().mockResolvedValue(undefined);
  generateText = jest.fn().mockResolvedValue('Mock Apple Foundation response');
  dispose = jest.fn();
}
