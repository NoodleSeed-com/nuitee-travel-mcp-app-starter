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
        imageSrc: '/images/destinations/rome-dawn-v1.jpg',
        imagePosition: 'center 48%',
      },
      {
        id: 'london',
        name: 'London',
        descriptor: 'Nonstop options',
        prompt: 'Compare nonstop flight options to London.',
        imageSrc: '/images/destinations/london-river-v1.jpg',
        imagePosition: 'center 52%',
      },
      {
        id: 'istanbul',
        name: 'Istanbul',
        descriptor: 'Flexible dates',
        prompt: 'Find flights to Istanbul with flexible dates.',
        imageSrc: '/images/destinations/istanbul-bosphorus-v1.jpg',
        imagePosition: 'center 46%',
      },
    ]);
  });

  it('defines one honest flexible-trip editorial prompt', () => {
    expect(landingEditorialFeature).toEqual({
      eyebrow: 'Travel inspiration',
      heading: 'A few words can take you somewhere new.',
      support: 'Refine the dates, travellers, cabin, and route as you go.',
      action: 'Start with a flexible trip',
      prompt: 'Help me find a trip somewhere warm with flexible dates.',
      imageSrc: '/images/destinations/warm-horizon-v1.jpg',
      imagePosition: 'center 54%',
    });
  });

  it('keeps every destination id and submitted prompt unique', () => {
    expect(new Set(landingDestinations.map(({ id }) => id)).size).toBe(3);
    expect(new Set(landingDestinations.map(({ prompt }) => prompt)).size).toBe(3);
  });
});
