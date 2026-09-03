import { describe, expect, it } from 'vitest';
import {
  landingDestinations,
  landingEditorialFeature,
} from '../src/lib/landing-content';

describe('airline editorial landing content', () => {
  it('defines five deterministic destination prompt entries', () => {
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
      {
        id: 'lisbon',
        name: 'Lisbon',
        descriptor: 'Sunlit stays',
        prompt: 'Help me plan flights and a three-night stay in Lisbon.',
        imageSrc: '/images/destinations/lisbon-editorial-v1.png',
        imagePosition: '50% 54%',
      },
      {
        id: 'banff',
        name: 'Banff',
        descriptor: 'Mountain escapes',
        prompt: 'Plan a flight and hotel trip to Banff for two.',
        imageSrc: '/images/destinations/banff-editorial-v1.png',
        imagePosition: '50% 48%',
      },
    ]);
  });

  it('defines one honest unified demo-trip editorial prompt', () => {
    expect(landingEditorialFeature).toEqual({
      heading: 'One conversation, every part of the trip.',
      support: 'Refine current flights and stays, then preview rewards as you go.',
      action: 'Build a trip',
      prompt: 'Help me build a trip somewhere warm with flexible dates and a hotel.',
    });
  });

  it('keeps every destination id and submitted prompt unique', () => {
    expect(new Set(landingDestinations.map(({ id }) => id)).size).toBe(5);
    expect(new Set(landingDestinations.map(({ prompt }) => prompt)).size).toBe(5);
  });
});
