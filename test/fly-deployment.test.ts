import { describe, expect, it } from 'vitest';
import { validateFlyDeployment } from '../scripts/validate-fly-deployment.mjs';

const configured = {
  ENABLE_FLY_DEPLOY: 'true',
  FLY_APP: 'my-travel-starter',
  FLY_DEPLOY_URL: 'https://my-travel-starter.fly.dev',
  NEXT_PUBLIC_NOODLE_SERVICE_URL: 'https://cloud.noodleseed.dev',
  NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: 'public-test-embed',
};

describe('opt-in Fly deployment coordinates', () => {
  it('accepts explicitly enabled deployment with adopter-owned coordinates', () => {
    expect(() => validateFlyDeployment(configured)).not.toThrow();
    expect(() => validateFlyDeployment({ ...configured, FLY_DEPLOY_URL: 'https://travel.example.com' })).not.toThrow();
  });
  it.each([undefined, '', 'false', 'TRUE', '1'])('requires explicit opt-in: %s', (enabled) => {
    expect(() => validateFlyDeployment({ ...configured, ENABLE_FLY_DEPLOY: enabled })).toThrow('ENABLE_FLY_DEPLOY');
  });
  it.each(['', '-bad', 'bad-', 'My-App', 'app/name', 'a'.repeat(64)])('rejects invalid app names: %s', (app) => {
    expect(() => validateFlyDeployment({ ...configured, FLY_APP: app })).toThrow('FLY_APP');
  });
  it.each(['', 'http://app.fly.dev', 'https://localhost', 'https://app.fly.dev/', 'https://app.fly.dev/path', 'https://app.fly.dev?x=1', 'https://app.fly.dev#x', 'https://user:secret@app.fly.dev', 'https://*.fly.dev', ' https://app.fly.dev'])('rejects invalid deployment origins: %s', (url) => {
    expect(() => validateFlyDeployment({ ...configured, FLY_DEPLOY_URL: url })).toThrow('FLY_DEPLOY_URL');
  });
  it('requires the public assistant coordinates', () => {
    expect(() => validateFlyDeployment({ ...configured, NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: '' })).toThrow('NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID');
    expect(() => validateFlyDeployment({ ...configured, NEXT_PUBLIC_NOODLE_SERVICE_URL: 'http://cloud.noodleseed.dev' })).toThrow('NEXT_PUBLIC_NOODLE_SERVICE_URL');
  });
});
