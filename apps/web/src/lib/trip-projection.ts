export type TripPhase =
  | 'idle'
  | 'searching'
  | 'comparing'
  | 'selected'
  | 'verifying'
  | 'verified'
  | 'error';

export interface TripProjection {
  readonly phase: TripPhase;
  readonly origin?: string;
  readonly destination?: string;
  readonly departureDate?: string;
  readonly returnDate?: string;
  readonly travelers?: string;
}

export const EMPTY_TRIP: TripProjection = { phase: 'idle' };
