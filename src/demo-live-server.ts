import { createTravelServer } from './travel-server.js';

// Private demonstration entrypoint. It reuses the starter's live Nuitee
// flight capabilities and adds clearly synthetic stays and rewards. The
// ordinary live entrypoint remains flights-only.
export default createTravelServer('live', 'flightcatchers-demo');
