import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

const poiCategory = v.union(
	v.literal('work'),
	v.literal('school'),
	v.literal('family'),
	v.literal('other')
);

const poiFields = {
	label: v.string(),
	category: poiCategory,
	address: v.optional(v.string()),
	lat: v.number(),
	lon: v.number()
};

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return [];
		}

		const pois = await ctx.db
			.query('personalPois')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.collect();

		return pois
			.map((poi) => ({
				id: poi._id,
				label: poi.label,
				category: poi.category,
				address: poi.address ?? null,
				lat: poi.lat,
				lon: poi.lon,
				createdAt: poi.createdAt,
				updatedAt: poi.updatedAt
			}))
			.sort((a, b) => a.label.localeCompare(b.label, 'nb'));
	}
});

export const create = mutation({
	args: poiFields,
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		const now = Date.now();
		const fields = normalizePoiFields(args);

		return await ctx.db.insert('personalPois', {
			userId,
			...fields,
			createdAt: now,
			updatedAt: now
		});
	}
});

export const update = mutation({
	args: {
		id: v.id('personalPois'),
		...poiFields
	},
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		const existing = await requireOwnedPoi(ctx, userId, args.id);
		const fields = normalizePoiFields(args);

		await ctx.db.patch(existing._id, {
			...fields,
			updatedAt: Date.now()
		});
	}
});

export const remove = mutation({
	args: {
		id: v.id('personalPois')
	},
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		const existing = await requireOwnedPoi(ctx, userId, args.id);
		await ctx.db.delete(existing._id);
	}
});

async function requireUserId(ctx: MutationCtx) {
	const userId = await getAuthUserId(ctx);
	if (!userId) {
		throw new Error('UNAUTHENTICATED');
	}
	return userId;
}

async function requireOwnedPoi(ctx: MutationCtx, userId: Id<'users'>, id: Id<'personalPois'>) {
	const poi = await ctx.db.get(id);
	if (!poi || poi.userId !== userId) {
		throw new Error('PERSONAL_POI_NOT_FOUND');
	}
	return poi;
}

function normalizePoiFields(args: {
	label: string;
	category: 'work' | 'school' | 'family' | 'other';
	address?: string;
	lat: number;
	lon: number;
}) {
	const label = args.label.trim();
	const address = args.address?.trim();

	if (label.length < 1 || label.length > 80) {
		throw new Error('PERSONAL_POI_LABEL_INVALID');
	}

	if (address && address.length > 180) {
		throw new Error('PERSONAL_POI_ADDRESS_INVALID');
	}

	if (!Number.isFinite(args.lat) || args.lat < -90 || args.lat > 90) {
		throw new Error('PERSONAL_POI_LAT_INVALID');
	}

	if (!Number.isFinite(args.lon) || args.lon < -180 || args.lon > 180) {
		throw new Error('PERSONAL_POI_LON_INVALID');
	}

	return {
		label,
		category: args.category,
		address: address || undefined,
		lat: args.lat,
		lon: args.lon
	};
}
