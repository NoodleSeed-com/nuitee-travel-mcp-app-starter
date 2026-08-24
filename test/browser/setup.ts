import { vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network access is disabled in browser fixture tests.'))));

document.documentElement.style.margin = '0';
document.body.style.margin = '0';
