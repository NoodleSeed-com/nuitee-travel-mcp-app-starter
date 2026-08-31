'use client';

import type { Ref } from 'react';
import {
  NEUTRAL_TRAVEL_DEFAULTS,
  type TravelDefaults,
} from '../lib/travel-defaults';
import { DestinationInspiration } from './destination-inspiration';
import { TravelCapabilityStrip } from './travel-capability-strip';
import { TravelEditorialFeature } from './travel-editorial-feature';
import { TravelHero } from './travel-hero';

interface TravelZeroStateProps {
  readonly defaults?: TravelDefaults;
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

export function TravelZeroState({
  defaults = NEUTRAL_TRAVEL_DEFAULTS,
  inputRef,
  launchError = null,
  onStart,
}: Readonly<TravelZeroStateProps>) {
  return (
    <div className="travel-landing">
      <TravelHero
        defaults={defaults}
        inputRef={inputRef}
        launchError={launchError}
        onStart={onStart}
      />
      <DestinationInspiration onStart={onStart} />
      <TravelCapabilityStrip />
      <TravelEditorialFeature onStart={onStart} />
    </div>
  );
}
