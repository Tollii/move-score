import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
	...authTables,
	featureFlags: defineTable({
		name: v.string(),
		enabled: v.boolean(),
		updatedAt: v.number()
	}).index('by_name', ['name']),
	personalPois: defineTable({
		userId: v.id('users'),
		label: v.string(),
		category: v.union(
			v.literal('work'),
			v.literal('school'),
			v.literal('family'),
			v.literal('other')
		),
		address: v.optional(v.string()),
		lat: v.number(),
		lon: v.number(),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_user', ['userId'])
});
