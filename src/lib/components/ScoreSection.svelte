<script lang="ts">
	import ScoreCircle from './ScoreCircle.svelte';

	export type Scores = {
		gange: number;
		kollektiv: number;
		fasiliteter: number;
		støy: number;
		skole: number;
	};

	type Props = { scores?: Scores; overall?: number };
	let { scores, overall }: Props = $props();

	const SCORE_ITEMS = [
		{ key: 'gange' as const, label: 'Gangavstand', icon: '🚶' },
		{ key: 'kollektiv' as const, label: 'Kollektivtilbud', icon: '🚌' },
		{ key: 'fasiliteter' as const, label: 'Fasiliteter', icon: '🏪' },
		{ key: 'støy' as const, label: 'Støynivå', icon: '🔇' },
		{ key: 'skole' as const, label: 'Skoletilbud', icon: '🏫' }
	];

	function scoreColor(s: number) {
		return s >= 85 ? '#3a7a52' : s >= 70 ? '#d4860a' : '#e05a2b';
	}

	function scoreLabel(s: number) {
		return s >= 90 ? 'Utmerket' : s >= 80 ? 'Veldig bra' : s >= 70 ? 'Bra' : s >= 60 ? 'Middels' : 'Lavt';
	}
</script>

<!-- Overall score -->
<div class="overall-box">
	<ScoreCircle score={overall ?? null} size={60} />
	<div>
		<div class="overall-label">Move Score</div>
		{#if overall !== undefined}
			<div class="overall-value">{scoreLabel(overall)}</div>
		{:else}
			<span class="na-badge" style="font-size: 13px; padding: 4px 12px;">N/A</span>
		{/if}
		<div class="overall-sub">Basert på {SCORE_ITEMS.length} faktorer</div>
	</div>
</div>

<!-- Sub-scores -->
{#if scores}
	{#each SCORE_ITEMS as item}
		{@const s = scores[item.key]}
		<div class="score-item">
			<div class="score-header">
				<div class="score-name">
					<span class="score-icon">{item.icon}</span>
					<span>{item.label}</span>
				</div>
				<span class="score-num" style:color={scoreColor(s)}>{s}</span>
			</div>
			<div class="bar-track">
				<div class="bar-fill" style:width="{s}%" style:background={scoreColor(s)}></div>
			</div>
		</div>
	{/each}
{:else}
	<!-- N/A stub — score calculation not yet implemented -->
	<div class="na-notice">
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<circle cx="7" cy="7" r="6" stroke="#d4860a" stroke-width="1.4" />
			<path d="M7 4v4M7 9.5v.5" stroke="#d4860a" stroke-width="1.4" stroke-linecap="round" />
		</svg>
		Scoreberegning ikke implementert ennå
	</div>

	{#each SCORE_ITEMS as item}
		<div class="score-item">
			<div class="score-header">
				<div class="score-name">
					<span class="score-icon">{item.icon}</span>
					<span>{item.label}</span>
				</div>
				<span class="na-badge">N/A</span>
			</div>
			<div class="bar-track">
				<div class="bar-fill bar-fill-na"></div>
			</div>
		</div>
	{/each}
{/if}

<div class="footnote">
	Score basert på gangavstand til fasiliteter, kollektivtilbud, støykart fra Miljødirektoratet, og
	skoletilbud fra Utdanningsdirektoratet. Mer data kommer.
</div>

<style>
	.overall-box {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 14px;
		background: #f5f4ee;
		border-radius: 10px;
		margin-bottom: 14px;
	}
	.overall-label {
		font-size: 11px;
		font-weight: 600;
		color: #a8a79e;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		margin-bottom: 2px;
	}
	.overall-value {
		font-size: 18px;
		font-weight: 700;
		color: #1a1a18;
		letter-spacing: -0.02em;
	}
	.overall-sub {
		font-size: 11.5px;
		color: #a8a79e;
		margin-top: 2px;
	}
	.score-item {
		margin-bottom: 10px;
	}
	.score-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 5px;
	}
	.score-name {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12.5px;
		color: #1a1a18;
	}
	.score-icon {
		font-size: 14px;
	}
	.score-num {
		font-size: 12.5px;
		font-weight: 700;
	}
	.bar-track {
		flex: 1;
		height: 6px;
		background: #f0efe9;
		border-radius: 99px;
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 0.6s ease;
	}
	.bar-fill-na {
		width: 0;
		background: #e5e4de;
	}
	.footnote {
		margin-top: 14px;
		padding: 10px 12px;
		background: #f5f4ee;
		border-radius: 9px;
		font-size: 11px;
		color: #a8a79e;
		line-height: 1.55;
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
		margin-bottom: 10px;
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
