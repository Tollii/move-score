<script lang="ts">
	import ScoreCircle from './ScoreCircle.svelte';
	import EiendomSection from './EiendomSection.svelte';
	import FinnSection from './FinnSection.svelte';
	import KollektivtSection from './KollektivtSection.svelte';
	import NabolagSection from './NabolagSection.svelte';
	import ScoreSection from './ScoreSection.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import PersonSimpleWalk from 'phosphor-svelte/lib/PersonSimpleWalk';
	import Bus from 'phosphor-svelte/lib/Bus';
	import Car from 'phosphor-svelte/lib/Car';
	import Bicycle from 'phosphor-svelte/lib/Bicycle';
	import type { PropertyData } from './EiendomSection.svelte';
	import type { TransitStop } from './KollektivtSection.svelte';
	import type { Amenity } from './NabolagSection.svelte';
	import type { Scores } from './ScoreSection.svelte';
	import type { GeonorgeAddress } from '$lib/geonorge/address';
	import type { FinnListingInfo } from '$lib/finn/address';
	import { enabledIsochroneModes, type IsochroneModeId } from '$lib/isochrones/modes';

	type Props = {
		address: GeonorgeAddress;
		isochronesShown: boolean;
		activeMode?: IsochroneModeId;
		isLoading?: boolean;
		property?: PropertyData;
		finnListing?: FinnListingInfo;
		transit?: TransitStop[];
		amenities?: Amenity[];
		scores?: Scores;
		overallScore?: number;
		onShowIsochrones: (mode: IsochroneModeId) => void;
	};

	let {
		address,
		isochronesShown,
		activeMode = 'walk',
		isLoading = false,
		property,
		finnListing,
		transit,
		amenities,
		scores,
		overallScore,
		onShowIsochrones
	}: Props = $props();

	const tabs = $derived([
		...(finnListing ? [{ id: 'finn', label: 'Finn.no' }] : []),
		{ id: 'eiendom', label: 'Eiendom' },
		{ id: 'kollektiv', label: 'Kollektivt' },
		{ id: 'nabolag', label: 'Nabolag' },
		{ id: 'score', label: 'Score' }
	]);

	let activeTab = $state('eiendom');
	let scrollEl = $state<HTMLDivElement | undefined>();
	const addressTitle = $derived(
		address.adressetekst ?? address.adressetekstutenadressetilleggsnavn ?? 'Valgt punkt på kartet'
	);
	const addressSubtitle = $derived(formatAddressSubtitle(address));
	const modeIcons = {
		walk: PersonSimpleWalk,
		transit: Bus,
		driving: Car,
		cycling: Bicycle,
		cyclingTransit: Bicycle
	} satisfies Record<IsochroneModeId, typeof PersonSimpleWalk>;

	$effect(() => {
		void address;
		activeTab = finnListing ? 'finn' : 'eiendom';
	});

	$effect(() => {
		void activeTab;
		if (scrollEl) scrollEl.scrollTop = 0;
	});

	function formatAddressSubtitle(address: GeonorgeAddress) {
		const place = [address.postnummer, address.poststed].filter(Boolean).join(' ');
		if (place || address.kommunenavn) {
			return [place, address.kommunenavn].filter(Boolean).join(' · ');
		}

		const point = address.representasjonspunkt;
		if (!point) {
			return '';
		}

		return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
	}
</script>

<div class="card" style="margin-top: 8px; overflow: hidden;">
	<!-- Address header -->
	<div class="address-header">
		<div style="display: flex; align-items: flex-start; gap: 10px;">
			<div style="flex: 1;">
				<div class="lbl">Valgt sted</div>
				<div class="address-main">{addressTitle}</div>
				{#if addressSubtitle}
					<div class="address-sub">{addressSubtitle}</div>
				{/if}
			</div>
			<ScoreCircle score={overallScore ?? null} size={50} />
		</div>
	</div>

	<!-- CTA -->
	<div class="walk-section" class:no-border={!isochronesShown}>
		<div class="mode-grid">
			{#each enabledIsochroneModes as mode (mode.id)}
				{@const Icon = modeIcons[mode.id]}
				<Button
					variant="secondary"
					class="mode-button gap-1.5 text-[12px] font-semibold {isochronesShown &&
					activeMode === mode.id
						? 'bg-primary text-primary-foreground hover:bg-primary/90'
						: ''}"
					disabled={isLoading}
					title={mode.label}
					aria-label={mode.label}
					onclick={() => onShowIsochrones(mode.id)}
					aria-pressed={isochronesShown && activeMode === mode.id}
				>
					{#if isLoading && activeMode === mode.id}
						<Spinner class="size-3.5" />
					{:else if mode.id === 'cyclingTransit'}
						<span class="combo-icons" aria-hidden="true">
							<Bicycle size={15} weight="bold" />
							<Bus size={15} weight="bold" />
						</span>
					{:else}
						<Icon size={16} weight="bold" />
					{/if}
					{mode.shortLabel}
				</Button>
			{/each}
		</div>
	</div>

	<!-- Dashboard tabs — only shown after isochrones are rendered -->
	{#if isochronesShown}
		<Tabs.Root bind:value={activeTab} class="flex flex-col">
			<div class="px-3 pt-2.5">
				<Tabs.List class="w-full">
					{#each tabs as tab (tab.id)}
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
				<Tabs.Content value="finn">
					<FinnSection listing={finnListing} />
				</Tabs.Content>
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
	.mode-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}
	:global(.mode-button) {
		min-width: 0;
		height: 36px;
	}
	.combo-icons {
		display: inline-flex;
		align-items: center;
		gap: 1px;
		flex-shrink: 0;
	}
</style>
