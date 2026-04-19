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

	const client = useConvexClient();

	const BANDS = [5, 10, 15, 20]; // minutes
	const COLORS = ['#0f766e', '#22c55e', '#eab308', '#ef4444']; // inside to outside

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
				minutes: BANDS
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
				? 'OpenRouteService har nådd rate limit. Kartet er flyttet, men gangavstand kan hentes senere.'
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
		// Sort features by time ascending, render outer-to-inner for proper layering
		const feats = [...isochrone.features].sort((a, b) => featureValue(b) - featureValue(a));
		for (const [index, feature] of feats.entries()) {
			const id = `iso-${featureValue(feature)}`;
			map.addSource(id, { type: 'geojson', data: feature });
			map.addLayer({
				id,
				type: 'fill',
				source: id,
				paint: {
					'fill-color': COLORS[BANDS.length - 1 - index],
					'fill-opacity': 0.35,
					'fill-outline-color': COLORS[BANDS.length - 1 - index]
				}
			});
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

		for (const minutes of BANDS) {
			const id = `iso-${minutes * 60}`;
			if (map.getLayer(id)) {
				map.removeLayer(id);
			}
			if (map.getSource(id)) {
				map.removeSource(id);
			}
		}
	}

	function featureValue(feature: IsochroneFeature) {
		const value = feature.properties?.value;
		if (typeof value === 'number') {
			return value;
		}

		return Number(value ?? 0);
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
</div>
