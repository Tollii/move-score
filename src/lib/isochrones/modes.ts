export type IsochroneModeId = 'walk' | 'cycling' | 'driving' | 'transit' | 'cyclingTransit';
export type TargomoTravelMode =
	| 'walk'
	| 'bike'
	| 'car'
	| 'transit'
	| 'walktransit'
	| 'biketransit'
	| 'multiModal';

export type IsochroneBand = {
	minutes: number;
	color: string;
	label: string;
};

export type IsochroneModeConfig = {
	id: IsochroneModeId;
	label: string;
	shortLabel: string;
	legendTitle: string;
	targomoMode: TargomoTravelMode;
	referenceMode?: IsochroneModeId;
	renderStyle: 'standard' | 'transit';
	errorMessage: string;
	rateLimitMessage?: string;
	bands: IsochroneBand[];
};

export const enabledIsochroneModes = [
	{
		id: 'walk',
		label: 'Gangavstand',
		shortLabel: 'Gange',
		legendTitle: 'Gangavstand',
		targomoMode: 'walk',
		renderStyle: 'standard',
		errorMessage: 'Kunne ikke hente gangavstand for valgt adresse.',
		rateLimitMessage: 'Karttjenesten har nådd rate limit. Prøv å hente gangavstand igjen om litt.',
		bands: [
			{ minutes: 5, color: '#16a34a', label: '0-5 min' },
			{ minutes: 10, color: '#ca8a04', label: '5-10 min' },
			{ minutes: 15, color: '#ea580c', label: '10-15 min' },
			{ minutes: 20, color: '#dc2626', label: '15-20 min' }
		]
	},
	{
		id: 'cycling',
		label: 'Sykkel',
		shortLabel: 'Sykkel',
		legendTitle: 'Sykkelavstand',
		targomoMode: 'bike',
		renderStyle: 'standard',
		errorMessage: 'Kunne ikke hente sykkelavstand for valgt adresse.',
		rateLimitMessage:
			'Karttjenesten har nådd rate limit. Prøv å hente sykkelavstand igjen om litt.',
		bands: [
			{ minutes: 5, color: '#0f766e', label: '0-5 min' },
			{ minutes: 10, color: '#4d7c0f', label: '5-10 min' },
			{ minutes: 20, color: '#b45309', label: '10-20 min' },
			{ minutes: 30, color: '#b91c1c', label: '20-30 min' }
		]
	},
	{
		id: 'driving',
		label: 'Bil',
		shortLabel: 'Bil',
		legendTitle: 'Kjoretid',
		targomoMode: 'car',
		renderStyle: 'standard',
		errorMessage: 'Kunne ikke hente kjoretid for valgt adresse.',
		rateLimitMessage: 'Karttjenesten har nådd rate limit. Prøv å hente kjoretid igjen om litt.',
		bands: [
			{ minutes: 10, color: '#2563eb', label: '0-10 min' },
			{ minutes: 20, color: '#7c3aed', label: '10-20 min' },
			{ minutes: 30, color: '#c026d3', label: '20-30 min' },
			{ minutes: 45, color: '#be123c', label: '30-45 min' }
		]
	},
	{
		id: 'transit',
		label: 'Kollektivt',
		shortLabel: 'Kollektiv',
		legendTitle: 'Kollektivrekkevidden',
		targomoMode: 'transit',
		referenceMode: 'walk',
		renderStyle: 'transit',
		errorMessage: 'Kunne ikke hente kollektivrekkevidden for valgt adresse.',
		rateLimitMessage:
			'Karttjenesten har nådd rate limit. Prøv å hente kollektivrekkevidden igjen om litt.',
		bands: [
			{ minutes: 10, color: '#059669', label: '0-10 min' },
			{ minutes: 15, color: '#65a30d', label: '10-15 min' },
			{ minutes: 20, color: '#d97706', label: '15-20 min' },
			{ minutes: 30, color: '#ea580c', label: '20-30 min' },
			{ minutes: 45, color: '#dc2626', label: '30-45 min' },
			{ minutes: 60, color: '#9f1239', label: '45-60 min' }
		]
	},
	{
		id: 'cyclingTransit',
		label: 'Sykkel + kollektivt',
		shortLabel: 'Sykkel+kol.',
		legendTitle: 'Sykkel og kollektivt',
		targomoMode: 'multiModal',
		referenceMode: 'cycling',
		renderStyle: 'transit',
		errorMessage: 'Kunne ikke hente rekkevidde for sykkel og kollektivt for valgt adresse.',
		rateLimitMessage:
			'Karttjenesten har nådd rate limit. Prøv å hente sykkel og kollektivt igjen om litt.',
		bands: [
			{ minutes: 10, color: '#0891b2', label: '0-10 min' },
			{ minutes: 20, color: '#4d7c0f', label: '10-20 min' },
			{ minutes: 30, color: '#d97706', label: '20-30 min' },
			{ minutes: 45, color: '#dc2626', label: '30-45 min' },
			{ minutes: 60, color: '#9f1239', label: '45-60 min' }
		]
	}
] as const satisfies readonly IsochroneModeConfig[];

export const ISOCHRONE_MODES_BY_ID: Record<IsochroneModeId, IsochroneModeConfig> =
	enabledIsochroneModes.reduce(
		(modesById, mode) => {
			modesById[mode.id] = mode;
			return modesById;
		},
		{} as Record<IsochroneModeId, IsochroneModeConfig>
	);

export function isEnabledIsochroneMode(value: unknown): value is IsochroneModeId {
	return typeof value === 'string' && value in ISOCHRONE_MODES_BY_ID;
}
