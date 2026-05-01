import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
	...authTables,
	featureFlags: defineTable({
		name: v.string(),
		enabled: v.boolean(),
		updatedAt: v.number()
	}).index('by_name', ['name'])
});
