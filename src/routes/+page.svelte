<script lang="ts">
	import { AddressLookup, type GeonorgeAddress } from '$lib';

	let selectedAddress = $state<GeonorgeAddress | undefined>();
</script>

<svelte:head>
	<title>Adresseoppslag</title>
	<meta
		name="description"
		content="Søk etter norske adresser med Kartverkets GeoNorge-adresseoppslag."
	/>
</svelte:head>

<main class="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
	<div class="mx-auto flex max-w-4xl flex-col gap-8">
		<header>
			<p class="text-sm font-medium tracking-wide text-teal-700 uppercase">GeoNorge</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Adresseoppslag</h1>
			<p class="mt-3 max-w-2xl text-base text-zinc-700">
				Finn offisielle norske adresser fra Kartverkets åpne adresse-API.
			</p>
		</header>

		<AddressLookup onSelect={(address) => (selectedAddress = address)} />

		{#if selectedAddress?.representasjonspunkt}
			<section class="max-w-2xl rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
				<h2 class="text-lg font-semibold text-zinc-950">Koordinater</h2>
				<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-zinc-500">Latitude</dt>
						<dd class="font-medium text-zinc-950">{selectedAddress.representasjonspunkt.lat}</dd>
					</div>
					<div>
						<dt class="text-zinc-500">Longitude</dt>
						<dd class="font-medium text-zinc-950">{selectedAddress.representasjonspunkt.lon}</dd>
					</div>
					<div>
						<dt class="text-zinc-500">EPSG</dt>
						<dd class="font-medium text-zinc-950">{selectedAddress.representasjonspunkt.epsg}</dd>
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
</main>
