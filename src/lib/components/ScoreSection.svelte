<script lang="ts">
	import ScoreCircle from './ScoreCircle.svelte';
	import PersonSimpleWalk from 'phosphor-svelte/lib/PersonSimpleWalk';
	import Bus from 'phosphor-svelte/lib/Bus';
	import Storefront from 'phosphor-svelte/lib/Storefront';
	import SpeakerSlash from 'phosphor-svelte/lib/SpeakerSlash';
	import GraduationCap from 'phosphor-svelte/lib/GraduationCap';
	import Warning from 'phosphor-svelte/lib/Warning';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';

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
		{ key: 'gange' as const, label: 'Gangavstand', iconKey: 'walk' },
		{ key: 'kollektiv' as const, label: 'Kollektivtilbud', iconKey: 'bus' },
		{ key: 'fasiliteter' as const, label: 'Fasiliteter', iconKey: 'store' },
		{ key: 'støy' as const, label: 'Støynivå', iconKey: 'noise' },
		{ key: 'skole' as const, label: 'Skoletilbud', iconKey: 'school' }
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
			<Badge variant="warning" class="text-[13px] px-3 py-1">N/A</Badge>
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
					<span class="score-icon">
						{#if item.iconKey === 'walk'}
							<PersonSimpleWalk size={16} />
						{:else if item.iconKey === 'bus'}
							<Bus size={16} />
						{:else if item.iconKey === 'store'}
							<Storefront size={16} />
						{:else if item.iconKey === 'noise'}
							<SpeakerSlash size={16} />
						{:else if item.iconKey === 'school'}
							<GraduationCap size={16} />
						{/if}
					</span>
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
	<Alert.Root variant="warning" class="mb-2.5 text-[11.5px]">
		<Warning size={14} />
		<Alert.Description>Scoreberegning ikke implementert ennå</Alert.Description>
	</Alert.Root>

	{#each SCORE_ITEMS as item}
		<div class="score-item">
			<div class="score-header">
				<div class="score-name">
					<span class="score-icon">
						{#if item.iconKey === 'walk'}
							<PersonSimpleWalk size={16} />
						{:else if item.iconKey === 'bus'}
							<Bus size={16} />
						{:else if item.iconKey === 'store'}
							<Storefront size={16} />
						{:else if item.iconKey === 'noise'}
							<SpeakerSlash size={16} />
						{:else if item.iconKey === 'school'}
							<GraduationCap size={16} />
						{/if}
					</span>
					<span>{item.label}</span>
				</div>
				<Badge variant="warning" class="text-[10px]">N/A</Badge>
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

</style>
