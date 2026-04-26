// convex/isochrones.ts
import { api } from './_generated/api';
import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';

const ISOCHRONE_CACHE_VERSION = 'v1';
const MAPBOX_GENERALIZE_METERS = 1;
const MAPBOX_DENOISE = 0;
const WALK_TTL_DAYS = 90;
const TARGOMO_BASE = 'https://api.targomo.com/westcentraleurope/v1';

type GeoJsonFeatureCollection = {
	type?: string;
	features?: Array<{
		type?: string;
		geometry?: unknown;
		properties?: Record<string, unknown> | null;
	}>;
};

export const getTransitIsochrone = action({
	args: {
		lat: v.number(),
		lon: v.number(),
		minutes: v.array(v.number()) // e.g. [15, 30, 45, 60]
	},
	handler: async (ctx, { lat, lon, minutes }): Promise<unknown> => {
		const ranges = normalizeTransitRanges(minutes);
		if (ranges.length === 0) {
			throw new Error('Transit isochrone ranges must be between 1 and 120 minutes');
		}
		const cacheKey = `transit:targomo:${ISOCHRONE_CACHE_VERSION}:${lat.toFixed(5)}:${lon.toFixed(5)}:${ranges.join(',')}`;
		console.log('[isochrones.getTransitIsochrone] start', { cacheKey, lat, lon, minutes: ranges });

		const apiKey = process.env.TARGOMO_API_KEY;
		if (!apiKey) {
			throw new Error('TARGOMO_API_KEY must be configured');
		}

		const { date, time } = nextTuesdayMorning();
		const values = ranges.map((m) => m * 60);

		console.log('[isochrones.getTransitIsochrone] fetching Targomo', { cacheKey, date, time, values });
		const res = await fetch(`${TARGOMO_BASE}/polygon_post?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sources: [{ lat, lng: lon, id: 'origin', tm: { transit: {} } }],
				polygon: { serializer: 'geojson', srid: 4326, values },
				maxEdgeWeight: values[values.length - 1],
				transitFrameDate: date,
				transitFrameTime: time
			})
		});
		console.log('[isochrones.getTransitIsochrone] Targomo response', { cacheKey, status: res.status, ok: res.ok });
		if (!res.ok) {
			const body = await res.text();
			console.log('[isochrones.getTransitIsochrone] Targomo error', { cacheKey, status: res.status, body });
			throw new Error(`Targomo ${res.status}: ${body}`);
		}

		const raw = await res.json();
		const geojson = normalizeTargomoGeojson(
			raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw,
			ranges
		);
		return JSON.stringify(geojson);
	}
});

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
		const cacheKey = `walk:mapbox:${ISOCHRONE_CACHE_VERSION}:${lat.toFixed(5)}:${lon.toFixed(5)}:${ranges.join(',')}:generalize:${MAPBOX_GENERALIZE_METERS}:denoise:${MAPBOX_DENOISE}`;
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
			geojsonJson: JSON.stringify(geojson),
			ttlDays: WALK_TTL_DAYS
		});
		console.log('[isochrones.getWalkIsochrone] saved cache', { cacheKey });
		return JSON.stringify(geojson);
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
		geojsonJson: v.string(),
		ttlDays: v.number()
	},
	handler: async (ctx, args) => {
		const { geojsonJson, ...metadata } = args;
		console.log('[isochrones.saveCache] upsert start', { cacheKey: metadata.cacheKey });
		const existing = await ctx.db
			.query('isochrones')
			.withIndex('by_cacheKey', (q) => q.eq('cacheKey', metadata.cacheKey))
			.first();

		const row = {
			...metadata,
			geojson: geojsonJson,
			computedAt: Date.now()
		};

		if (existing) {
			await ctx.db.patch(existing._id, row);
			console.log('[isochrones.saveCache] updated existing', { cacheKey: metadata.cacheKey });
			return existing._id;
		}

		const id = await ctx.db.insert('isochrones', row);
		console.log('[isochrones.saveCache] inserted new', { cacheKey: metadata.cacheKey, id });
		return id;
	}
});

function normalizeRanges(minutes: number[]) {
	return [...new Set(minutes.map((minute) => Math.trunc(minute)))]
		.filter((minute) => Number.isFinite(minute) && minute > 0 && minute <= 60)
		.sort((a, b) => a - b)
		.slice(0, 4);
}

function normalizeTransitRanges(minutes: number[]) {
	return [...new Set(minutes.map((m) => Math.trunc(m)))]
		.filter((m) => Number.isFinite(m) && m > 0 && m <= 120)
		.sort((a, b) => a - b)
		.slice(0, 10);
}

function normalizeTargomoGeojson(geojson: unknown, ranges: number[]) {
	if (!isFeatureCollection(geojson)) {
		throw new Error('Targomo response was not a GeoJSON FeatureCollection');
	}
	const fallback = [...ranges].sort((a, b) => a - b);
	return {
		...geojson,
		features: geojson.features.map((feature, index) => {
			const props = feature.properties ?? {};
			const value =
				typeof props.value === 'number'
					? props.value
					: typeof props.time === 'number'
						? props.time
						: (fallback[index] ?? 0) * 60;
			return { ...feature, properties: { ...props, value } };
		})
	};
}

// Returns the next Tuesday as YYYYMMDD integer and 08:00 as seconds past midnight.
// Tuesday avoids weekend/Monday-anomaly schedules.
function nextTuesdayMorning(): { date: number; time: number } {
	const now = new Date();
	const daysUntil = ((2 - now.getUTCDay() + 7) % 7) || 7;
	const tuesday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil));
	const y = tuesday.getUTCFullYear();
	const m = String(tuesday.getUTCMonth() + 1).padStart(2, '0');
	const d = String(tuesday.getUTCDate()).padStart(2, '0');
	return { date: Number(`${y}${m}${d}`), time: 28800 };
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
