<script lang="ts">
	import FinnSection from './FinnSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import PersonSimpleWalk from 'phosphor-svelte/lib/PersonSimpleWalk';
	import Bus from 'phosphor-svelte/lib/Bus';
	import Car from 'phosphor-svelte/lib/Car';
	import Bicycle from 'phosphor-svelte/lib/Bicycle';
	import type { GeonorgeAddress } from '$lib/geonorge/address';
	import type { FinnListingInfo } from '$lib/finn/address';
	import { enabledIsochroneModes, type IsochroneModeId } from '$lib/isochrones/modes';

	type Props = {
		address: GeonorgeAddress;
		isochronesShown: boolean;
		activeMode?: IsochroneModeId;
		isLoading?: boolean;
		finnListing?: FinnListingInfo;
		onShowIsochrones: (mode: IsochroneModeId) => void;
	};

	let {
		address,
		isochronesShown,
		activeMode = 'walk',
		isLoading = false,
		finnListing,
		onShowIsochrones
	}: Props = $props();

	const addressTitle = $derived(
		address.adressetekst ?? address.adressetekstutenadressetilleggsnavn ?? 'Valgt punkt på kartet'
	);
	const addressSubtitle = $derived(formatAddressSubtitle(address));
	const modeIcons = {
		walk: PersonSimpleWalk,
		transit: Bus,
		driving: Car,
		cycling: Bicycle
	} satisfies Record<IsochroneModeId, typeof PersonSimpleWalk>;

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
		<div class="lbl">Valgt sted</div>
		<div class="address-main">{addressTitle}</div>
		{#if addressSubtitle}
			<div class="address-sub">{addressSubtitle}</div>
		{/if}
	</div>

	<!-- Mode buttons -->
	<div class="walk-section" class:no-border={!finnListing}>
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
					{:else}
						<Icon size={16} weight="bold" />
					{/if}
					{mode.shortLabel}
				</Button>
			{/each}
		</div>
	</div>

	<!-- Finn.no listing details -->
	{#if finnListing}
		<div class="finn-section">
			<FinnSection listing={finnListing} />
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
	.mode-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}
	:global(.mode-button) {
		min-width: 0;
		height: 36px;
	}
	.finn-section {
		padding: 14px 16px 16px;
	}
</style>
