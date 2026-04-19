<script lang="ts">
	import { AddressLookup, MoveScoreMap, type GeonorgeAddress } from '$lib';

	const defaultAddress: GeonorgeAddress = {
		adressenavn: 'Slottsplassen',
		adressetekst: 'Slottsplassen 1',
		adressetilleggsnavn: null,
		adressekode: 21608,
		nummer: 1,
		bokstav: '',
		kommunenummer: '0301',
		kommunenavn: 'OSLO',
		gardsnummer: 209,
		bruksnummer: 25,
		festenummer: 0,
		undernummer: null,
		bruksenhetsnummer: [],
		objtype: 'Vegadresse',
		poststed: 'OSLO',
		postnummer: '0010',
		adressetekstutenadressetilleggsnavn: 'Slottsplassen 1',
		stedfestingverifisert: true,
		representasjonspunkt: {
			epsg: 'EPSG:4258',
			lat: 59.917063045432855,
			lon: 10.727724636631736
		},
		oppdateringsdato: '2020-06-15T18:07:07'
	};

	let selectedAddress = $state<GeonorgeAddress | undefined>(defaultAddress);
</script>

<svelte:head>
	<title>MOVE-SCORE // GANGAVSTAND-ANALYSE</title>
	<meta name="description" content="Søk etter norske adresser med gangavstandsanalyse." />
</svelte:head>

<div class="app-root">
	<header class="app-header">
		<div class="header-left">
			<span class="header-indicator">▶</span>
			<span class="header-title">MOVE-SCORE</span>
			<span class="header-sep">—</span>
			<span class="header-sub">GANGAVSTAND-ANALYSE</span>
			<span class="header-version">v1.0</span>
		</div>
		<div class="header-right">
			<span class="header-tag">[ GEONORGE ]</span>
			<span class="header-tag">[ MAPBOX ]</span>
			<span class="header-status">● AKTIV</span>
		</div>
	</header>

	<div class="app-body">
		<MoveScoreMap {selectedAddress} />

		<aside class="floating-sidebar">
			<div class="panel">
				<div class="panel-header">[ ADRESSEOPPSLAG ]</div>
				<div class="panel-body">
					<AddressLookup
						defaultQuery="Slottsplassen 1, 0010 OSLO (OSLO)"
						onSelect={(address) => (selectedAddress = address)}
					/>
				</div>
			</div>

			{#if selectedAddress?.representasjonspunkt}
				<div class="panel">
					<div class="panel-header">[ KOORDINATER ]</div>
					<div class="panel-body">
						<dl class="coord-grid">
							<div class="coord-row">
								<dt class="coord-key">LAT</dt>
								<dd class="coord-val coord-val--bright">
									{selectedAddress.representasjonspunkt.lat.toFixed(6)}
								</dd>
							</div>
							<div class="coord-row">
								<dt class="coord-key">LON</dt>
								<dd class="coord-val coord-val--bright">
									{selectedAddress.representasjonspunkt.lon.toFixed(6)}
								</dd>
							</div>
							<div class="coord-row">
								<dt class="coord-key">EPSG</dt>
								<dd class="coord-val">{selectedAddress.representasjonspunkt.epsg}</dd>
							</div>
							<div class="coord-row coord-row--last">
								<dt class="coord-key">KOM</dt>
								<dd class="coord-val">
									{selectedAddress.kommunenavn}
									{selectedAddress.kommunenummer}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			{/if}

			<div class="panel panel--dim sidebar-footer">
				<div class="panel-header panel-header--dim">[ SYSTEM ]</div>
				<div class="panel-body system-log">
					<div class="log-entry">▸ GEONORGE API: TILKOBLET</div>
					<div class="log-entry">▸ ISOKRON-MOTOR: MAPBOX</div>
					<div class="log-entry">▸ KARTLAG: OPENFREEMAP</div>
				</div>
			</div>
		</aside>
	</div>
</div>

<style>
	.app-root {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #090908;
		color: #ffb300;
		font-family: 'Share Tech Mono', 'Courier New', monospace;
		overflow: hidden;
	}

	.app-header {
		flex-shrink: 0;
		height: 36px;
		border-bottom: 1px solid rgba(255, 179, 0, 0.2);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		background: #0a0a07;
		z-index: 20;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.header-indicator {
		color: #ffcc00;
		font-size: 8px;
	}

	.header-title {
		font-size: 12px;
		color: #ffcc00;
		letter-spacing: 0.22em;
	}

	.header-sep {
		color: rgba(255, 179, 0, 0.2);
		font-size: 11px;
	}

	.header-sub {
		font-size: 11px;
		color: rgba(255, 179, 0, 0.65);
		letter-spacing: 0.15em;
	}

	.header-version {
		font-size: 9px;
		color: rgba(255, 179, 0, 0.3);
		letter-spacing: 0.1em;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 14px;
		font-size: 10px;
		letter-spacing: 0.12em;
	}

	.header-tag {
		color: rgba(255, 179, 0, 0.3);
	}

	.header-status {
		color: #44aa44;
		font-size: 10px;
		letter-spacing: 0.1em;
	}

	.app-body {
		flex: 1;
		min-height: 0;
		position: relative;
		overflow: hidden;
	}

	.floating-sidebar {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		width: 300px;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
		background: rgba(9, 9, 8, 0.88);
		border-right: 1px solid rgba(255, 179, 0, 0.15);
		overflow-y: auto;
		backdrop-filter: blur(6px);
	}

	.floating-sidebar::-webkit-scrollbar {
		width: 3px;
	}
	.floating-sidebar::-webkit-scrollbar-track {
		background: transparent;
	}
	.floating-sidebar::-webkit-scrollbar-thumb {
		background: rgba(255, 179, 0, 0.2);
	}

	.panel {
		border: 1px solid rgba(255, 179, 0, 0.35);
		flex-shrink: 0;
	}

	.panel--dim {
		border-color: rgba(255, 179, 0, 0.2);
	}

	.panel-header {
		padding: 5px 10px;
		border-bottom: 1px solid rgba(255, 179, 0, 0.25);
		font-size: 9px;
		letter-spacing: 0.22em;
		color: rgba(255, 179, 0, 0.75);
		background: rgba(255, 179, 0, 0.05);
	}

	.panel-header--dim {
		color: rgba(255, 179, 0, 0.5);
		border-bottom-color: rgba(255, 179, 0, 0.15);
	}

	.panel-body {
		padding: 10px;
	}

	.coord-grid {
		display: grid;
		gap: 0;
		font-size: 11px;
		margin: 0;
	}

	.coord-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 4px 0;
		border-bottom: 1px solid rgba(255, 179, 0, 0.06);
	}

	.coord-row--last {
		border-bottom: none;
	}

	.coord-key {
		color: rgba(255, 179, 0, 0.6);
		letter-spacing: 0.18em;
		font-size: 9px;
	}

	.coord-val {
		color: rgba(255, 179, 0, 0.9);
		letter-spacing: 0.04em;
		text-align: right;
		font-size: 11px;
	}

	.coord-val--bright {
		color: #ffcc00;
		font-size: 12px;
	}

	.sidebar-footer {
		margin-top: auto;
	}

	.system-log {
		display: grid;
		gap: 4px;
	}

	.log-entry {
		font-size: 9px;
		color: rgba(255, 179, 0, 0.55);
		letter-spacing: 0.08em;
		line-height: 1.7;
	}

	@media (max-width: 640px) {
		.floating-sidebar {
			width: 100%;
			bottom: auto;
			max-height: 50vh;
		}
		.header-sub,
		.header-version,
		.header-right {
			display: none;
		}
	}
</style>
