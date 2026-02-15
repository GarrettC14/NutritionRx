import { withAlpha, relativeLuminance, contrastTextColor } from '../colorUtils';

describe('withAlpha', () => {
  it('converts black with alpha 0.5 to rgba string', () => {
    expect(withAlpha('#000000', 0.5)).toBe('rgba(0,0,0,0.5)');
  });

  it('converts white with alpha 1 to rgba string', () => {
    expect(withAlpha('#FFFFFF', 1)).toBe('rgba(255,255,255,1)');
  });

  it('converts an arbitrary color #FF5733 with alpha 0.3', () => {
    // R=0xFF=255, G=0x57=87, B=0x33=51
    expect(withAlpha('#FF5733', 0.3)).toBe('rgba(255,87,51,0.3)');
  });

  it('handles alpha 0 (fully transparent)', () => {
    expect(withAlpha('#123456', 0)).toBe('rgba(18,52,86,0)');
  });

  it('handles alpha 1 (fully opaque)', () => {
    expect(withAlpha('#ABCDEF', 1)).toBe('rgba(171,205,239,1)');
  });

  it('handles lowercase hex input', () => {
    expect(withAlpha('#ff0000', 0.8)).toBe('rgba(255,0,0,0.8)');
  });
});

describe('relativeLuminance', () => {
  it('returns 0 for black (#000000)', () => {
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('returns approximately 1 for white (#FFFFFF)', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 4);
  });

  it('returns approximately 0.2126 for pure red (#FF0000)', () => {
    expect(relativeLuminance('#FF0000')).toBeCloseTo(0.2126, 4);
  });

  it('returns approximately 0.7152 for pure green (#00FF00)', () => {
    expect(relativeLuminance('#00FF00')).toBeCloseTo(0.7152, 4);
  });

  it('returns approximately 0.0722 for pure blue (#0000FF)', () => {
    expect(relativeLuminance('#0000FF')).toBeCloseTo(0.0722, 4);
  });

  it('returns the sum of r+g+b coefficients for white', () => {
    // White = linearize(255) for each channel
    // L = 0.2126*1 + 0.7152*1 + 0.0722*1 = 1.0
    const lum = relativeLuminance('#FFFFFF');
    expect(lum).toBeCloseTo(0.2126 + 0.7152 + 0.0722, 4);
  });

  it('computes luminance for a mid-gray (#808080)', () => {
    // 128/255 = 0.50196... > 0.03928 => linearize = ((0.50196+0.055)/1.055)^2.4
    // Expected ~0.2159 (sRGB mid-gray)
    const lum = relativeLuminance('#808080');
    expect(lum).toBeGreaterThan(0.2);
    expect(lum).toBeLessThan(0.25);
  });

  it('luminance increases monotonically from dark to light gray', () => {
    const dark = relativeLuminance('#333333');
    const mid = relativeLuminance('#888888');
    const light = relativeLuminance('#CCCCCC');
    expect(dark).toBeLessThan(mid);
    expect(mid).toBeLessThan(light);
  });
});

describe('contrastTextColor', () => {
  it('returns white text for a dark background (#000000)', () => {
    expect(contrastTextColor('#000000')).toBe('#FFFFFF');
  });

  it('returns dark text for a light background (#FFFFFF)', () => {
    expect(contrastTextColor('#FFFFFF')).toBe('#1F2328');
  });

  it('returns white text for a very dark color (#1A1A1A)', () => {
    expect(contrastTextColor('#1A1A1A')).toBe('#FFFFFF');
  });

  it('returns dark text for a very light color (#F0F0F0)', () => {
    expect(contrastTextColor('#F0F0F0')).toBe('#1F2328');
  });

  it('returns dark text for yellow (#FFFF00) which has high luminance', () => {
    // Yellow has luminance ~0.9278, very high => dark text has better contrast
    expect(contrastTextColor('#FFFF00')).toBe('#1F2328');
  });

  it('returns white text for dark blue (#000080)', () => {
    expect(contrastTextColor('#000080')).toBe('#FFFFFF');
  });

  it('picks the color with the higher WCAG contrast ratio', () => {
    // For a medium gray, we verify the function picks correctly
    // by computing the expected ratio ourselves
    const bgHex = '#808080';
    const bgLum = relativeLuminance(bgHex);
    const whiteLum = 1.0;
    const darkLum = 0.024;

    const whiteRatio =
      (Math.max(bgLum, whiteLum) + 0.05) /
      (Math.min(bgLum, whiteLum) + 0.05);
    const darkRatio =
      (Math.max(bgLum, darkLum) + 0.05) /
      (Math.min(bgLum, darkLum) + 0.05);

    const expected = whiteRatio >= darkRatio ? '#FFFFFF' : '#1F2328';
    expect(contrastTextColor(bgHex)).toBe(expected);
  });
});
