import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Deterministic transport data exercises the actual SDK. It is not an AI evaluation.
export async function createBusinessModelFixture() {
  const requests = [];
  const directory = await mkdtemp(join(tmpdir(), 'business-model-fixture-'));
  const server = createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks)); requests.push(body);
      const hasToolResult = body.messages?.at(-1)?.role === 'tool';
      const knowledgeTurn = JSON.stringify(body.messages?.findLast(message => message.role === 'user')).includes('desk hours');
      const delta = hasToolResult ? { content: 'Fixture answer from the connected business assistant.' }
        : { tool_calls: [{ index: 0, id: `fixture_tool_call_${requests.length}`, type: 'function', function: { name: knowledgeTurn ? 'search_business_knowledge' : 'open_travel_starter', arguments: knowledgeTurn ? JSON.stringify({ query: 'desk opens Tuesday' }) : '{}' } }] };
      if (!body.stream) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'fixture', object: 'chat.completion', created: 1, model: 'fictional-model', choices: [{ index: 0, message: { role: 'assistant', ...delta }, finish_reason: hasToolResult ? 'stop' : 'tool_calls' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      for (const value of [
        { id: 'fixture', object: 'chat.completion.chunk', created: 1, model: 'fictional-model', choices: [{ index: 0, delta, finish_reason: null }] },
        { id: 'fixture', object: 'chat.completion.chunk', created: 1, model: 'fictional-model', choices: [{ index: 0, delta: {}, finish_reason: hasToolResult ? 'stop' : 'tool_calls' }] },
      ]) res.write(`data: ${JSON.stringify(value)}\n\n`);
      res.end('data: [DONE]\n\n');
    } catch { res.writeHead(400); res.end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const preloadPath = join(directory, 'model-fetch.mjs');
  const installer = new URL('./business-model-fetch.mjs', import.meta.url).href;
  await writeFile(preloadPath, `import { installBusinessModelFixture } from ${JSON.stringify(installer)};\ninstallBusinessModelFixture(${JSON.stringify(origin)});\n`, { mode: 0o600 });
  return {
    requests, origin, workerExecArgv: ['--import', preloadPath],
    async close() { await new Promise(done => server.close(done)); await rm(directory, { recursive: true, force: true }); },
  };
}
