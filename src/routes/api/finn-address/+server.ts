import { json, type RequestHandler } from '@sveltejs/kit';
import { FinnAddressLookupError, lookupFinnAddress } from '$lib/finn/address';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const startedAt = Date.now();
	const input = url.searchParams.get('input')?.trim();
	if (!input) {
		console.info('[finn.lookup] rejected', {
			provider: 'Finn',
			code: 'FINN_LOOKUP_INPUT_MISSING',
			durationMs: Date.now() - startedAt
		});
		return json({ error: 'Mangler Finn-kode eller Finn-lenke.' }, { status: 400 });
	}

	try {
		const result = await lookupFinnAddress(input, { fetch });
		console.info('[finn.lookup] completed', {
			provider: 'Finn',
			result: 'success',
			hasListing: Boolean(result.listing),
			durationMs: Date.now() - startedAt
		});
		return json(result);
	} catch (error) {
		if (error instanceof FinnAddressLookupError) {
			console.warn('[finn.lookup] failed', {
				provider: 'Finn',
				code: 'FINN_LOOKUP_FAILED',
				status: 422,
				durationMs: Date.now() - startedAt
			});
			return json({ error: error.message }, { status: 422 });
		}

		console.error('[finn.lookup] failed', {
			provider: 'Finn',
			code: 'FINN_LOOKUP_FAILED',
			status: 502,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - startedAt
		});
		return json({ error: 'Kunne ikke slå opp Finn-annonsen akkurat nå.' }, { status: 502 });
	}
};
