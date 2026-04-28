import { track } from '@vercel/analytics';

type AnalyticsPrimitive = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsPrimitive>;

type AddressSource = 'address' | 'finn' | 'url';
type ResultBucket = '0' | '1' | '2-5' | '6-10' | '11-25' | '26+';

export type AnalyticsEvent =
	| {
			name: 'address_search_completed';
			properties: { source: AddressSource; resultBucket: ResultBucket };
	  }
	| { name: 'address_search_failed'; properties: { source: AddressSource; errorCode: string } }
	| { name: 'address_selected'; properties: { source: AddressSource; hasMunicipality: boolean } }
	| {
			name: 'finn_lookup_completed';
			properties: { result: 'success' | 'failure'; errorCode?: string };
	  }
	| { name: 'map_point_selected'; properties: { source: 'map' | 'url' } }
	| { name: 'isochrone_requested'; properties: { mode: string; source: 'button' | 'auto' | 'map' } }
	| {
			name: 'isochrone_completed';
			properties: { mode: string; result: 'success' | 'failure'; errorCode?: string };
	  }
	| {
			name: 'isochrone_band_toggled';
			properties: { mode: string; minutes: number; visible: boolean };
	  }
	| {
			name: 'auth_completed';
			properties: {
				flow: 'signIn' | 'signUp' | 'signOut';
				result: 'success' | 'failure';
				errorCode?: string;
			};
	  };

export function trackEvent(event: AnalyticsEvent) {
	if (typeof window === 'undefined') {
		return;
	}

	track(event.name, sanitizeProperties(event.properties));
}

export function bucketCount(count: number | undefined): ResultBucket {
	if (!count || count <= 0) return '0';
	if (count === 1) return '1';
	if (count <= 5) return '2-5';
	if (count <= 10) return '6-10';
	if (count <= 25) return '11-25';
	return '26+';
}

export function analyticsErrorCode(error: unknown, fallback = 'UNKNOWN_ERROR') {
	const message = error instanceof Error ? error.message : String(error);
	const stableCode = message.match(/\b[A-Z][A-Z0-9_]{2,}\b/)?.[0];
	return stableCode ?? fallback;
}

function sanitizeProperties(properties: AnalyticsProperties): AnalyticsProperties {
	return Object.fromEntries(
		Object.entries(properties).filter(
			([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value)
		)
	);
}
