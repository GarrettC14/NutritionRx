# On-Device LLM Implementation Spec

## Shared specification for GymRx and NutritionRx

---

## Context

Both apps use an on-device LLM for premium "Smart Insights" features — weekly recaps, trend analysis, coaching observations, etc. The current implementation uses a single `llama.rn` + SmolLM2-1.7B model for all devices. This spec replaces that with a tiered approach:

1. **iOS devices with Apple Intelligence** → Use Apple Foundation Models (free, system-managed, no download)
2. **All other capable devices** → Use `llama.rn` with the best GGUF model for that device's RAM and architecture
3. **Devices too weak for any local LLM** → Disable the feature and tell the user why

There is **no Gemini Nano integration** — the Prompt API is still in Alpha/Beta and not production-ready. Android devices always go through path 2 or 3.

There is **no rule-based/template fallback**. If the device can't run any LLM, the insight features are simply unavailable. Static computation doesn't provide enough value for these use cases.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                 Feature Code (Widgets, Insights)             │
│         llmManager.generate(prompt, options)                 │
├──────────────────────────────────────────────────────────────┤
│                    LLMProviderManager                        │
│         Resolves best provider at runtime                    │
├────────────────────┬─────────────────────────────────────────┤
│  AppleFoundation   │           LlamaProvider                 │
│  Provider          │   (auto-selects model by device)        │
│                    │                                         │
│  iOS 26+           │   ┌─────────┬──────────┬──────────┐    │
│  iPhone 15 Pro+    │   │Standard │ Compact  │ Minimal  │    │
│  Apple Intelligence│   │SmolLM2  │ Llama3.2 │ Qwen2.5  │    │
│  enabled           │   │ 1.7B    │  1B      │  0.5B    │    │
│                    │   │ ~1 GB   │ ~600 MB  │ ~350 MB  │    │
│                    │   │ 6+ GB   │ 4-6 GB   │ 3-4 GB   │    │
│                    │   │  RAM    │  RAM     │  RAM     │    │
│                    │   └─────────┴──────────┴──────────┘    │
├────────────────────┴─────────────────────────────────────────┤
│               UnsupportedProvider                            │
│  < 3 GB RAM, non-arm64, or other hard limits                │
│  Feature disabled — user shown explanation                   │
└──────────────────────────────────────────────────────────────┘

Resolution order (first available wins):
  iOS:     AppleFoundation → Llama → Unsupported
  Android: Llama → Unsupported
```

---

## File Structure

Create or modify these files. Both apps follow the same structure — adjust import paths for each project.

```
src/
├── services/
│   └── llm/
│       ├── types.ts                    # Shared types and interfaces
│       ├── providerManager.ts          # Singleton that resolves and manages the active provider
│       ├── deviceClassifier.ts         # Detects device capabilities, selects model tier
│       ├── modelCatalog.ts             # Model definitions (URLs, sizes, RAM thresholds)
│       └── providers/
│           ├── appleFoundationProvider.ts   # iOS Foundation Models via react-native-apple-llm
│           ├── llamaProvider.ts             # llama.rn with device-appropriate GGUF model
│           └── unsupportedProvider.ts       # Returns unsupported status — feature disabled
```

---

## Dependencies

### New dependency (iOS only)

```bash
npm install react-native-apple-llm
cd ios && pod install
```

This package requires:

- iOS deployment target of 26.0 in your Podfile / Xcode project (only affects this feature — the package is conditionally loaded)
- Xcode 26
- The package gracefully returns `unavailable` on older iOS versions and non-eligible devices

### Existing dependencies (already in both projects)

```
llama.rn                  # llama.cpp bindings for React Native
react-native-device-info  # Device RAM, model, ABI detection
expo-file-system          # Model download and storage
```

If `react-native-device-info` is not already installed:

```bash
npm install react-native-device-info
```

---

## Implementation

### 1. types.ts

```typescript
// src/services/llm/types.ts

export type LLMProviderName =
  | "apple-foundation"
  | "llama-standard"
  | "llama-compact"
  | "llama-minimal"
  | "unsupported";

export interface LLMResult {
  text: string;
  provider: LLMProviderName;
  latencyMs: number;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface LLMProvider {
  /** Display name for logging / diagnostics */
  readonly name: LLMProviderName;

  /**
   * Returns true if this provider can run on the current device.
   * Must be fast — no downloads, no heavy initialization.
   */
  isAvailable(): Promise<boolean>;

  /**
   * One-time setup. For Llama, this loads the model into memory.
   * For Apple Foundation, this creates a session.
   * May be called multiple times safely (idempotent).
   */
  initialize(): Promise<void>;

  /** Generate text from a prompt. */
  generate(prompt: string, options?: GenerateOptions): Promise<LLMResult>;

  /** Release resources (model memory, sessions). */
  cleanup(): Promise<void>;
}

/**
 * Returned by the provider manager when checking LLM readiness.
 * The UI layer uses this to decide what to show.
 */
export type LLMStatus =
  | { ready: true; provider: LLMProviderName }
  | {
      ready: false;
      reason: "model-download-required";
      downloadSizeMB: number;
      modelName: string;
    }
  | { ready: false; reason: "unsupported"; message: string };
```

---

### 2. modelCatalog.ts

```typescript
// src/services/llm/modelCatalog.ts

export interface ModelDefinition {
  id: "standard" | "compact" | "minimal";
  providerName: "llama-standard" | "llama-compact" | "llama-minimal";
  displayName: string;
  filename: string;
  downloadUrl: string;
  sizeBytes: number;
  displaySize: string;
  minRamMB: number;
  contextLength: number;
  nThreads: number;
}

/**
 * Model catalog ordered from highest quality to lowest.
 * Device classifier walks this list and picks the first model
 * whose minRamMB threshold is met.
 */
export const MODEL_CATALOG: ModelDefinition[] = [
  {
    id: "standard",
    providerName: "llama-standard",
    displayName: "SmolLM2 1.7B",
    filename: "smollm2-1.7b-instruct-q4_k_m.gguf",
    downloadUrl:
      "https://huggingface.co/lmstudio-community/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf",
    sizeBytes: 1_020_000_000,
    displaySize: "~1 GB",
    minRamMB: 6000,
    contextLength: 2048,
    nThreads: 4,
  },
  {
    id: "compact",
    providerName: "llama-compact",
    displayName: "Llama 3.2 1B",
    filename: "llama-3.2-1b-instruct-q4_k_m.gguf",
    downloadUrl:
      "https://huggingface.co/lmstudio-community/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    sizeBytes: 670_000_000,
    displaySize: "~670 MB",
    minRamMB: 4000,
    contextLength: 1536,
    nThreads: 4,
  },
  {
    id: "minimal",
    providerName: "llama-minimal",
    displayName: "Qwen2.5 0.5B",
    filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
    downloadUrl:
      "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
    sizeBytes: 390_000_000,
    displaySize: "~390 MB",
    minRamMB: 3000,
    contextLength: 1024,
    nThreads: 2,
  },
];
```

> **Note:** Verify the exact HuggingFace URLs before implementation. The filenames and paths above reflect the standard community quantization naming but may need minor corrections. Download one of each manually to confirm URLs resolve.

---

### 3. deviceClassifier.ts

```typescript
// src/services/llm/deviceClassifier.ts

import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";
import { MODEL_CATALOG, ModelDefinition } from "./modelCatalog";

export interface DeviceCapabilities {
  totalRamMB: number;
  isArm64: boolean;
  iosVersion: number | null; // e.g. 26 — null on Android
  isAppleIntelligenceEligible: boolean;
  deviceModel: string; // e.g. "iPhone 16 Pro", "Pixel 8"
}

export interface ClassificationResult {
  capabilities: DeviceCapabilities;
  /** The best llama.rn model for this device, or null if too weak. */
  recommendedModel: ModelDefinition | null;
  /** True if iOS device might support Foundation Models (final check is runtime). */
  maybeAppleFoundation: boolean;
}

/**
 * Gathers device info and determines the best LLM strategy.
 * This is a pure capability check — no model loading or network calls.
 */
export async function classifyDevice(): Promise<ClassificationResult> {
  const [totalMemory, abis, model] = await Promise.all([
    DeviceInfo.getTotalMemory(),
    DeviceInfo.supportedAbis(),
    DeviceInfo.getModel(),
  ]);

  const totalRamMB = totalMemory / (1024 * 1024);

  const isArm64 = abis.some(
    (abi: string) => abi.includes("arm64") || abi.includes("aarch64"),
  );

  // iOS version check
  let iosVersion: number | null = null;
  if (Platform.OS === "ios") {
    iosVersion = parseInt(String(Platform.Version), 10);
  }

  // Apple Intelligence eligibility is a rough pre-check.
  // The actual availability is confirmed at runtime by the Foundation Models bridge.
  // Eligible hardware: iPhone 15 Pro+, iPad M1+, Mac M1+
  const appleIntelligenceModels = [
    "iPhone16",
    "iPhone17",
    "iPhone18", // iPhone 15 Pro = iPhone16,x internally
    "iPad14",
    "iPad15",
    "iPad16", // M1+ iPads
  ];
  const isAppleIntelligenceEligible =
    Platform.OS === "ios" &&
    (iosVersion ?? 0) >= 26 &&
    appleIntelligenceModels.some((prefix) => model.startsWith(prefix));

  const capabilities: DeviceCapabilities = {
    totalRamMB,
    isArm64,
    iosVersion,
    isAppleIntelligenceEligible,
    deviceModel: model,
  };

  // Find the best llama.rn model this device can run
  let recommendedModel: ModelDefinition | null = null;

  if (isArm64 && totalRamMB >= 3000) {
    // Walk catalog from highest quality to lowest, pick first that fits
    for (const definition of MODEL_CATALOG) {
      if (totalRamMB >= definition.minRamMB) {
        recommendedModel = definition;
        break;
      }
    }
  }

  return {
    capabilities,
    recommendedModel,
    maybeAppleFoundation: isAppleIntelligenceEligible,
  };
}
```

**Important notes on `isAppleIntelligenceEligible`:**

- The internal model identifiers (like `iPhone16,x` for iPhone 15 Pro) may not match the marketing names. Use `DeviceInfo.getDeviceId()` instead of `getModel()` if you need the internal identifier.
- This is only a preliminary filter. The **real** availability check happens in `AppleFoundationProvider.isAvailable()` which calls into the native bridge. If the bridge says unavailable, we fall through to Llama regardless.
- Update the `appleIntelligenceModels` array as new devices ship.

---

### 4. providers/appleFoundationProvider.ts

```typescript
// src/services/llm/providers/appleFoundationProvider.ts

import { Platform } from "react-native";
import { LLMProvider, LLMResult, GenerateOptions } from "../types";

// Conditionally import — this package only works on iOS 26+.
// On Android or older iOS, the import still succeeds but the
// availability check returns false.
let AppleLLMModule: typeof import("react-native-apple-llm") | null = null;

if (Platform.OS === "ios") {
  try {
    AppleLLMModule = require("react-native-apple-llm");
  } catch {
    // Package not linked or iOS < 26 — that's fine, we'll fall through
    AppleLLMModule = null;
  }
}

export class AppleFoundationProvider implements LLMProvider {
  readonly name = "apple-foundation" as const;
  private session: InstanceType<
    NonNullable<typeof AppleLLMModule>["AppleLLMSession"]
  > | null = null;

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "ios" || !AppleLLMModule) return false;

    try {
      const status = await AppleLLMModule.isFoundationModelsEnabled();
      return status === "available";
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (!AppleLLMModule) {
      throw new Error("Apple Foundation Models not available");
    }

    // Create a new session each time — sessions are lightweight.
    // Instructions are set per the app's design philosophy.
    // The calling code can override instructions via the prompt itself,
    // but this sets a sensible default.
    this.session = new AppleLLMModule.AppleLLMSession();
    await this.session.configure({
      instructions: this.getSystemInstructions(),
    });
  }

  async generate(
    prompt: string,
    options?: GenerateOptions,
  ): Promise<LLMResult> {
    if (!this.session) {
      await this.initialize();
    }

    const start = Date.now();

    const response = await this.session!.generateText({
      prompt,
    });

    return {
      text:
        typeof response === "string"
          ? response.trim()
          : String(response).trim(),
      provider: "apple-foundation",
      latencyMs: Date.now() - start,
    };
  }

  async cleanup(): Promise<void> {
    if (this.session) {
      try {
        this.session.dispose();
      } catch {
        // Dispose may fail if session was already released — that's fine
      }
      this.session = null;
    }
  }

  /**
   * Override this in app-specific subclasses if needed,
   * or keep generic. The per-feature prompts carry the real instructions.
   */
  private getSystemInstructions(): string {
    return "You are a concise, knowledgeable fitness and nutrition analyst. Provide brief, specific, actionable observations based on the data provided. Never fabricate data. Keep responses to 2-3 sentences unless asked for more.";
  }
}
```

**Notes:**

- `react-native-apple-llm` uses a session-based API. `configure()` sets system instructions, `generateText()` runs inference.
- The package handles all the native Swift bridging to Apple's `FoundationModels` framework.
- On non-eligible devices, `isFoundationModelsEnabled()` returns a status other than `'available'` — we never crash.
- `generateText()` does **not** accept `maxTokens` or `temperature` — Apple's Foundation Models framework manages these internally. The model is optimized for device-scale tasks and produces appropriately-sized responses given the prompt. If response length control is critical, handle it in the prompt text itself (e.g., "respond in 2-3 sentences").

---

### 5. providers/llamaProvider.ts

```typescript
// src/services/llm/providers/llamaProvider.ts

import { initLlama, LlamaContext } from "llama.rn";
import * as FileSystem from "expo-file-system";
import { LLMProvider, LLMResult, GenerateOptions } from "../types";
import { ModelDefinition } from "../modelCatalog";

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

export class LlamaProvider implements LLMProvider {
  readonly name;
  private context: LlamaContext | null = null;
  private modelDefinition: ModelDefinition;

  constructor(modelDefinition: ModelDefinition) {
    this.modelDefinition = modelDefinition;
    this.name = modelDefinition.providerName;
  }

  async isAvailable(): Promise<boolean> {
    // The device classifier already determined this model is appropriate
    // for the device. We just need to confirm the runtime can load.
    return true;
  }

  /**
   * Returns true if the model file is already downloaded.
   */
  async isModelDownloaded(): Promise<boolean> {
    const path = this.getModelPath();
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  }

  /**
   * Downloads the model file. Call this from the UI layer before initialize().
   *
   * @param onProgress - callback with 0-1 progress value
   * @returns true if download succeeded
   */
  async downloadModel(
    onProgress?: (progress: number) => void,
  ): Promise<boolean> {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, {
      intermediates: true,
    });

    const downloadResumable = FileSystem.createDownloadResumable(
      this.modelDefinition.downloadUrl,
      this.getModelPath(),
      {},
      (downloadProgress) => {
        const fraction =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        onProgress?.(fraction);
      },
    );

    const result = await downloadResumable.downloadAsync();
    return result !== undefined;
  }

  /**
   * Delete the downloaded model to free storage.
   */
  async deleteModel(): Promise<void> {
    await this.cleanup();
    const path = this.getModelPath();
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path);
    }
  }

  async initialize(): Promise<void> {
    if (this.context) return;

    const modelPath = this.getModelPath();
    const info = await FileSystem.getInfoAsync(modelPath);

    if (!info.exists) {
      throw new Error(
        `Model not downloaded. Call downloadModel() first. Expected at: ${modelPath}`,
      );
    }

    this.context = await initLlama({
      model: modelPath,
      n_ctx: this.modelDefinition.contextLength,
      n_threads: this.modelDefinition.nThreads,
      n_gpu_layers: 0, // CPU-only for maximum compatibility
    });
  }

  async generate(
    prompt: string,
    options?: GenerateOptions,
  ): Promise<LLMResult> {
    if (!this.context) {
      await this.initialize();
    }

    const start = Date.now();

    const result = await this.context!.completion({
      prompt,
      n_predict: options?.maxTokens ?? 200,
      temperature: options?.temperature ?? 0.7,
      stop: options?.stopSequences ?? ["\n\n", "##"],
    });

    return {
      text: result.text.trim(),
      provider: this.modelDefinition.providerName,
      latencyMs: Date.now() - start,
    };
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      try {
        await this.context.release();
      } catch {
        // May fail if already released
      }
      this.context = null;
    }
  }

  getModelDefinition(): ModelDefinition {
    return this.modelDefinition;
  }

  getModelPath(): string {
    return `${MODELS_DIR}${this.modelDefinition.filename}`;
  }
}
```

---

### 6. providers/unsupportedProvider.ts

```typescript
// src/services/llm/providers/unsupportedProvider.ts

import { LLMProvider, LLMResult, GenerateOptions } from "../types";

/**
 * Placeholder provider for devices that cannot run any local LLM.
 * All calls to generate() throw — the UI layer should check status
 * and never call generate() on an unsupported device.
 */
export class UnsupportedProvider implements LLMProvider {
  readonly name = "unsupported" as const;

  async isAvailable(): Promise<boolean> {
    return true; // Always "available" as the terminal fallback
  }

  async initialize(): Promise<void> {
    // Nothing to do
  }

  async generate(
    _prompt: string,
    _options?: GenerateOptions,
  ): Promise<LLMResult> {
    throw new Error(
      "LLM inference is not supported on this device. The UI should prevent this call.",
    );
  }

  async cleanup(): Promise<void> {
    // Nothing to clean up
  }
}
```

---

### 7. providerManager.ts

This is the main entry point that all feature code uses.

```typescript
// src/services/llm/providerManager.ts

import { Platform } from "react-native";
import {
  LLMProvider,
  LLMResult,
  LLMStatus,
  GenerateOptions,
  LLMProviderName,
} from "./types";
import { classifyDevice, ClassificationResult } from "./deviceClassifier";
import { AppleFoundationProvider } from "./providers/appleFoundationProvider";
import { LlamaProvider } from "./providers/llamaProvider";
import { UnsupportedProvider } from "./providers/unsupportedProvider";

class LLMProviderManager {
  private activeProvider: LLMProvider | null = null;
  private classification: ClassificationResult | null = null;
  private resolving = false;

  /**
   * Determine device capabilities and resolve the best provider.
   * Does NOT download models or load them into memory.
   * Safe to call multiple times — caches result.
   */
  async resolve(): Promise<void> {
    if (this.activeProvider || this.resolving) return;
    this.resolving = true;

    try {
      this.classification = await classifyDevice();

      // --- Attempt 1: Apple Foundation Models (iOS only) ---
      if (Platform.OS === "ios" && this.classification.maybeAppleFoundation) {
        const apple = new AppleFoundationProvider();
        const available = await apple.isAvailable();
        if (available) {
          this.activeProvider = apple;
          console.log("[LLM] Provider resolved: Apple Foundation Models");
          return;
        }
        console.log(
          "[LLM] Apple Foundation Models not available, falling through to Llama",
        );
      }

      // --- Attempt 2: Llama with device-appropriate model ---
      if (this.classification.recommendedModel) {
        this.activeProvider = new LlamaProvider(
          this.classification.recommendedModel,
        );
        console.log(
          `[LLM] Provider resolved: ${this.classification.recommendedModel.displayName}`,
        );
        return;
      }

      // --- Attempt 3: Unsupported ---
      this.activeProvider = new UnsupportedProvider();
      console.log("[LLM] Provider resolved: Unsupported (device too weak)");
    } finally {
      this.resolving = false;
    }
  }

  /**
   * Returns the current LLM readiness status for the UI layer.
   * Call this to determine what to show the user.
   */
  async getStatus(): Promise<LLMStatus> {
    await this.resolve();

    if (!this.activeProvider || this.activeProvider.name === "unsupported") {
      return {
        ready: false,
        reason: "unsupported",
        message: this.getUnsupportedMessage(),
      };
    }

    // Apple Foundation Models — always ready (system-managed model)
    if (this.activeProvider.name === "apple-foundation") {
      return { ready: true, provider: "apple-foundation" };
    }

    // Llama provider — check if model is downloaded
    const llamaProvider = this.activeProvider as LlamaProvider;
    const downloaded = await llamaProvider.isModelDownloaded();

    if (!downloaded) {
      const def = llamaProvider.getModelDefinition();
      return {
        ready: false,
        reason: "model-download-required",
        downloadSizeMB: Math.round(def.sizeBytes / 1_000_000),
        modelName: def.displayName,
      };
    }

    return { ready: true, provider: llamaProvider.name };
  }

  /**
   * Generate text. Automatically initializes the provider if needed.
   * Throws if the device is unsupported — check getStatus() first.
   */
  async generate(
    prompt: string,
    options?: GenerateOptions,
  ): Promise<LLMResult> {
    await this.resolve();

    if (!this.activeProvider || this.activeProvider.name === "unsupported") {
      throw new Error("LLM not available on this device");
    }

    // Initialize on first generate call (loads model / creates session)
    await this.activeProvider.initialize();

    return this.activeProvider.generate(prompt, options);
  }

  /**
   * Download the Llama model. Only relevant when status is 'model-download-required'.
   * No-op if provider is Apple Foundation or Unsupported.
   */
  async downloadModel(
    onProgress?: (progress: number) => void,
  ): Promise<boolean> {
    await this.resolve();

    if (this.activeProvider instanceof LlamaProvider) {
      return this.activeProvider.downloadModel(onProgress);
    }

    return false;
  }

  /**
   * Delete the downloaded model to free storage.
   */
  async deleteModel(): Promise<void> {
    if (this.activeProvider instanceof LlamaProvider) {
      await this.activeProvider.deleteModel();
    }
  }

  /**
   * Get the active provider name for logging / diagnostics.
   */
  getProviderName(): LLMProviderName {
    return this.activeProvider?.name ?? "unsupported";
  }

  /**
   * Get device classification results for diagnostics.
   */
  getClassification(): ClassificationResult | null {
    return this.classification;
  }

  /**
   * Release all resources. Call when the app backgrounds or
   * the user navigates away from insight features.
   */
  async cleanup(): Promise<void> {
    if (this.activeProvider) {
      await this.activeProvider.cleanup();
    }
  }

  /**
   * Full reset — re-resolves provider on next use.
   * Useful after the user downloads iOS updates, etc.
   */
  async reset(): Promise<void> {
    await this.cleanup();
    this.activeProvider = null;
    this.classification = null;
  }

  private getUnsupportedMessage(): string {
    if (!this.classification) {
      return "Unable to determine device capabilities.";
    }

    const { totalRamMB, isArm64 } = this.classification.capabilities;

    if (!isArm64) {
      return (
        "Smart Insights requires a newer device with a 64-bit processor. " +
        "Your current device doesn't support on-device AI."
      );
    }

    if (totalRamMB < 3000) {
      return (
        `Smart Insights requires at least 3 GB of RAM to run the AI model. ` +
        `Your device has approximately ${Math.round(totalRamMB / 1000)} GB. ` +
        `This feature will be available if you upgrade to a newer device.`
      );
    }

    return "Smart Insights is not available on this device.";
  }
}

/** Singleton instance — import this in feature code. */
export const llmManager = new LLMProviderManager();
```

---

## How Feature Code Uses This

All existing feature code that calls llama.rn directly should be refactored to go through `llmManager`. The consuming code never knows (or cares) which provider is active.

### Generating Insights

```typescript
import { llmManager } from "@/services/llm/providerManager";

async function generateWeeklyRecap(
  weekData: WeeklyWorkoutData,
): Promise<string> {
  const status = await llmManager.getStatus();

  if (!status.ready) {
    // UI should have prevented us from getting here, but be defensive
    throw new Error(`LLM not ready: ${status.reason}`);
  }

  const prompt = buildRecapPrompt(weekData);

  const result = await llmManager.generate(prompt, {
    maxTokens: 200,
    temperature: 0.7,
  });

  return result.text;
}
```

### Checking Status in UI (Zustand Store Integration)

```typescript
import { llmManager } from "@/services/llm/providerManager";
import { LLMStatus } from "@/services/llm/types";

// Inside your insight widget store or hook:
const checkLLMStatus = async (): Promise<LLMStatus> => {
  return llmManager.getStatus();
};

// Use the status to control UI:
// status.ready === true                     → show insight content
// status.reason === 'model-download-required' → show download prompt
// status.reason === 'unsupported'           → show unsupported message
```

---

## UI States

### State 1: Apple Foundation Models Active (iOS)

No download needed. The user sees insight content immediately. There is no mention of AI models, downloads, or setup. It just works.

### State 2: Llama Model — Download Required

Shown when `getStatus()` returns `{ reason: 'model-download-required' }`.

**GymRx (Quiet Strength voice):**

```
┌──────────────────────────────────────────────┐
│                                              │
│  Enable Smart Insights                       │
│                                              │
│  Download a small AI model to unlock         │
│  personalized training analysis.             │
│                                              │
│  📦 [Model Name] ([size])                    │
│                                              │
│  • One-time download                         │
│  • Works completely offline                  │
│  • Your data stays on your device            │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │        Download & Enable             │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │           Not Now                    │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

**NutritionRx (Nourished Calm voice):**

```
┌──────────────────────────────────────────────┐
│                                              │
│  Set Up Smart Insights                       │
│                                              │
│  A small AI model helps us give you          │
│  personalized nutrition observations.        │
│                                              │
│  📦 [Model Name] ([size])                    │
│                                              │
│  • One-time download                         │
│  • Works entirely offline                    │
│  • Everything stays on your device           │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │        Download & Enable             │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │           Maybe Later                │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

The `[Model Name]` and `[size]` are populated dynamically from `getStatus()`. A user with 8 GB RAM sees "SmolLM2 1.7B (~1 GB)". A user with 4 GB RAM sees "Llama 3.2 1B (~670 MB)". The user does not choose — we prescribe the best model for their device.

### State 3: Download In Progress

```
┌──────────────────────────────────────────────┐
│                                              │
│  Setting Up Smart Insights                   │
│                                              │
│  ████████████░░░░░░░░  65%                   │
│                                              │
│  Downloading AI model...                     │
│  This is a one-time setup.                   │
│                                              │
└──────────────────────────────────────────────┘
```

### State 4: Device Unsupported

Shown when `getStatus()` returns `{ reason: 'unsupported' }`.

**GymRx:**

```
┌──────────────────────────────────────────────┐
│                                              │
│  Smart Insights Unavailable                  │
│                                              │
│  [Dynamic message from status.message]       │
│                                              │
│  All other premium features work             │
│  normally on your device.                    │
│                                              │
└──────────────────────────────────────────────┘
```

**NutritionRx:**

```
┌──────────────────────────────────────────────┐
│                                              │
│  Smart Insights Unavailable                  │
│                                              │
│  [Dynamic message from status.message]       │
│                                              │
│  Your other premium features are             │
│  fully available.                            │
│                                              │
└──────────────────────────────────────────────┘
```

The dynamic message explains specifically WHY (not enough RAM, processor too old) so the user understands it's a hardware limitation, not a bug.

---

## Settings Integration

Add an entry in the app settings under a "Smart Insights" or "AI Features" section:

```
Smart Insights
├── Status: [Active — Apple Intelligence] or [Active — SmolLM2 1.7B] or [Unavailable]
├── Model Storage: [1.02 GB used]         ← only shown for Llama provider
├── [Delete AI Model]                     ← only shown for Llama provider
└── Provider: [apple-foundation | llama-standard | etc]  ← subtle, for diagnostics
```

When the user taps "Delete AI Model":

1. Confirm with an alert
2. Call `llmManager.deleteModel()`
3. Status reverts to `model-download-required`
4. Insight widgets show the download prompt again

---

## Prompt Compatibility Across Providers

Both Apple Foundation Models and the llama.rn GGUF models handle standard instruction-following prompts. Use the same prompt templates you've already built — they work across all providers.

One thing to be aware of: Apple's ~3B Foundation Model is specifically noted as NOT being a general chatbot. It excels at summarization, extraction, classification, and structured tasks — which is exactly what your fitness insight prompts do. Don't try to use it for open-ended conversation.

If you find that Apple Foundation Models produces noticeably different quality or formatting compared to the Llama models for the same prompt, you can add a light prompt adapter:

```typescript
function adaptPrompt(prompt: string, provider: LLMProviderName): string {
  // Apple Foundation Models sometimes respond better with shorter,
  // more direct instructions. Adjust only if needed after testing.
  if (provider === "apple-foundation") {
    return prompt; // Start with the same prompt, tune later if needed
  }
  return prompt;
}
```

---

## Memory Management

Local LLMs consume significant RAM while loaded. Follow these patterns:

1. **Load on demand** — Don't call `initialize()` at app startup. Load when the user opens an insight screen.
2. **Release on navigate away** — Call `llmManager.cleanup()` when the user leaves the insights section. The model can be reloaded if they come back.
3. **Release on background** — Use `AppState` listener to cleanup when the app backgrounds.

```typescript
import { AppState } from "react-native";

AppState.addEventListener("change", (nextState) => {
  if (nextState !== "active") {
    llmManager.cleanup();
  }
});
```

Apple Foundation Models don't have this concern — the OS manages the model's memory lifecycle. But the cleanup calls are safe no-ops for that provider.

---

## Migration from Current Implementation

Both apps currently have llama.rn code scattered in feature-specific services (e.g., `src/features/weeklyRecap/services/llamaService.ts`). To migrate:

1. Create the new `src/services/llm/` directory structure from this spec
2. Update all existing llama.rn call sites to import from `llmManager` instead
3. Remove the old `llamaService.ts` files (or keep as thin wrappers that delegate to `llmManager`)
4. The model download URL and path may change — ensure the new `modelCatalog.ts` URLs are correct
5. If a user already has the old SmolLM2 model downloaded, the new code should detect it if the filename matches. If filenames differ, handle migration (copy/rename or re-download).

---

## Testing Checklist

### iOS — Apple Foundation Models Path

- [ ] On iPhone 15 Pro+ with iOS 26+ and Apple Intelligence enabled: `getStatus()` returns `{ ready: true, provider: 'apple-foundation' }`
- [ ] `generate()` returns a coherent response to a fitness insight prompt
- [ ] On iPhone 14 or older: Falls through to Llama provider correctly
- [ ] On iOS 25 or earlier: Falls through to Llama provider correctly
- [ ] On iPhone 15 Pro with Apple Intelligence disabled: Falls through to Llama
- [ ] `cleanup()` disposes the session without errors
- [ ] Calling `generate()` after `cleanup()` re-initializes automatically

### Llama — Device-Appropriate Model Selection

- [ ] Device with 8 GB RAM: Selects SmolLM2 1.7B (standard)
- [ ] Device with 5 GB RAM: Selects Llama 3.2 1B (compact)
- [ ] Device with 3.5 GB RAM: Selects Qwen2.5 0.5B (minimal)
- [ ] `getStatus()` returns `model-download-required` before download
- [ ] `downloadModel()` downloads the correct model file with progress callbacks
- [ ] `getStatus()` returns `{ ready: true }` after download
- [ ] `generate()` produces a coherent response
- [ ] `deleteModel()` removes the file and status reverts to `model-download-required`
- [ ] Download screen shows the correct model name and size for the device

### Unsupported Devices

- [ ] Device with 2 GB RAM: `getStatus()` returns `unsupported` with RAM message
- [ ] Non-arm64 device: `getStatus()` returns `unsupported` with processor message
- [ ] UI shows the unsupported message, not a crash
- [ ] Other premium features still work normally

### Android-Specific

- [ ] No Apple Foundation Models check is attempted
- [ ] Llama model selection works correctly based on RAM
- [ ] Download and inference work end-to-end

### General

- [ ] `cleanup()` on app background releases model memory
- [ ] Re-entering insights after background reloads model successfully
- [ ] Switching between insight widgets doesn't reload model unnecessarily
- [ ] Settings screen shows correct provider and storage info

---

## Summary

| Scenario                         | iOS                                        | Android                         |
| -------------------------------- | ------------------------------------------ | ------------------------------- |
| Flagship with Apple Intelligence | Foundation Models (~3B, free, no download) | n/a                             |
| 6+ GB RAM, arm64                 | SmolLM2 1.7B (~1 GB download)              | SmolLM2 1.7B (~1 GB download)   |
| 4-6 GB RAM, arm64                | Llama 3.2 1B (~670 MB download)            | Llama 3.2 1B (~670 MB download) |
| 3-4 GB RAM, arm64                | Qwen2.5 0.5B (~390 MB download)            | Qwen2.5 0.5B (~390 MB download) |
| < 3 GB RAM or non-arm64          | Feature disabled, message shown            | Feature disabled, message shown |
