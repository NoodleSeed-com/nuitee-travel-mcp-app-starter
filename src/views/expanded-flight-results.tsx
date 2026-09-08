import FlightResults from './flight-results.js';

/** Expanded travel profiles provide review_trip; the flight-only starter does not. */
export default function ExpandedFlightResults() {
  return <FlightResults tripReviewEnabled />;
}
