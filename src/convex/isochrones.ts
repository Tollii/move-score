// convex/isochrones.ts
import { action } from './_generated/server';
import { v } from 'convex/values';

const MAPBOX_GENERALIZE_METERS = 1;
const MAPBOX_DENOISE = 0;
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
	handler: async (_ctx, { lat, lon, minutes }): Promise<unknown> => {
		const ranges = normalizeTransitRanges(minutes);
		if (ranges.length === 0) {
			throw new Error('Transit isochrone ranges must be between 1 and 120 minutes');
		}
		console.log('[isochrones.getTransitIsochrone] start', { lat, lon, minutes: ranges });

		const apiKey = process.env.TARGOMO_API_KEY;
		if (!apiKey) {
			throw new Error('TARGOMO_API_KEY must be configured');
		}

		const { date, time } = nextTuesdayMorning();
		const values = ranges.map((m) => m * 60);

		console.log('[isochrones.getTransitIsochrone] fetching Targomo', { date, time, values });
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
		console.log('[isochrones.getTransitIsochrone] Targomo response', {
			status: res.status,
			ok: res.ok
		});
		if (!res.ok) {
			const body = await res.text();
			console.log('[isochrones.getTransitIsochrone] Targomo error', { status: res.status, body });
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
	handler: async (_ctx, { lat, lon, minutes }): Promise<unknown> => {
		const ranges = normalizeRanges(minutes);
		if (ranges.length === 0) {
			throw new Error('Mapbox isochrone ranges must be between 1 and 60 minutes');
		}
		console.log('[isochrones.getWalkIsochrone] start', { lat, lon, minutes: ranges });

		const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
		if (!accessToken) {
			throw new Error('MAPBOX_ACCESS_TOKEN must be configured');
		}

		console.log('[isochrones.getWalkIsochrone] fetching Mapbox', { lat, lon, minutes: ranges });
		const url = new URL(`https://api.mapbox.com/isochrone/v1/mapbox/walking/${lon},${lat}`);
		url.searchParams.set('contours_minutes', ranges.map((minute) => String(minute)).join(','));
		url.searchParams.set('polygons', 'true');
		url.searchParams.set('generalize', String(MAPBOX_GENERALIZE_METERS));
		url.searchParams.set('denoise', String(MAPBOX_DENOISE));
		url.searchParams.set('access_token', accessToken);

		const res = await fetch(url);
		console.log('[isochrones.getWalkIsochrone] Mapbox response', {
			status: res.status,
			ok: res.ok
		});
		if (!res.ok) {
			const body = await res.text();
			console.log('[isochrones.getWalkIsochrone] Mapbox error', { status: res.status, body });
			throw new Error(`Mapbox ${res.status}: ${body}`);
		}

		const geojson = normalizeMapboxGeojson(await res.json(), ranges);
		const featureCount = Array.isArray(geojson.features) ? geojson.features.length : undefined;
		console.log('[isochrones.getWalkIsochrone] Mapbox parsed', { featureCount });
		return JSON.stringify(geojson);
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
	const daysUntil = (2 - now.getUTCDay() + 7) % 7 || 7;
	const tuesday = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil)
	);
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
