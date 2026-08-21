import { createTravelServer } from './travel-server.js';

// Optional website/SaaS entrypoint used by the companion documented in
// docs/EMBEDDED_ASSISTANT.md. Replace the illustrative production origin in
// travel-server.ts, then configure the model settings and NUITEE_API_KEY only
// in the Noodle deployment. The business tools and widgets remain identical to
// src/live-server.ts.
export default createTravelServer('embedded');
