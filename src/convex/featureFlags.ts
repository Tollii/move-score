import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
	args: {},
	handler: async (ctx) => {
		const flags = await ctx.db.query('featureFlags').collect();
		return flags
			.map((flag) => ({
				name: flag.name,
				enabled: flag.enabled,
				updatedAt: flag.updatedAt
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}
});

export const isEnabled = query({
	args: {
		name: v.string(),
		defaultValue: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const flag = await ctx.db
			.query('featureFlags')
			.withIndex('by_name', (q) => q.eq('name', args.name))
			.unique();

		return flag?.enabled ?? args.defaultValue ?? false;
	}
});

export const set = mutation({
	args: {
		name: v.string(),
		enabled: v.boolean()
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new Error('UNAUTHENTICATED');
		}

		const existing = await ctx.db
			.query('featureFlags')
			.withIndex('by_name', (q) => q.eq('name', args.name))
			.unique();
		const updatedAt = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, { enabled: args.enabled, updatedAt });
			return existing._id;
		}

		return await ctx.db.insert('featureFlags', {
			name: args.name,
			enabled: args.enabled,
			updatedAt
		});
	}
});
