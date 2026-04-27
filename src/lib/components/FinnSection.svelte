<script lang="ts">
	import ArrowSquareOut from 'phosphor-svelte/lib/ArrowSquareOut';
	import Warning from 'phosphor-svelte/lib/Warning';
	import * as Alert from '$lib/components/ui/alert';
	import type { FinnListingField, FinnListingInfo } from '$lib/finn/address';

	type Props = {
		listing?: FinnListingInfo;
	};

	let { listing }: Props = $props();

	const priorityLabels = new Set([
		'Prisantydning',
		'Totalpris',
		'Omkostninger',
		'Felleskost/mnd.',
		'Fellesgjeld',
		'Bruksareal',
		'Internt bruksareal',
		'Primærrom',
		'Boligtype',
		'Eierform',
		'Soverom',
		'Rom',
		'Etasje',
		'Byggeår'
	]);

	const priceFields = $derived(listing?.price ?? []);
	const keyFields = $derived(listing?.keyInfo ?? []);
	const highlightedFields = $derived(
		[...priceFields, ...keyFields].filter((field) => priorityLabels.has(field.label)).slice(0, 6)
	);
	const remainingKeyFields = $derived(
		keyFields.filter(
			(field) => !highlightedFields.some((highlight) => fieldsMatch(highlight, field))
		)
	);

	function fieldsMatch(a: FinnListingField, b: FinnListingField) {
		return a.label === b.label && a.value === b.value;
	}
</script>

{#if listing}
	{#if listing.imageUrl}
		<img class="listing-image" src={listing.imageUrl} alt="" />
	{/if}

	{#if listing.title}
		<h3>{listing.title}</h3>
	{/if}

	{#if highlightedFields.length}
		<div class="highlight-grid">
			{#each highlightedFields as field (`${field.label}-${field.value}`)}
				<div class="highlight-cell">
					<div class="field-label">{field.label}</div>
					<div class="highlight-value">{field.value}</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if priceFields.length}
		<section>
			<div class="section-label">Pris</div>
			{#each priceFields as field (`price-${field.label}`)}
				<div class="stat-row">
					<span class="stat-key">{field.label}</span>
					<span class="stat-val">{field.value}</span>
				</div>
			{/each}
		</section>
	{/if}

	{#if remainingKeyFields.length}
		<section>
			<div class="section-label">Nøkkelinfo</div>
			{#each remainingKeyFields as field (`key-${field.label}`)}
				<div class="stat-row">
					<span class="stat-key">{field.label}</span>
					<span class="stat-val">{field.value}</span>
				</div>
			{/each}
		</section>
	{/if}

	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external Finn.no URL -->
	<a href={listing.url} target="_blank" rel="noopener noreferrer" class="finn-link">
		<ArrowSquareOut size={13} />
		Se på Finn.no · {listing.finnCode}
	</a>
{:else}
	<Alert.Root variant="warning" class="mb-3 text-[11.5px]">
		<Warning size={14} />
		<Alert.Description>Finn.no-data er ikke tilgjengelig for denne adressen</Alert.Description>
	</Alert.Root>
{/if}

<style>
	.listing-image {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 9px;
		margin-bottom: 12px;
		background: #f5f4ee;
	}
	h3 {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.35;
		letter-spacing: 0;
		color: #1a1a18;
	}
	.highlight-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin-bottom: 13px;
	}
	.highlight-cell {
		background: #fff8d6;
		border: 1px solid #f5e280;
		border-radius: 8px;
		padding: 9px 10px;
		min-width: 0;
	}
	.field-label,
	.section-label {
		font-size: 10px;
		color: #8a6800;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		margin-bottom: 3px;
	}
	.section-label {
		color: #a8a79e;
		margin-top: 12px;
		margin-bottom: 5px;
	}
	.highlight-value {
		font-size: 13px;
		font-weight: 700;
		line-height: 1.25;
		color: #1a1a18;
		overflow-wrap: anywhere;
	}
	.stat-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-bottom: 1px solid #f0efe9;
	}
	.stat-row:last-child {
		border-bottom: none;
	}
	.stat-key {
		font-size: 12.5px;
		color: #6a6a62;
	}
	.stat-val {
		font-size: 13px;
		font-weight: 600;
		color: #1a1a18;
		text-align: right;
		overflow-wrap: anywhere;
	}
	.finn-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 12px;
		padding: 9px;
		border-radius: 8px;
		border: 1.5px solid #e5e4de;
		background: #fafaf6;
		font-size: 12.5px;
		font-weight: 600;
		color: #6a6a62;
		text-decoration: none;
		width: 100%;
		font-family: inherit;
		transition: background 0.12s;
	}
	.finn-link:hover {
		background: #f0efe9;
	}
</style>
