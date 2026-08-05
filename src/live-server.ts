import { createTravelServer } from './travel-server.js';

// Use this entrypoint only after the deployment owner configures the managed
// NUITEE_API_KEY secret. It shares every tool schema, normalizer, state rule,
// and widget with the credential-free entrypoint.
export default createTravelServer('live');
