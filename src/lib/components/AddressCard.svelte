<script lang="ts">
	import ScoreCircle from './ScoreCircle.svelte';
	import EiendomSection from './EiendomSection.svelte';
	import KollektivtSection from './KollektivtSection.svelte';
	import NabolagSection from './NabolagSection.svelte';
	import ScoreSection from './ScoreSection.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import PersonSimpleWalk from 'phosphor-svelte/lib/PersonSimpleWalk';
	import Bus from 'phosphor-svelte/lib/Bus';
	import type { PropertyData } from './EiendomSection.svelte';
	import type { TransitStop } from './KollektivtSection.svelte';
	import type { Amenity } from './NabolagSection.svelte';
	import type { Scores } from './ScoreSection.svelte';
	import type { GeonorgeAddress } from '$lib/geonorge/address';

	type Props = {
		address: GeonorgeAddress;
		isochronesShown: boolean;
		activeMode?: 'walk' | 'transit';
		isLoading?: boolean;
		property?: PropertyData;
		transit?: TransitStop[];
		amenities?: Amenity[];
		scores?: Scores;
		overallScore?: number;
		onShowIsochrones: (mode: 'walk' | 'transit') => void;
	};

	let {
		address,
		isochronesShown,
		activeMode = 'walk',
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

	let activeTab = $state('eiendom');
	let scrollEl = $state<HTMLDivElement | undefined>();

	$effect(() => {
		void address;
		activeTab = 'eiendom';
	});

	$effect(() => {
		void activeTab;
		if (scrollEl) scrollEl.scrollTop = 0;
	});
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
		<div class="flex gap-1.5">
			<Button
				variant="secondary"
				class="flex-1 gap-1.5 text-[13px] font-semibold {isochronesShown && activeMode === 'walk'
					? 'bg-primary text-primary-foreground hover:bg-primary/90'
					: ''}"
				disabled={isLoading}
				onclick={() => onShowIsochrones('walk')}
			>
				{#if isLoading && activeMode === 'walk'}
					<Spinner class="size-3.5" />
				{:else}
					<PersonSimpleWalk size={16} weight="bold" />
				{/if}
				Gangavstand
			</Button>
			<Button
				variant="secondary"
				class="flex-1 gap-1.5 text-[13px] font-semibold {isochronesShown && activeMode === 'transit'
					? 'bg-primary text-primary-foreground hover:bg-primary/90'
					: ''}"
				disabled={isLoading}
				onclick={() => onShowIsochrones('transit')}
			>
				{#if isLoading && activeMode === 'transit'}
					<Spinner class="size-3.5" />
				{:else}
					<Bus size={16} weight="bold" />
				{/if}
				Kollektivt
			</Button>
		</div>
	</div>

	<!-- Dashboard tabs — only shown after isochrones are rendered -->
	{#if isochronesShown}
		<Tabs.Root bind:value={activeTab} class="flex flex-col">
			<div class="px-3 pt-2.5">
				<Tabs.List class="w-full">
					{#each TABS as tab (tab.id)}
						<Tabs.Trigger value={tab.id} class="flex-1 text-[11px]">
							{tab.label}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</div>

			<div
				bind:this={scrollEl}
				class="max-h-[340px] overflow-y-auto px-4 pt-3 pb-4"
				style="scrollbar-width: thin; scrollbar-color: #e5e4de transparent;"
			>
				<Tabs.Content value="eiendom">
					<EiendomSection {property} />
				</Tabs.Content>
				<Tabs.Content value="kollektiv">
					<KollektivtSection {transit} />
				</Tabs.Content>
				<Tabs.Content value="nabolag">
					<NabolagSection {amenities} />
				</Tabs.Content>
				<Tabs.Content value="score">
					<ScoreSection {scores} overall={overallScore} />
				</Tabs.Content>
			</div>
		</Tabs.Root>
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
</style>
