import { json, type RequestHandler } from '@sveltejs/kit';
import { FinnAddressLookupError, lookupFinnAddress } from '$lib/finn/address';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const input = url.searchParams.get('input')?.trim();
	if (!input) {
		return json({ error: 'Mangler Finn-kode eller Finn-lenke.' }, { status: 400 });
	}

	try {
		return json(await lookupFinnAddress(input, { fetch }));
	} catch (error) {
		if (error instanceof FinnAddressLookupError) {
			return json({ error: error.message }, { status: 422 });
		}

		console.error('Finn address lookup failed', error);
		return json({ error: 'Kunne ikke slå opp Finn-annonsen akkurat nå.' }, { status: 502 });
	}
};
