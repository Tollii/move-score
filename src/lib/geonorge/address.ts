const GEONORGE_ADDRESS_BASE_URL = 'https://ws.geonorge.no/adresser/v1';

export type GeonorgeAddressObjectType = 'Vegadresse' | 'Matrikkeladresse';
export type GeonorgeSearchMode = 'AND' | 'OR';

export type GeonorgePoint = {
	epsg?: string;
	lat: number;
	lon: number;
};

export type GeonorgeAddress = {
	adressenavn?: string | null;
	adressetekst?: string | null;
	adressetilleggsnavn?: string | null;
	adressekode?: number | null;
	nummer?: number | null;
	bokstav?: string | null;
	kommunenummer?: string | null;
	kommunenavn?: string | null;
	gardsnummer?: number | null;
	bruksnummer?: number | null;
	festenummer?: number | null;
	undernummer?: number | null;
	bruksenhetsnummer?: string[] | null;
	objtype?: GeonorgeAddressObjectType | null;
	poststed?: string | null;
	postnummer?: string | null;
	adressetekstutenadressetilleggsnavn?: string | null;
	stedfestingverifisert?: boolean | null;
	representasjonspunkt?: GeonorgePoint | null;
	oppdateringsdato?: string | null;
};

export type GeonorgeAddressSearchMetadata = {
	side?: number;
	totaltAntallTreff?: number;
	treffPerSide?: number;
	sokeStreng?: string;
	viserFra?: number;
	asciiKompatibel?: boolean;
	viserTil?: number;
};

export type GeonorgeAddressSearchResponse = {
	metadata?: GeonorgeAddressSearchMetadata;
	adresser: GeonorgeAddress[];
};

export type GeonorgeAddressSearchParams = {
	sok?: string;
	fuzzy?: boolean;
	sokemodus?: GeonorgeSearchMode;
	adressenavn?: string;
	adressetekst?: string;
	adressetilleggsnavn?: string;
	adressekode?: number;
	nummer?: number;
	bokstav?: string;
	kommunenummer?: string;
	kommunenavn?: string;
	gardsnummer?: number;
	bruksnummer?: number;
	festenummer?: number;
	undernummer?: number;
	bruksenhetsnummer?: string;
	objtype?: GeonorgeAddressObjectType;
	poststed?: string;
	postnummer?: string;
	filtrer?: string | string[];
	utkoordsys?: number;
	treffPerSide?: number;
	side?: number;
	asciiKompatibel?: boolean;
};

export type SearchGeonorgeAddressesOptions = {
	fetch?: typeof fetch;
	signal?: AbortSignal;
	baseUrl?: string;
};

export class GeonorgeAddressLookupError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly responseText: string
	) {
		super(message);
		this.name = 'GeonorgeAddressLookupError';
	}
}

export async function searchGeonorgeAddresses(
	params: GeonorgeAddressSearchParams,
	options: SearchGeonorgeAddressesOptions = {}
): Promise<GeonorgeAddressSearchResponse> {
	const url = buildGeonorgeAddressSearchUrl(params, options.baseUrl);
	const fetcher = options.fetch ?? fetch;
	const response = await fetcher(url, {
		signal: options.signal,
		headers: { accept: 'application/json' }
	});

	if (!response.ok) {
		const responseText = await response.text();
		throw new GeonorgeAddressLookupError(
			`GeoNorge address lookup failed with HTTP ${response.status}`,
			response.status,
			responseText
		);
	}

	const payload = (await response.json()) as Partial<GeonorgeAddressSearchResponse>;

	return {
		metadata: payload.metadata,
		adresser: Array.isArray(payload.adresser) ? payload.adresser : []
	};
}

export function buildGeonorgeAddressSearchUrl(
	params: GeonorgeAddressSearchParams,
	baseUrl = GEONORGE_ADDRESS_BASE_URL
): URL {
	const url = new URL(`${baseUrl.replace(/\/$/, '')}/sok`);
	const searchParams = toSearchParams(params);

	if (!Array.from(searchParams).length) {
		throw new Error('At least one GeoNorge address search parameter is required.');
	}

	url.search = searchParams.toString();
	return url;
}

function toSearchParams(params: GeonorgeAddressSearchParams): URLSearchParams {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') {
			continue;
		}

		if (Array.isArray(value)) {
			searchParams.set(key, value.join(','));
			continue;
		}

		searchParams.set(key, String(value));
	}

	return searchParams;
}
