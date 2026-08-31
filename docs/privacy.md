# Website privacy boundary

Wayfare may request optional browser location permission after the guest page loads. Flight search remains fully usable without it.

Precise coordinates are processed only in memory inside the browser long enough to choose the nearest supported large airport. They are not persisted by the application and are never written to cookies, local storage, session storage, URLs, logs, analytics, DOM attributes, screenshots, or a backend endpoint.

Only a derived airport code, city label, country code, and selected currency may enter the embedded Assistant's untrusted page context. The context is a convenience default, not verified identity, authorization, fraud evidence, regulatory evidence, or provider pricing authority. An origin, market, or currency stated by the traveler always wins.

Wayfare performs no third-party location lookup, IP geolocation, reverse-geocoding request, exchange-rate request, or background location tracking. The bundled airport catalog comes from the pinned public-domain snapshot documented in [airport-data.md](airport-data.md); it is not fetched at runtime.

Permission denial never blocks flight search. A denied, timed-out, unavailable, or out-of-range location quietly falls back to `Your departure` and a browser-locale currency, then to `USD` when no supported region can be resolved. Wayfare does not automatically retry permission during the page lifetime.

The browser may remember its own permission decision according to browser policy. That browser-owned behavior is separate from Wayfare application storage.

This local contract does not replace the deployment owner's public privacy notice. Before public promotion, configure and review a real privacy URL that also covers anonymous Assistant/model processing, Nuitee flight queries, service retention, subprocessors, budgets, support, and the fact that the site does not create bookings.
