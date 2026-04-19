// convex/pois.ts
import { query } from './_generated/server';
import { v } from 'convex/values';
import { booleanPointInPolygon, point } from '@turf/turf';

type Bbox = [minLon: number, minLat: number, maxLon: number, maxLat: number];

export const poisInIsochrone = query({
	args: {
		category: v.string(),
		geojson: v.any() // FeatureCollection from isochrone
	},
	handler: async (ctx, { category, geojson }) => {
		console.log('[pois.poisInIsochrone] start', { category });
		// Coarse filter: get POIs whose geohash5 overlaps the polygon bbox.
		// Fine filter: point-in-polygon using @turf/turf.
		const bbox = computeBbox(geojson);
		const candidateHashes = geohashPrefixesForBbox(bbox, 5);
		console.log('[pois.poisInIsochrone] bbox and hashes', {
			category,
			bbox,
			hashCount: candidateHashes.length
		});
		const candidates = [];
		for (const h of candidateHashes) {
			const rows = await ctx.db
				.query('pois')
				.withIndex('by_category_and_geohash', (q) => q.eq('category', category).eq('geohash5', h))
				.collect();
			console.log('[pois.poisInIsochrone] hash candidates', {
				category,
				geohash5: h,
				count: rows.length
			});
			candidates.push(...rows);
		}
		const polygon = geojson.features[0]; // largest ring
		const filtered = candidates.filter((p) =>
			booleanPointInPolygon(point([p.lon, p.lat]), polygon)
		);
		console.log('[pois.poisInIsochrone] filtered', {
			category,
			candidateCount: candidates.length,
			filteredCount: filtered.length
		});
		return filtered;
	}
});

function computeBbox(geojson: unknown): Bbox {
	let minLon = Infinity;
	let minLat = Infinity;
	let maxLon = -Infinity;
	let maxLat = -Infinity;

	function visitCoordinates(value: unknown) {
		if (!Array.isArray(value)) {
			return;
		}

		if (
			value.length >= 2 &&
			typeof value[0] === 'number' &&
			typeof value[1] === 'number' &&
			Number.isFinite(value[0]) &&
			Number.isFinite(value[1])
		) {
			const [lon, lat] = value;
			minLon = Math.min(minLon, lon);
			minLat = Math.min(minLat, lat);
			maxLon = Math.max(maxLon, lon);
			maxLat = Math.max(maxLat, lat);
			return;
		}

		for (const item of value) {
			visitCoordinates(item);
		}
	}

	function visitGeojson(value: unknown) {
		if (!value || typeof value !== 'object') {
			return;
		}

		const maybeGeojson = value as {
			coordinates?: unknown;
			geometry?: unknown;
			features?: unknown[];
		};

		visitCoordinates(maybeGeojson.coordinates);
		visitGeojson(maybeGeojson.geometry);

		if (Array.isArray(maybeGeojson.features)) {
			for (const feature of maybeGeojson.features) {
				visitGeojson(feature);
			}
		}
	}

	visitGeojson(geojson);

	if (![minLon, minLat, maxLon, maxLat].every(Number.isFinite)) {
		throw new Error('Expected GeoJSON with finite lon/lat coordinates');
	}

	return [minLon, minLat, maxLon, maxLat];
}

function geohashPrefixesForBbox([minLon, minLat, maxLon, maxLat]: Bbox, precision: number) {
	const hashes = new Set<string>();
	const totalBits = precision * 5;
	const lonBits = Math.ceil(totalBits / 2);
	const latBits = Math.floor(totalBits / 2);
	const lonStep = 360 / 2 ** lonBits;
	const latStep = 180 / 2 ** latBits;
	const startLon = Math.max(-180, minLon - lonStep);
	const endLon = Math.min(180, maxLon + lonStep);
	const startLat = Math.max(-90, minLat - latStep);
	const endLat = Math.min(90, maxLat + latStep);

	for (let lat = startLat; lat <= endLat; lat += latStep) {
		for (let lon = startLon; lon <= endLon; lon += lonStep) {
			hashes.add(encodeGeohash(lat, lon, precision));
		}
	}

	hashes.add(encodeGeohash(minLat, minLon, precision));
	hashes.add(encodeGeohash(minLat, maxLon, precision));
	hashes.add(encodeGeohash(maxLat, minLon, precision));
	hashes.add(encodeGeohash(maxLat, maxLon, precision));

	return [...hashes];
}

function encodeGeohash(lat: number, lon: number, precision: number) {
	const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
	let latRange: [number, number] = [-90, 90];
	let lonRange: [number, number] = [-180, 180];
	let hash = '';
	let bit = 0;
	let charIndex = 0;
	let evenBit = true;

	while (hash.length < precision) {
		if (evenBit) {
			const mid = (lonRange[0] + lonRange[1]) / 2;
			if (lon >= mid) {
				charIndex = charIndex * 2 + 1;
				lonRange = [mid, lonRange[1]];
			} else {
				charIndex *= 2;
				lonRange = [lonRange[0], mid];
			}
		} else {
			const mid = (latRange[0] + latRange[1]) / 2;
			if (lat >= mid) {
				charIndex = charIndex * 2 + 1;
				latRange = [mid, latRange[1]];
			} else {
				charIndex *= 2;
				latRange = [latRange[0], mid];
			}
		}

		evenBit = !evenBit;
		bit += 1;

		if (bit === 5) {
			hash += base32[charIndex];
			bit = 0;
			charIndex = 0;
		}
	}

	return hash;
}
