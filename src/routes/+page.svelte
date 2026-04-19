<script lang="ts">
	import { AddressLookup, MoveScoreMap, type GeonorgeAddress } from '$lib';

	const defaultAddress: GeonorgeAddress = {
		adressenavn: 'Slottsplassen',
		adressetekst: 'Slottsplassen 1',
		adressetilleggsnavn: null,
		adressekode: 21608,
		nummer: 1,
		bokstav: '',
		kommunenummer: '0301',
		kommunenavn: 'OSLO',
		gardsnummer: 209,
		bruksnummer: 25,
		festenummer: 0,
		undernummer: null,
		bruksenhetsnummer: [],
		objtype: 'Vegadresse',
		poststed: 'OSLO',
		postnummer: '0010',
		adressetekstutenadressetilleggsnavn: 'Slottsplassen 1',
		stedfestingverifisert: true,
		representasjonspunkt: {
			epsg: 'EPSG:4258',
			lat: 59.917063045432855,
			lon: 10.727724636631736
		},
		oppdateringsdato: '2020-06-15T18:07:07'
	};

	let selectedAddress = $state<GeonorgeAddress | undefined>(defaultAddress);
	let isochroneLoading = $state(false);
	let isochroneError = $state<string | undefined>();
	let triggerKey = $state(0);

	function handleAddressSelect(address: GeonorgeAddress) {
		selectedAddress = address;
		isochroneError = undefined;
	}

	function triggerIsochrone() {
		triggerKey++;
	}
</script>

<svelte:head>
	<title>Move Score — Finn nabolaget som passer deg</title>
	<meta
		name="description"
		content="Utforsk norske adresser på et interaktivt kart og se gangavstand rundt valgt punkt."
	/>
</svelte:head>

<main class="relative min-h-screen overflow-hidden bg-[var(--color-ink)] text-[var(--color-paper)]">
	<MoveScoreMap
		class="absolute inset-0 h-full w-full"
		{selectedAddress}
		{triggerKey}
		bind:isLoading={isochroneLoading}
		bind:error={isochroneError}
	/>

	<div
		class="pointer-events-none absolute inset-y-0 left-0 z-10 w-[38rem] bg-gradient-to-r from-[rgb(7_18_15/0.18)] to-transparent"
	></div>

	<section
		class="pointer-events-none absolute inset-y-0 left-0 z-50 flex w-full max-w-[31rem] p-4 sm:p-6 lg:p-8"
	>
		<aside
			class="pointer-events-auto flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[var(--color-glass-dark)] shadow-[var(--shadow-glass)] backdrop-blur-2xl sm:max-h-[calc(100vh-3rem)] lg:max-h-[calc(100vh-4rem)]"
		>
			<div class="flex-1 overflow-y-auto overscroll-contain">
				<!-- Header -->
				<header class="p-6 lg:p-8">
					<div class="mb-5 flex items-center gap-2.5">
						<span
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-teal)]/35 bg-[var(--color-teal)]/15"
						>
							<svg
								width="11"
								height="11"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="text-[var(--color-teal)]"
								aria-hidden="true"
							>
								<path
									d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9 1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"
								/>
							</svg>
						</span>
						<span
							class="text-[10px] font-bold tracking-[0.24em] text-[var(--color-teal)] uppercase"
							>Move Score</span
						>
					</div>

					<h1
						class="font-display text-[2rem] leading-[1.05] font-black tracking-tight text-[var(--color-paper)] sm:text-[2.35rem]"
					>
						Finn nabolaget som passer livet ditt.
					</h1>
					<p class="mt-3 text-sm leading-6 text-[var(--color-paper-muted)]">
						Søk etter en adresse og se hvor langt du kan gå fra valgt punkt.
					</p>
				</header>

				<div class="mx-6 h-px bg-white/8 lg:mx-8"></div>

				<!-- Search -->
				<div class="p-6 lg:p-8">
					<AddressLookup
						defaultQuery="Slottsplassen 1, 0010 OSLO (OSLO)"
						onSelect={handleAddressSelect}
					/>
				</div>

				<!-- Address + CTA -->
				{#if selectedAddress?.representasjonspunkt}
					<div class="mx-6 h-px bg-white/8 lg:mx-8"></div>

					<div class="p-6 lg:p-8">
						<p class="mb-3 text-[10px] font-bold tracking-[0.25em] text-[var(--color-paper-muted)] uppercase">
							Valgt adresse
						</p>

						<div class="mb-5">
							<p class="text-[1.2rem] font-black leading-snug text-[var(--color-paper)]">
								{selectedAddress.adressetekst}
							</p>
							<p class="mt-1 text-sm font-medium text-[var(--color-paper-muted)]">
								{selectedAddress.postnummer}
								{selectedAddress.poststed}{#if selectedAddress.kommunenavn}&thinsp;·&thinsp;{selectedAddress.kommunenavn}{/if}
							</p>
							<p class="mt-2.5 font-mono text-[10.5px] text-[var(--color-paper-muted)]/50">
								{selectedAddress.representasjonspunkt.lat.toFixed(5)},
								{selectedAddress.representasjonspunkt.lon.toFixed(5)}&ensp;{selectedAddress
									.representasjonspunkt.epsg}
							</p>
						</div>

						<button
							type="button"
							class="group flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-6 py-3.5 text-sm font-bold text-[var(--color-ink)] shadow-[var(--shadow-btn)] transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none motion-safe:duration-200"
							disabled={isochroneLoading}
							onclick={triggerIsochrone}
						>
							{#if isochroneLoading}
								<span
									class="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-ink)]/25 border-t-[var(--color-ink)]"
								></span>
								Beregner gangavstand…
							{:else}
								Vis gangavstand
								<svg
									width="15"
									height="15"
									viewBox="0 0 15 15"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="transition-transform duration-200 group-hover:translate-x-0.5"
									aria-hidden="true"
								>
									<path d="M2.5 7.5h10M8 3l4.5 4.5L8 12" />
								</svg>
							{/if}
						</button>

						{#if isochroneError}
							<p
								class="mt-3 rounded-[var(--radius-md)] border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm leading-relaxed text-red-200"
							>
								{isochroneError}
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</aside>
	</section>
</main>
