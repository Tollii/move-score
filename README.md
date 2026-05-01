# Move Score

## Developing

Install dependencies and start a development server:

```sh
pnpm install
pnpm dev
```

### Isochrone providers

Isochrones are fetched by Convex actions so provider secrets stay server-side. Configure these Convex environment variables before requesting reachability polygons:

```sh
TRAVELTIME_APP_ID=...
TRAVELTIME_API_KEY=...
```

`TRAVELTIME_APP_ID` and `TRAVELTIME_API_KEY` are required in the active Convex environment, including any preview or production Convex deployment that serves isochrone requests. No `MAPBOX_ACCESS_TOKEN` is required for this path.

Supported isochrone modes are walking, cycling, driving, and public transport with walking access/egress. The isochrone action uses TravelTime's `/v4/time-map/fast` endpoint and maps UI modes to TravelTime's `walking`, `cycling`, `driving`, and `public_transport` transport types. Cycling + public transport is not exposed in the TravelTime-only rollout because TravelTime does not support that transport mode for Norway. Road modes depend on OpenStreetMap coverage; transit modes depend on TravelTime regional transit coverage and should be smoke-tested before relying on preview or production results.

### Feature flags

Feature flags are stored in the Convex `featureFlags` table and can be checked from either server or client code with `api.featureFlags.isEnabled`. Authenticated users can turn flags on or off with `api.featureFlags.set`.

Current flags: none.

## Building

To create a production version of your app:

```sh
pnpm build
```

You can preview the production build with `pnpm preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
