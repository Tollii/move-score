<script lang="ts">
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type maplibregl from 'maplibre-gl';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { GeonorgeAddress } from '$lib/geonorge/address';

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
		{ minutes: 5, color: '#0f766e', label: '0-5 minutter' },
		{ minutes: 10, color: '#22c55e', label: '5-10 minutter' },
		{ minutes: 15, color: '#eab308', label: '10-15 minutter' },
		{ minutes: 20, color: '#ef4444', label: '15-20 minutter' }
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
				style: 'https://tiles.openfreemap.org/styles/positron',
				center: [10.7522, 59.9139],
				zoom: 11
			});

			marker = new maplibre.default.Marker({ color: '#0f766e' });
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
				? 'Mapbox har nådd rate limit. Kartet er flyttet, men gangavstand kan hentes senere.'
				: 'Kunne ikke hente gangavstand for valgt adresse.';
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
					'fill-opacity': 0.35,
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

<div class="relative min-h-[480px] overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
	<div bind:this={mapEl} class="h-[480px] w-full"></div>

	<div
		class="absolute top-4 left-4 max-w-sm rounded-md bg-white/95 p-3 text-sm text-zinc-900 shadow-sm"
	>
		{#if selectedAddress}
			<p class="font-medium">{selectedAddress.adressetekst}</p>
			<p class="mt-1 text-zinc-600">
				{selectedAddress.postnummer}
				{selectedAddress.poststed}
			</p>
			<button
				type="button"
				class="mt-3 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
				disabled={isochroneLoading || !origin}
				onclick={showWalkIsochrone}
			>
				{isochroneLoading ? 'Henter gangavstand...' : 'Vis gangavstand'}
			</button>
			{#if isochroneLoading}
				<p class="mt-2 text-zinc-600">Henter gangavstand...</p>
			{/if}
			{#if errorMessage}
				<p class="mt-2 text-red-700">{errorMessage}</p>
			{/if}
		{:else}
			<p class="font-medium">Velg en adresse</p>
			<p class="mt-1 text-zinc-600">Kartet flyttes hit når du velger et søkeresultat.</p>
		{/if}
	</div>

	<div
		class="absolute right-4 bottom-4 left-4 rounded-md bg-white/95 p-4 text-sm text-zinc-900 shadow-sm md:left-auto md:max-w-sm"
	>
		<ul class="mt-3 grid gap-2" aria-label="Forklaring av gangringer">
			{#each WALK_BANDS as band (band.minutes)}
				<li class="flex items-center gap-2">
					<span
						class="h-3 w-3 shrink-0 rounded-full"
						style:background-color={band.color}
						aria-hidden="true"
					></span>
					<span>{band.label}</span>
				</li>
			{/each}
		</ul>
	</div>
</div>
