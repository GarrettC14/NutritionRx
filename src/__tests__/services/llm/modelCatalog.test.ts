/**
 * Tests for src/services/llm/modelCatalog.ts
 *
 * Validates the MODEL_CATALOG entries and the selectModelForDevice function
 * that picks the best model tier based on device RAM.
 */

import { MODEL_CATALOG, selectModelForDevice, ModelConfig } from '../../../services/llm/modelCatalog';

describe('MODEL_CATALOG', () => {
  it('has exactly 3 entries', () => {
    expect(MODEL_CATALOG).toHaveLength(3);
  });

  it('each entry has all required fields', () => {
    const requiredFields: (keyof ModelConfig)[] = [
      'tier',
      'name',
      'filename',
      'downloadUrl',
      'sizeBytes',
      'minRAMGB',
      'contextSize',
      'threads',
      'chatTemplate',
      'stopTokens',
    ];

    for (const model of MODEL_CATALOG) {
      for (const field of requiredFields) {
        expect(model).toHaveProperty(field);
        expect(model[field]).toBeDefined();
      }
    }
  });

  it('models are ordered by descending RAM requirement (standard first)', () => {
    expect(MODEL_CATALOG[0].tier).toBe('standard');
    expect(MODEL_CATALOG[1].tier).toBe('compact');
    expect(MODEL_CATALOG[2].tier).toBe('minimal');

    // Verify descending minRAMGB order
    for (let i = 0; i < MODEL_CATALOG.length - 1; i++) {
      expect(MODEL_CATALOG[i].minRAMGB).toBeGreaterThan(MODEL_CATALOG[i + 1].minRAMGB);
    }
  });
});

describe('selectModelForDevice', () => {
  it('returns standard model for 8GB device', () => {
    const result = selectModelForDevice(8);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('standard');
  });

  it('returns standard model for exactly 6GB device', () => {
    const result = selectModelForDevice(6);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('standard');
  });

  it('returns compact model for 5GB device', () => {
    const result = selectModelForDevice(5);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('compact');
  });

  it('returns compact model for exactly 4GB device', () => {
    const result = selectModelForDevice(4);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('compact');
  });

  it('returns minimal model for 3.5GB device', () => {
    const result = selectModelForDevice(3.5);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('minimal');
  });

  it('returns minimal model for exactly 3GB device', () => {
    const result = selectModelForDevice(3);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('minimal');
  });

  it('returns null for 2GB device', () => {
    const result = selectModelForDevice(2);
    expect(result).toBeNull();
  });

  it('returns null for 0GB device', () => {
    const result = selectModelForDevice(0);
    expect(result).toBeNull();
  });
});
