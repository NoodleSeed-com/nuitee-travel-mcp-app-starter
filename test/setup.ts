import { vi } from 'vitest';

// Ordinary tests must be hermetic. Provider behavior is supplied through
// fictional fixtures and the gateway's injected callOperation boundary.
vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network access is disabled in ordinary tests.'))));
