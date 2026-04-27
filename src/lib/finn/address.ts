import { searchGeonorgeAddresses, type GeonorgeAddress } from '$lib/geonorge/address';

const FINN_AD_URL_BASE = 'https://www.finn.no/realestate/homes/ad.html';

export type FinnAddressLookupResult = {
	finnCode: string;
	addressText: string;
	address: GeonorgeAddress;
	listing: FinnListingInfo;
};

export type FinnListingInfo = {
	finnCode: string;
	url: string;
	title?: string;
	imageUrl?: string;
	price: FinnListingField[];
	keyInfo: FinnListingField[];
};

export type FinnListingField = {
	label: string;
	value: string;
};

export class FinnAddressLookupError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'FinnAddressLookupError';
	}
}

export function extractFinnCode(input: string): string | undefined {
	const trimmedInput = input.trim();
	if (/^\d{6,}$/.test(trimmedInput)) {
		return trimmedInput;
	}

	const finnCodeFromQuery = parseFinnUrl(trimmedInput)?.searchParams.get('finnkode');
	if (finnCodeFromQuery && /^\d{6,}$/.test(finnCodeFromQuery)) {
		return finnCodeFromQuery;
	}

	const finnCodeFromPath = trimmedInput.match(/(?:^|[/.])(\d{6,})(?:$|[/?#])/);
	return finnCodeFromPath?.[1];
}

export function isFinnAddressInput(input: string) {
	return Boolean(extractFinnCode(input));
}

export async function lookupFinnAddress(
	input: string,
	options: { fetch?: typeof fetch } = {}
): Promise<FinnAddressLookupResult> {
	const finnCode = extractFinnCode(input);
	if (!finnCode) {
		throw new FinnAddressLookupError('Ugyldig Finn-kode eller Finn-lenke.');
	}

	const fetcher = options.fetch ?? fetch;
	const finnResponse = await fetcher(buildFinnAdUrl(finnCode), {
		headers: {
			accept: 'text/html',
			'user-agent': 'Mozilla/5.0 (compatible; MoveScore/1.0; +https://github.com/Tollii/move-score)'
		}
	});

	if (!finnResponse.ok) {
		throw new FinnAddressLookupError(`Finn-oppslaget feilet med HTTP ${finnResponse.status}.`);
	}

	const html = await finnResponse.text();
	const addressText = extractAddressTextFromFinnHtml(html);
	if (!addressText) {
		throw new FinnAddressLookupError('Fant ikke adresse i Finn-annonsen.');
	}

	const geonorgeResponse = await searchGeonorgeAddresses(
		{
			sok: addressText,
			fuzzy: true,
			treffPerSide: 1
		},
		{ fetch: fetcher }
	);
	const [address] = geonorgeResponse.adresser;
	if (!address) {
		throw new FinnAddressLookupError(`Fant ikke "${addressText}" hos Geonorge.`);
	}

	return {
		finnCode,
		addressText,
		address,
		listing: extractListingInfoFromFinnHtml(html, finnCode)
	};
}

export function extractAddressTextFromFinnHtml(html: string): string | undefined {
	return (
		extractMapAddress(html) ??
		extractSerializedLocationAddress(html) ??
		extractJsonLdAddress(html) ??
		extractOgDescriptionAddress(html)
	);
}

export function extractListingInfoFromFinnHtml(html: string, finnCode: string): FinnListingInfo {
	return {
		finnCode,
		url: buildFinnAdUrl(finnCode).toString(),
		title: firstCapture(html, /<meta\s+property=["']og:title["']\s+content=["'](?<value>[^"']+)/i),
		imageUrl: firstCapture(
			html,
			/<meta\s+property=["']og:image["']\s+content=["'](?<value>[^"']+)/i
		),
		price: extractDefinitionList(html, 'pricing-details'),
		keyInfo: extractDefinitionList(html, 'key-info')
	};
}

function buildFinnAdUrl(finnCode: string) {
	const url = new URL(FINN_AD_URL_BASE);
	url.searchParams.set('finnkode', finnCode);
	return url;
}

function parseFinnUrl(input: string) {
	try {
		const url = new URL(input);
		return url.hostname.endsWith('finn.no') ? url : undefined;
	} catch {
		return undefined;
	}
}

function extractMapAddress(html: string) {
	const match = html.match(/data-testid=["']map-address["'][^>]*>(?<address>[\s\S]*?)<\/span>/i);
	return normalizeAddressText(match?.groups?.address);
}

function extractSerializedLocationAddress(html: string) {
	const streetAddress = firstCapture(html, /\\?"streetAddress\\?",\\?"(?<value>[^"\\]+)\\?"/);
	const postalCode = firstCapture(html, /\\?"postalCode\\?",\\?"(?<value>[^"\\]+)\\?"/);
	return normalizeAddressText([streetAddress, postalCode].filter(Boolean).join(', '));
}

function extractJsonLdAddress(html: string) {
	for (const script of html.matchAll(
		/<script[^>]+type=["']application\/ld\+json["'][^>]*>(?<json>[\s\S]*?)<\/script>/gi
	)) {
		const jsonText = decodeHtmlEntities(script.groups?.json ?? '');
		try {
			const value = JSON.parse(jsonText) as unknown;
			const address = findAddressLikeValue(value);
			if (address) {
				return address;
			}
		} catch {
			continue;
		}
	}
	return undefined;
}

function extractOgDescriptionAddress(html: string) {
	const description = firstCapture(
		html,
		/<meta\s+name=["']description["']\s+content=["'](?<value>[^"']+)/i
	);
	const match = decodeHtmlEntities(description ?? '').match(
		/\b(?<street>[\p{L} .'-]+ \d+[A-Z]?)\b/u
	);
	return normalizeAddressText(match?.groups?.street);
}

function extractDefinitionList(html: string, testId: string): FinnListingField[] {
	const section = html.match(
		new RegExp(
			`<section[^>]+data-testid=["']${escapeRegExp(testId)}["'][^>]*>(?<content>[\\s\\S]*?)<\\/section>`,
			'i'
		)
	)?.groups?.content;

	if (!section) {
		return [];
	}

	const fields: FinnListingField[] = [];
	for (const match of section.matchAll(
		/<div[^>]*>\s*<dt[^>]*>(?<label>[\s\S]*?)<\/dt>\s*<dd[^>]*>(?<value>[\s\S]*?)<\/dd>\s*<\/div>/gi
	)) {
		const label = normalizeAddressText(match.groups?.label);
		const value = normalizeAddressText(match.groups?.value);
		if (label && value) {
			fields.push({ label, value });
		}
	}

	const indicativePrice = section.match(
		/<div[^>]+data-testid=["']pricing-incicative-price["'][^>]*>[\s\S]*?<span[^>]*>(?<label>[\s\S]*?)<\/span>\s*<span[^>]*>(?<value>[\s\S]*?)<\/span>/i
	);
	const priceLabel = normalizeAddressText(indicativePrice?.groups?.label);
	const priceValue = normalizeAddressText(indicativePrice?.groups?.value);
	if (priceLabel && priceValue && !fields.some((field) => field.label === priceLabel)) {
		fields.unshift({ label: priceLabel, value: priceValue });
	}

	return fields;
}

function findAddressLikeValue(value: unknown): string | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const address = findAddressLikeValue(item);
			if (address) {
				return address;
			}
		}
		return undefined;
	}

	const record = value as Record<string, unknown>;
	const address = record.address;
	if (address && typeof address === 'object') {
		const addressRecord = address as Record<string, unknown>;
		const streetAddress = stringValue(addressRecord.streetAddress);
		const postalCode = stringValue(addressRecord.postalCode);
		const locality = stringValue(addressRecord.addressLocality);
		const candidate = normalizeAddressText(
			[streetAddress, postalCode, locality].filter(Boolean).join(', ')
		);
		if (candidate) {
			return candidate;
		}
	}

	for (const item of Object.values(record)) {
		const found = findAddressLikeValue(item);
		if (found) {
			return found;
		}
	}
	return undefined;
}

function firstCapture(html: string, pattern: RegExp) {
	const match = html.match(pattern);
	return match?.groups?.value ? decodeHtmlEntities(match.groups.value) : undefined;
}

function normalizeAddressText(value: string | undefined) {
	const decoded = decodeHtmlEntities(value ?? '')
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	return decoded || undefined;
}

function decodeHtmlEntities(value: string) {
	return value
		.replace(/\\u003c/g, '<')
		.replace(/\\u003e/g, '>')
		.replace(/\\u002F/gi, '/')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

function stringValue(value: unknown) {
	return typeof value === 'string' ? value : undefined;
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
