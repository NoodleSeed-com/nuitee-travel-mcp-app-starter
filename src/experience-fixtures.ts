export interface ExperienceFixture {
  readonly key: string;
  readonly city: 'Lisbon' | 'Tokyo';
  readonly countryCode: 'PT' | 'JP';
  readonly timeZone: 'Europe/Lisbon' | 'Asia/Tokyo';
  readonly title: string;
  readonly operatorLabel: string;
  readonly shortDescription: string;
  readonly categories: readonly string[];
  readonly durationMinutes: number;
  readonly meetingArea: string;
  readonly accessibility: { readonly stepFree: boolean; readonly summary: string };
  readonly inclusions: readonly string[];
  readonly restrictions: readonly string[];
  readonly cancellationPolicy: string;
  readonly localTimes: readonly string[];
  readonly pricesMinor: Readonly<Record<string, number>>;
}

export const DEMO_EXPERIENCE_CATALOG: Readonly<Record<string, readonly ExperienceFixture[]>> = {
  LISBON: [
    {
      key: 'demo_experience_lisbon_alfama_tastes_tiles',
      city: 'Lisbon', countryCode: 'PT', timeZone: 'Europe/Lisbon',
      title: 'Alfama Tastes & Tiles Walk', operatorLabel: 'Wayfare Alfama Studio',
      shortDescription: 'A small-group tasting walk through hillside lanes, family kitchens, and a fictional tile studio.',
      categories: ['FOOD', 'CULTURE', 'CRAFT'], durationMinutes: 180, meetingArea: 'Alfama river gate',
      accessibility: { stepFree: false, summary: 'Moderate hills and steps.' },
      inclusions: ['Five tasting stops', 'Local host', 'Tile-studio visit'],
      restrictions: ['Not step-free.', 'Comfortable walking shoes suggested.'],
      cancellationPolicy: 'Free cancellation until 24 hours before the fictional slot.',
      localTimes: ['09:30', '15:00'], pricesMinor: { CAD: 10_900, USD: 8_000, EUR: 7_400, GBP: 6_400, JPY: 12_100 },
    },
    {
      key: 'demo_experience_lisbon_tagus_sunset_sailing',
      city: 'Lisbon', countryCode: 'PT', timeZone: 'Europe/Lisbon',
      title: 'Tagus Sunset Sailing Circle', operatorLabel: 'Wayfare Tagus Circle',
      shortDescription: 'A quiet fictional harbor sail with skyline storytelling and a small seasonal snack.',
      categories: ['WATER', 'EVENING', 'CULTURE'], durationMinutes: 120, meetingArea: 'Belém marina meeting point',
      accessibility: { stepFree: false, summary: 'Assisted boarding may be requested.' },
      inclusions: ['Two-hour sail', 'Welcome drink', 'Light snack'],
      restrictions: ['Weather-sensitive.', 'Assisted boarding must be requested.'],
      cancellationPolicy: 'Free cancellation until 48 hours before the fictional slot.',
      localTimes: ['18:30'], pricesMinor: { CAD: 8_600, USD: 6_300, EUR: 5_800, GBP: 5_000, JPY: 9_500 },
    },
    {
      key: 'demo_experience_lisbon_belem_makers',
      city: 'Lisbon', countryCode: 'PT', timeZone: 'Europe/Lisbon',
      title: 'Belém Makers Morning', operatorLabel: 'Wayfare Riverside Makers',
      shortDescription: 'Meet fictional local makers, try a simple print workshop, and explore riverside design landmarks.',
      categories: ['DESIGN', 'FAMILY', 'CULTURE'], durationMinutes: 150, meetingArea: 'Belém cultural district',
      accessibility: { stepFree: true, summary: 'A step-free route is available.' },
      inclusions: ['Workshop materials', 'Local host', 'Take-home print'],
      restrictions: ['Children under eight require an accompanying adult.'],
      cancellationPolicy: 'Free cancellation until 24 hours before the fictional slot.',
      localTimes: ['10:00'], pricesMinor: { CAD: 6_800, USD: 5_000, EUR: 4_600, GBP: 4_000, JPY: 7_600 },
    },
  ],
  TOKYO: [
    {
      key: 'demo_experience_tokyo_yanaka_food_craft',
      city: 'Tokyo', countryCode: 'JP', timeZone: 'Asia/Tokyo',
      title: 'Yanaka Food & Craft Walk', operatorLabel: 'Wayfare Yanaka Workshop',
      shortDescription: 'A fictional small-group walk connecting neighborhood snacks, ceramics, and family-run workshops.',
      categories: ['FOOD', 'CRAFT', 'CULTURE'], durationMinutes: 180, meetingArea: 'Yanaka neighborhood gate',
      accessibility: { stepFree: false, summary: 'Mostly level with one short stairway.' },
      inclusions: ['Four tastings', 'Bilingual host', 'Craft demonstration'],
      restrictions: ['Dietary needs must be checked before the demo slot.'],
      cancellationPolicy: 'Free cancellation until 24 hours before the fictional slot.',
      localTimes: ['10:00', '14:30'], pricesMinor: { CAD: 8_900, USD: 6_500, EUR: 6_000, GBP: 5_200, JPY: 9_800 },
    },
    {
      key: 'demo_experience_tokyo_sumida_waterways',
      city: 'Tokyo', countryCode: 'JP', timeZone: 'Asia/Tokyo',
      title: 'Sumida Evening Waterways', operatorLabel: 'Wayfare Sumida Stories',
      shortDescription: 'Follow a fictional river story from old merchant districts to contemporary waterside design.',
      categories: ['WATER', 'EVENING', 'DESIGN'], durationMinutes: 120, meetingArea: 'Kuramae riverside meeting point',
      accessibility: { stepFree: true, summary: 'A step-free pier route is available.' },
      inclusions: ['Boat passage', 'Neighborhood host', 'Tea'],
      restrictions: ['Weather-sensitive.', 'No live vessel availability is checked.'],
      cancellationPolicy: 'Free cancellation until 48 hours before the fictional slot.',
      localTimes: ['17:30'], pricesMinor: { CAD: 6_900, USD: 5_100, EUR: 4_700, GBP: 4_100, JPY: 7_600 },
    },
    {
      key: 'demo_experience_tokyo_quiet_tea_design',
      city: 'Tokyo', countryCode: 'JP', timeZone: 'Asia/Tokyo',
      title: 'Quiet Tea & Design Studio', operatorLabel: 'Wayfare Kiyosumi Studio',
      shortDescription: 'A calm fictional studio session pairing modern Japanese objects with a guided seasonal tea tasting.',
      categories: ['TEA', 'DESIGN', 'CULTURE'], durationMinutes: 90, meetingArea: 'Kiyosumi studio quarter',
      accessibility: { stepFree: true, summary: 'Step-free studio access is available.' },
      inclusions: ['Tea tasting', 'Design talk', 'Printed studio notes'],
      restrictions: ['Recommended for ages 12 and older.'],
      cancellationPolicy: 'Non-refundable within 24 hours of the fictional slot.',
      localTimes: ['11:00', '16:00'], pricesMinor: { CAD: 5_900, USD: 4_400, EUR: 4_000, GBP: 3_500, JPY: 6_500 },
    },
  ],
};

export const DEMO_EXPERIENCE_ALIASES: Readonly<Record<string, keyof typeof DEMO_EXPERIENCE_CATALOG>> = {
  LISBON: 'LISBON',
  LIS: 'LISBON',
  TOKYO: 'TOKYO',
  TYO: 'TOKYO',
  HND: 'TOKYO',
  NRT: 'TOKYO',
};
