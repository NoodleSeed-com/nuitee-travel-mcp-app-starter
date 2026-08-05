import { createTravelServer } from './travel-server.js';

// The default entrypoint is deliberately credential-free so the home App,
// ordinary tests, and Agent Kit baseline work without any provider secret.
export default createTravelServer('credential-free');
