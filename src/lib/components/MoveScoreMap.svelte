<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type maplibregl from 'maplibre-gl';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { GeonorgeAddress } from '$lib/geonorge/address';

	type Props = {
		selectedAddress?: GeonorgeAddress;
		class?: string;
		triggerKey?: number;
		isLoading?: boolean;
		error?: string | undefined;
	};

	type IsochroneProperties = {
		value?: number | string | null;
	};

	type IsochroneFeature = GeoJSON.Feature<GeoJSON.Geometry, IsochroneProperties>;
	type IsochroneFeatureCollection = GeoJSON.FeatureCollection<
		GeoJSON.Geometry,
		IsochroneProperties
	>;

	let {
		selectedAddress,
		class: className = '',
		triggerKey = 0,
		isLoading = $bindable(false),
		error = $bindable<string | undefined>(undefined)
	}: Props = $props();

	let mapEl: HTMLDivElement;
	let map = $state<maplibregl.Map | undefined>();
	let marker: maplibregl.Marker | undefined;
	let mapReady = $state(false);
	let origin = $state<{ lat: number; lon: number } | null>(null);
	let isochrone = $state<IsochroneFeatureCollection | null>(null);
	let selectedOriginKey = '';
	let activeRequestKey = '';
	let loadedIsochroneKey = '';
	let renderedIsochroneLayerIds: string[] = [];
	let lastTriggerKey = 0;

	const client = useConvexClient();

	const WALK_BANDS = [
		{ minutes: 5, color: '#0f766e', label: '0–5 min' },
		{ minutes: 10, color: '#22c55e', label: '5–10 min' },
		{ minutes: 15, color: '#eab308', label: '10–15 min' },
		{ minutes: 20, color: '#ef4444', label: '15–20 min' }
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
		activeRequestKey = originKey;
		loadedIsochroneKey = '';
		origin = { lat: point.lat, lon: point.lon };
		isochrone = null;
		error = undefined;
		clearIsochroneLayers();
		moveMapToOrigin();
	});

	$effect(() => {
		const key = triggerKey;
		if (key > 0 && key !== lastTriggerKey) {
			lastTriggerKey = key;
			untrack(showWalkIsochrone);
		}
	});

	function showWalkIsochrone() {
		if (!origin) {
			return;
		}

		if (isochrone && loadedIsochroneKey === selectedOriginKey) {
			renderIsochrone();
			return;
		}

		void loadIsochrone(origin.lat, origin.lon, selectedOriginKey);
	}

	async function loadIsochrone(lat: number, lon: number, requestKey: string) {
		isLoading = true;
		error = undefined;

		try {
			const geojson = (await client.action(api.isochrones.getWalkIsochrone, {
				lat,
				lon,
				minutes: WALK_BANDS.map((band) => band.minutes)
			})) as IsochroneFeatureCollection;

			if (activeRequestKey !== requestKey) {
				return;
			}

			isochrone = geojson;
			loadedIsochroneKey = requestKey;
			renderIsochrone();
		} catch (err) {
			if (activeRequestKey !== requestKey) {
				return;
			}

			isochrone = null;
			loadedIsochroneKey = '';
			clearIsochroneLayers();
			error = isRateLimitError(err)
				? 'Mapbox har nådd rate limit. Kartet er flyttet, men gangavstand kan hentes igjen om litt.'
				: 'Kunne ikke hente gangavstand for valgt adresse.';
		} finally {
			if (activeRequestKey === requestKey) {
				isLoading = false;
			}
		}
	}

	function renderIsochrone() {
		if (!map || !isochrone) return;
		clearIsochroneLayers();
		const polygonFeatures = [...isochrone.features]
			.filter((feature) => isPolygonGeometry(feature.geometry))
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
					'fill-opacity': 0.28,
					'fill-outline-color': color
				}
			});
			renderedIsochroneLayerIds = [...renderedIsochroneLayerIds, id];
		}

		moveMapToOrigin();
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

	function featureColor(feature: IsochroneFeature) {
		const minutes = featureValue(feature) / 60;
		return (
			WALK_BANDS.find((band) => Math.abs(band.minutes - minutes) < 0.5)?.color ??
			WALK_BANDS[WALK_BANDS.length - 1].color
		);
	}

	function isPolygonGeometry(
		geometry: GeoJSON.Geometry | null
	): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
		return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';
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
