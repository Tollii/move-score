<script lang="ts">
	type Props = { score: number | null; size?: number };
	let { score, size = 56 }: Props = $props();

	const sw = 4.5;
	const r = $derived((size - sw) / 2);
	const circ = $derived(2 * Math.PI * r);
	const dash = $derived(score !== null ? (score / 100) * circ : 0);
	const color = $derived(
		score === null ? '#D4D3CC' : score >= 85 ? '#3a7a52' : score >= 70 ? '#d4860a' : '#e05a2b'
	);
	const fontSize = $derived(size < 50 ? 11 : size < 40 ? 9 : 13);
</script>

<div
	style:width="{size}px"
	style:height="{size}px"
	style="position: relative; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;"
>
	<svg width={size} height={size} style="transform: rotate(-90deg); position: absolute;" aria-hidden="true">
		<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE9DC" stroke-width={sw} />
		{#if score !== null}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke={color}
				stroke-width={sw}
				stroke-dasharray="{dash} {circ}"
				stroke-linecap="round"
			/>
		{/if}
	</svg>
	<span style="font-size: {fontSize}px; font-weight: 700; color: #1A1A18; position: relative; z-index: 1; font-family: 'DM Sans', sans-serif;">
		{score !== null ? score : '—'}
	</span>
</div>
