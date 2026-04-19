<script lang="ts">
	import {
		searchGeonorgeAddresses,
		type GeonorgeAddress,
		type GeonorgeAddressSearchMetadata
	} from '$lib/geonorge/address';

	type Props = {
		defaultQuery?: string;
		placeholder?: string;
		minLength?: number;
		debounceMs?: number;
		treffPerSide?: number;
		kommunenummer?: string;
		onSelect?: (address: GeonorgeAddress) => void;
	};

	let {
		defaultQuery = '',
		placeholder = 'SØK ADRESSE...',
		minLength = 2,
		debounceMs = 250,
		treffPerSide = 8,
		kommunenummer,
		onSelect
	}: Props = $props();

	let query = $state('');
	let addresses = $state<GeonorgeAddress[]>([]);
	let metadata = $state<GeonorgeAddressSearchMetadata | undefined>();
	let selectedAddress = $state<GeonorgeAddress | undefined>();
	let selectedQuery = $state('');
	let loading = $state(false);
	let errorMessage = $state<string | undefined>();
	let initialized = false;

	const selectedAddressLabel = $derived(formatAddress(selectedAddress));

	$effect(() => {
		if (!initialized) {
			query = defaultQuery;
			initialized = true;
		}
	});

	$effect(() => {
		const trimmedQuery = query.trim();

		if (selectedAddress && trimmedQuery !== selectedQuery) {
			selectedAddress = undefined;
			selectedQuery = '';
		}

		if (trimmedQuery.length < minLength) {
			addresses = [];
			metadata = undefined;
			errorMessage = undefined;
			loading = false;
			return;
		}

		if (trimmedQuery === selectedQuery) {
			addresses = [];
			metadata = undefined;
			errorMessage = undefined;
			loading = false;
			return;
		}

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			loading = true;
			errorMessage = undefined;

			try {
				const response = await searchGeonorgeAddresses(
					{
						sok: trimmedQuery,
						kommunenummer,
						treffPerSide,
						side: 0,
						asciiKompatibel: false
					},
					{ signal: controller.signal }
				);

				addresses = response.adresser;
				metadata = response.metadata;
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') {
					return;
				}

				addresses = [];
				metadata = undefined;
				errorMessage = 'FEIL: KUNNE IKKE HENTE ADRESSER';
			} finally {
				if (!controller.signal.aborted) {
					loading = false;
				}
			}
		}, debounceMs);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	function selectAddress(address: GeonorgeAddress) {
		selectedAddress = address;
		query = formatAddress(address);
		selectedQuery = query;
		addresses = [];
		metadata = undefined;
		onSelect?.(address);
	}

	function formatAddress(address: GeonorgeAddress | undefined) {
		if (!address) {
			return '';
		}

		const addressText = address.adressetekst ?? address.adressetekstutenadressetilleggsnavn;
		const place = [address.postnummer, address.poststed].filter(Boolean).join(' ');
		const municipality = address.kommunenavn ? `(${address.kommunenavn})` : '';

		return [addressText, place, municipality].filter(Boolean).join(', ');
	}

	function formatCoordinates(address: GeonorgeAddress) {
		const point = address.representasjonspunkt;

		if (!point) {
			return 'INGEN KOORDINATER';
		}

		return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)} ${point.epsg ?? ''}`.trim();
	}

	function addressKey(address: GeonorgeAddress) {
		return [
			address.kommunenummer,
			address.adressekode,
			address.nummer,
			address.bokstav,
			address.postnummer,
			address.representasjonspunkt?.lat,
			address.representasjonspunkt?.lon
		]
			.filter((value) => value !== undefined && value !== null && value !== '')
			.join('-');
	}
</script>

<section class="lookup">
	<label class="lookup-label" for="address-lookup">TARGET DESIGNATION</label>
	<div class="input-wrapper">
		<input
			id="address-lookup"
			type="search"
			class="lookup-input"
			{placeholder}
			autocomplete="street-address"
			bind:value={query}
		/>
		{#if loading}
			<div class="loading-indicator">SØKER...</div>
		{/if}
	</div>

	{#if errorMessage}
		<p class="error-text">{errorMessage}</p>
	{:else if query.trim().length > 0 && query.trim().length < minLength}
		<p class="hint-text">MIN {minLength} TEGN PÅKREVD</p>
	{/if}

	{#if addresses.length > 0}
		<div class="results-panel">
			<div class="results-header">
				{metadata?.totaltAntallTreff ?? addresses.length} TREFF
			</div>
			<ul class="results-list">
				{#each addresses as address (addressKey(address))}
					<li>
						<button type="button" class="result-btn" onclick={() => selectAddress(address)}>
							<span class="result-address">{formatAddress(address)}</span>
							<span class="result-coords">{formatCoordinates(address)}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{:else if query.trim().length >= minLength && !loading && !errorMessage}
		<p class="hint-text">INGEN TREFF</p>
	{/if}

	{#if selectedAddress}
		<div class="selected-panel">
			<p class="selected-label">◈ VALGT TARGET</p>
			<p class="selected-address">{selectedAddressLabel}</p>
			<p class="selected-coords">{formatCoordinates(selectedAddress)}</p>
		</div>
	{/if}
</section>

<style>
	.lookup {
		width: 100%;
		font-family: 'Share Tech Mono', 'Courier New', monospace;
	}

	.lookup-label {
		display: block;
		font-size: 9px;
		letter-spacing: 0.2em;
		color: rgba(255, 179, 0, 0.7);
		margin-bottom: 6px;
	}

	.input-wrapper {
		position: relative;
	}

	.lookup-input {
		width: 100%;
		background: #141410;
		border: 1px solid rgba(255, 179, 0, 0.3);
		color: #ffb300;
		font-family: 'Share Tech Mono', 'Courier New', monospace;
		font-size: 11px;
		padding: 8px 10px;
		outline: none;
		letter-spacing: 0.05em;
		border-radius: 0;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
		-webkit-appearance: none;
		appearance: none;
	}

	.lookup-input:focus {
		border-color: rgba(255, 179, 0, 0.7);
		box-shadow:
			0 0 0 1px rgba(255, 179, 0, 0.12),
			0 0 10px rgba(255, 179, 0, 0.06);
	}

	.lookup-input::placeholder {
		color: rgba(255, 179, 0, 0.2);
		letter-spacing: 0.08em;
	}

	.lookup-input::-webkit-search-cancel-button,
	.lookup-input::-webkit-search-decoration {
		-webkit-appearance: none;
	}

	.loading-indicator {
		position: absolute;
		top: 50%;
		right: 10px;
		transform: translateY(-50%);
		font-size: 9px;
		color: rgba(255, 179, 0, 0.45);
		letter-spacing: 0.18em;
		animation: blink 1.2s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}

	.error-text {
		margin-top: 6px;
		font-size: 9px;
		color: #cc2200;
		letter-spacing: 0.1em;
	}

	.hint-text {
		margin-top: 6px;
		font-size: 9px;
		color: rgba(255, 179, 0, 0.55);
		letter-spacing: 0.12em;
	}

	.results-panel {
		margin-top: 4px;
		border: 1px solid rgba(255, 179, 0, 0.35);
		background: #0e0e0a;
	}

	.results-header {
		padding: 4px 10px;
		font-size: 9px;
		letter-spacing: 0.2em;
		color: rgba(255, 179, 0, 0.6);
		border-bottom: 1px solid rgba(255, 179, 0, 0.2);
	}

	.results-list {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 220px;
		overflow-y: auto;
	}

	.result-btn {
		display: block;
		width: 100%;
		padding: 7px 10px;
		text-align: left;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 179, 0, 0.06);
		cursor: pointer;
		transition: background 0.1s;
		font-family: 'Share Tech Mono', monospace;
	}

	.result-btn:hover,
	.result-btn:focus {
		background: rgba(255, 179, 0, 0.07);
		outline: none;
	}

	.result-address {
		display: block;
		font-size: 11px;
		color: #ffb300;
		letter-spacing: 0.04em;
		line-height: 1.3;
	}

	.result-coords {
		display: block;
		margin-top: 2px;
		font-size: 9px;
		color: rgba(255, 179, 0, 0.55);
		letter-spacing: 0.08em;
	}

	.selected-panel {
		margin-top: 8px;
		border-left: 2px solid #ffb300;
		border-top: 1px solid rgba(255, 179, 0, 0.18);
		border-right: 1px solid rgba(255, 179, 0, 0.18);
		border-bottom: 1px solid rgba(255, 179, 0, 0.18);
		padding: 8px 10px;
		background: rgba(255, 179, 0, 0.04);
	}

	.selected-label {
		font-size: 9px;
		letter-spacing: 0.2em;
		color: rgba(255, 179, 0, 0.7);
		margin: 0 0 4px;
	}

	.selected-address {
		font-size: 11px;
		color: #ffcc00;
		letter-spacing: 0.04em;
		line-height: 1.4;
		margin: 0;
	}

	.selected-coords {
		margin: 3px 0 0;
		font-size: 9px;
		color: rgba(255, 179, 0, 0.6);
		letter-spacing: 0.08em;
	}
</style>
