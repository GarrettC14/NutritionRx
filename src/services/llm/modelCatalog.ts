/**
 * Model Catalog
 * Tiered model definitions selected by device RAM.
 */

export interface ModelConfig {
  tier: 'standard' | 'compact' | 'minimal';
  name: string;
  filename: string;
  huggingFaceRepo: string;
  huggingFaceFile: string;
  downloadUrl: string;
  sizeBytes: number;
  sizeLabel: string;
  minRAMGB: number;
  contextSize: number;
  threads: number;
  chatTemplate: 'chatml' | 'llama3';
  stopTokens: string[];
}

export const MODEL_CATALOG: ModelConfig[] = [
  {
    tier: 'standard',
    name: 'SmolLM2 1.7B',
    filename: 'smollm2-1.7b-instruct-q4_k_m.gguf',
    huggingFaceRepo: 'bartowski/SmolLM2-1.7B-Instruct-GGUF',
    huggingFaceFile: 'SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
    downloadUrl:
      'https://huggingface.co/bartowski/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
    sizeBytes: 1_020_000_000,
    sizeLabel: '~1 GB',
    minRAMGB: 6,
    contextSize: 2048,
    threads: 4,
    chatTemplate: 'chatml',
    stopTokens: ['<|im_end|>', '<|im_start|>'],
  },
  {
    tier: 'compact',
    name: 'Llama 3.2 1B',
    filename: 'llama-3.2-1b-instruct-q4_k_m.gguf',
    huggingFaceRepo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    huggingFaceFile: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    downloadUrl:
      'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    sizeBytes: 670_000_000,
    sizeLabel: '~670 MB',
    minRAMGB: 4,
    contextSize: 1536,
    threads: 4,
    chatTemplate: 'llama3',
    stopTokens: ['<|eot_id|>', '<|end_of_text|>'],
  },
  {
    tier: 'minimal',
    name: 'Qwen2.5 0.5B',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    huggingFaceRepo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    huggingFaceFile: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    sizeBytes: 390_000_000,
    sizeLabel: '~390 MB',
    minRAMGB: 3,
    contextSize: 2048,
    threads: 2,
    chatTemplate: 'chatml',
    stopTokens: ['<|im_end|>', '<|im_start|>'],
  },
];

export function selectModelForDevice(ramGB: number): ModelConfig | null {
  return MODEL_CATALOG.find((m) => ramGB >= m.minRAMGB) ?? null;
}
