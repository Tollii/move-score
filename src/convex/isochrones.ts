// convex/isochrones.ts
import { api } from './_generated/api';
import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getWalkIsochrone = action({
	args: {
		lat: v.number(),
		lon: v.number(),
		minutes: v.array(v.number()) // e.g. [5, 10, 15, 20]
	},
	handler: async (ctx, { lat, lon, minutes }): Promise<unknown> => {
		const cacheKey = `walk:${lat.toFixed(5)}:${lon.toFixed(5)}:${minutes.join(',')}`;
		console.log('[isochrones.getWalkIsochrone] start', { cacheKey, lat, lon, minutes });
		const cached = (await ctx.runQuery(api.isochrones.getCached, { cacheKey })) as {
			geojson: unknown;
			computedAt: number;
			ttlDays: number;
		} | null;
		if (cached && isFresh(cached, 90)) {
			console.log('[isochrones.getWalkIsochrone] cache hit', {
				cacheKey,
				computedAt: cached.computedAt,
				ttlDays: cached.ttlDays
			});
			return cached.geojson;
		}
		if (cached) {
			console.log('[isochrones.getWalkIsochrone] cache stale', {
				cacheKey,
				computedAt: cached.computedAt,
				ttlDays: cached.ttlDays
			});
		} else {
			console.log('[isochrones.getWalkIsochrone] cache miss', { cacheKey });
		}

		const apiKey = process.env.ORS_API_KEY;
		if (!apiKey) {
			console.log('[isochrones.getWalkIsochrone] missing ORS_API_KEY', { cacheKey });
			throw new Error('ORS_API_KEY is not configured');
		}

		console.log('[isochrones.getWalkIsochrone] fetching ORS', { cacheKey });
		const res = await fetch('https://api.openrouteservice.org/v2/isochrones/foot-walking', {
			method: 'POST',
			headers: {
				Authorization: apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				locations: [[lon, lat]], // ORS is lon,lat
				range: minutes.map((m) => m * 60), // seconds
				range_type: 'time',
				attributes: ['area']
			})
		});
		console.log('[isochrones.getWalkIsochrone] ORS response', {
			cacheKey,
			status: res.status,
			ok: res.ok
		});
		if (!res.ok) {
			const body = await res.text();
			console.log('[isochrones.getWalkIsochrone] ORS error', {
				cacheKey,
				status: res.status,
				body
			});
			throw new Error(`ORS ${res.status}: ${body}`);
		}
		const geojson = await res.json();
		const featureCount = Array.isArray(geojson?.features) ? geojson.features.length : undefined;
		console.log('[isochrones.getWalkIsochrone] ORS parsed', { cacheKey, featureCount });

		await ctx.runMutation(api.isochrones.saveCache, {
			cacheKey,
			lat,
			lon,
			mode: 'walk',
			minutes,
			geojson,
			ttlDays: 90
		});
		console.log('[isochrones.getWalkIsochrone] saved cache', { cacheKey });
		return geojson;
	}
});

export const getCached = query({
	args: { cacheKey: v.string() },
	handler: async (ctx, { cacheKey }) => {
		const cached = await ctx.db
			.query('isochrones')
			.withIndex('by_cacheKey', (q) => q.eq('cacheKey', cacheKey))
			.first();
		console.log('[isochrones.getCached] lookup', { cacheKey, hit: cached !== null });
		return cached;
	}
});

export const saveCache = mutation({
	args: {
		cacheKey: v.string(),
		lat: v.number(),
		lon: v.number(),
		mode: v.union(v.literal('walk'), v.literal('transit'), v.literal('bike')),
		minutes: v.array(v.number()),
		departAt: v.optional(v.string()),
		geojson: v.any(),
		ttlDays: v.number()
	},
	handler: async (ctx, args) => {
		console.log('[isochrones.saveCache] upsert start', { cacheKey: args.cacheKey });
		const existing = await ctx.db
			.query('isochrones')
			.withIndex('by_cacheKey', (q) => q.eq('cacheKey', args.cacheKey))
			.first();

		const row = {
			...args,
			computedAt: Date.now()
		};

		if (existing) {
			await ctx.db.patch(existing._id, row);
			console.log('[isochrones.saveCache] updated existing', { cacheKey: args.cacheKey });
			return existing._id;
		}

		const id = await ctx.db.insert('isochrones', row);
		console.log('[isochrones.saveCache] inserted new', { cacheKey: args.cacheKey, id });
		return id;
	}
});

function isFresh(row: { computedAt: number; ttlDays: number }, maxDays: number) {
	return Date.now() - row.computedAt < maxDays * 86400 * 1000;
}
