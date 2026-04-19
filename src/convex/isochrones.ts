// convex/isochrones.ts
import { api } from './_generated/api';
import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';

const ISOCHRONE_PROVIDER = 'mapbox';
const ISOCHRONE_CACHE_VERSION = 'v1';
const ISOCHRONE_TTL_DAYS = 90;
const MAPBOX_GENERALIZE_METERS = 1;
const MAPBOX_DENOISE = 0;

type GeoJsonFeatureCollection = {
	type?: string;
	features?: Array<{
		type?: string;
		geometry?: unknown;
		properties?: Record<string, unknown> | null;
	}>;
};

export const getWalkIsochrone = action({
	args: {
		lat: v.number(),
		lon: v.number(),
		minutes: v.array(v.number()) // e.g. [5, 10, 15, 20]
	},
	handler: async (ctx, { lat, lon, minutes }): Promise<unknown> => {
		const ranges = normalizeRanges(minutes);
		if (ranges.length === 0) {
			throw new Error('Mapbox isochrone ranges must be between 1 and 60 minutes');
		}
		const cacheKey = `walk:${ISOCHRONE_PROVIDER}:${ISOCHRONE_CACHE_VERSION}:${lat.toFixed(5)}:${lon.toFixed(5)}:${ranges.join(',')}:generalize:${MAPBOX_GENERALIZE_METERS}:denoise:${MAPBOX_DENOISE}`;
		console.log('[isochrones.getWalkIsochrone] start', { cacheKey, lat, lon, minutes: ranges });
		const cached = (await ctx.runQuery(api.isochrones.getCached, { cacheKey })) as {
			geojson: unknown;
			computedAt: number;
			ttlDays: number;
		} | null;
		if (cached && isFresh(cached)) {
			console.log('[isochrones.getWalkIsochrone] cache hit', {
				cacheKey,
				computedAt: cached.computedAt,
				ttlDays: cached.ttlDays
			});
			return cached.geojson;
		}
		if (cached) {
			console.log('[isochrones.getWalkIsochrone] cache stale', {
				cacheKey,
				computedAt: cached.computedAt,
				ttlDays: cached.ttlDays
			});
		} else {
			console.log('[isochrones.getWalkIsochrone] cache miss', { cacheKey });
		}

		const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
		if (!accessToken) {
			console.log('[isochrones.getWalkIsochrone] missing Mapbox access token', { cacheKey });
			throw new Error('MAPBOX_ACCESS_TOKEN must be configured');
		}

		console.log('[isochrones.getWalkIsochrone] fetching Mapbox', { cacheKey });
		const url = new URL(`https://api.mapbox.com/isochrone/v1/mapbox/walking/${lon},${lat}`);
		url.searchParams.set('contours_minutes', ranges.map((minute) => String(minute)).join(','));
		url.searchParams.set('polygons', 'true');
		url.searchParams.set('generalize', String(MAPBOX_GENERALIZE_METERS));
		url.searchParams.set('denoise', String(MAPBOX_DENOISE));
		url.searchParams.set('access_token', accessToken);

		const res = await fetch(url);
		console.log('[isochrones.getWalkIsochrone] Mapbox response', {
			cacheKey,
			status: res.status,
			ok: res.ok
		});
		if (!res.ok) {
			const body = await res.text();
			console.log('[isochrones.getWalkIsochrone] Mapbox error', {
				cacheKey,
				status: res.status,
				body
			});
			throw new Error(`Mapbox ${res.status}: ${body}`);
		}

		const geojson = normalizeMapboxGeojson(await res.json(), ranges);
		const featureCount = Array.isArray(geojson.features) ? geojson.features.length : undefined;
		console.log('[isochrones.getWalkIsochrone] Mapbox parsed', { cacheKey, featureCount });

		await ctx.runMutation(api.isochrones.saveCache, {
			cacheKey,
			lat,
			lon,
			mode: 'walk',
			minutes: ranges,
			geojson,
			ttlDays: ISOCHRONE_TTL_DAYS
		});
		console.log('[isochrones.getWalkIsochrone] saved cache', { cacheKey });
		return geojson;
	}
});

export const getCached = query({
	args: { cacheKey: v.string() },
	handler: async (ctx, { cacheKey }) => {
		const cached = await ctx.db
			.query('isochrones')
			.withIndex('by_cacheKey', (q) => q.eq('cacheKey', cacheKey))
			.first();
		console.log('[isochrones.getCached] lookup', { cacheKey, hit: cached !== null });
		return cached;
	}
});

export const saveCache = mutation({
	args: {
		cacheKey: v.string(),
		lat: v.number(),
		lon: v.number(),
		mode: v.union(v.literal('walk'), v.literal('transit'), v.literal('bike')),
		minutes: v.array(v.number()),
		departAt: v.optional(v.string()),
		geojson: v.any(),
		ttlDays: v.number()
	},
	handler: async (ctx, args) => {
		console.log('[isochrones.saveCache] upsert start', { cacheKey: args.cacheKey });
		const existing = await ctx.db
			.query('isochrones')
			.withIndex('by_cacheKey', (q) => q.eq('cacheKey', args.cacheKey))
			.first();

		const row = {
			...args,
			computedAt: Date.now()
		};

		if (existing) {
			await ctx.db.patch(existing._id, row);
			console.log('[isochrones.saveCache] updated existing', { cacheKey: args.cacheKey });
			return existing._id;
		}

		const id = await ctx.db.insert('isochrones', row);
		console.log('[isochrones.saveCache] inserted new', { cacheKey: args.cacheKey, id });
		return id;
	}
});

function normalizeRanges(minutes: number[]) {
	return [...new Set(minutes.map((minute) => Math.trunc(minute)))]
		.filter((minute) => Number.isFinite(minute) && minute > 0 && minute <= 60)
		.sort((a, b) => a - b)
		.slice(0, 4);
}

function normalizeMapboxGeojson(geojson: unknown, ranges: number[]) {
	if (!isFeatureCollection(geojson)) {
		throw new Error('Mapbox response was not a GeoJSON FeatureCollection');
	}

	const fallbackRanges = [...ranges].sort((a, b) => a - b);
	return {
		...geojson,
		features: geojson.features.map((feature, index) => {
			const properties = feature.properties ?? {};
			const contour = typeof properties.contour === 'number' ? properties.contour : null;
			const value = (contour ?? fallbackRanges[index] ?? 0) * 60;

			return {
				...feature,
				properties: {
					...properties,
					value
				}
			};
		})
	};
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection & {
	features: NonNullable<GeoJsonFeatureCollection['features']>;
} {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as GeoJsonFeatureCollection).type === 'FeatureCollection' &&
		Array.isArray((value as GeoJsonFeatureCollection).features)
	);
}

function isFresh(row: { computedAt: number; ttlDays: number }) {
	return Date.now() - row.computedAt < row.ttlDays * 86400 * 1000;
}
