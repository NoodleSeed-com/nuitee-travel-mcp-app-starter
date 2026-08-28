'use client';

import type { Ref } from 'react';
import { TravelHero } from './travel-hero';

interface TravelZeroStateProps {
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

export function TravelZeroState({
  inputRef,
  launchError = null,
  onStart,
}: Readonly<TravelZeroStateProps>) {
  return (
    <div className="travel-landing">
      <TravelHero
        inputRef={inputRef}
        launchError={launchError}
        onStart={onStart}
      />
    </div>
  );
}
