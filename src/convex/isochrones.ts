// convex/isochrones.ts
import { action } from './_generated/server';
import { v } from 'convex/values';
import { ISOCHRONE_MODES_BY_ID } from '../lib/isochrones/modes';

const TRAVELTIME_BASE = 'https://api.traveltimeapp.com/v4';
const MAX_CONTOUR_MINUTES = 120;
const MAX_CONTOUR_COUNT = 10;
const FEATURE_VALUE_KEYS = [
	'value',
	'time',
	'travelTime',
	'travel_time',
	'cost',
	'edgeWeight'
] as const;
const CONTOUR_HINT_KEYS = ['range', 'contour'] as const;

type ProviderErrorCode =
	| 'TRAVELTIME_API_KEY_MISSING'
	| 'TRAVELTIME_APP_ID_MISSING'
	| 'TRAVELTIME_ISOCHRONE_FAILED'
	| 'TRAVELTIME_ISOCHRONE_INVALID_COORDINATES'
	| 'TRAVELTIME_ISOCHRONE_INVALID_RANGES'
	| 'TRAVELTIME_ISOCHRONE_RATE_LIMITED';

type GeoJsonFeatureCollection = {
	type?: string;
	features?: Array<{
		type?: string;
		geometry?: unknown;
		properties?: Record<string, unknown> | null;
	}>;
};

export const getIsochrone = action({
	args: {
		lat: v.number(),
		lon: v.number(),
		mode: v.union(
			v.literal('walk'),
			v.literal('transit'),
			v.literal('driving'),
			v.literal('cycling')
		)
	},
	handler: async (_, args): Promise<string> => {
		const mode = ISOCHRONE_MODES_BY_ID[args.mode];
		return JSON.stringify(
			await fetchTravelTimeIsochrone({
				lat: args.lat,
				lon: args.lon,
				minutes: mode.bands.map((band) => band.minutes),
				appMode: args.mode,
				providerMode: mode.travelTimeMode
			})
		);
	}
});

async function fetchTravelTimeIsochrone({
	lat,
	lon,
	minutes,
	appMode,
	providerMode
}: {
	lat: number;
	lon: number;
	minutes: readonly number[];
	appMode: string;
	providerMode: string;
}) {
	validateCoordinates(lat, lon);

	const ranges = normalizeRanges(minutes);
	if (ranges.length === 0) {
		throw stableProviderError('TRAVELTIME_ISOCHRONE_INVALID_RANGES');
	}

	const appId = process.env.TRAVELTIME_APP_ID;
	if (!appId) {
		throw stableProviderError('TRAVELTIME_APP_ID_MISSING');
	}

	const apiKey = process.env.TRAVELTIME_API_KEY;
	if (!apiKey) {
		throw stableProviderError('TRAVELTIME_API_KEY_MISSING');
	}

	const startedAt = Date.now();
	const logContext = {
		appMode,
		providerMode,
		minutes: ranges,
		contourCount: ranges.length,
		maxMinutes: ranges.at(-1)
	};
	const payload = {
		arrival_searches: {
			one_to_many: ranges.map((minute) => ({
				id: travelTimeSearchId(minute),
				coords: { lat, lng: lon },
				transportation: { type: providerMode },
				arrival_time_period: 'weekday_morning',
				travel_time: minute * 60,
				no_holes: true
			}))
		}
	};

	console.log('[isochrones.getIsochrone] fetching TravelTime', logContext);

	let res: Response;
	try {
		res = await fetch(`${TRAVELTIME_BASE}/time-map/fast`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/geo+json',
				'X-Application-Id': appId,
				'X-Api-Key': apiKey
			},
			body: JSON.stringify(payload)
		});
	} catch (error) {
		logProviderFailure('TRAVELTIME_ISOCHRONE_FAILED', {
			error,
			context: logContext
		});
		throw stableProviderError('TRAVELTIME_ISOCHRONE_FAILED');
	}

	console.log('[isochrones.getIsochrone] TravelTime response', {
		status: res.status,
		ok: res.ok,
		appMode,
		providerMode,
		durationMs: Date.now() - startedAt
	});

	if (!res.ok) {
		const code =
			res.status === 429 ? 'TRAVELTIME_ISOCHRONE_RATE_LIMITED' : 'TRAVELTIME_ISOCHRONE_FAILED';
		logProviderFailure(code, {
			status: res.status,
			bodySnippet: await readSanitizedBodySnippet(res),
			context: logContext,
			durationMs: Date.now() - startedAt
		});
		throw stableProviderError(code);
	}

	try {
		const raw = await res.json();
		const normalized = normalizeTravelTimeGeojson(raw, ranges);
		console.log('[isochrones.getIsochrone] completed', {
			provider: 'TravelTime',
			result: 'success',
			appMode,
			featureCount: normalized.features.length,
			durationMs: Date.now() - startedAt
		});
		return normalized;
	} catch (error) {
		logProviderFailure('TRAVELTIME_ISOCHRONE_FAILED', {
			error,
			context: { ...logContext, phase: 'parse' },
			durationMs: Date.now() - startedAt
		});
		throw stableProviderError('TRAVELTIME_ISOCHRONE_FAILED');
	}
}

function validateCoordinates(lat: number, lon: number) {
	if (
		!Number.isFinite(lat) ||
		!Number.isFinite(lon) ||
		lat < -90 ||
		lat > 90 ||
		lon < -180 ||
		lon > 180
	) {
		throw stableProviderError('TRAVELTIME_ISOCHRONE_INVALID_COORDINATES');
	}
}

function normalizeRanges(minutes: readonly number[]) {
	return [...new Set(minutes.map((minute) => Math.trunc(minute)))]
		.filter((minute) => Number.isFinite(minute) && minute > 0 && minute <= MAX_CONTOUR_MINUTES)
		.sort((a, b) => a - b)
		.slice(0, MAX_CONTOUR_COUNT);
}

function normalizeTravelTimeGeojson(geojson: unknown, ranges: number[]) {
	if (!isFeatureCollection(geojson)) {
		throw new Error('TravelTime response was not a GeoJSON FeatureCollection');
	}

	const fallbackValues = [...ranges].sort((a, b) => a - b).map((minute) => minute * 60);
	return {
		...geojson,
		features: geojson.features.map((feature, index) => {
			const props = feature.properties ?? {};
			const value =
				readTravelTimeFeatureValue(props) ?? fallbackValues[index] ?? fallbackValues.at(-1) ?? 0;

			return {
				...feature,
				properties: {
					...props,
					value
				}
			};
		})
	};
}

function readTravelTimeFeatureValue(properties: Record<string, unknown>) {
	const value = readFeatureValue(properties, new Set(), new Set());
	if (value !== undefined) {
		return value;
	}

	const searchId = properties.search_id;
	if (typeof searchId === 'string') {
		const match = /^iso-(\d+)$/.exec(searchId);
		if (match) {
			return Number(match[1]);
		}
	}

	return undefined;
}

function readFeatureValue(
	properties: Record<string, unknown>,
	requestedMinuteSet: ReadonlySet<number>,
	requestedSecondSet: ReadonlySet<number>
) {
	for (const key of FEATURE_VALUE_KEYS) {
		const value = readNumericProperty(properties[key]);
		if (value === undefined) {
			continue;
		}

		if (requestedSecondSet.has(value)) {
			return value;
		}
		if (requestedMinuteSet.has(value)) {
			return value * 60;
		}

		return value;
	}

	for (const key of CONTOUR_HINT_KEYS) {
		const value = readNumericProperty(properties[key]);
		if (value === undefined) {
			continue;
		}

		if (requestedSecondSet.has(value)) {
			return value;
		}
		if (requestedMinuteSet.has(value)) {
			return value * 60;
		}
	}

	return undefined;
}

function readNumericProperty(value: unknown) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return undefined;
}

function travelTimeSearchId(minute: number) {
	return `iso-${minute * 60}`;
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

function stableProviderError(code: ProviderErrorCode) {
	return new Error(code);
}

async function readSanitizedBodySnippet(response: Response) {
	try {
		return sanitizeProviderSnippet(await response.text());
	} catch {
		return undefined;
	}
}

function sanitizeProviderSnippet(value: string) {
	return value
		.replace(/("?(?:access[_-]?token|api[_-]?key|key)"?\s*:\s*")[^"]+(")/gi, '$1[redacted]$2')
		.replace(/("?(?:lat|lon|lng|latitude|longitude)"?\s*:\s*)-?\d+(?:\.\d+)?/gi, '$1[redacted]')
		.replace(/([?&](?:access_token|key)=)[^&\s]+/gi, '$1[redacted]')
		.replace(/(X-Api-Key:?\s*)[A-Za-z0-9._-]+/gi, '$1[redacted]')
		.replace(/(X-Application-Id:?\s*)[A-Za-z0-9._-]+/gi, '$1[redacted]')
		.replace(/\bBearer\s+[A-Za-z0-9._-]+\b/gi, 'Bearer [redacted]')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 300);
}

function logProviderFailure(
	code: ProviderErrorCode,
	details: {
		status?: number;
		bodySnippet?: string;
		error?: unknown;
		context?: Record<string, unknown>;
		durationMs?: number;
	}
) {
	const error = details.error instanceof Error ? details.error.message : details.error;
	console.warn('[isochrones.providerFailure]', {
		provider: 'TravelTime',
		code,
		status: details.status,
		bodySnippet: details.bodySnippet,
		error,
		context: details.context,
		durationMs: details.durationMs
	});
}
