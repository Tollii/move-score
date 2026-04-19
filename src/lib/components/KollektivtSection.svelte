<script lang="ts">
	export type TransitLine = { num: string; color: string };
	export type TransitStop = {
		name: string;
		type: 'metro' | 'tram' | 'bus' | 'train';
		lines: TransitLine[];
		distance: number;
		walk: number;
		freq: string;
	};

	type Props = { transit?: TransitStop[] };
	let { transit }: Props = $props();

	const typeColors: Record<string, string> = {
		metro: '#8e44ad',
		tram: '#c0392b',
		bus: '#2980b9',
		train: '#27ae60'
	};
	const typeLabel: Record<string, string> = {
		metro: 'T-bane',
		tram: 'Trikk',
		bus: 'Buss',
		train: 'Tog'
	};
	const typeEmoji: Record<string, string> = {
		metro: 'Ⓜ',
		tram: '🚋',
		bus: '🚌',
		train: '🚆'
	};

	const STUB_STOPS = ['Nærmeste stoppested', 'Kollektivknutepunkt', 'Busstopp i nærheten'];
</script>

{#if transit && transit.length > 0}
	{#each transit as stop}
		<div class="transit-row">
			<div
				class="type-icon"
				style:background="{typeColors[stop.type]}18"
				style:border="1px solid {typeColors[stop.type]}30"
			>
				{typeEmoji[stop.type]}
			</div>
			<div class="stop-info">
				<div class="stop-header">
					<span class="stop-name">{stop.name}</span>
					<span class="stop-type">{typeLabel[stop.type]}</span>
				</div>
				<div class="lines">
					{#each stop.lines.slice(0, 6) as line}
						<span
							class="line-badge"
							style:background="{line.color}22"
							style:color={line.color}
							style:border="1px solid {line.color}40"
						>{line.num}</span>
					{/each}
					{#if stop.lines.length > 6}
						<span class="lines-overflow">+{stop.lines.length - 6}</span>
					{/if}
				</div>
			</div>
			<div class="stop-dist">
				<div class="walk-time">
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
						<circle cx="6" cy="2" r="1.2" fill="#A8A79E" />
						<path d="M6 3.5L4.5 7l1.5 3M6 3.5L7.5 7 6 10M4.5 5.5h3" stroke="#A8A79E" stroke-width="1.2" stroke-linecap="round" />
					</svg>
					<span>{stop.walk} min</span>
				</div>
				<div class="stop-freq">Avg {stop.freq}</div>
			</div>
		</div>
	{/each}
{:else}
	<!-- N/A stub — waiting for transit data -->
	<div class="na-notice">
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<circle cx="7" cy="7" r="6" stroke="#d4860a" stroke-width="1.4" />
			<path d="M7 4v4M7 9.5v.5" stroke="#d4860a" stroke-width="1.4" stroke-linecap="round" />
		</svg>
		Kollektivdata ikke tilgjengelig ennå
	</div>

	{#each STUB_STOPS as label, i}
		<div class="transit-row">
			<div class="type-icon" style:background="#f5f4ee" style:border="1px solid #e5e4de">
				{['Ⓜ', '🚋', '🚌'][i]}
			</div>
			<div class="stop-info">
				<div class="stop-header">
					<span class="stop-name" style="color: #a8a79e;">{label}</span>
				</div>
				<div class="lines">
					<span class="na-badge">N/A</span>
				</div>
			</div>
			<div class="stop-dist">
				<span class="na-badge">N/A</span>
			</div>
		</div>
	{/each}
{/if}

<style>
	.transit-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 0;
		border-bottom: 1px solid #f0efe9;
	}
	.transit-row:last-child {
		border-bottom: none;
	}
	.type-icon {
		width: 36px;
		height: 36px;
		border-radius: 9px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 15px;
	}
	.stop-info {
		flex: 1;
		min-width: 0;
	}
	.stop-header {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 3px;
	}
	.stop-name {
		font-size: 12.5px;
		font-weight: 600;
		color: #1a1a18;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.stop-type {
		font-size: 10px;
		color: #a8a79e;
		font-weight: 500;
		flex-shrink: 0;
	}
	.lines {
		display: flex;
		gap: 3px;
		flex-wrap: wrap;
		align-items: center;
	}
	.line-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 18px;
		padding: 0 5px;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.02em;
	}
	.lines-overflow {
		font-size: 10px;
		color: #a8a79e;
	}
	.stop-dist {
		text-align: right;
		flex-shrink: 0;
	}
	.walk-time {
		display: flex;
		align-items: center;
		gap: 3px;
		justify-content: flex-end;
		font-size: 12px;
		font-weight: 600;
		color: #1a1a18;
	}
	.stop-freq {
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
