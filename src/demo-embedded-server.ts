import { createTravelServer } from './travel-server.js';

// Private Embedded Assistant demonstration entrypoint. It uses the same
// profile and capability instances as demo-live-server; only the assistant
// presentation and model transport differ.
export default createTravelServer('embedded', 'flightcatchers-demo');
