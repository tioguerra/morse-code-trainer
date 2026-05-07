<script lang="ts">
	import TelegraphKey from '$lib/components/TelegraphKey.svelte';
	import MorseTree from '$lib/components/MorseTree.svelte';
	import { KeyState } from '$lib/morse/key.svelte';
	import { cw } from '$lib/audio/cw';
	import type { Item } from '$lib/content/types';
	import { i18n } from '$lib/i18n/index.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	type Props = {
		item: Item;
		onResolve: (correct: boolean) => void;
	};
	let { item, onResolve }: Props = $props();
	const t = i18n.t;

	let target = $derived(item.text.toUpperCase());
	let resolved = $state(false);
	let mistake = $state(false);

	const key = new KeyState({
		onLetter: (letter) => {
			if (resolved) return;
			const tapeNoSpace = key.tape.replace(/\s/g, '');
			const idx = tapeNoSpace.length - 1;
			const expected = target[idx];
			if (letter !== expected) {
				mistake = true;
				resolved = true;
				setTimeout(() => onResolve(false), 1100);
				return;
			}
			if (tapeNoSpace === target) {
				resolved = true;
				setTimeout(() => onResolve(true), 600);
			}
		},
		onError: () => {
			if (resolved) return;
			mistake = true;
			resolved = true;
			setTimeout(() => onResolve(false), 1100);
		}
	});

	$effect(() => {
		const _ = item.id;
		key.clear();
		resolved = false;
		mistake = false;
	});

	async function preview() {
		await cw.play(item.morse, settings.wpm);
	}

	const tapeClean = $derived((key.tape ?? '').replace(/\s/g, ''));
	const done = $derived(tapeClean);
	const remaining = $derived(target.slice(tapeClean.length));
	const liveBuffer = $derived(
		(key.current ?? '').replaceAll('-', '—').replaceAll('.', '·') || ' '
	);
</script>

<div class="wrap">
	<div class="tag">{t('session.produceKey')}</div>

	<div class="prompt">
		<span class="done">{done}</span><span class="rest">{remaining}</span>
	</div>

	<div class="buffer">{liveBuffer}</div>

	<div class="tree-wrap">
		<MorseTree currentPath={key.current} playOnTap={false} />
	</div>

	<TelegraphKey state={key} />

	<button type="button" onclick={preview} class="btn btn-ghost">▶ {t('session.replay')}</button>

	<div class="status">
		{#if resolved && !mistake}
			<span class="ok">✓ {t('session.correct')}</span>
		{:else if resolved && mistake}
			<span class="ko">✗ {item.text}</span>
		{/if}
	</div>
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
	}
	.tag {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--color-text-muted);
		text-transform: uppercase;
	}
	.prompt {
		font-weight: 700;
		font-size: 2.25rem;
		letter-spacing: 0.3em;
		padding: 0.75rem 1.25rem;
		border: 2px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-bg);
	}
	.done {
		color: var(--color-primary);
	}
	.rest {
		color: var(--color-text-disabled);
	}
	.buffer {
		min-width: 6ch;
		font-weight: 600;
		font-size: 1.5rem;
		color: var(--color-text);
		padding: 0.4rem 1rem;
	}
	.tree-wrap {
		width: 100%;
		max-width: 26rem;
		height: clamp(9rem, 24vh, 14rem);
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
