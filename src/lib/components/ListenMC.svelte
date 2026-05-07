<script lang="ts">
	import { cw } from '$lib/audio/cw';
	import type { Item } from '$lib/content/types';
	import { ITEMS } from '$lib/content/corpus';
	import { i18n } from '$lib/i18n/index.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	type Props = {
		item: Item;
		onResolve: (correct: boolean) => void;
	};
	let { item, onResolve }: Props = $props();
	const t = i18n.t;

	function pickDistractors(target: Item, n = 3): Item[] {
		const pool = ITEMS.filter((i) => i.tier === target.tier && i.id !== target.id);
		const a = [...pool];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a.slice(0, n);
	}

	let options = $state<Item[]>([]);
	let selected = $state<string | null>(null);
	let revealed = $state(false);

	$effect(() => {
		const _ = item.id;
		const distractors = pickDistractors(item);
		const all = [item, ...distractors];
		for (let i = all.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[all[i], all[j]] = [all[j], all[i]];
		}
		options = all;
		selected = null;
		revealed = false;
		const id = setTimeout(() => play(), 380);
		return () => clearTimeout(id);
	});

	async function play() {
		await cw.play(item.morse, settings.wpm);
	}

	function pick(opt: Item) {
		if (revealed) return;
		selected = opt.id;
		revealed = true;
		const correct = opt.id === item.id;
		setTimeout(() => onResolve(correct), correct ? 600 : 900);
	}
</script>

<div class="quiz">
	<div class="tag">{t('session.listenPrompt')}</div>
	<button type="button" onclick={play} class="play" aria-label={t('session.replay')}>▶</button>
	<div class="opts">
		{#each options as opt (opt.id)}
			{@const isCorrect = revealed && opt.id === item.id}
			{@const isWrong = revealed && selected === opt.id && opt.id !== item.id}
			<button
				type="button"
				onclick={() => pick(opt)}
				disabled={revealed}
				class="opt"
				class:correct={isCorrect}
				class:wrong={isWrong}
			>
				{opt.text}
			</button>
		{/each}
	</div>
	<div class="status">
		{#if revealed && selected === item.id}
			<span class="ok">✓ {t('session.correct')}</span>
		{:else if revealed}
			<span class="ko">✗ {item.text}</span>
		{/if}
	</div>
</div>

<style>
	.quiz {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		text-align: center;
	}
	.tag {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--color-text-muted);
		text-transform: uppercase;
	}
	.play {
		width: 6rem;
		height: 6rem;
		border-radius: 999px;
		background: var(--color-text);
		color: white;
		font-size: 1.6rem;
		display: grid;
		place-items: center;
		transition: transform 80ms;
	}
	.play:active {
		transform: scale(0.96);
	}
	.opts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
		width: 100%;
		max-width: 22rem;
	}
	.opt {
		background: var(--color-bg);
		border: 2px solid var(--color-border-strong);
		color: var(--color-text);
		font-weight: 600;
		font-size: 1.5rem;
		padding: 1.25rem 0;
		border-radius: 12px;
		transition: all 160ms;
	}
	.opt:active:not(:disabled) {
		transform: translateY(1px);
	}
	.opt.correct {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}
	.opt.wrong {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: white;
	}
	.status {
		min-height: 1.5rem;
		font-weight: 600;
	}
	.ok {
		color: var(--color-primary);
	}
	.ko {
		color: var(--color-danger);
	}
</style>
