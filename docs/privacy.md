# Website privacy boundary

Wayfare does not request browser location permission, read GPS coordinates, or infer a departure airport. The response policy explicitly disables browser geolocation.

When the server is deployed behind Fly.io and `IPINFO_TOKEN` is configured, it reads the proxy-provided client IP and asks IPinfo Lite for a coarse country code. Wayfare does not store the raw IP address or include it in client props, assistant context, cookies, local storage, or session storage. The browser receives only the country code and its suggested currency.

The country and currency are convenience defaults, not verified identity, authorization, fraud evidence, regulatory evidence, or provider pricing authority. The traveler can change the currency at any time, and a route stated by the traveler always wins.

If coarse-country resolution is unavailable, fails, or returns an unsupported country, Wayfare falls back quietly to the browser locale and then to `USD`. Flight search remains fully usable in every case, and no permission prompt is shown.

The public `/privacy` page describes the guest, assistant, Fly.io, IPinfo Lite, Noodle Seed, model-provider, and Nuitee data flow. It is a product draft that must receive deployment-owner and legal review before public release.
