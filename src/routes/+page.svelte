<script lang="ts">
	import { onMount } from 'svelte';
	import { AddressLookup, MoveScoreMap, searchGeonorgeAddresses, type GeonorgeAddress } from '$lib';
	import AddressCard from '$lib/components/AddressCard.svelte';

	const ADDRESS_QUERY_PARAM = 'address';

	let selectedAddress = $state<GeonorgeAddress | undefined>();
	let isochroneLoading = $state(false);
	let isochroneError = $state<string | undefined>();
	let triggerKey = $state(0);
	let isochronesShown = $state(false);

	onMount(() => {
		void selectAddressFromUrl();
		globalThis.addEventListener('popstate', handlePopState);

		return () => {
			globalThis.removeEventListener('popstate', handlePopState);
		};
	});

	function handleAddressSelect(address: GeonorgeAddress) {
		selectedAddress = address;
		isochroneError = undefined;
		isochronesShown = false;
		updateAddressQueryParam(address);
	}

	function handlePopState() {
		void selectAddressFromUrl();
	}

	async function selectAddressFromUrl() {
		const queryAddress = new URL(globalThis.location.href).searchParams
			.get(ADDRESS_QUERY_PARAM)
			?.trim();

		if (!queryAddress) {
			selectedAddress = undefined;
			isochroneError = undefined;
			isochronesShown = false;
			return;
		}

		try {
			const response = await searchGeonorgeAddresses({
				sok: queryAddress,
				fuzzy: true,
				treffPerSide: 1
			});

			const [address] = response.adresser;
			if (!address) {
				selectedAddress = undefined;
				isochroneError = undefined;
				isochronesShown = false;
				return;
			}

			selectedAddress = address;
			isochroneError = undefined;
			isochronesShown = false;
			updateAddressQueryParam(address, 'replace');
		} catch (error) {
			console.error('Could not load address from URL', error);
		}
	}

	function updateAddressQueryParam(address: GeonorgeAddress, mode: 'push' | 'replace' = 'push') {
		const url = new URL(globalThis.location.href);
		url.searchParams.set(ADDRESS_QUERY_PARAM, formatAddress(address));

		if (url.href === globalThis.location.href) {
			return;
		}

		globalThis.history[mode === 'replace' ? 'replaceState' : 'pushState']({}, '', url);
	}

	function formatAddress(address: GeonorgeAddress) {
		const addressText = address.adressetekst ?? address.adressetekstutenadressetilleggsnavn;
		const place = [address.postnummer, address.poststed].filter(Boolean).join(' ');
		const municipality = address.kommunenavn ? `(${address.kommunenavn})` : '';

		return [addressText, place, municipality].filter(Boolean).join(', ');
	}

	function handleShowIsochrones() {
		isochronesShown = true;
		triggerKey++;
	}

	const WALK_BANDS = [
		{ color: '#3a7a52', label: '0–5 min' },
		{ color: '#7fb069', label: '5–10 min' },
		{ color: '#F5B800', label: '10–15 min' },
		{ color: '#e05a2b', label: '15–20 min' }
	];
</script>

<svelte:head>
	<title>Move Score — Finn nabolaget som passer deg</title>
	<meta
		name="description"
		content="Utforsk norske adresser på et interaktivt kart og se gangavstand rundt valgt punkt."
	/>
</svelte:head>

<main
	style="position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #f0efe9;"
>
	<!-- Map layer -->
	<MoveScoreMap
		class="absolute inset-0 h-full w-full"
		{selectedAddress}
		{triggerKey}
		bind:isLoading={isochroneLoading}
		bind:error={isochroneError}
	/>

	<!-- Left panel -->
	<div class="panel">
		<!-- Search card -->
		<div class="card search-card">
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
					<p>Søk etter en adresse og se gangavstand, kollektivtilbud og nabolagsinfo.</p>
				</div>
			{/if}

			<div style="margin-top: {selectedAddress ? '0' : '14px'};">
				{#if !selectedAddress}
					<div class="lbl">Adresse</div>
				{/if}
				{#key selectedAddress ? formatAddress(selectedAddress) : ''}
					<AddressLookup
						defaultQuery={selectedAddress ? formatAddress(selectedAddress) : ''}
						onSelect={handleAddressSelect}
					/>
				{/key}
			</div>

			{#if isochroneError}
				<p class="error-msg">{isochroneError}</p>
			{/if}
		</div>

		<!-- Address + dashboard card -->
		{#if selectedAddress}
			<AddressCard
				address={selectedAddress}
				{isochronesShown}
				isLoading={isochroneLoading}
				onShowIsochrones={handleShowIsochrones}
			/>
		{/if}

		<!-- Legend -->
		{#if isochronesShown}
			<div class="card legend-card">
				<div class="lbl" style="margin-bottom: 8px;">Gangavstand</div>
				{#each WALK_BANDS as band (band.label)}
					<div class="legend-row">
						<div class="legend-dot" style:background={band.color}></div>
						{band.label}
					</div>
				{/each}
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
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		color: #1a1a18;
		margin-bottom: 5px;
	}
	.legend-row:last-child {
		margin-bottom: 0;
	}
	.legend-dot {
		width: 11px;
		height: 11px;
		border-radius: 3px;
		flex-shrink: 0;
		opacity: 0.9;
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
</style>
