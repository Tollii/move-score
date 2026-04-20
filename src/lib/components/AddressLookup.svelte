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

		return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
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

<section class="w-full">
	<label
		class="block text-[10px] font-bold tracking-[0.22em] text-[var(--color-paper-muted)] uppercase"
		for="address-lookup">Adresse</label
	>
	<div class="relative mt-2">
		<input
			id="address-lookup"
			type="search"
			class="w-full rounded-[var(--radius-lg)] border border-white/10 bg-[var(--color-paper)] px-4 py-3.5 text-[0.9375rem] font-semibold text-[var(--color-ink)] shadow-[var(--shadow-small)] outline-none transition placeholder:font-normal placeholder:text-[var(--color-ink-soft)]/45 focus:border-[var(--color-accent)]/60 focus:ring-3 focus:ring-[var(--color-accent)]/20"
			{placeholder}
			autocomplete="street-address"
			bind:value={query}
		/>
		{#if loading}
			<span
				class="absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--color-ink)]/15 border-t-[var(--color-ink-soft)]"
			></span>
		{/if}
	</div>

	{#if errorMessage}
		<p
			class="mt-3 rounded-[var(--radius-md)] border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200"
		>
			{errorMessage}
		</p>
	{:else if query.trim().length > 0 && query.trim().length < minLength}
		<p class="mt-2.5 text-xs text-[var(--color-paper-muted)]">Skriv minst {minLength} tegn.</p>
	{/if}

	{#if addresses.length > 0}
		<div
			class="mt-2.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink)]/10 bg-[var(--color-paper)] shadow-[var(--shadow-glass)]"
		>
			<div
				class="border-b border-[var(--color-ink)]/8 px-4 py-2.5 text-[10px] font-bold tracking-[0.2em] text-[var(--color-ink-soft)]/60 uppercase"
			>
				{metadata?.totaltAntallTreff ?? addresses.length} treff
			</div>
			<ul class="divide-y divide-[var(--color-ink)]/6">
				{#each addresses as address (addressKey(address))}
					<li>
						<button
							type="button"
							class="group block w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-accent)]/10 focus:bg-[var(--color-accent)]/10 focus:outline-none"
							onclick={() => selectAddress(address)}
						>
							<span
								class="block text-[0.875rem] font-bold leading-snug text-[var(--color-ink)] transition-transform duration-150 group-hover:translate-x-0.5 motion-safe:transition-transform"
								>{formatAddress(address)}</span
							>
							<span class="mt-0.5 block text-xs font-medium text-[var(--color-ink-soft)]/60"
								>{formatCoordinates(address)}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{:else if query.trim().length >= minLength && !loading && !errorMessage}
		<p class="mt-2.5 text-xs text-[var(--color-paper-muted)]">Ingen adresser funnet.</p>
	{/if}
</section>
