import { describe, it, expect } from 'vitest';
import { RHYTHM_COLOUR } from './ECGWaveform';
import tailwindConfig from '../../tailwind.config.js';

// R-12: RHYTHM_COLOUR in ECGWaveform.tsx must stay in sync with
// vital.rhythm.* tokens in tailwind.config.js. This test enforces that
// automatically — if either side changes without updating the other, it fails.
describe('ECGWaveform RHYTHM_COLOUR sync (R-12)', () => {
  it('matches vital-rhythm-* tokens in tailwind.config.js', () => {
    const rhythmTokens = tailwindConfig.theme.extend.colors.vital.rhythm as Record<string, string>;

    // HeartRhythm key → tailwind token key
    const mapping: Record<string, string> = {
      Sinus:       'sinus',
      Bradycardia: 'bradycardia',
      SVT:         'svt',
      VTach:       'vtach',
      VFib:        'vfib',
      Asystole:    'asystole',
      PEA:         'pea',
    };

    for (const [rhythmKey, tokenKey] of Object.entries(mapping)) {
      expect(
        RHYTHM_COLOUR[rhythmKey as keyof typeof RHYTHM_COLOUR],
        `RHYTHM_COLOUR.${rhythmKey} must match tailwind vital.rhythm.${tokenKey}`,
      ).toBe(rhythmTokens[tokenKey]);
    }
  });
});
