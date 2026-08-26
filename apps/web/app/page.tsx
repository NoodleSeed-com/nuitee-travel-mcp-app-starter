import { resolvePublicAssistantRuntime } from '../src/lib/assistant-config';

export default function HomePage() {
  const runtime = resolvePublicAssistantRuntime(process.env);

  return (
    <main>
      <section aria-labelledby="travel-assistant-heading">
        <p className="eyebrow">Cedar &amp; Cloud Travel</p>
        <h1 id="travel-assistant-heading">Travel assistant</h1>
        {runtime.status === 'setup-required' ? (
          <p>{runtime.message}</p>
        ) : (
          <p>The travel assistant is ready for the chat-first experience.</p>
        )}
      </section>
    </main>
  );
}
