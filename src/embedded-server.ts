import { createTravelServer } from './travel-server.js';

// Optional website/SaaS entrypoint used by the companion documented in
// docs/EMBEDDED_ASSISTANT.md. Add the deployment-owned HTTPS origin through the
// presentation config and remove localhost unless the deployment explicitly
// needs it. Configure model settings and NUITEE_API_KEY only in Noodle. The
// business tools and widgets remain identical to src/live-server.ts.
export default createTravelServer('embedded');
