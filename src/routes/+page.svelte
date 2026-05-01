<script lang="ts">
	import { onMount } from 'svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../convex/_generated/api';
	import {
		AddressLookup,
		MoveScoreMap,
		searchGeonorgeAddresses,
		type GeonorgeAddress,
		type GeonorgePoint
	} from '$lib';
	import AddressCard from '$lib/components/AddressCard.svelte';
	import PersonalPois from '$lib/components/PersonalPois.svelte';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import { analyticsErrorCode, trackEvent } from '$lib/analytics';
	import { useAuth } from '$lib/auth/convex-auth.svelte';
	import type { FinnListingInfo } from '$lib/finn/address';
	import {
		enabledIsochroneModes,
		ISOCHRONE_MODES_BY_ID,
		type IsochroneModeId
	} from '$lib/isochrones/modes';

	const ADDRESS_QUERY_PARAM = 'address';
	const LAT_QUERY_PARAM = 'lat';
	const LON_QUERY_PARAM = 'lon';
	const MAP_POINT_LABEL = 'Valgt punkt på kartet';

	const auth = useAuth();
	const personalPoisQuery = useQuery(api.personalPois.list, () =>
		auth.isAuthenticated ? {} : 'skip'
	);

	let selectedAddress = $state<GeonorgeAddress | undefined>();
	let selectedFinnListing = $state<FinnListingInfo | undefined>();
	let isochroneLoading = $state(false);
	let isochroneError = $state<string | undefined>();
	let triggerKey = $state(0);
	let isochronesShown = $state(false);
	let isochroneMode = $state<IsochroneModeId>('walk');
	let visibleBandsByMode = $state(createVisibleBandsByMode());
	let mobileDetailsOpen = $state(false);

	onMount(() => {
		void selectAddressFromUrl();
		globalThis.addEventListener('popstate', handlePopState);

		return () => {
			globalThis.removeEventListener('popstate', handlePopState);
		};
	});

	function handleAddressSelect(
		address: GeonorgeAddress,
		context?: { source: 'address' | 'finn'; listing?: FinnListingInfo }
	) {
		const source = context?.source ?? 'address';
		selectedAddress = address;
		selectedFinnListing = context?.listing;
		isochroneError = undefined;
		isochronesShown = false;
		mobileDetailsOpen = true;
		updateAddressQueryParam(address);
		trackEvent({
			name: 'address_selected',
			properties: { source, hasMunicipality: Boolean(address.kommunenavn) }
		});

		if (source === 'finn') {
			handleShowIsochrones('walk', 'auto');
		}
	}

	function handleMapPointSelect(point: GeonorgePoint) {
		const nextMode = isochronesShown ? isochroneMode : 'walk';

		selectedAddress = createMapPointSelection(point);
		selectedFinnListing = undefined;
		isochroneError = undefined;
		mobileDetailsOpen = true;
		trackEvent({ name: 'map_point_selected', properties: { source: 'map' } });
		handleShowIsochrones(nextMode, 'map');
		updatePointQueryParam(point);
	}

	function handlePopState() {
		void selectAddressFromUrl();
	}

	async function selectAddressFromUrl() {
		const url = new URL(globalThis.location.href);
		const lat = parseCoordinateQueryParam(url.searchParams.get(LAT_QUERY_PARAM), -90, 90);
		const lon = parseCoordinateQueryParam(url.searchParams.get(LON_QUERY_PARAM), -180, 180);

		if (lat !== undefined && lon !== undefined) {
			const point = { lat, lon };

			selectedAddress = createMapPointSelection(point);
			selectedFinnListing = undefined;
			isochroneError = undefined;
			isochronesShown = false;
			updatePointQueryParam(point, 'replace');
			trackEvent({ name: 'map_point_selected', properties: { source: 'url' } });
			return;
		}

		const queryAddress = url.searchParams.get(ADDRESS_QUERY_PARAM)?.trim();

		if (!queryAddress) {
			clearSelectedLocation();
			return;
		}

		try {
			const response = await findAddressFromUrlQuery(queryAddress);

			const [address] = response.adresser;
			if (!address) {
				clearSelectedLocation();
				trackEvent({
					name: 'address_search_failed',
					properties: { source: 'url', errorCode: 'GEONORGE_NO_RESULTS' }
				});
				return;
			}

			selectedAddress = address;
			selectedFinnListing = undefined;
			isochroneError = undefined;
			isochronesShown = false;
			mobileDetailsOpen = true;
			updateAddressQueryParam(address, 'replace');
			trackEvent({
				name: 'address_selected',
				properties: { source: 'url', hasMunicipality: Boolean(address.kommunenavn) }
			});
		} catch (error) {
			console.error('Could not load address from URL', error);
			trackEvent({
				name: 'address_search_failed',
				properties: {
					source: 'url',
					errorCode: analyticsErrorCode(error, 'GEONORGE_LOOKUP_FAILED')
				}
			});
		}
	}

	async function findAddressFromUrlQuery(queryAddress: string) {
		const cleanedQueryAddress = cleanAddressQuery(queryAddress);
		const queries =
			cleanedQueryAddress === queryAddress ? [queryAddress] : [queryAddress, cleanedQueryAddress];

		for (const query of queries) {
			try {
				const response = await searchGeonorgeAddresses({
					sok: query,
					fuzzy: true,
					treffPerSide: 1
				});

				if (response.adresser.length > 0 || query === queries.at(-1)) {
					return response;
				}
			} catch (error) {
				if (query === queries.at(-1)) {
					throw error;
				}
			}
		}

		return { adresser: [] };
	}

	function cleanAddressQuery(queryAddress: string) {
		return queryAddress
			.replace(/\([^)]*\)/g, '')
			.replace(/,/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function updateAddressQueryParam(address: GeonorgeAddress, mode: 'push' | 'replace' = 'push') {
		const url = new URL(globalThis.location.href);
		url.searchParams.set(ADDRESS_QUERY_PARAM, formatAddress(address));
		url.searchParams.delete(LAT_QUERY_PARAM);
		url.searchParams.delete(LON_QUERY_PARAM);

		updateBrowserLocation(url, mode);
	}

	function updatePointQueryParam(point: GeonorgePoint, mode: 'push' | 'replace' = 'push') {
		const url = new URL(globalThis.location.href);
		url.searchParams.delete(ADDRESS_QUERY_PARAM);
		url.searchParams.set(LAT_QUERY_PARAM, formatCoordinateQueryParam(point.lat));
		url.searchParams.set(LON_QUERY_PARAM, formatCoordinateQueryParam(point.lon));

		updateBrowserLocation(url, mode);
	}

	function updateBrowserLocation(url: URL, mode: 'push' | 'replace') {
		if (url.href === globalThis.location.href) {
			return;
		}

		globalThis.history[mode === 'replace' ? 'replaceState' : 'pushState']({}, '', url);
	}

	function clearSelectedLocation() {
		selectedAddress = undefined;
		selectedFinnListing = undefined;
		isochroneError = undefined;
		isochronesShown = false;
	}

	function createMapPointSelection(point: GeonorgePoint): GeonorgeAddress {
		return {
			adressetekst: MAP_POINT_LABEL,
			adressetekstutenadressetilleggsnavn: MAP_POINT_LABEL,
			representasjonspunkt: point
		};
	}

	function parseCoordinateQueryParam(
		value: string | null,
		min: number,
		max: number
	): number | undefined {
		if (!value) {
			return undefined;
		}

		const parsed = Number(value);
		if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
			return undefined;
		}

		return parsed;
	}

	function formatCoordinateQueryParam(value: number) {
		return value.toFixed(6);
	}

	function formatAddress(address: GeonorgeAddress) {
		const addressText = address.adressetekst ?? address.adressetekstutenadressetilleggsnavn;
		const place = [address.postnummer, address.poststed].filter(Boolean).join(' ');
		const municipality = address.kommunenavn ? `(${address.kommunenavn})` : '';

		return [addressText, place, municipality].filter(Boolean).join(', ');
	}

	function handleShowIsochrones(
		mode: IsochroneModeId,
		source: 'button' | 'auto' | 'map' = 'button'
	) {
		isochroneMode = mode;
		isochronesShown = true;
		mobileDetailsOpen = true;
		triggerKey++;
		trackEvent({ name: 'isochrone_requested', properties: { mode, source } });
	}

	const activeModeConfig = $derived(ISOCHRONE_MODES_BY_ID[isochroneMode]);
	const visibleBandMinutes = $derived(visibleBandsByMode[isochroneMode]);
	const personalPois = $derived(auth.isAuthenticated ? (personalPoisQuery.data ?? []) : []);
	const personalPoisLoading = $derived(auth.isAuthenticated && personalPoisQuery.isLoading);

	function toggleBand(minutes: number) {
		const visible = visibleBandsByMode[isochroneMode];
		const next = visible.includes(minutes)
			? visible.filter((band) => band !== minutes)
			: [...visible, minutes].sort((a, b) => a - b);

		visibleBandsByMode = { ...visibleBandsByMode, [isochroneMode]: next };
		trackEvent({
			name: 'isochrone_band_toggled',
			properties: { mode: isochroneMode, minutes, visible: next.includes(minutes) }
		});
	}

	function isBandVisible(minutes: number) {
		return visibleBandMinutes.includes(minutes);
	}

	function createVisibleBandsByMode(): Record<IsochroneModeId, number[]> {
		return Object.fromEntries(
			enabledIsochroneModes.map((mode) => [mode.id, mode.bands.map((band) => band.minutes)])
		) as Record<IsochroneModeId, number[]>;
	}
</script>

<svelte:head>
	<title>Move Score — Finn nabolaget som passer deg</title>
	<meta
		name="description"
		content="Utforsk norske adresser på et interaktivt kart og sammenlign gange, sykkel, bil og kollektiv rekkevidde."
	/>
</svelte:head>

<main
	class:mobile-overlay-present={selectedAddress || isochronesShown}
	class:mobile-details-open={mobileDetailsOpen}
	style="position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #f0efe9;"
>
	<!-- Map layer -->
	<MoveScoreMap
		class="absolute inset-0 h-full w-full"
		{selectedAddress}
		{triggerKey}
		mode={isochroneMode}
		{visibleBandMinutes}
		{mobileDetailsOpen}
		{personalPois}
		onSelectPoint={handleMapPointSelect}
		bind:isLoading={isochroneLoading}
		bind:error={isochroneError}
	/>

	<ProfileMenu />

	<!-- Left panel -->
	<div class="panel">
		<!-- Search card -->
		<div class="card search-card" onfocusin={() => (mobileDetailsOpen = false)}>
			<!-- Logo -->
			<div class="logo">
				<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
					<circle cx="6.5" cy="6.5" r="6.5" fill="#F5B800" />
					<path
						d="M3.5 6.5l2 2 4-4"
						stroke="#1A1A18"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span class="logo-text">Move Score</span>
			</div>

			{#if !selectedAddress}
				<div class="tagline">
					<h1>Finn nabolaget som passer livet ditt.</h1>
					<p>
						Søk etter en adresse eller klikk et punkt i kartet for å sammenligne gange, sykkel, bil,
						kollektivt og nabolagsinfo.
					</p>
				</div>
			{/if}

			<div style="margin-top: {selectedAddress ? '0' : '14px'};">
				{#if !selectedAddress}
					<div class="lbl">Adresse</div>
				{/if}
				{#key selectedAddress ? (selectedAddress.representasjonspunkt ? `${selectedAddress.representasjonspunkt.lat},${selectedAddress.representasjonspunkt.lon}` : formatAddress(selectedAddress)) : ''}
					<AddressLookup
						defaultQuery={selectedAddress ? formatAddress(selectedAddress) : ''}
						onQueryInput={() => (mobileDetailsOpen = false)}
						onSelect={handleAddressSelect}
					/>
				{/key}
			</div>

			{#if isochroneError}
				<p class="error-msg">{isochroneError}</p>
			{/if}
		</div>

		<PersonalPois
			pois={personalPois}
			isAuthenticated={auth.isAuthenticated}
			isAuthLoading={auth.isLoading}
			isLoading={personalPoisLoading}
			{selectedAddress}
		/>

		{#if selectedAddress || isochronesShown}
			<button
				type="button"
				class="card details-toggle"
				aria-expanded={mobileDetailsOpen}
				aria-controls="mobile-map-details"
				onclick={() => (mobileDetailsOpen = !mobileDetailsOpen)}
			>
				<span class="toggle-kicker">Kartdetaljer</span>
				<span class="toggle-action">
					{mobileDetailsOpen ? 'Trykk her for å utforske kartet' : 'Trykk her for å vise detaljer'}
				</span>
			</button>

			<div
				id="mobile-map-details"
				class="details-stack"
				class:mobile-collapsed={!mobileDetailsOpen}
			>
				<!-- Address + dashboard card -->
				{#if selectedAddress}
					<AddressCard
						address={selectedAddress}
						{isochronesShown}
						finnListing={selectedFinnListing}
						activeMode={isochroneMode}
						isLoading={isochroneLoading}
						onShowIsochrones={handleShowIsochrones}
					/>
				{/if}

				<!-- Legend -->
				{#if isochronesShown}
					<div class="card legend-card">
						<div class="lbl" style="margin-bottom: 8px;">
							{activeModeConfig.legendTitle}
						</div>
						{#each activeModeConfig.bands as band (band.label)}
							<button
								type="button"
								class="legend-row"
								class:muted={!isBandVisible(band.minutes)}
								aria-pressed={isBandVisible(band.minutes)}
								onclick={() => toggleBand(band.minutes)}
							>
								<div class="legend-dot" style:background={band.color}></div>
								<span class="legend-label">
									{band.label}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</main>

<style>
	main {
		font-family: 'DM Sans', sans-serif;
	}

	.panel {
		position: fixed;
		top: 20px;
		left: 20px;
		z-index: 100;
		display: flex;
		flex-direction: column;
		gap: 0;
		max-height: calc(100vh - 40px);
		overflow-y: auto;
		overflow-x: visible;
		scrollbar-width: none;
		padding-bottom: 20px;
	}
	.panel::-webkit-scrollbar {
		display: none;
	}

	.card {
		background: #fffefc;
		border-radius: 14px;
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.08),
			0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.07);
		width: 316px;
		pointer-events: auto;
	}

	.search-card {
		padding: 16px;
	}

	.details-toggle {
		display: none;
	}

	.details-stack {
		display: contents;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 7px;
		background: #1a1a18;
		border-radius: 8px;
		padding: 6px 11px;
		width: fit-content;
	}
	.logo-text {
		color: #f5b800;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}

	.tagline {
		margin-top: 13px;
	}
	.tagline h1 {
		font-size: 19px;
		font-weight: 700;
		line-height: 1.25;
		color: #1a1a18;
		letter-spacing: -0.02em;
		text-wrap: pretty;
		margin: 0;
	}
	.tagline p {
		font-size: 12.5px;
		color: #a8a79e;
		line-height: 1.55;
		margin: 5px 0 0;
	}

	.lbl {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: #a8a79e;
		margin-bottom: 7px;
	}

	.error-msg {
		margin-top: 10px;
		padding: 9px 11px;
		border-radius: 8px;
		border: 1px solid #f9a8a8;
		background: #fff5f5;
		font-size: 12px;
		color: #c0392b;
		line-height: 1.5;
	}

	.legend-card {
		padding: 10px 14px;
		margin-top: 8px;
	}
	.legend-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		border: 0;
		background: transparent;
		border-radius: 7px;
		padding: 5px 4px;
		font-size: 12.5px;
		color: #1a1a18;
		font-family: 'DM Sans', sans-serif;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.12s,
			opacity 0.12s;
	}
	.legend-row:hover {
		background: #f5f4ee;
	}
	.legend-row.muted {
		opacity: 0.36;
	}
	.legend-dot {
		width: 11px;
		height: 11px;
		border-radius: 3px;
		flex-shrink: 0;
		opacity: 0.9;
	}
	.legend-label {
		line-height: 1.2;
	}

	/* Override AddressLookup component for light card context */
	.search-card :global(input[type='search']) {
		background: #fafaf6 !important;
		border: 1.5px solid #e5e4de !important;
		border-radius: 9px !important;
		color: #1a1a18 !important;
		font-family: 'DM Sans', sans-serif !important;
		box-shadow: none !important;
	}
	.search-card :global(input[type='search']:focus) {
		border-color: #f5b800 !important;
		background: #fff !important;
		box-shadow: 0 0 0 3px rgba(245, 184, 0, 0.15) !important;
	}
	.search-card :global(input[type='search']::placeholder) {
		color: #a8a79e !important;
		font-weight: 400 !important;
	}
	.search-card :global(label) {
		color: #a8a79e !important;
	}
	/* Suggestion dropdown */
	.search-card :global(section > div:last-child) {
		border-color: #e5e4de !important;
		border-radius: 11px !important;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1) !important;
	}

	@media (max-width: 640px) {
		.panel {
			inset: 12px 12px 0;
			top: 12px;
			left: 12px;
			right: 12px;
			bottom: 0;
			z-index: 120;
			max-height: none;
			overflow: visible;
			padding-bottom: 0;
			pointer-events: none;
		}

		.card {
			width: 100%;
			max-width: none;
			border-radius: 12px;
		}

		.search-card {
			position: relative;
			pointer-events: auto;
			padding: 12px;
		}

		.search-card:focus-within {
			z-index: 140;
		}

		.logo {
			padding: 5px 9px;
		}

		.tagline h1 {
			font-size: 16px;
		}

		.tagline p {
			display: none;
		}

		.details-toggle {
			position: fixed;
			left: 12px;
			right: 12px;
			bottom: calc(12px + env(safe-area-inset-bottom));
			z-index: 130;
			display: flex;
			width: auto;
			min-height: 58px;
			align-items: center;
			justify-content: center;
			flex-direction: column;
			gap: 3px;
			padding: 14px 18px 12px;
			border: 0;
			font-family: 'DM Sans', sans-serif;
			color: #1a1a18;
			cursor: pointer;
			pointer-events: auto;
		}

		.details-toggle::before {
			content: '';
			position: absolute;
			top: 8px;
			left: 50%;
			width: 42px;
			height: 4px;
			transform: translateX(-50%);
			border-radius: 999px;
			background: #d6d4cb;
		}

		.toggle-kicker {
			color: #8b8a81;
			font-size: 9px;
			font-weight: 800;
			text-transform: uppercase;
			letter-spacing: 0.14em;
		}

		.toggle-action {
			font-size: 14px;
			font-weight: 800;
			line-height: 1.15;
			text-align: center;
		}

		.details-stack {
			position: fixed;
			left: 12px;
			right: 12px;
			bottom: calc(72px + env(safe-area-inset-bottom));
			z-index: 125;
			display: flex;
			max-height: min(54vh, 430px);
			flex-direction: column;
			overflow-y: auto;
			padding-bottom: 4px;
			pointer-events: auto;
			scrollbar-width: none;
		}

		.details-stack::-webkit-scrollbar {
			display: none;
		}

		.details-stack.mobile-collapsed {
			display: none;
		}

		.details-stack :global(.card) {
			width: 100%;
			border-radius: 12px;
		}

		.legend-card {
			margin-top: 8px;
		}

		:global(.mobile-overlay-present .maplibregl-ctrl-bottom-right),
		:global(.mobile-overlay-present .profile-menu) {
			bottom: calc(88px + env(safe-area-inset-bottom));
		}

		:global(.mobile-overlay-present.mobile-details-open .maplibregl-ctrl-bottom-right),
		:global(.mobile-overlay-present.mobile-details-open .profile-menu) {
			bottom: calc(min(54vh, 430px) + 92px + env(safe-area-inset-bottom));
		}
	}
</style>
