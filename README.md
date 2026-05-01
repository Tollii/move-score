# Move Score

## Developing

Install dependencies and start a development server:

```sh
pnpm install
pnpm dev
```

### Isochrone providers

Isochrones are fetched by Convex actions so provider secrets stay server-side. Configure this Convex environment variable before requesting reachability polygons:

```sh
TARGOMO_API_KEY=...
```

`TARGOMO_API_KEY` is required in the active Convex environment, including any preview or production Convex deployment that serves isochrone requests. The current isochrone implementation for walking, cycling, driving, public transport with walking access/egress, and cycling + transit uses Targomo only; no `MAPBOX_ACCESS_TOKEN` is required for this path.

Supported isochrone modes are walking, cycling, driving, public transport with walking access/egress, and cycling + public transport through Targomo. The transit UI mode uses Targomo `transit`, which already includes walking access/egress around public transport. The cycling + public transport mode uses Targomo `multiModal` with a `bike -> transit -> bike` sequence so it models mixed bike/transit travel instead of the narrower `biketransit` behavior. Credentialed smoke testing for Norway-area transit and multimodal coverage is still pending. Road modes depend on OpenStreetMap coverage; transit modes depend on Targomo regional transit/GTFS coverage and should be smoke-tested before relying on preview or production results.

### Feature flags

Feature flags are stored in the Convex `featureFlags` table and can be checked from either server or client code with `api.featureFlags.isEnabled`. Authenticated users can turn flags on or off with `api.featureFlags.set`.

Current flags:

- `isochrones.useBiketransit` switches cycling + public transport from the default `multiModal` preset to Targomo `biketransit` for comparison.

## Building

To create a production version of your app:

```sh
pnpm build
```

You can preview the production build with `pnpm preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
