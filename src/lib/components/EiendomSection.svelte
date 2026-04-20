<script lang="ts">
	export type PropertyData = {
		type: string;
		size: number;
		rooms: number;
		floor: string;
		built: number;
		renovated?: number;
		askingPrice: number;
		pricePerSqm: number;
		fellesgjeld: number;
		felleskostnader: number;
		eierform: string;
		energimerke: string;
		finnKode: string;
	};

	type Props = { property?: PropertyData };
	let { property }: Props = $props();

	function fmt(n: number) {
		return n.toLocaleString('nb-NO');
	}
</script>

{#if property}
	<!-- Key metrics -->
	<div class="metrics-grid">
		{#each [{ val: `${property.size} m²`, label: 'Størrelse' }, { val: `${property.rooms} rom`, label: 'Antall rom' }, { val: property.floor, label: 'Etasje' }] as m}
			<div class="metric-cell">
				<div class="metric-val">{m.val}</div>
				<div class="metric-label">{m.label}</div>
			</div>
		{/each}
	</div>

	<!-- Price -->
	<div class="price-box">
		<div class="price-row">
			<div>
				<div class="price-label">Prisantydning</div>
				<div class="price-main">{fmt(property.askingPrice)} kr</div>
			</div>
			<div style="text-align: right;">
				<div class="price-label">Per m²</div>
				<div class="price-sqm">{fmt(property.pricePerSqm)} kr</div>
			</div>
		</div>
		{#if property.fellesgjeld > 0}
			<div class="price-debt">
				<span>+ Fellesgjeld {fmt(property.fellesgjeld)} kr</span>
				<span style="font-weight: 600;">Totalt {fmt(property.askingPrice + property.fellesgjeld)} kr</span>
			</div>
		{/if}
	</div>

	<!-- Details -->
	<div>
		{#each [{ k: 'Boligtype', v: property.type }, { k: 'Byggeår', v: `${property.built}${property.renovated ? ` (renovert ${property.renovated})` : ''}` }, { k: 'Eierform', v: property.eierform }, { k: 'Energimerke', v: property.energimerke }, { k: 'Felleskostnader', v: `${fmt(property.felleskostnader)} kr/mnd` }] as row}
			<div class="stat-row">
				<span class="stat-key">{row.k}</span>
				<span class="stat-val">{row.v}</span>
			</div>
		{/each}
	</div>

	<a
		href="https://www.finn.no/realestate/homes/ad.html?finnkode={property.finnKode}"
		target="_blank"
		rel="noopener noreferrer"
		class="finn-link"
	>
		<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
			<path d="M2 6.5C2 4 4 2 6.5 2S11 4 11 6.5 9 11 6.5 11 2 9 2 6.5z" stroke="#A8A79E" stroke-width="1.3" />
			<path d="M9.5 9.5L12 12" stroke="#A8A79E" stroke-width="1.3" stroke-linecap="round" />
		</svg>
		Se på Finn.no · {property.finnKode}
	</a>
{:else}
	<!-- N/A stub — waiting for property data -->
	<div class="na-notice">
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<circle cx="7" cy="7" r="6" stroke="#d4860a" stroke-width="1.4" />
			<path d="M7 4v4M7 9.5v.5" stroke="#d4860a" stroke-width="1.4" stroke-linecap="round" />
		</svg>
		Eiendomsdata ikke tilgjengelig ennå
	</div>

	<div class="metrics-grid">
		{#each ['Størrelse', 'Antall rom', 'Etasje'] as label}
			<div class="metric-cell">
				<span class="na-badge">N/A</span>
				<div class="metric-label">{label}</div>
			</div>
		{/each}
	</div>

	<div class="price-box price-box-na">
		<div class="price-row">
			<div>
				<div class="price-label">Prisantydning</div>
				<span class="na-badge">N/A</span>
			</div>
			<div style="text-align: right;">
				<div class="price-label">Per m²</div>
				<span class="na-badge">N/A</span>
			</div>
		</div>
	</div>

	<div>
		{#each ['Boligtype', 'Byggeår', 'Eierform', 'Energimerke', 'Felleskostnader'] as key}
			<div class="stat-row">
				<span class="stat-key">{key}</span>
				<span class="na-badge">N/A</span>
			</div>
		{/each}
	</div>

	<button class="finn-link" disabled style="cursor: default; opacity: 0.45;">
		<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
			<path d="M2 6.5C2 4 4 2 6.5 2S11 4 11 6.5 9 11 6.5 11 2 9 2 6.5z" stroke="#A8A79E" stroke-width="1.3" />
			<path d="M9.5 9.5L12 12" stroke="#A8A79E" stroke-width="1.3" stroke-linecap="round" />
		</svg>
		Finn.no-kobling kommer
	</button>
{/if}

<style>
	.metrics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 6px;
		margin-bottom: 13px;
	}
	.metric-cell {
		background: #f5f4ee;
		border-radius: 8px;
		padding: 9px 10px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
	}
	.metric-val {
		font-size: 14px;
		font-weight: 700;
		color: #1a1a18;
		letter-spacing: -0.02em;
	}
	.metric-label {
		font-size: 10px;
		color: #a8a79e;
	}
	.price-box {
		background: #fff8d6;
		border: 1px solid #f5e280;
		border-radius: 9px;
		padding: 11px 13px;
		margin-bottom: 11px;
	}
	.price-box-na {
		background: #fafaf6;
		border-color: #e5e4de;
	}
	.price-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.price-label {
		font-size: 10px;
		color: #8a6800;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		margin-bottom: 3px;
	}
	.price-box-na .price-label {
		color: #a8a79e;
	}
	.price-main {
		font-size: 20px;
		font-weight: 700;
		color: #1a1a18;
		letter-spacing: -0.03em;
	}
	.price-sqm {
		font-size: 13px;
		font-weight: 600;
		color: #1a1a18;
	}
	.price-debt {
		margin-top: 7px;
		padding-top: 7px;
		border-top: 1px solid #f0e060;
		display: flex;
		justify-content: space-between;
		font-size: 11.5px;
		color: #8a6800;
	}
	.stat-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
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
		cursor: pointer;
		transition: background 0.12s;
	}
	.finn-link:hover {
		background: #f0efe9;
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
		margin-bottom: 13px;
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
