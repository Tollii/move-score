import { api } from './_generated/api';
import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const resolveAddress = action({
	args: { query: v.string() },
	handler: async (ctx, { query }): Promise<unknown> => {
		console.log('[geocode.resolveAddress] start', { query });
		const cached = (await ctx.runQuery(api.geocode.getCached, { query })) as unknown;
		if (cached) {
			console.log('[geocode.resolveAddress] cache hit', { query });
			return cached;
		}

		const url = new URL('https://ws.geonorge.no/adresser/v1/sok');
		url.searchParams.set('sok', query);
		url.searchParams.set('treffPerSide', '1');
		console.log('[geocode.resolveAddress] fetching GeoNorge', { query });
		const res = await fetch(url);
		console.log('[geocode.resolveAddress] GeoNorge response', {
			query,
			status: res.status,
			ok: res.ok
		});
		const data = await res.json();
		const hit = data.adresser?.[0];
		if (!hit) {
			console.log('[geocode.resolveAddress] no hit', { query });
			throw new Error('Address not found');
		}

		const result = {
			query,
			resolvedText: hit.adressetekst + ', ' + hit.postnummer + ' ' + hit.poststed,
			lat: hit.representasjonspunkt.lat,
			lon: hit.representasjonspunkt.lon,
			postnummer: hit.postnummer,
			poststed: hit.poststed,
			kommune: hit.kommunenavn
		};

		await ctx.runMutation(api.geocode.saveCache, result);
		console.log('[geocode.resolveAddress] resolved and cached', {
			query,
			resolvedText: result.resolvedText,
			lat: result.lat,
			lon: result.lon
		});
		return result;
	}
});

export const getCached = query({
	args: { query: v.string() },
	handler: async (ctx, { query }) => {
		const cached = await ctx.db
			.query('addresses')
			.withIndex('by_query', (q) => q.eq('query', query))
			.first();
		console.log('[geocode.getCached] lookup', { query, hit: cached !== null });
		return cached;
	}
});

export const saveCache = mutation({
	args: {
		query: v.string(),
		resolvedText: v.string(),
		lat: v.number(),
		lon: v.number(),
		postnummer: v.string(),
		poststed: v.string(),
		kommune: v.string()
	},
	handler: async (ctx, result) => {
		console.log('[geocode.saveCache] upsert start', {
			query: result.query,
			resolvedText: result.resolvedText
		});
		const existing = await ctx.db
			.query('addresses')
			.withIndex('by_query', (q) => q.eq('query', result.query))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				...result,
				lookupCount: existing.lookupCount + 1
			});
			console.log('[geocode.saveCache] updated existing', {
				query: result.query,
				lookupCount: existing.lookupCount + 1
			});
			return existing._id;
		}

		const id = await ctx.db.insert('addresses', {
			...result,
			lookupCount: 1
		});
		console.log('[geocode.saveCache] inserted new', { query: result.query, id });
		return id;
	}
});
