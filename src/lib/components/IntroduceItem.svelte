<script lang="ts">
	import MorseTree from '$lib/components/MorseTree.svelte';
	import { cw } from '$lib/audio/cw';
	import { settings } from '$lib/stores/settings.svelte';
	import { i18n, type Locale } from '$lib/i18n/index.svelte';
	import type { Item } from '$lib/content/types';

	type Props = {
		item: Item;
		purpose: 'first-time' | 'remedial-intro';
		onContinue: () => void;
	};
	let { item, purpose, onContinue }: Props = $props();

	const t = i18n.t;

	async function play() {
		await cw.play(item.morse, settings.wpm);
	}

	$effect(() => {
		const _ = item.id;
		const id = setTimeout(() => play(), 380);
		return () => clearTimeout(id);
	});

	const morseDisplay = $derived(
		item.morse
			.split('')
			.map((c) => (c === '.' ? '·' : c === '-' ? '—' : c))
			.join(' ')
	);

	const meaning = $derived(item.meaning?.[i18n.locale as Locale]);
	const tag = $derived(
		purpose === 'remedial-intro' ? t('session.tagReview') : t('session.tagNew')
	);
	const isRemedial = $derived(purpose === 'remedial-intro');
</script>

<div class="intro">
	<div class="tag" class:remedial={isRemedial}>{tag}</div>
	<div class="big-letter">{item.text}</div>
	<div class="big-morse">{morseDisplay}</div>
	{#if item.tier === 'CHAR'}
		<div class="tree-wrap">
			<MorseTree currentPath={item.morse} playOnTap={false} />
		</div>
	{/if}
	{#if meaning}
		<div class="meaning">{meaning}</div>
	{/if}
	<div class="row">
		<button type="button" onclick={play} class="btn btn-ghost" aria-label={t('session.replay')}>▶</button>
		<button type="button" onclick={onContinue} class="btn btn-primary">OK</button>
	</div>
</div>

<style>
	.intro {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		text-align: center;
	}
	.tag {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--color-success);
		text-transform: uppercase;
	}
	.tag.remedial {
		color: var(--color-warn);
	}
	.big-letter {
		font-weight: 700;
		font-size: clamp(4rem, 22vw, 6.5rem);
		line-height: 1;
		color: var(--color-text);
	}
	.big-morse {
		font-weight: 600;
		font-size: 2rem;
		letter-spacing: 0.4em;
		color: var(--color-success);
	}
	.tree-wrap {
		width: 100%;
		max-width: 26rem;
		height: clamp(11rem, 32vh, 16rem);
	}
	.meaning {
		font-size: 0.95rem;
		color: var(--color-text-muted);
		max-width: 24rem;
	}
	.row {
		display: flex;
		gap: 0.65rem;
	}
</style>
