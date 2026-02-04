// Mock for llama.rn

const mockContext = {
  completion: jest.fn().mockResolvedValue({
    text: 'Mock LLM response text for testing',
  }),
  release: jest.fn().mockResolvedValue(undefined),
};

export const initLlama = jest.fn().mockResolvedValue(mockContext);

export default {
  initLlama,
};
