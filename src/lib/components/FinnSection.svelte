<script lang="ts">
	import ArrowSquareOut from 'phosphor-svelte/lib/ArrowSquareOut';
	import type { FinnListingField, FinnListingInfo } from '$lib/finn/address';

	type Props = {
		listing: FinnListingInfo;
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
		'Eieform',
		'Soverom',
		'Rom',
		'Etasje',
		'Byggeår'
	]);

	const priceFields = $derived(listing.price ?? []);
	const keyFields = $derived(listing.keyInfo ?? []);
	const highlightedFields = $derived(
		[...priceFields, ...keyFields].filter((field) => priorityLabels.has(field.label)).slice(0, 6)
	);
	const summaryFields = $derived(highlightedFields.slice(0, 3));
	const secondaryHighlightedFields = $derived(highlightedFields.slice(3));
	const detailFields = $derived(
		[...priceFields, ...keyFields].filter(
			(field) => !highlightedFields.some((h) => fieldsMatch(h, field))
		)
	);

	function fieldsMatch(a: FinnListingField, b: FinnListingField) {
		return a.label === b.label && a.value === b.value;
	}
</script>

<article class="listing-summary">
	{#if listing.imageUrl}
		<img class="listing-image" src={listing.imageUrl} alt="" />
	{/if}

	<div class="listing-copy">
		{#if listing.title}
			<h3 class="listing-title">{listing.title}</h3>
		{/if}

		{#if summaryFields.length}
			<div class="summary-grid">
				{#each summaryFields as field (`summary-${field.label}-${field.value}`)}
					<div class="summary-pill">
						<span>{field.label}</span>
						<strong>{field.value}</strong>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</article>

{#if secondaryHighlightedFields.length}
	<div class="highlight-grid">
		{#each secondaryHighlightedFields as field (`${field.label}-${field.value}`)}
			<div class="highlight-cell">
				<div class="field-label">{field.label}</div>
				<div class="highlight-value">{field.value}</div>
			</div>
		{/each}
	</div>
{/if}

{#if detailFields.length}
	<section>
		<div class="section-label">Detaljer</div>
		{#each detailFields as field, i (`detail-${i}-${field.label}`)}
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

<style>
	.listing-summary {
		display: grid;
		grid-template-columns: 92px minmax(0, 1fr);
		gap: 10px;
		align-items: stretch;
		margin-bottom: 10px;
	}
	.listing-image {
		width: 100%;
		height: 100%;
		min-height: 86px;
		object-fit: cover;
		border-radius: 9px;
		background: #f5f4ee;
	}
	.listing-copy {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.listing-title {
		margin: 0;
		font-size: 13px;
		line-height: 1.3;
		color: #1a1a18;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.summary-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 5px;
	}
	.summary-pill {
		min-width: 0;
		border-radius: 8px;
		background: #f5f4ee;
		padding: 6px 8px;
	}
	.summary-pill span {
		display: block;
		margin-bottom: 1px;
		color: #a8a79e;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.summary-pill strong {
		display: block;
		color: #1a1a18;
		font-size: 12px;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}
	.highlight-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 5px;
		margin-bottom: 10px;
	}
	.highlight-cell {
		background: #fff8d6;
		border: 1px solid #f5e280;
		border-radius: 8px;
		padding: 7px 9px;
		min-width: 0;
	}
	.field-label {
		font-size: 10px;
		color: #8a6800;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		margin-bottom: 2px;
	}
	.section-label {
		font-size: 10px;
		color: #a8a79e;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		margin-bottom: 4px;
	}
	.highlight-value {
		font-size: 12.5px;
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
		padding: 6px 0;
		border-bottom: 1px solid #f0efe9;
	}
	.stat-row:last-child {
		border-bottom: none;
	}
	.stat-key {
		font-size: 12px;
		color: #6a6a62;
	}
	.stat-val {
		font-size: 12.5px;
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
		margin-top: 10px;
		padding: 8px;
		border-radius: 8px;
		border: 1.5px solid #e5e4de;
		background: #fafaf6;
		font-size: 12px;
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

	@media (max-width: 640px) {
		.listing-summary {
			grid-template-columns: 84px minmax(0, 1fr);
		}

		.highlight-grid {
			display: none;
		}
	}
</style>
