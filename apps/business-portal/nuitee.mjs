// A connection check only. No booking, checkout, payment or ticketing calls.
// https://docs.liteapi.travel/reference/get_data-currencies
const CHECK_URL = 'https://api.liteapi.travel/v3.0/data/currencies';
const MAX_BYTES = 128 * 1024;

export async function checkNuiteeKey(apiKey, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  if (typeof apiKey !== 'string' || !apiKey.length || apiKey.length > 4096 || /[^\x21-\x7e]/.test(apiKey)) {
    return { status: 'rejected' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  let response;
  let reader;
  try {
    response = await fetchImpl(CHECK_URL, {
      method: 'GET', headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
      redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
    });
    if ([401, 403].includes(response.status)) return { status: 'rejected' };
    if (response.status !== 200 || response.redirected) return { status: 'unavailable' };
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) return { status: 'unavailable' };
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_BYTES || !response.body) return { status: 'unavailable' };
    reader = response.body.getReader();
    let size = 0;
    const parts = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) return { status: 'unavailable' };
      parts.push(Buffer.from(value));
    }
    const payload = JSON.parse(Buffer.concat(parts, size).toString('utf8'));
    if (payload.error || !Array.isArray(payload.data) || !payload.data.length || payload.data.length > 512 ||
      !payload.data.every(item => item && typeof item === 'object' && /^[A-Z]{3}$/.test(item.code))) {
      return { status: 'unavailable' };
    }
    return { status: 'verified' };
  } catch {
    // Provider errors can contain headers or echoed credentials. Never surface them.
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
    controller.abort();
    try { if (reader) await reader.cancel(); else await response?.body?.cancel(); } catch { /* already closed */ }
  }
}
