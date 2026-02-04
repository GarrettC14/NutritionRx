/**
 * Model Catalog Tests
 * Validates the LLM model catalog structure and ordering.
 */

import { MODEL_CATALOG, ModelDefinition } from '@/services/llm/modelCatalog';

describe('MODEL_CATALOG', () => {
  it('contains exactly 3 model definitions', () => {
    expect(MODEL_CATALOG).toHaveLength(3);
  });

  it('is ordered from highest to lowest minRamMB', () => {
    for (let i = 1; i < MODEL_CATALOG.length; i++) {
      expect(MODEL_CATALOG[i - 1].minRamMB).toBeGreaterThan(
        MODEL_CATALOG[i].minRamMB,
      );
    }
  });

  it('has unique ids for each model', () => {
    const ids = MODEL_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique providerNames for each model', () => {
    const names = MODEL_CATALOG.map((m) => m.providerName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has unique filenames for each model', () => {
    const filenames = MODEL_CATALOG.map((m) => m.filename);
    expect(new Set(filenames).size).toBe(filenames.length);
  });

  it('each model has valid fields', () => {
    MODEL_CATALOG.forEach((model: ModelDefinition) => {
      expect(model.id).toBeTruthy();
      expect(model.providerName).toMatch(/^llama-/);
      expect(model.displayName).toBeTruthy();
      expect(model.filename).toMatch(/\.gguf$/);
      expect(model.downloadUrl).toMatch(/^https:\/\//);
      expect(model.sizeBytes).toBeGreaterThan(0);
      expect(model.displaySize).toBeTruthy();
      expect(model.minRamMB).toBeGreaterThanOrEqual(3000);
      expect(model.contextLength).toBeGreaterThan(0);
      expect(model.nThreads).toBeGreaterThan(0);
    });
  });

  it('standard model requires 6GB+ RAM', () => {
    const standard = MODEL_CATALOG.find((m) => m.id === 'standard');
    expect(standard).toBeDefined();
    expect(standard!.minRamMB).toBe(6000);
  });

  it('compact model requires 4GB+ RAM', () => {
    const compact = MODEL_CATALOG.find((m) => m.id === 'compact');
    expect(compact).toBeDefined();
    expect(compact!.minRamMB).toBe(4000);
  });

  it('minimal model requires 3GB+ RAM', () => {
    const minimal = MODEL_CATALOG.find((m) => m.id === 'minimal');
    expect(minimal).toBeDefined();
    expect(minimal!.minRamMB).toBe(3000);
  });
});
