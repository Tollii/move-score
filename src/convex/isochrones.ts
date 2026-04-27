// convex/isochrones.ts
import { action } from './_generated/server';
import { v } from 'convex/values';

const TARGOMO_BASE = 'https://api.targomo.com/westcentraleurope/v1';
const MAX_CONTOUR_MINUTES = 120;
const MAX_CONTOUR_COUNT = 10;
const TRANSIT_FRAME_DURATION_SECONDS = 7200;
const TRANSIT_MAX_TRANSFERS = 3;
const SUPPORTED_TARGOMO_MODES = [
	'walk',
	'bike',
	'car',
	'transit',
	'walktransit',
	'biketransit'
] as const;
const FEATURE_VALUE_KEYS = ['value', 'time', 'travelTime', 'cost', 'edgeWeight'] as const;
const CONTOUR_HINT_KEYS = ['range', 'contour'] as const;

type TargomoTravelMode = 'walk' | 'bike' | 'car' | 'transit' | 'walktransit' | 'biketransit';
type ProviderErrorCode =
	| 'TARGOMO_API_KEY_MISSING'
	| 'TARGOMO_ISOCHRONE_FAILED'
	| 'TARGOMO_ISOCHRONE_INVALID_COORDINATES'
	| 'TARGOMO_ISOCHRONE_INVALID_RANGES'
	| 'TARGOMO_ISOCHRONE_RATE_LIMITED'
	| 'TARGOMO_ISOCHRONE_UNSUPPORTED_MODE';

type GeoJsonFeatureCollection = {
	type?: string;
	features?: Array<{
		type?: string;
		geometry?: unknown;
		properties?: Record<string, unknown> | null;
	}>;
};

const PUBLIC_ISOCHRONE_PRESETS = {
	walk: { targomoMode: 'walk', minutes: [5, 10, 15, 20] },
	cycling: { targomoMode: 'bike', minutes: [5, 10, 20, 30] },
	driving: { targomoMode: 'car', minutes: [10, 20, 30, 45] },
	transit: { targomoMode: 'transit', minutes: [10, 15, 20, 30, 45, 60] },
	cyclingTransit: { targomoMode: 'biketransit', minutes: [10, 20, 30, 45, 60] }
} as const satisfies Record<string, { targomoMode: TargomoTravelMode; minutes: readonly number[] }>;

type PublicIsochroneMode = keyof typeof PUBLIC_ISOCHRONE_PRESETS;
type TargomoIsochroneArgs = {
	lat: number;
	lon: number;
	minutes: readonly number[];
	mode: TargomoTravelMode;
	appMode: PublicIsochroneMode;
};

export const getIsochrone = action({
	args: {
		lat: v.number(),
		lon: v.number(),
		mode: v.union(
			v.literal('walk'),
			v.literal('transit'),
			v.literal('driving'),
			v.literal('cycling'),
			v.literal('cyclingTransit')
		)
	},
	handler: async (_ctx, args): Promise<string> => {
		const preset = PUBLIC_ISOCHRONE_PRESETS[args.mode];
		return JSON.stringify(
			await fetchTargomoIsochrone({
				lat: args.lat,
				lon: args.lon,
				mode: preset.targomoMode,
				minutes: preset.minutes,
				appMode: args.mode
			})
		);
	}
});

async function fetchTargomoIsochrone({ lat, lon, minutes, mode, appMode }: TargomoIsochroneArgs) {
	validateCoordinates(lat, lon);
	validateMode(mode);

	const ranges = normalizeRanges(minutes);
	if (ranges.length === 0) {
		throw stableProviderError('TARGOMO_ISOCHRONE_INVALID_RANGES');
	}

	const apiKey = process.env.TARGOMO_API_KEY;
	if (!apiKey) {
		throw stableProviderError('TARGOMO_API_KEY_MISSING');
	}

	const values = ranges.map((minute) => minute * 60);
	const frame = nextTuesdayMorning();
	const logContext = summarizeRequest({ appMode, mode, minutes: ranges, frame });
	const payload = {
		sources: [
			{
				lat,
				lng: lon,
				id: 'origin',
				tm: buildTravelModePayload(mode, frame)
			}
		],
		polygon: { serializer: 'geojson', srid: 4326, values },
		maxEdgeWeight: values[values.length - 1]
	};

	console.log('[isochrones.getIsochrone] fetching Targomo', logContext);

	let res: Response;
	try {
		res = await fetch(`${TARGOMO_BASE}/polygon_post?key=${encodeURIComponent(apiKey)}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
	} catch (error) {
		logProviderFailure('TARGOMO_ISOCHRONE_FAILED', {
			error,
			context: logContext
		});
		throw stableProviderError('TARGOMO_ISOCHRONE_FAILED');
	}

	console.log('[isochrones.getIsochrone] Targomo response', {
		status: res.status,
		ok: res.ok,
		appMode,
		providerMode: mode
	});

	if (!res.ok) {
		const code = res.status === 429 ? 'TARGOMO_ISOCHRONE_RATE_LIMITED' : 'TARGOMO_ISOCHRONE_FAILED';
		logProviderFailure(code, {
			status: res.status,
			bodySnippet: await readSanitizedBodySnippet(res),
			context: logContext
		});
		throw stableProviderError(code);
	}

	try {
		const raw = await res.json();
		const geojson = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
		return normalizeTargomoGeojson(geojson, ranges);
	} catch (error) {
		logProviderFailure('TARGOMO_ISOCHRONE_FAILED', {
			error,
			context: { ...logContext, phase: 'parse' }
		});
		throw stableProviderError('TARGOMO_ISOCHRONE_FAILED');
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
		throw stableProviderError('TARGOMO_ISOCHRONE_INVALID_COORDINATES');
	}
}

function validateMode(mode: string): asserts mode is TargomoTravelMode {
	if (!SUPPORTED_TARGOMO_MODES.includes(mode as TargomoTravelMode)) {
		throw stableProviderError('TARGOMO_ISOCHRONE_UNSUPPORTED_MODE');
	}
}

function normalizeRanges(minutes: readonly number[]) {
	return [...new Set(minutes.map((minute) => Math.trunc(minute)))]
		.filter((minute) => Number.isFinite(minute) && minute > 0 && minute <= MAX_CONTOUR_MINUTES)
		.sort((a, b) => a - b)
		.slice(0, MAX_CONTOUR_COUNT);
}

function buildTravelModePayload(
	mode: TargomoTravelMode,
	frame: { date: number; time: number; duration: number }
) {
	if (mode === 'transit' || mode === 'walktransit' || mode === 'biketransit') {
		return {
			[mode]: {
				frame,
				maxTransfers: TRANSIT_MAX_TRANSFERS
			}
		};
	}

	return { [mode]: {} };
}

function normalizeTargomoGeojson(geojson: unknown, ranges: number[]) {
	if (!isFeatureCollection(geojson)) {
		throw new Error('Targomo response was not a GeoJSON FeatureCollection');
	}

	const fallbackValues = [...ranges].sort((a, b) => a - b).map((minute) => minute * 60);
	const requestedMinuteSet = new Set(ranges);
	const requestedSecondSet = new Set(fallbackValues);
	return {
		...geojson,
		features: geojson.features.map((feature, index) => {
			const props = feature.properties ?? {};
			const value =
				readFeatureValue(props, requestedMinuteSet, requestedSecondSet) ??
				fallbackValues[index] ??
				fallbackValues.at(-1) ??
				0;

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

// Returns the next Tuesday as YYYYMMDD integer and 08:00 as seconds past midnight.
// Tuesday avoids weekend/Monday-anomaly schedules.
function nextTuesdayMorning(): { date: number; time: number; duration: number } {
	const now = new Date();
	const daysUntil = (2 - now.getUTCDay() + 7) % 7 || 7;
	const tuesday = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil)
	);
	const y = tuesday.getUTCFullYear();
	const m = String(tuesday.getUTCMonth() + 1).padStart(2, '0');
	const d = String(tuesday.getUTCDate()).padStart(2, '0');
	return { date: Number(`${y}${m}${d}`), time: 28800, duration: TRANSIT_FRAME_DURATION_SECONDS };
}

function summarizeRequest(args: {
	appMode: PublicIsochroneMode;
	mode: TargomoTravelMode;
	minutes: number[];
	frame: { date: number; time: number; duration: number };
}) {
	return {
		appMode: args.appMode,
		providerMode: args.mode,
		minutes: args.minutes,
		contourCount: args.minutes.length,
		maxMinutes: args.minutes.at(-1),
		frame: args.frame
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
	}
) {
	const error = details.error instanceof Error ? details.error.message : details.error;
	console.warn('[isochrones.providerFailure]', {
		provider: 'Targomo',
		code,
		status: details.status,
		bodySnippet: details.bodySnippet,
		error,
		context: details.context
	});
}
