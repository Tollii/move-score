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
		placeholder = 'Søk etter adresse',
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
				errorMessage = 'Kunne ikke hente adresser akkurat nå.';
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
			return 'Ingen koordinater';
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

<section class="w-full max-w-2xl">
	<label class="block text-sm font-medium text-zinc-900" for="address-lookup">Adresse</label>
	<div class="relative mt-2">
		<input
			id="address-lookup"
			type="search"
			class="w-full rounded-md border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 shadow-sm transition outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30"
			{placeholder}
			autocomplete="street-address"
			bind:value={query}
		/>
		{#if loading}
			<div class="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-zinc-500">Søker...</div>
		{/if}
	</div>

	{#if errorMessage}
		<p class="mt-2 text-sm text-red-700">{errorMessage}</p>
	{:else if query.trim().length > 0 && query.trim().length < minLength}
		<p class="mt-2 text-sm text-zinc-600">Skriv minst {minLength} tegn.</p>
	{/if}

	{#if addresses.length > 0}
		<div class="mt-3 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
			<div
				class="border-b border-zinc-200 px-4 py-2 text-xs font-medium tracking-wide text-zinc-500 uppercase"
			>
				{metadata?.totaltAntallTreff ?? addresses.length} treff
			</div>
			<ul class="divide-y divide-zinc-200">
				{#each addresses as address (addressKey(address))}
					<li>
						<button
							type="button"
							class="block w-full px-4 py-3 text-left transition hover:bg-teal-50 focus:bg-teal-50 focus:outline-none"
							onclick={() => selectAddress(address)}
						>
							<span class="block font-medium text-zinc-950">{formatAddress(address)}</span>
							<span class="mt-1 block text-sm text-zinc-600">{formatCoordinates(address)}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{:else if query.trim().length >= minLength && !loading && !errorMessage}
		<p class="mt-2 text-sm text-zinc-600">Ingen adresser funnet.</p>
	{/if}

	{#if selectedAddress}
		<div class="mt-4 rounded-md border border-teal-700 bg-teal-50 p-4 text-sm text-teal-950">
			<p class="font-medium">Valgt adresse</p>
			<p class="mt-1">{selectedAddressLabel}</p>
			<p class="mt-1">{formatCoordinates(selectedAddress)}</p>
		</div>
	{/if}
</section>
