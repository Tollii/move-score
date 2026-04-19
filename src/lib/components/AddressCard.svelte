<script lang="ts">
	import ScoreCircle from './ScoreCircle.svelte';
	import EiendomSection from './EiendomSection.svelte';
	import KollektivtSection from './KollektivtSection.svelte';
	import NabolagSection from './NabolagSection.svelte';
	import ScoreSection from './ScoreSection.svelte';
	import type { PropertyData } from './EiendomSection.svelte';
	import type { TransitStop } from './KollektivtSection.svelte';
	import type { Amenity } from './NabolagSection.svelte';
	import type { Scores } from './ScoreSection.svelte';
	import type { GeonorgeAddress } from '$lib/geonorge/address';

	type Props = {
		address: GeonorgeAddress;
		isochronesShown: boolean;
		isLoading?: boolean;
		property?: PropertyData;
		transit?: TransitStop[];
		amenities?: Amenity[];
		scores?: Scores;
		overallScore?: number;
		onShowIsochrones: () => void;
	};

	let {
		address,
		isochronesShown,
		isLoading = false,
		property,
		transit,
		amenities,
		scores,
		overallScore,
		onShowIsochrones
	}: Props = $props();

	const TABS = [
		{ id: 'eiendom', label: 'Eiendom' },
		{ id: 'kollektiv', label: 'Kollektivt' },
		{ id: 'nabolag', label: 'Nabolag' },
		{ id: 'score', label: 'Score' }
	] as const;

	type TabId = (typeof TABS)[number]['id'];

	let activeTab = $state<TabId>('eiendom');
	let scrollEl = $state<HTMLDivElement | undefined>();

	$effect(() => {
		// Reset to first tab when address changes
		void address;
		activeTab = 'eiendom';
	});

	function switchTab(id: TabId) {
		activeTab = id;
		if (scrollEl) scrollEl.scrollTop = 0;
	}
</script>

<div class="card" style="margin-top: 8px; overflow: hidden;">
	<!-- Address header -->
	<div class="address-header">
		<div style="display: flex; align-items: flex-start; gap: 10px;">
			<div style="flex: 1;">
				<div class="lbl">Valgt adresse</div>
				<div class="address-main">{address.adressetekst}</div>
				<div class="address-sub">
					{address.postnummer}
					{address.poststed}{#if address.kommunenavn}&thinsp;·&thinsp;{address.kommunenavn}{/if}
				</div>
			</div>
			<ScoreCircle score={overallScore ?? null} size={50} />
		</div>
	</div>

	<!-- CTA -->
	<div class="walk-section" class:no-border={!isochronesShown}>
		<button class="btn-primary" onclick={onShowIsochrones} disabled={isLoading}>
			{#if isLoading}
				<span class="spinner"></span>
				Beregner…
			{:else if isochronesShown}
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M11.5 7A4.5 4.5 0 1 1 7 2.5a4.5 4.5 0 0 1 3.2 1.3L13 1.5" stroke="#1A1A18" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				Oppdater
			{:else}
				Vis gangavstand
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M2 7h10M8 3l4 4-4 4" stroke="#1A1A18" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{/if}
		</button>
	</div>

	<!-- Dashboard tabs — only shown after isochrones are rendered -->
	{#if isochronesShown}
		<div class="tabs-header">
			<div class="tabs">
				{#each TABS as tab}
					<button
						class="tab-btn"
						class:active={activeTab === tab.id}
						onclick={() => switchTab(tab.id)}
					>
						{tab.label}
					</button>
				{/each}
			</div>
		</div>

		<div bind:this={scrollEl} class="panel-scroll">
			{#if activeTab === 'eiendom'}
				<EiendomSection {property} />
			{:else if activeTab === 'kollektiv'}
				<KollektivtSection {transit} />
			{:else if activeTab === 'nabolag'}
				<NabolagSection {amenities} />
			{:else if activeTab === 'score'}
				<ScoreSection {scores} overall={overallScore} />
			{/if}
		</div>
	{/if}
</div>

<style>
	.card {
		background: #fffefc;
		border-radius: 14px;
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.08),
			0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.07);
		width: 316px;
	}
	.address-header {
		padding: 14px 16px 12px;
		border-bottom: 1px solid #f0efe9;
	}
	.lbl {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: #a8a79e;
		margin-bottom: 4px;
	}
	.address-main {
		font-size: 15px;
		font-weight: 700;
		color: #1a1a18;
		letter-spacing: -0.02em;
		line-height: 1.3;
	}
	.address-sub {
		font-size: 12px;
		color: #a8a79e;
		margin-top: 2px;
	}
	.walk-section {
		padding: 12px 16px;
		border-bottom: 1px solid #f0efe9;
	}
	.walk-section.no-border {
		border-bottom: none;
	}
.btn-primary {
		width: 100%;
		background: #f5b800;
		color: #1a1a18;
		border: none;
		border-radius: 9px;
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
		font-weight: 600;
		padding: 11px 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		transition:
			background 0.12s,
			transform 0.1s;
		letter-spacing: -0.01em;
	}
	.btn-primary:hover:not(:disabled) {
		background: #edaf00;
	}
	.btn-primary:active:not(:disabled) {
		transform: scale(0.98);
	}
	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(26, 26, 24, 0.25);
		border-top-color: #1a1a18;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.tabs-header {
		padding: 10px 12px 0;
	}
	.tabs {
		display: flex;
		gap: 2px;
		background: #f0efe9;
		border-radius: 9px;
		padding: 3px;
	}
	.tab-btn {
		flex: 1;
		padding: 6px 4px;
		border: none;
		border-radius: 7px;
		background: transparent;
		font-family: 'DM Sans', sans-serif;
		font-size: 11px;
		font-weight: 500;
		color: #a8a79e;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.tab-btn.active {
		background: #fffefc;
		color: #1a1a18;
		font-weight: 600;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
	}
	.tab-btn:hover:not(.active) {
		color: #1a1a18;
	}
	.panel-scroll {
		max-height: 340px;
		padding: 12px 16px 16px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: #e5e4de transparent;
	}
	.panel-scroll::-webkit-scrollbar {
		width: 4px;
	}
	.panel-scroll::-webkit-scrollbar-thumb {
		background: #e5e4de;
		border-radius: 4px;
	}
</style>
