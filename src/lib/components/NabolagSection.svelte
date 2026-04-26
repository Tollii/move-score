<script lang="ts">
	import ShoppingCart from 'phosphor-svelte/lib/ShoppingCart';
	import ForkKnife from 'phosphor-svelte/lib/ForkKnife';
	import Barbell from 'phosphor-svelte/lib/Barbell';
	import TreeIcon from 'phosphor-svelte/lib/Tree';
	import GraduationCap from 'phosphor-svelte/lib/GraduationCap';
	import FirstAidKit from 'phosphor-svelte/lib/FirstAidKit';
	import Warning from 'phosphor-svelte/lib/Warning';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';

	export type Amenity = {
		iconKey: string;
		name: string;
		type: string;
		distance: number;
	};

	type Props = { amenities?: Amenity[] };
	let { amenities }: Props = $props();

	const TYPE_ORDER = [
		'Dagligvare',
		'Kafé',
		'Restaurant',
		'Treningssenter',
		'Park',
		'Barneskole',
		'Helse',
		'Bibliotek',
		'Kultur'
	];

	const sorted = $derived(
		amenities
			? [...amenities].sort((a, b) => {
					const ai = TYPE_ORDER.indexOf(a.type);
					const bi = TYPE_ORDER.indexOf(b.type);
					return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
				})
			: []
	);

	const STUB_ITEMS = [
		{ iconKey: 'grocery', label: 'Dagligvare' },
		{ iconKey: 'food', label: 'Kafé / Restaurant' },
		{ iconKey: 'gym', label: 'Treningssenter' },
		{ iconKey: 'park', label: 'Park' },
		{ iconKey: 'school', label: 'Barneskole' },
		{ iconKey: 'health', label: 'Helse' }
	];
</script>

{#if amenities && amenities.length > 0}
	{#each sorted as amenity (`${amenity.type}:${amenity.name}`)}
		<div class="amenity-row">
			<div class="amenity-icon">
				{#if amenity.iconKey === 'grocery'}
					<ShoppingCart size={18} />
				{:else if amenity.iconKey === 'food'}
					<ForkKnife size={18} />
				{:else if amenity.iconKey === 'gym'}
					<Barbell size={18} />
				{:else if amenity.iconKey === 'park'}
					<TreeIcon size={18} />
				{:else if amenity.iconKey === 'school'}
					<GraduationCap size={18} />
				{:else if amenity.iconKey === 'health'}
					<FirstAidKit size={18} />
				{:else}
					<ShoppingCart size={18} />
				{/if}
			</div>
			<div class="amenity-info">
				<div class="amenity-name">{amenity.name}</div>
				<div class="amenity-type">{amenity.type}</div>
			</div>
			<div class="amenity-dist">
				<span class="dist-val">
					{amenity.distance < 1000
						? `${amenity.distance} m`
						: `${(amenity.distance / 1000).toFixed(1)} km`}
				</span>
				<div class="dist-walk">{Math.round(amenity.distance / 80)} min gange</div>
			</div>
		</div>
	{/each}
{:else}
	<!-- N/A stub — waiting for amenity data -->
	<Alert.Root variant="warning" class="mb-1 text-[11.5px]">
		<Warning size={14} />
		<Alert.Description>Nabolagsdata ikke tilgjengelig ennå</Alert.Description>
	</Alert.Root>

	{#each STUB_ITEMS as item (item.iconKey)}
		<div class="amenity-row">
			<div class="amenity-icon">
				{#if item.iconKey === 'grocery'}
					<ShoppingCart size={18} />
				{:else if item.iconKey === 'food'}
					<ForkKnife size={18} />
				{:else if item.iconKey === 'gym'}
					<Barbell size={18} />
				{:else if item.iconKey === 'park'}
					<TreeIcon size={18} />
				{:else if item.iconKey === 'school'}
					<GraduationCap size={18} />
				{:else if item.iconKey === 'health'}
					<FirstAidKit size={18} />
				{/if}
			</div>
			<div class="amenity-info">
				<div class="amenity-name" style="color: #a8a79e;">{item.label}</div>
				<div class="amenity-type">Kategori</div>
			</div>
			<div class="amenity-dist">
				<Badge variant="warning" class="text-[10px]">N/A</Badge>
			</div>
		</div>
	{/each}
{/if}

<style>
	.amenity-row {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 8px 0;
		border-bottom: 1px solid #f0efe9;
	}
	.amenity-row:last-child {
		border-bottom: none;
	}
	.amenity-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: #f5f4ee;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		flex-shrink: 0;
	}
	.amenity-info {
		flex: 1;
		min-width: 0;
	}
	.amenity-name {
		font-size: 12.5px;
		font-weight: 600;
		color: #1a1a18;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.amenity-type {
		font-size: 10.5px;
		color: #a8a79e;
		margin-top: 1px;
	}
	.amenity-dist {
		text-align: right;
		flex-shrink: 0;
	}
	.dist-val {
		font-size: 12px;
		font-weight: 600;
		color: #1a1a18;
	}
	.dist-walk {
		font-size: 10px;
		color: #a8a79e;
		margin-top: 1px;
	}
</style>
