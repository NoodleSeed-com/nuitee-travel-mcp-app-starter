import { createTravelServer } from './travel-server.js';

// Optional website/SaaS entrypoint. Replace the illustrative exact allowed
// origin in travel-server.ts, then configure the three managed model settings
// and NUITEE_API_KEY server-side. The business tools and widgets are identical
// to src/live-server.ts.
export default createTravelServer('embedded');
