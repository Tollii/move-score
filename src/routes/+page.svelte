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
</script>

<svelte:head>
	<title>Adresseoppslag</title>
	<meta
		name="description"
		content="Søk etter norske adresser med Kartverkets GeoNorge-adresseoppslag."
	/>
</svelte:head>

<main class="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
	<div class="mx-auto flex max-w-6xl flex-col gap-8">
		<header>
			<p class="text-sm font-medium tracking-wide text-teal-700 uppercase">GeoNorge</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Flyttescore</h1>
			<p class="mt-3 max-w-2xl text-base text-zinc-700">
				Finn en adresse og se hvor langt du kommer til fots.
			</p>
		</header>

		<section class="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
			<div class="flex flex-col gap-4">
				<AddressLookup
					defaultQuery="Slottsplassen 1, 0010 OSLO (OSLO)"
					onSelect={(address) => (selectedAddress = address)}
				/>

				{#if selectedAddress?.representasjonspunkt}
					<section class="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
						<h2 class="text-lg font-semibold text-zinc-950">Valgt punkt</h2>
						<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
							<div>
								<dt class="text-zinc-500">Latitude</dt>
								<dd class="font-medium text-zinc-950">
									{selectedAddress.representasjonspunkt.lat}
								</dd>
							</div>
							<div>
								<dt class="text-zinc-500">Longitude</dt>
								<dd class="font-medium text-zinc-950">
									{selectedAddress.representasjonspunkt.lon}
								</dd>
							</div>
							<div>
								<dt class="text-zinc-500">EPSG</dt>
								<dd class="font-medium text-zinc-950">
									{selectedAddress.representasjonspunkt.epsg}
								</dd>
							</div>
							<div>
								<dt class="text-zinc-500">Kommune</dt>
								<dd class="font-medium text-zinc-950">
									{selectedAddress.kommunenavn}
									{selectedAddress.kommunenummer}
								</dd>
							</div>
						</dl>
					</section>
				{/if}
			</div>

			<MoveScoreMap {selectedAddress} />
		</section>
	</div>
</main>
