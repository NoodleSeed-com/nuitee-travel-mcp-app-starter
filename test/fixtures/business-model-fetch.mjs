// Test-only transport boundary for actual SDK workers. Never import from product code.
import { Agent, fetch as undiciFetch, setGlobalDispatcher } from 'undici';
import { registerHooks } from 'node:module';

let fixtureDispatcher;
export function fixtureFetch(input, options) {
  if (!fixtureDispatcher) throw new Error('The fictional model fixture has not been installed.');
  return undiciFetch(input, { ...options, dispatcher: fixtureDispatcher });
}

export function installBusinessModelFixture(fixtureOrigin) {
  const destination = new URL(fixtureOrigin);
  if (destination.origin !== fixtureOrigin || destination.protocol !== 'http:' || destination.hostname !== '127.0.0.1' || !destination.port) {
    throw new Error('The fictional model fixture requires an explicit IPv4 loopback origin.');
  }
  const agent = new Agent();
  fixtureDispatcher = agent.compose(dispatch => (options, handler) => {
    const source = new URL(String(options.origin));
    if (source.origin === 'https://models.example.test') return dispatch({ ...options, origin: destination.origin }, handler);
    if (source.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(source.hostname)) return dispatch(options, handler);
    throw new Error('External requests are blocked by the fictional business fixture.');
  });
  setGlobalDispatcher(fixtureDispatcher);

  // The SDK supplies its own dispatcher to named Undici fetch. Node's public
  // module hooks replace that public transport export only within this test worker.
  // No SDK files, private imports, model parsing or MCP execution are replaced.
  const realUndici = JSON.stringify(import.meta.resolve('undici'));
  const fixtureModule = JSON.stringify(import.meta.url);
  const wrapperUrl = 'business-model-fixture:undici';
  registerHooks({
    resolve(specifier, context, nextResolve) {
      return specifier === 'undici' ? { url: wrapperUrl, shortCircuit: true } : nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url !== wrapperUrl) return nextLoad(url, context);
      return { format: 'module', shortCircuit: true, source: `
        export * from ${realUndici};
        export { fixtureFetch as fetch } from ${fixtureModule};
        import undici from ${realUndici};
        import { fixtureFetch } from ${fixtureModule};
        export default { ...undici, fetch: fixtureFetch };
      ` };
    },
  });
  return agent;
}
