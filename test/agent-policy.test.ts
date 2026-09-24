import { describe, expect, it } from 'vitest';
import { publicTravelAssistantPolicy, travelAgentPolicy } from '../src/agent-policy.js';
import { createTravelServer } from '../src/travel-server.js';

describe('travel policy delivery', () => {
  for (const profile of ['starter', 'expanded-travel'] as const) {
    for (const mode of ['credential-free', 'live', 'embedded'] as const) {
      it(`preserves shared policy and profile guidance in ${profile}/${mode}`, async () => {
        const manifest = await createTravelServer(mode, profile).toManifest();
        const instructions = manifest.server.instructions!;
        expect(instructions.length).toBeLessThanOrEqual(4_000);
        expect(instructions.startsWith(`${travelAgentPolicy}\n\nActive travel profile:\n`)).toBe(true);
        expect(instructions.slice(travelAgentPolicy.length).trim().length).toBeGreaterThan(100);
        expect(manifest.server.agentGuide).toBeDefined();

        if (mode === 'embedded') {
          expect(manifest.server.assistant?.surfaces).toHaveLength(1);
          expect(manifest.server.assistant?.surfaces?.[0]).toMatchObject({
            mode: 'public',
            instructions: publicTravelAssistantPolicy,
          });
          expect(publicTravelAssistantPolicy.length).toBeLessThanOrEqual(4_000);
        } else {
          expect(manifest.server.assistant).toBeUndefined();
        }
      });
    }
  }
});
