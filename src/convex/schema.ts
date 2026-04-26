// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	// Cached isochrones. Key is a deterministic hash of the query params.
	isochrones: defineTable({
		cacheKey: v.string(), // hash(lat, lon, mode, minutes)
		lat: v.number(),
		lon: v.number(),
		mode: v.literal('walk'),
		minutes: v.array(v.number()), // e.g. [5, 10, 15, 20]
		geojson: v.string(), // Stringified FeatureCollection of polygons
		computedAt: v.number(), // Date.now()
		ttlDays: v.number() // walk=90
	})
		.index('by_cacheKey', ['cacheKey'])
		.index('by_computedAt', ['computedAt']),

	// Cached geocoding results (Kartverket).
	addresses: defineTable({
		query: v.string(), // normalized address string
		resolvedText: v.string(), // canonical "Storgata 1, 2000 Lillestrøm"
		lat: v.number(),
		lon: v.number(),
		postnummer: v.string(),
		poststed: v.string(),
		kommune: v.string(),
		lookupCount: v.number() // for popularity analytics
	})
		.index('by_query', ['query'])
		.index('by_lookupCount', ['lookupCount']),

	// POIs extracted nightly from OSM. Indexed spatially by a geohash prefix.
	pois: defineTable({
		osmId: v.string(),
		category: v.string(), // "grocery", "kindergarten", "metro", "gym", "pharmacy", ...
		name: v.string(),
		lat: v.number(),
		lon: v.number(),
		geohash5: v.string(), // 5-char prefix ~5km box, for cheap spatial lookups
		tags: v.any() // raw OSM tags
	})
		.index('by_category_and_geohash', ['category', 'geohash5'])
		.index('by_osmId', ['osmId']),

	// Saved locations (Pro feature, later).
	savedPlaces: defineTable({
		userId: v.string(),
		label: v.string(), // "Dream apartment", "Current place"
		address: v.string(),
		lat: v.number(),
		lon: v.number(),
		notes: v.optional(v.string())
	}).index('by_user', ['userId'])
});
