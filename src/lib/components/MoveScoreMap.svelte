<script lang="ts">
	/* eslint-disable no-useless-assignment */
	import { onMount, untrack } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type maplibregl from 'maplibre-gl';
	import { ConvexHttpClient } from 'convex/browser';
	import { difference, featureCollection } from '@turf/turf';
	import { api } from '../../convex/_generated/api';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { analyticsErrorCode, trackEvent } from '$lib/analytics';
	import type { GeonorgeAddress, GeonorgePoint } from '$lib/geonorge/address';
	import {
		ISOCHRONE_MODES_BY_ID,
		type IsochroneModeConfig,
		type IsochroneModeId
	} from '$lib/isochrones/modes';

	type Props = {
		selectedAddress?: GeonorgeAddress;
		class?: string;
		triggerKey?: number;
		mode?: IsochroneModeId;
		visibleBandMinutes?: number[];
		mobileDetailsOpen?: boolean;
		onSelectPoint?: (point: GeonorgePoint) => void;
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
		mobileDetailsOpen = false,
		onSelectPoint,
		isLoading = $bindable<boolean>(),
		error = $bindable<string | undefined>()
	}: Props = $props();

	let mapEl: HTMLDivElement;
	let map = $state<maplibregl.Map | undefined>();
	let marker: maplibregl.Marker | undefined;
	let mapReady = $state(false);
	let origin = $state<{ lat: number; lon: number } | null>(null);
	let isochrone = $state<IsochroneFeatureCollection | null>(null);
	let referenceIsochrone = $state<IsochroneFeatureCollection | null>(null);
	let renderedIsochrone = $state<IsochroneFeatureCollection | null>(null);
	let renderedReferenceIsochrone = $state<IsochroneFeatureCollection | null>(null);
	let selectedOriginKey = '';
	let activeRequestKey = '';
	let loadedIsochroneKey = '';
	let renderedIsochroneLayerIds: string[] = [];
	let lastTriggerKey = 0;

	const isochroneClient = new ConvexHttpClient(PUBLIC_CONVEX_URL);

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
			map.on('click', (event) => {
				onSelectPoint?.({ lat: event.lngLat.lat, lon: event.lngLat.lng });
			});
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
		referenceIsochrone = null;
		renderedIsochrone = null;
		renderedReferenceIsochrone = null;
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
		void mobileDetailsOpen;
		if (mapReady && origin) {
			untrack(moveMapToOrigin);
		}
	});

	$effect(() => {
		void visibleBandMinutes;
		void mode;
		if (renderedIsochrone && loadedIsochroneKey === `${selectedOriginKey}:${mode}`) {
			untrack(() => renderIsochrone({ moveCamera: false }));
		}
	});

	function showIsochrone() {
		const point = selectedAddress?.representasjonspunkt;
		if (!point) {
			return;
		}

		const originKey = `${point.lat}:${point.lon}`;
		const requestKey = `${originKey}:${mode}`;
		if (renderedIsochrone && loadedIsochroneKey === requestKey) {
			renderIsochrone({ moveCamera: true });
			return;
		}

		activeRequestKey = requestKey;
		void loadIsochrone(point.lat, point.lon, requestKey);
	}

	async function loadIsochrone(lat: number, lon: number, requestKey: string) {
		isLoading = true;
		error = undefined;

		try {
			const currentMode = mode;
			const currentConfig = ISOCHRONE_MODES_BY_ID[currentMode];
			const referenceConfig = currentConfig.referenceMode
				? ISOCHRONE_MODES_BY_ID[currentConfig.referenceMode]
				: undefined;

			const [primaryGeojson, referenceGeojson] = await Promise.all([
				loadModeIsochrone(currentConfig, lat, lon),
				referenceConfig ? loadReferenceIsochrone(referenceConfig, lat, lon) : Promise.resolve(null)
			]);

			if (activeRequestKey !== requestKey) return;

			isochrone = parseIsochrone(primaryGeojson);
			referenceIsochrone = referenceGeojson ? parseIsochrone(referenceGeojson) : null;
			renderedIsochrone = prepareIsochroneForRendering(isochrone);
			renderedReferenceIsochrone = referenceIsochrone
				? prepareIsochroneForRendering(referenceIsochrone)
				: null;

			loadedIsochroneKey = requestKey;
			renderIsochrone({ moveCamera: true });
			trackEvent({
				name: 'isochrone_completed',
				properties: { mode: currentMode, result: 'success' }
			});
		} catch (err) {
			if (activeRequestKey !== requestKey) return;

			isochrone = null;
			referenceIsochrone = null;
			renderedIsochrone = null;
			renderedReferenceIsochrone = null;
			loadedIsochroneKey = '';
			clearIsochroneLayers();
			error = errorMessageForMode(ISOCHRONE_MODES_BY_ID[mode], err);
			trackEvent({
				name: 'isochrone_completed',
				properties: {
					mode,
					result: 'failure',
					errorCode: analyticsErrorCode(err, 'TRAVELTIME_ISOCHRONE_FAILED')
				}
			});
		} finally {
			if (activeRequestKey === requestKey) {
				isLoading = false;
			}
		}
	}

	function renderIsochrone({ moveCamera = false }: { moveCamera?: boolean } = {}) {
		if (!map || !renderedIsochrone) return;
		clearIsochroneLayers();

		const modeConfig = ISOCHRONE_MODES_BY_ID[mode];
		const referenceConfig = modeConfig.referenceMode
			? ISOCHRONE_MODES_BY_ID[modeConfig.referenceMode]
			: undefined;

		if (referenceConfig && renderedReferenceIsochrone) {
			const ghostFeatures = [...renderedReferenceIsochrone.features]
				.filter(isPolygonFeature)
				.sort((a, b) => featureValue(b) - featureValue(a));

			for (const [index, feature] of ghostFeatures.entries()) {
				const id = `iso-${referenceConfig.id}-ghost-${featureValue(feature)}-${index}`;
				const color = featureColor(feature, referenceConfig);
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
			const color = featureColor(feature, modeConfig);
			map.addSource(id, { type: 'geojson', data: feature });
			map.addLayer({
				id,
				type: 'fill',
				source: id,
				paint: {
					'fill-color': color,
					'fill-opacity': featureFillOpacity(feature, modeConfig),
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
					'line-opacity': featureLineOpacity(feature, modeConfig),
					'line-width': featureLineWidth(feature, modeConfig)
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

	function loadModeIsochrone(config: IsochroneModeConfig, lat: number, lon: number) {
		return isochroneClient.action(api.isochrones.getIsochrone, {
			lat,
			lon,
			mode: config.id
		});
	}

	async function loadReferenceIsochrone(config: IsochroneModeConfig, lat: number, lon: number) {
		try {
			return await loadModeIsochrone(config, lat, lon);
		} catch (err) {
			console.warn('Reference isochrone failed', { mode: config.id, error: String(err) });
			trackEvent({
				name: 'isochrone_completed',
				properties: {
					mode: config.id,
					result: 'failure',
					errorCode: analyticsErrorCode(err, 'TRAVELTIME_ISOCHRONE_FAILED')
				}
			});
			return null;
		}
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
		const padding = mapCameraPadding();

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

	function mapCameraPadding() {
		if (globalThis.innerWidth >= 1024) {
			return { top: 120, right: 220, bottom: 180, left: 520 };
		}

		const bottom = mobileDetailsOpen ? Math.min(globalThis.innerHeight * 0.62, 520) : 150;
		return { top: 180, right: 40, bottom, left: 40 };
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

	function featureColor(feature: IsochroneFeature, config: IsochroneModeConfig) {
		const minutes = featureValue(feature) / 60;
		const bands = config.bands;
		return (
			bands.find((b) => Math.abs(b.minutes - minutes) < 0.5)?.color ?? bands[bands.length - 1].color
		);
	}

	function featureFillOpacity(feature: IsochroneFeature, config: IsochroneModeConfig) {
		if (config.renderStyle !== 'transit') {
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

	function featureLineOpacity(feature: IsochroneFeature, config: IsochroneModeConfig) {
		if (config.renderStyle !== 'transit') {
			return 0.42;
		}

		const minutes = featureValue(feature) / 60;
		if (minutes <= 20) return 0.62;
		if (minutes <= 30) return 0.5;
		return 0.42;
	}

	function featureLineWidth(feature: IsochroneFeature, config: IsochroneModeConfig) {
		if (config.renderStyle !== 'transit') {
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
		return (
			message.includes('429') ||
			message.includes('TRAVELTIME_ISOCHRONE_RATE_LIMITED') ||
			message.toLowerCase().includes('rate limit')
		);
	}

	function errorMessageForMode(config: IsochroneModeConfig, err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		if (isRateLimitError(err) && config.rateLimitMessage) {
			return config.rateLimitMessage;
		}

		if (
			message.includes('TRAVELTIME_API_KEY_MISSING') ||
			message.includes('TRAVELTIME_APP_ID_MISSING')
		) {
			return 'Karttjenesten mangler konfigurasjon i backend-miljoet.';
		}

		return config.errorMessage;
	}
</script>

<div class={`relative min-h-screen overflow-hidden bg-[#ece8e0] ${className}`}>
	<div bind:this={mapEl} class="map-canvas h-full min-h-screen w-full"></div>
</div>

<style>
	/* Subtle warmth + slight desaturation to harmonize with the card design */
	.map-canvas {
		filter: saturate(0.88) contrast(0.94) brightness(1.04);
		cursor: crosshair;
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
