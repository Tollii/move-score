<script lang="ts">
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { GeonorgeAddress } from '$lib/geonorge/address';
	import {
		personalPoiCategories,
		personalPoiCategoryLabel,
		type PersonalPoi,
		type PersonalPoiCategory
	} from '$lib/personal-pois';
	import AddressLookup from './AddressLookup.svelte';

	type Props = {
		pois: PersonalPoi[];
		isAuthenticated: boolean;
		isAuthLoading?: boolean;
		isLoading?: boolean;
		selectedAddress?: GeonorgeAddress;
	};

	const {
		pois,
		isAuthenticated,
		isAuthLoading = false,
		isLoading = false,
		selectedAddress
	}: Props = $props();
	const client = useConvexClient();

	let label = $state('');
	let category = $state<PersonalPoiCategory>('work');
	let address = $state<GeonorgeAddress | undefined>();
	let editingPoi = $state<PersonalPoi | undefined>();
	let error = $state<string | undefined>();
	let isSubmitting = $state(false);
	let deletingId = $state<string | undefined>();
	let formKey = $state(0);

	const canSubmit = $derived(
		Boolean(label.trim()) && Boolean(address?.representasjonspunkt) && !isSubmitting
	);

	function useSelectedAddress() {
		if (!selectedAddress?.representasjonspunkt) {
			return;
		}

		address = selectedAddress;
		if (!label.trim()) {
			label = formatAddress(selectedAddress);
		}
		formKey++;
	}

	function startEdit(poi: PersonalPoi) {
		editingPoi = poi;
		label = poi.label;
		category = poi.category;
		address = {
			adressetekst: poi.address ?? poi.label,
			adressetekstutenadressetilleggsnavn: poi.address ?? poi.label,
			representasjonspunkt: { lat: poi.lat, lon: poi.lon }
		};
		error = undefined;
		formKey++;
	}

	function resetForm() {
		editingPoi = undefined;
		label = '';
		category = 'work';
		address = undefined;
		error = undefined;
		formKey++;
	}

	async function handleSubmit() {
		const point = address?.representasjonspunkt;
		const selectedPoiAddress = address;
		if (!point || !selectedPoiAddress) {
			error = 'Velg en adresse for stedet.';
			return;
		}

		error = undefined;
		isSubmitting = true;

		try {
			const payload = {
				label: label.trim(),
				category,
				address: formatAddress(selectedPoiAddress),
				lat: point.lat,
				lon: point.lon
			};

			if (editingPoi) {
				await client.mutation(api.personalPois.update, { id: editingPoi.id, ...payload });
			} else {
				await client.mutation(api.personalPois.create, payload);
			}

			resetForm();
		} catch (err) {
			console.error('Could not save personal POI', err);
			error = friendlyPoiError(err, 'Stedet kunne ikke lagres akkurat nå.');
		} finally {
			isSubmitting = false;
		}
	}

	async function removePoi(poi: PersonalPoi) {
		error = undefined;
		deletingId = poi.id;

		try {
			await client.mutation(api.personalPois.remove, { id: poi.id });
			if (editingPoi?.id === poi.id) {
				resetForm();
			}
		} catch (err) {
			console.error('Could not delete personal POI', err);
			error = friendlyPoiError(err, 'Stedet kunne ikke slettes akkurat nå.');
		} finally {
			deletingId = undefined;
		}
	}

	function formatAddress(value: GeonorgeAddress) {
		const addressText = value.adressetekst ?? value.adressetekstutenadressetilleggsnavn;
		const place = [value.postnummer, value.poststed].filter(Boolean).join(' ');
		const municipality = value.kommunenavn ? `(${value.kommunenavn})` : '';

		return [addressText, place, municipality].filter(Boolean).join(', ');
	}

	function friendlyPoiError(err: unknown, fallback: string) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes('UNAUTHENTICATED')) {
			return 'Logg inn for å lagre personlige steder.';
		}
		if (message.includes('LABEL')) {
			return 'Gi stedet et navn mellom 1 og 80 tegn.';
		}
		return fallback;
	}
</script>

<div class="poi-card">
	<div class="poi-header">
		<div>
			<div class="lbl">Lagrede steder</div>
			<h2>Mine steder</h2>
		</div>
		{#if selectedAddress?.representasjonspunkt && isAuthenticated}
			<button type="button" class="ghost-button" onclick={useSelectedAddress}>Bruk valgt</button>
		{/if}
	</div>

	{#if isAuthLoading}
		<p class="muted-text">Laster profil.</p>
	{:else if !isAuthenticated}
		<p class="muted-text">Logg inn for å lagre skole, jobb, familie og andre egne steder.</p>
	{:else}
		<form
			class="poi-form"
			onsubmit={(event) => {
				event.preventDefault();
				void handleSubmit();
			}}
		>
			<div class="form-row">
				<label>
					<span>Navn</span>
					<input bind:value={label} maxlength="80" placeholder="Jobb, skole, mamma" required />
				</label>
				<label>
					<span>Type</span>
					<select
						value={category}
						onchange={(event) => (category = event.currentTarget.value as PersonalPoiCategory)}
					>
						{#each personalPoiCategories as option (option.id)}
							<option value={option.id}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="address-field">
				{#key formKey}
					<AddressLookup
						id="personal-poi-address-lookup"
						defaultQuery={address ? formatAddress(address) : ''}
						onSelect={(value) => (address = value)}
					/>
				{/key}
			</div>

			{#if error}
				<p class="form-error">{error}</p>
			{/if}

			<div class="form-actions">
				<button type="submit" class="primary-button" disabled={!canSubmit}>
					{isSubmitting ? 'Lagrer' : editingPoi ? 'Oppdater' : 'Legg til'}
				</button>
				{#if editingPoi}
					<button type="button" class="ghost-button" onclick={resetForm}>Avbryt</button>
				{/if}
			</div>
		</form>

		<div class="poi-list" aria-live="polite">
			{#if isLoading}
				<p class="muted-text">Laster steder.</p>
			{:else if pois.length === 0}
				<p class="muted-text">Ingen lagrede steder ennå.</p>
			{:else}
				{#each pois as poi (poi.id)}
					<div class="poi-row">
						<div class="poi-pin" data-category={poi.category}></div>
						<div class="poi-copy">
							<div class="poi-name">{poi.label}</div>
							<div class="poi-meta">
								{personalPoiCategoryLabel(poi.category)}
								{#if poi.address}
									<span aria-hidden="true">·</span>
									{poi.address}
								{/if}
							</div>
						</div>
						<div class="poi-actions">
							<button type="button" class="text-button" onclick={() => startEdit(poi)}>Endre</button
							>
							<button
								type="button"
								class="text-button danger"
								disabled={deletingId === poi.id}
								onclick={() => void removePoi(poi)}
							>
								{deletingId === poi.id ? 'Sletter' : 'Slett'}
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.poi-card {
		width: 316px;
		margin-top: 8px;
		padding: 14px;
		border: 1px solid rgba(0, 0, 0, 0.07);
		border-radius: 14px;
		background: #fffefc;
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.08),
			0 1px 3px rgba(0, 0, 0, 0.06);
		pointer-events: auto;
	}

	.poi-header,
	.form-row,
	.form-actions,
	.poi-row,
	.poi-actions {
		display: flex;
		align-items: center;
	}

	.poi-header {
		justify-content: space-between;
		gap: 10px;
	}

	h2 {
		margin: 0;
		color: #1a1a18;
		font-size: 15px;
		line-height: 1.2;
	}

	.lbl {
		margin-bottom: 3px;
		color: #a8a79e;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.poi-form {
		display: grid;
		gap: 9px;
		margin-top: 12px;
	}

	.form-row {
		align-items: flex-start;
		gap: 8px;
	}

	label {
		display: grid;
		flex: 1 1 0;
		gap: 5px;
		min-width: 0;
		color: #6e6d66;
		font-size: 11px;
		font-weight: 700;
	}

	input,
	select {
		width: 100%;
		min-height: 38px;
		border: 1.5px solid #e5e4de;
		border-radius: 9px;
		background: #fafaf6;
		padding: 0 10px;
		color: #1a1a18;
		font: inherit;
		font-size: 13px;
		font-weight: 500;
	}

	input:focus,
	select:focus {
		border-color: #f5b800;
		background: #fff;
		box-shadow: 0 0 0 3px rgba(245, 184, 0, 0.15);
		outline: none;
	}

	.poi-card :global(input[type='search']) {
		background: #fafaf6 !important;
		border: 1.5px solid #e5e4de !important;
		border-radius: 9px !important;
		color: #1a1a18 !important;
		box-shadow: none !important;
	}

	.poi-card :global(input[type='search']:focus) {
		border-color: #f5b800 !important;
		background: #fff !important;
		box-shadow: 0 0 0 3px rgba(245, 184, 0, 0.15) !important;
	}

	.poi-card :global(section > div:last-child) {
		border-color: #e5e4de !important;
		border-radius: 11px !important;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1) !important;
	}

	.form-actions {
		gap: 8px;
	}

	button {
		border: 0;
		border-radius: 9px;
		font-family: 'DM Sans', sans-serif;
		font-weight: 700;
		cursor: pointer;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.primary-button {
		min-height: 36px;
		background: #1a1a18;
		padding: 0 13px;
		color: #f5b800;
		font-size: 12px;
	}

	.ghost-button {
		min-height: 32px;
		background: #f5f4ee;
		padding: 0 10px;
		color: #1a1a18;
		font-size: 11.5px;
		white-space: nowrap;
	}

	.poi-list {
		display: grid;
		gap: 8px;
		margin-top: 12px;
	}

	.poi-row {
		align-items: flex-start;
		gap: 9px;
		padding: 9px 0 0;
		border-top: 1px solid #ecebe5;
	}

	.poi-pin {
		width: 12px;
		height: 12px;
		margin-top: 3px;
		border: 2px solid #fffefc;
		border-radius: 999px;
		background: #4f46e5;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.16);
		flex: 0 0 auto;
	}

	.poi-pin[data-category='work'] {
		background: #2563eb;
	}

	.poi-pin[data-category='school'] {
		background: #059669;
	}

	.poi-pin[data-category='family'] {
		background: #db2777;
	}

	.poi-pin[data-category='other'] {
		background: #7c3aed;
	}

	.poi-copy {
		min-width: 0;
		flex: 1 1 auto;
	}

	.poi-name {
		overflow: hidden;
		color: #1a1a18;
		font-size: 13px;
		font-weight: 700;
		line-height: 1.2;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.poi-meta {
		display: -webkit-box;
		overflow: hidden;
		margin-top: 2px;
		color: #8b8a82;
		font-size: 11px;
		line-clamp: 2;
		line-height: 1.35;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.poi-actions {
		gap: 5px;
		flex: 0 0 auto;
	}

	.text-button {
		background: transparent;
		padding: 2px 0;
		color: #54534e;
		font-size: 11px;
	}

	.text-button.danger {
		color: #b42318;
	}

	.muted-text,
	.form-error {
		margin: 10px 0 0;
		font-size: 12px;
		line-height: 1.45;
	}

	.muted-text {
		color: #8b8a82;
	}

	.form-error {
		border: 1px solid #f9a8a8;
		border-radius: 8px;
		background: #fff5f5;
		padding: 8px 10px;
		color: #c0392b;
	}

	@media (max-width: 640px) {
		.poi-card {
			width: 100%;
			max-width: none;
			border-radius: 12px;
		}
	}
</style>
