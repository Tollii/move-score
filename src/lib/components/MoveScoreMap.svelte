<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type maplibregl from 'maplibre-gl';
	import { useConvexClient } from 'convex-svelte';
	import { difference, featureCollection } from '@turf/turf';
	import { api } from '../../convex/_generated/api';
	import type { GeonorgeAddress } from '$lib/geonorge/address';

	type Props = {
		selectedAddress?: GeonorgeAddress;
		class?: string;
		triggerKey?: number;
		mode?: 'walk' | 'transit';
		visibleBandMinutes?: number[];
		isLoading?: boolean;
		error?: string | undefined;
	};

	type IsochroneProperties = {
		value?: number | string | null;
	};

	type IsochroneFeature = GeoJSON.Feature<GeoJSON.Geometry, IsochroneProperties>;
	type IsochronePolygonFeature = GeoJSON.Feature<
		GeoJSON.Polygon | GeoJSON.MultiPolygon,
		IsochroneProperties
	>;
	type IsochroneFeatureCollection = GeoJSON.FeatureCollection<
		GeoJSON.Geometry,
		IsochroneProperties
	>;

	let {
		selectedAddress,
		class: className = '',
		triggerKey = 0,
		mode = 'walk',
		visibleBandMinutes,
		isLoading = $bindable(false),
		error = $bindable<string | undefined>(undefined)
	}: Props = $props();

	let mapEl: HTMLDivElement;
	let map = $state<maplibregl.Map | undefined>();
	let marker: maplibregl.Marker | undefined;
	let mapReady = $state(false);
	let origin = $state<{ lat: number; lon: number } | null>(null);
	let isochrone = $state<IsochroneFeatureCollection | null>(null);
	let walkIsochrone = $state<IsochroneFeatureCollection | null>(null);
	let renderedIsochrone = $state<IsochroneFeatureCollection | null>(null);
	let renderedWalkIsochrone = $state<IsochroneFeatureCollection | null>(null);
	let selectedOriginKey = '';
	let activeRequestKey = '';
	let loadedIsochroneKey = '';
	let renderedIsochroneLayerIds: string[] = [];
	let lastTriggerKey = 0;

	const client = useConvexClient();

	const WALK_BANDS = [
		{ minutes: 5, color: '#16a34a', label: '0–5 min' },
		{ minutes: 10, color: '#ca8a04', label: '5–10 min' },
		{ minutes: 15, color: '#ea580c', label: '10–15 min' },
		{ minutes: 20, color: '#dc2626', label: '15–20 min' }
	];

	const TRANSIT_BANDS = [
		{ minutes: 10, color: '#059669', label: '0–10 min' },
		{ minutes: 15, color: '#65a30d', label: '10–15 min' },
		{ minutes: 20, color: '#d97706', label: '15–20 min' },
		{ minutes: 30, color: '#ea580c', label: '20–30 min' },
		{ minutes: 45, color: '#dc2626', label: '30–45 min' },
		{ minutes: 60, color: '#9f1239', label: '45–60 min' }
	];

	onMount(() => {
		let destroyed = false;

		async function initializeMap() {
			const maplibre = await import('maplibre-gl');

			if (destroyed) {
				return;
			}

			map = new maplibre.default.Map({
				container: mapEl,
				style: 'https://tiles.openfreemap.org/styles/liberty',
				center: [10.7522, 59.9139],
				zoom: 11.2,
				attributionControl: false
			});

			map.addControl(
				new maplibre.default.NavigationControl({ showZoom: true, showCompass: true }),
				'top-right'
			);
			map.addControl(new maplibre.default.AttributionControl({ compact: true }), 'bottom-right');

			marker = new maplibre.default.Marker({ color: '#ffb000', scale: 1.05 });
			map.on('load', () => {
				mapReady = true;
			});
		}

		initializeMap();

		return () => {
			destroyed = true;
			map?.remove();
		};
	});

	$effect(() => {
		const point = selectedAddress?.representasjonspunkt;

		if (!mapReady || !point) {
			return;
		}

		const originKey = `${point.lat}:${point.lon}`;
		if (selectedOriginKey === originKey) {
			return;
		}

		selectedOriginKey = originKey;
		activeRequestKey = '';
		loadedIsochroneKey = '';
		origin = { lat: point.lat, lon: point.lon };
		isochrone = null;
		walkIsochrone = null;
		renderedIsochrone = null;
		renderedWalkIsochrone = null;
		error = undefined;
		clearIsochroneLayers();
		moveMapToOrigin();
	});

	$effect(() => {
		const key = triggerKey;
		if (key > 0 && key !== lastTriggerKey) {
			lastTriggerKey = key;
			untrack(showIsochrone);
		}
	});

	$effect(() => {
		visibleBandMinutes;
		mode;
		if (renderedIsochrone && loadedIsochroneKey === `${selectedOriginKey}:${mode}`) {
			untrack(() => renderIsochrone({ moveCamera: false }));
		}
	});

	function showIsochrone() {
		if (!origin) {
			return;
		}

		const requestKey = `${selectedOriginKey}:${mode}`;
		if (renderedIsochrone && loadedIsochroneKey === requestKey) {
			renderIsochrone({ moveCamera: true });
			return;
		}

		activeRequestKey = requestKey;
		void loadIsochrone(origin.lat, origin.lon, requestKey);
	}

	async function loadIsochrone(lat: number, lon: number, requestKey: string) {
		isLoading = true;
		error = undefined;

		try {
			const currentMode = mode;

			if (currentMode === 'transit') {
				const [transitGeojson, walkGeojson] = await Promise.all([
					client.action(api.isochrones.getTransitIsochrone, {
						lat,
						lon,
						minutes: TRANSIT_BANDS.map((b) => b.minutes)
					}),
					client.action(api.isochrones.getWalkIsochrone, {
						lat,
						lon,
						minutes: WALK_BANDS.map((b) => b.minutes)
					})
				]);

				if (activeRequestKey !== requestKey) return;

				isochrone = parseIsochrone(transitGeojson);
				walkIsochrone = parseIsochrone(walkGeojson);
				renderedIsochrone = prepareIsochroneForRendering(isochrone);
				renderedWalkIsochrone = prepareIsochroneForRendering(walkIsochrone);
			} else {
				const geojson = await client.action(api.isochrones.getWalkIsochrone, {
					lat,
					lon,
					minutes: WALK_BANDS.map((b) => b.minutes)
				});

				if (activeRequestKey !== requestKey) return;

				isochrone = parseIsochrone(geojson);
				walkIsochrone = null;
				renderedIsochrone = prepareIsochroneForRendering(isochrone);
				renderedWalkIsochrone = null;
			}

			loadedIsochroneKey = requestKey;
			renderIsochrone({ moveCamera: true });
		} catch (err) {
			if (activeRequestKey !== requestKey) return;

			isochrone = null;
			walkIsochrone = null;
			renderedIsochrone = null;
			renderedWalkIsochrone = null;
			loadedIsochroneKey = '';
			clearIsochroneLayers();
			error =
				mode === 'transit'
					? 'Kunne ikke hente kollektivrekkevidden for valgt adresse.'
					: isRateLimitError(err)
						? 'Mapbox har nådd rate limit. Kartet er flyttet, men gangavstand kan hentes igjen om litt.'
						: 'Kunne ikke hente gangavstand for valgt adresse.';
		} finally {
			if (activeRequestKey === requestKey) {
				isLoading = false;
			}
		}
	}

	function renderIsochrone({ moveCamera = false }: { moveCamera?: boolean } = {}) {
		if (!map || !renderedIsochrone) return;
		clearIsochroneLayers();

		// When transit is shown, draw walk isochrone as ghost reference underneath
		if (mode === 'transit' && renderedWalkIsochrone) {
			const ghostFeatures = [...renderedWalkIsochrone.features]
				.filter(isPolygonFeature)
				.sort((a, b) => featureValue(b) - featureValue(a));

			for (const [index, feature] of ghostFeatures.entries()) {
				const id = `iso-walk-ghost-${featureValue(feature)}-${index}`;
				const color = walkBandColor(feature);
				map.addSource(id, { type: 'geojson', data: feature });
				map.addLayer({
					id,
					type: 'fill',
					source: id,
					paint: { 'fill-color': color, 'fill-opacity': 0.045, 'fill-outline-color': color }
				});
				renderedIsochroneLayerIds = [...renderedIsochroneLayerIds, id];
			}
		}

		const polygonFeatures = [...renderedIsochrone.features]
			.filter(isPolygonFeature)
			.filter((feature) => isBandVisible(feature))
			.sort((a, b) => featureValue(b) - featureValue(a));

		for (const [index, feature] of polygonFeatures.entries()) {
			const id = `iso-fill-${featureValue(feature)}-${index}`;
			const color = featureColor(feature);
			map.addSource(id, { type: 'geojson', data: feature });
			map.addLayer({
				id,
				type: 'fill',
				source: id,
				paint: {
					'fill-color': color,
					'fill-opacity': featureFillOpacity(feature),
					'fill-outline-color': color
				}
			});

			const outlineId = `${id}-outline`;
			map.addLayer({
				id: outlineId,
				type: 'line',
				source: id,
				paint: {
					'line-color': color,
					'line-opacity': featureLineOpacity(feature),
					'line-width': featureLineWidth(feature)
				}
			});
			renderedIsochroneLayerIds = [...renderedIsochroneLayerIds, id, outlineId];
		}

		if (moveCamera) {
			moveMapToOrigin();
		}
	}

	function parseIsochrone(value: unknown): IsochroneFeatureCollection {
		return (typeof value === 'string' ? JSON.parse(value) : value) as IsochroneFeatureCollection;
	}

	function prepareIsochroneForRendering(
		featureCollection: IsochroneFeatureCollection
	): IsochroneFeatureCollection {
		return {
			...featureCollection,
			features: exclusiveBandFeatures(featureCollection.features)
		};
	}

	function moveMapToOrigin() {
		if (!map || !origin) {
			return;
		}

		marker?.setLngLat([origin.lon, origin.lat]).addTo(map);

		const reducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const padding =
			globalThis.innerWidth >= 1024
				? { top: 120, right: 220, bottom: 180, left: 520 }
				: { top: 220, right: 40, bottom: 220, left: 40 };

		if (reducedMotion) {
			map.jumpTo({ center: [origin.lon, origin.lat], zoom: 14.2, padding });
			return;
		}

		map.flyTo({
			center: [origin.lon, origin.lat],
			zoom: 14.2,
			padding,
			duration: 1100,
			essential: false
		});
	}

	function clearIsochroneLayers() {
		if (!map) {
			return;
		}

		const style = map.getStyle();
		const layerIds = new Set([
			...renderedIsochroneLayerIds,
			...(style.layers ?? []).map((layer) => layer.id).filter((id) => id.startsWith('iso-'))
		]);
		const sourceIds = new Set([
			...renderedIsochroneLayerIds,
			...Object.keys(style.sources ?? {}).filter((id) => id.startsWith('iso-'))
		]);

		for (const id of layerIds) {
			if (map.getLayer(id)) {
				map.removeLayer(id);
			}
		}
		for (const id of sourceIds) {
			if (map.getSource(id)) {
				map.removeSource(id);
			}
		}
		renderedIsochroneLayerIds = [];
	}

	function featureValue(feature: IsochroneFeature) {
		const value = feature.properties?.value;
		if (typeof value === 'number') {
			return value;
		}

		return Number(value ?? 0);
	}

	function exclusiveBandFeatures(features: IsochroneFeature[]) {
		const cumulativeFeatures = features
			.filter(isPolygonFeature)
			.sort((a, b) => featureValue(a) - featureValue(b));

		return cumulativeFeatures.map((feature, index) => {
			const innerFeature = cumulativeFeatures[index - 1];
			if (!innerFeature) {
				return feature;
			}

			try {
				const ring = difference(featureCollection([feature, innerFeature]));
				if (!ring || !isPolygonGeometry(ring.geometry)) {
					return feature;
				}

				return {
					...ring,
					properties: feature.properties
				} satisfies IsochronePolygonFeature;
			} catch {
				return feature;
			}
		});
	}

	function featureColor(feature: IsochroneFeature) {
		const minutes = featureValue(feature) / 60;
		const bands = mode === 'transit' ? TRANSIT_BANDS : WALK_BANDS;
		return (
			bands.find((b) => Math.abs(b.minutes - minutes) < 0.5)?.color ?? bands[bands.length - 1].color
		);
	}

	function featureFillOpacity(feature: IsochroneFeature) {
		if (mode !== 'transit') {
			return 0.32;
		}

		const minutes = featureValue(feature) / 60;
		if (minutes <= 10) return 0.46;
		if (minutes <= 15) return 0.4;
		if (minutes <= 20) return 0.36;
		if (minutes <= 30) return 0.32;
		if (minutes <= 45) return 0.28;
		return 0.24;
	}

	function featureLineOpacity(feature: IsochroneFeature) {
		if (mode !== 'transit') {
			return 0.42;
		}

		const minutes = featureValue(feature) / 60;
		if (minutes <= 20) return 0.62;
		if (minutes <= 30) return 0.5;
		return 0.42;
	}

	function featureLineWidth(feature: IsochroneFeature) {
		if (mode !== 'transit') {
			return 1.2;
		}

		const minutes = featureValue(feature) / 60;
		if (minutes <= 20) return 1.4;
		if (minutes <= 30) return 1.2;
		return 1;
	}

	function isBandVisible(feature: IsochroneFeature) {
		if (!visibleBandMinutes) {
			return true;
		}

		const minutes = featureValue(feature) / 60;
		return visibleBandMinutes.some((band) => Math.abs(band - minutes) < 0.5);
	}

	function walkBandColor(feature: IsochroneFeature) {
		const minutes = featureValue(feature) / 60;
		return (
			WALK_BANDS.find((b) => Math.abs(b.minutes - minutes) < 0.5)?.color ??
			WALK_BANDS[WALK_BANDS.length - 1].color
		);
	}

	function isPolygonGeometry(
		geometry: GeoJSON.Geometry | null
	): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
		return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';
	}

	function isPolygonFeature(feature: IsochroneFeature): feature is IsochronePolygonFeature {
		return isPolygonGeometry(feature.geometry);
	}

	function isRateLimitError(err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return message.includes('429') || message.toLowerCase().includes('rate limit');
	}
</script>

<div class={`relative min-h-screen overflow-hidden bg-[#ece8e0] ${className}`}>
	<div bind:this={mapEl} class="map-canvas h-full min-h-screen w-full"></div>
</div>

<style>
	/* Subtle warmth + slight desaturation to harmonize with the card design */
	.map-canvas {
		filter: saturate(0.88) contrast(0.94) brightness(1.04);
	}

	/* Zoom controls — white card style matching the panel cards */
	:global(.maplibregl-ctrl-group) {
		overflow: hidden;
		border-radius: 12px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		background: #fffefc;
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.08),
			0 1px 3px rgba(0, 0, 0, 0.05);
		backdrop-filter: none;
	}

	:global(.maplibregl-ctrl-group button) {
		filter: none;
		color: #1a1a18;
		width: 32px;
		height: 32px;
	}

	:global(.maplibregl-ctrl-group button:hover) {
		background: #f5f4ee !important;
	}

	:global(.maplibregl-ctrl-group button + button) {
		border-top: 1px solid rgba(0, 0, 0, 0.06) !important;
	}

	/* Attribution */
	:global(.maplibregl-ctrl-attrib) {
		background: rgba(255, 254, 252, 0.82) !important;
		backdrop-filter: blur(6px);
		border-radius: 10px 0 0 0 !important;
		font-size: 10px !important;
		color: #a8a79e !important;
		font-family: 'DM Sans', sans-serif !important;
	}

	:global(.maplibregl-ctrl-attrib a) {
		color: #a8a79e !important;
	}

	:global(.maplibregl-ctrl-top-right) {
		top: 1rem;
		right: 1rem;
	}

	:global(.maplibregl-ctrl-bottom-right) {
		right: 1rem;
		bottom: 1rem;
	}

	@media (min-width: 1024px) {
		:global(.maplibregl-ctrl-top-right) {
			top: 1.5rem;
			right: 1.5rem;
		}

		:global(.maplibregl-ctrl-bottom-right) {
			right: 1.5rem;
			bottom: 1.5rem;
		}
	}
</style>
