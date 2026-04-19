<script lang="ts">
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type maplibregl from 'maplibre-gl';
	import type { StyleSpecification } from 'maplibre-gl';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { GeonorgeAddress } from '$lib/geonorge/address';

	// Amber-on-black tactical style using OpenFreeMap vector tiles (OpenMapTiles schema)
	const SENTINEL_STYLE: StyleSpecification = {
		version: 8,
		sources: {
			openmaptiles: {
				type: 'vector',
				url: 'https://tiles.openfreemap.org/planet'
			}
		},
		glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
		layers: [
			// ── Base ─────────────────────────────────────────────────────
			{
				id: 'background',
				type: 'background',
				paint: { 'background-color': '#090908' }
			},
			// ── Water ────────────────────────────────────────────────────
			{
				id: 'water-fill',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'water',
				paint: { 'fill-color': '#060c08' }
			},
			{
				id: 'waterway',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'waterway',
				paint: { 'line-color': '#0f1a0e', 'line-width': 1 }
			},
			// ── Land ─────────────────────────────────────────────────────
			{
				id: 'landcover',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'landcover',
				paint: { 'fill-color': '#0b0c08', 'fill-opacity': 0.7 }
			},
			{
				id: 'landuse',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'landuse',
				paint: { 'fill-color': '#0e0d09', 'fill-opacity': 0.5 }
			},
			// ── Buildings (outline only, SentinelMapper style) ────────────
			{
				id: 'building-fill',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'building',
				minzoom: 14,
				paint: { 'fill-color': '#0f0c07', 'fill-opacity': 0.9 }
			},
			{
				id: 'building-outline',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'building',
				minzoom: 14,
				paint: { 'line-color': '#2e1c00', 'line-width': 0.6 }
			},
			// ── Roads — darkest to brightest ─────────────────────────────
			{
				id: 'road-path',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['in', 'class', 'path', 'footway', 'cycleway', 'track'],
				minzoom: 14,
				paint: {
					'line-color': '#1e1200',
					'line-width': 0.5,
					'line-dasharray': [3, 2]
				}
			},
			{
				id: 'road-service',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['in', 'class', 'service'],
				minzoom: 13,
				paint: { 'line-color': '#261700', 'line-width': 0.7 }
			},
			{
				id: 'road-minor',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['in', 'class', 'minor', 'unclassified', 'residential'],
				paint: {
					'line-color': '#3a2400',
					'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 16, 1.8]
				}
			},
			{
				id: 'road-tertiary',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['==', 'class', 'tertiary'],
				paint: {
					'line-color': '#5c3900',
					'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 14, 2, 16, 3.5]
				}
			},
			{
				id: 'road-secondary',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['==', 'class', 'secondary'],
				paint: {
					'line-color': '#7d5000',
					'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 13, 2.5, 16, 4.5]
				}
			},
			{
				id: 'road-primary',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['in', 'class', 'primary', 'trunk'],
				paint: {
					'line-color': '#b07200',
					'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 12, 3, 16, 6]
				}
			},
			{
				id: 'road-motorway',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['==', 'class', 'motorway'],
				paint: {
					'line-color': '#ffaa00',
					'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 3.5, 16, 7]
				}
			},
			// ── Rail ─────────────────────────────────────────────────────
			{
				id: 'rail',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['in', 'class', 'rail', 'transit'],
				paint: {
					'line-color': '#2a1a00',
					'line-width': 1,
					'line-dasharray': [5, 3]
				}
			},
			// ── Labels ───────────────────────────────────────────────────
			{
				id: 'label-city',
				type: 'symbol',
				source: 'openmaptiles',
				'source-layer': 'place',
				filter: ['in', 'class', 'city', 'town'],
				layout: {
					'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
					'text-font': ['Noto Sans Bold'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 15],
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.1,
					'text-max-width': 8
				},
				paint: {
					'text-color': 'rgba(255,179,0,0.75)',
					'text-halo-color': 'rgba(9,9,8,0.95)',
					'text-halo-width': 1.5
				}
			},
			{
				id: 'label-suburb',
				type: 'symbol',
				source: 'openmaptiles',
				'source-layer': 'place',
				minzoom: 12,
				filter: ['in', 'class', 'suburb', 'village', 'hamlet', 'neighbourhood'],
				layout: {
					'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
					'text-font': ['Noto Sans Regular'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 12],
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.12,
					'text-max-width': 8
				},
				paint: {
					'text-color': 'rgba(255,179,0,0.45)',
					'text-halo-color': 'rgba(9,9,8,0.95)',
					'text-halo-width': 1
				}
			},
			{
				id: 'label-road',
				type: 'symbol',
				source: 'openmaptiles',
				'source-layer': 'transportation_name',
				minzoom: 14,
				layout: {
					'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
					'text-font': ['Noto Sans Regular'],
					'text-size': 9,
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.08,
					'symbol-placement': 'line',
					'text-max-angle': 30
				},
				paint: {
					'text-color': 'rgba(255,179,0,0.35)',
					'text-halo-color': 'rgba(9,9,8,0.9)',
					'text-halo-width': 1
				}
			}
		]
	};

	type Props = {
		selectedAddress?: GeonorgeAddress;
	};

	type IsochroneProperties = {
		value?: number | string | null;
	};

	type IsochroneFeature = GeoJSON.Feature<GeoJSON.Geometry, IsochroneProperties>;
	type IsochroneFeatureCollection = GeoJSON.FeatureCollection<
		GeoJSON.Geometry,
		IsochroneProperties
	>;

	let { selectedAddress }: Props = $props();

	let mapEl: HTMLDivElement;
	let map = $state<maplibregl.Map | undefined>();
	let marker: maplibregl.Marker | undefined;
	let mapReady = $state(false);
	let origin = $state<{ lat: number; lon: number } | null>(null);
	let isochrone = $state<IsochroneFeatureCollection | null>(null);
	let isochroneLoading = $state(false);
	let errorMessage = $state<string | undefined>();
	let selectedOriginKey = '';
	let activeRequestKey = '';
	let loadedIsochroneKey = '';
	let renderedIsochroneLayerIds: string[] = [];

	const client = useConvexClient();

	const WALK_BANDS = [
		{ minutes: 5, color: '#ffcc00', label: '0–5 MIN' },
		{ minutes: 10, color: '#ff8800', label: '5–10 MIN' },
		{ minutes: 15, color: '#ff4400', label: '10–15 MIN' },
		{ minutes: 20, color: '#cc1100', label: '15–20 MIN' }
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
				style: SENTINEL_STYLE,
				center: [10.7522, 59.9139],
				zoom: 11
			});

			marker = new maplibre.default.Marker({ color: '#ffb300' });
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
		errorMessage = undefined;
		clearIsochroneLayers();
		moveMapToOrigin();
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
		isochroneLoading = true;
		errorMessage = undefined;

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
		} catch (error) {
			if (activeRequestKey !== requestKey) {
				return;
			}

			isochrone = null;
			loadedIsochroneKey = '';
			clearIsochroneLayers();
			errorMessage = isRateLimitError(error)
				? 'RATE LIMIT: FORSØK IGJEN SENERE'
				: 'FEIL: KUNNE IKKE HENTE GANGAVSTAND';
		} finally {
			if (activeRequestKey === requestKey) {
				isochroneLoading = false;
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
					'fill-opacity': 0.3,
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
		map.flyTo({ center: [origin.lon, origin.lat], zoom: 14, essential: true });
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

	function isRateLimitError(error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return message.includes('429') || message.toLowerCase().includes('rate limit');
	}
</script>

<div class="map-container">
	<div bind:this={mapEl} class="map-canvas"></div>

	<div class="overlay-panel overlay-tl">
		<div class="panel-header">[ TARGET ]</div>
		<div class="panel-body">
			{#if selectedAddress}
				<p class="target-address">{selectedAddress.adressetekst}</p>
				<p class="target-location">{selectedAddress.postnummer} {selectedAddress.poststed}</p>
				<button
					type="button"
					class="action-btn"
					class:action-btn--loading={isochroneLoading}
					disabled={isochroneLoading || !origin}
					onclick={showWalkIsochrone}
				>
					{isochroneLoading ? '[ HENTER... ]' : '[ VIS GANGAVSTAND ]'}
				</button>
				{#if errorMessage}
					<p class="error-text">{errorMessage}</p>
				{/if}
			{:else}
				<p class="no-target">INGEN TARGET VALGT</p>
				<p class="hint-text">Velg adresse i venstre panel</p>
			{/if}
		</div>
	</div>

	<div class="overlay-panel overlay-br">
		<div class="panel-header">[ REKKEVIDDE ]</div>
		<div class="panel-body">
			<ul class="legend-list">
				{#each WALK_BANDS as band (band.minutes)}
					<li class="legend-item">
						<span class="legend-swatch" style:background-color={band.color}></span>
						<span class="legend-label">{band.label}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>

<style>
	.map-container {
		position: relative;
		height: 100%;
		width: 100%;
		background: #090908;
		overflow: hidden;
	}

	.map-canvas {
		height: 100%;
		width: 100%;
	}

	/* Override MapLibre attribution styling to match theme */
	:global(.maplibregl-ctrl-attrib) {
		background: rgba(9, 9, 8, 0.85) !important;
		color: rgba(255, 179, 0, 0.3) !important;
		font-family: 'Share Tech Mono', monospace !important;
		font-size: 9px !important;
		border-radius: 0 !important;
	}

	:global(.maplibregl-ctrl-attrib a) {
		color: rgba(255, 179, 0, 0.4) !important;
	}

	:global(.maplibregl-ctrl-logo) {
		opacity: 0.4 !important;
		filter: invert(1) sepia(1) saturate(2) hue-rotate(-10deg) !important;
	}

	.overlay-panel {
		position: absolute;
		background: rgba(9, 9, 8, 0.94);
		border: 1px solid rgba(255, 179, 0, 0.4);
		font-family: 'Share Tech Mono', 'Courier New', monospace;
		min-width: 190px;
		max-width: 260px;
		backdrop-filter: blur(4px);
		z-index: 5;
	}

	.overlay-tl {
		top: 12px;
		right: 12px;
	}

	.overlay-br {
		bottom: 28px;
		right: 12px;
	}

	.panel-header {
		padding: 5px 10px;
		border-bottom: 1px solid rgba(255, 179, 0, 0.3);
		font-size: 9px;
		letter-spacing: 0.22em;
		color: rgba(255, 179, 0, 0.8);
		background: rgba(255, 179, 0, 0.06);
	}

	.panel-body {
		padding: 10px;
	}

	.target-address {
		font-size: 12px;
		color: #ffcc00;
		letter-spacing: 0.04em;
		line-height: 1.3;
		margin: 0;
	}

	.target-location {
		margin: 3px 0 0;
		font-size: 10px;
		color: rgba(255, 179, 0, 0.5);
		letter-spacing: 0.08em;
	}

	.action-btn {
		margin-top: 10px;
		display: block;
		width: 100%;
		padding: 7px 10px;
		background: transparent;
		border: 1px solid rgba(255, 179, 0, 0.4);
		color: #ffb300;
		font-family: 'Share Tech Mono', monospace;
		font-size: 10px;
		letter-spacing: 0.15em;
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s,
			color 0.15s;
		border-radius: 0;
		text-align: center;
	}

	.action-btn:hover:not(:disabled) {
		border-color: rgba(255, 179, 0, 0.85);
		background: rgba(255, 179, 0, 0.08);
		color: #ffcc00;
	}

	.action-btn:disabled {
		border-color: rgba(255, 179, 0, 0.15);
		color: rgba(255, 179, 0, 0.3);
		cursor: not-allowed;
	}

	.action-btn--loading {
		animation: blink 1.2s ease-in-out infinite;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 0.45;
		}
		50% {
			opacity: 1;
		}
	}

	.error-text {
		margin-top: 8px;
		font-size: 9px;
		color: #cc2200;
		letter-spacing: 0.06em;
		line-height: 1.4;
	}

	.no-target {
		font-size: 11px;
		color: rgba(255, 179, 0, 0.75);
		letter-spacing: 0.08em;
		margin: 0;
	}

	.hint-text {
		margin: 4px 0 0;
		font-size: 9px;
		color: rgba(255, 179, 0, 0.55);
		letter-spacing: 0.06em;
		line-height: 1.5;
	}

	.legend-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.legend-swatch {
		width: 10px;
		height: 10px;
		flex-shrink: 0;
	}

	.legend-label {
		font-size: 10px;
		color: rgba(255, 179, 0, 0.85);
		letter-spacing: 0.12em;
	}
</style>
