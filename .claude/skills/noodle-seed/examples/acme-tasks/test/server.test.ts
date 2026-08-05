import { describe, expect, it } from 'vitest';
import app from '../src/server.js';

describe('acme-tasks example', () => {
  it('exports a Noodle server definition', () => {
    expect(typeof app.toManifest).toBe('function');
  });

  it('exposes a tool for each of the top-3 prioritized flows', async () => {
    // Capture → add_task, Prioritize → list_today (+ set_priority helper), Complete → complete_task.
    const text = JSON.stringify(await app.toManifest());
    expect(text).toContain('add_task');
    expect(text).toContain('list_today');
    expect(text).toContain('complete_task');
    expect(text).toContain('set_priority');
  });

  it('seeds today’s list highest-priority first', async () => {
    const text = JSON.stringify(await app.toManifest());
    expect(text).toMatch(/"tasks":\[\{"id":"email_vendor".*"priority":"high"/);
  });

  it('opts the conversational completion action into runtime confirmation', async () => {
    const manifest = await app.toManifest();
    const completeTask = manifest.tools.find((candidate) => candidate.name === 'complete_task');
    const addTask = manifest.tools.find((candidate) => candidate.name === 'add_task');

    expect(completeTask?.annotations?.confirm).toBe(true);
    expect(addTask?.annotations).not.toHaveProperty('confirm');
  });
});
