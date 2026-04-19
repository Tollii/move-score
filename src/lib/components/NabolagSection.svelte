<script lang="ts">
	export type Amenity = {
		icon: string;
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
		{ icon: '🛒', label: 'Dagligvare' },
		{ icon: '🍽️', label: 'Kafé / Restaurant' },
		{ icon: '🏃', label: 'Treningssenter' },
		{ icon: '🌳', label: 'Park' },
		{ icon: '🏫', label: 'Barneskole' },
		{ icon: '🏥', label: 'Helse' }
	];
</script>

{#if amenities && amenities.length > 0}
	{#each sorted as amenity}
		<div class="amenity-row">
			<div class="amenity-icon">{amenity.icon}</div>
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
	<div class="na-notice">
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<circle cx="7" cy="7" r="6" stroke="#d4860a" stroke-width="1.4" />
			<path d="M7 4v4M7 9.5v.5" stroke="#d4860a" stroke-width="1.4" stroke-linecap="round" />
		</svg>
		Nabolagsdata ikke tilgjengelig ennå
	</div>

	{#each STUB_ITEMS as item}
		<div class="amenity-row">
			<div class="amenity-icon">{item.icon}</div>
			<div class="amenity-info">
				<div class="amenity-name" style="color: #a8a79e;">{item.label}</div>
				<div class="amenity-type">Kategori</div>
			</div>
			<div class="amenity-dist">
				<span class="na-badge">N/A</span>
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
	.na-notice {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 11.5px;
		color: #d4860a;
		font-weight: 500;
		background: #fff8e6;
		border: 1px solid #f5d98a;
		border-radius: 8px;
		padding: 8px 11px;
		margin-bottom: 4px;
	}
	.na-badge {
		display: inline-flex;
		align-items: center;
		background: #fff3b0;
		border: 1.5px solid #f5b800;
		color: #7a5c00;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.05em;
		padding: 2px 8px;
		border-radius: 99px;
		font-family: 'DM Sans', sans-serif;
	}
</style>
