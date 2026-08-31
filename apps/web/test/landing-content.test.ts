import { describe, expect, it } from 'vitest';
import {
  landingDestinations,
  landingEditorialFeature,
} from '../src/lib/landing-content';

describe('airline editorial landing content', () => {
  it('defines three deterministic destination prompt entries', () => {
    expect(landingDestinations).toEqual([
      {
        id: 'rome',
        name: 'Rome',
        descriptor: 'Long weekends',
        prompt: 'Help me plan a long-weekend flight to Rome for two.',
        imageSrc: '/images/destinations/rome-editorial-v2.jpg',
        imagePosition: '72% 48%',
      },
      {
        id: 'london',
        name: 'London',
        descriptor: 'Nonstop options',
        prompt: 'Compare nonstop flight options to London.',
        imageSrc: '/images/destinations/london-editorial-v2.jpg',
        imagePosition: '58% 50%',
      },
      {
        id: 'istanbul',
        name: 'Istanbul',
        descriptor: 'Flexible dates',
        prompt: 'Find flights to Istanbul with flexible dates.',
        imageSrc: '/images/destinations/istanbul-editorial-v2.jpg',
        imagePosition: '30% 50%',
      },
    ]);
  });

  it('defines one honest flexible-trip editorial prompt', () => {
    expect(landingEditorialFeature).toEqual({
      heading: 'Plans change. Wayfare keeps up.',
      support: 'Refine the dates, travellers, cabin, and route as you go.',
      action: 'Start with a flexible trip',
      prompt: 'Help me find a trip somewhere warm with flexible dates.',
    });
  });

  it('keeps every destination id and submitted prompt unique', () => {
    expect(new Set(landingDestinations.map(({ id }) => id)).size).toBe(3);
    expect(new Set(landingDestinations.map(({ prompt }) => prompt)).size).toBe(3);
  });
});
