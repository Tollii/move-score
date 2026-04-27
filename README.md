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

`TARGOMO_API_KEY` is required in the active Convex environment, including any preview or production Convex deployment that serves isochrone requests. The current isochrone implementation for walking, cycling, driving, walk + transit, and cycling + transit uses Targomo only; no `MAPBOX_ACCESS_TOKEN` is required for this path.

Supported isochrone modes are walking, cycling, driving, public transport with walking access/egress, and cycling + public transport through Targomo. The current transit UI mode prefers Targomo `walktransit` per the issue plan, but credentialed smoke testing for Norway-area `walktransit`/`biketransit` coverage is still pending. If live validation shows `polygon_post` rejects `walktransit`, switch that mode to Targomo `transit` and document the verified result. Road modes depend on OpenStreetMap coverage; transit modes depend on Targomo regional transit/GTFS coverage and should be smoke-tested before relying on preview or production results.

## Building

To create a production version of your app:

```sh
pnpm build
```

You can preview the production build with `pnpm preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
