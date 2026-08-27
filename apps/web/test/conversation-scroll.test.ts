import { describe, expect, it } from 'vitest';
import { isNearTranscriptEnd } from '../src/lib/conversation-scroll';

describe('conversation scroll ownership', () => {
  it('follows only when the reader is within thirty pixels of the end', () => {
    expect(isNearTranscriptEnd({
      scrollHeight: 1_000,
      scrollTop: 870,
      clientHeight: 100,
    })).toBe(true);
    expect(isNearTranscriptEnd({
      scrollHeight: 1_000,
      scrollTop: 600,
      clientHeight: 100,
    })).toBe(false);
  });

  it('treats tiny negative layout drift as being at the end', () => {
    expect(isNearTranscriptEnd({
      scrollHeight: 999.5,
      scrollTop: 900,
      clientHeight: 100,
    })).toBe(true);
  });

  it('accepts an explicit threshold without changing the default', () => {
    const metrics = {
      scrollHeight: 1_000,
      scrollTop: 850,
      clientHeight: 100,
    };

    expect(isNearTranscriptEnd(metrics)).toBe(false);
    expect(isNearTranscriptEnd(metrics, 50)).toBe(true);
  });
});
