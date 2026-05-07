<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import MorseTree from '$lib/components/MorseTree.svelte';
	import TelegraphKey from '$lib/components/TelegraphKey.svelte';
	import { KeyState } from '$lib/morse/key.svelte';
	import { user } from '$lib/stores/user.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import LangPicker from '$lib/components/LangPicker.svelte';
	import { ITEMS_BY_ID } from '$lib/content/corpus';
	import { MASTERED_LEVEL } from '$lib/srs/engine';

	const t = i18n.t;
	let ready = $state(false);

	onMount(async () => {
		await user.hydrate();
		settings.hydrate();
		if (!user.stats.onboarded) {
			goto(`${base}/welcome`);
			return;
		}
		ready = true;
	});

	// Forming words is hard for beginners — the natural ~1s Morse word gap
	// is too short. Hold for 3.5s to insert a space.
	const key = new KeyState({}, { minWordGapMs: 3500 });

	function deleteLast() {
		key.backspace();
	}

	const masteredPaths = $derived.by(() => {
		const set = new Set<string>();
		for (const p of user.progress.values()) {
			if (p.level < MASTERED_LEVEL) continue;
			const item = ITEMS_BY_ID[p.itemId];
			if (item?.tier === 'CHAR') set.add(item.morse);
		}
		return set;
	});

	const liveBuffer = $derived(
		(key.current ?? '').replaceAll('-', '—').replaceAll('.', '·')
	);

	const tapeText = $derived(key.tape ?? '');
	const showHint = $derived(!tapeText && !liveBuffer);
</script>

{#if ready}
	<main class="page">
		<header class="head">
			<span class="brand">{t('app.name')}</span>
			<LangPicker />
		</header>

		<div class="tree-wrap">
			<MorseTree currentPath={key.current} {masteredPaths} playOnTap={true} />
		</div>

		<button
			type="button"
			class="tape"
			class:empty={showHint}
			onclick={deleteLast}
			aria-label={t('home.deleteLast')}
		>
			{#if showHint}
				<span class="tape-hint">{t('home.tapeHint')}</span>
			{:else}
				<span class="tape-text">{tapeText}</span>
				{#if liveBuffer}
					<span class="tape-buffer">{liveBuffer}</span>
				{/if}
			{/if}
		</button>

		<div class="key-wrap">
			<TelegraphKey state={key} />
		</div>

		<a href="{base}/session" class="btn btn-primary cta">{t('home.train')}</a>

		<nav class="nav">
			<a href="{base}/welcome">{t('home.tutorial')}</a>
			<a href="{base}/settings">{t('home.settings')}</a>
		</nav>
	</main>
{/if}

<style>
	.page {
		gap: 0.75rem;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.tree-wrap {
		flex: 1;
		min-height: 14rem;
		display: flex;
		justify-content: center;
		padding: 0.25rem 0;
	}

	.tape {
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: 12px;
		padding: 0.85rem 1rem;
		text-align: center;
		font-weight: 600;
		font-size: 1.35rem;
		letter-spacing: 0.1em;
		min-height: 3.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		overflow-x: auto;
		white-space: nowrap;
		font-family: inherit;
		color: var(--color-text);
		transition: background 120ms;
	}
	.tape:active:not(.empty) {
		background: var(--color-surface-2);
	}
	.tape-text {
		color: var(--color-text);
	}
	.tape-buffer {
		color: var(--color-success);
		font-size: 1.15rem;
	}
	.tape-hint {
		color: var(--color-text-disabled);
		font-weight: 500;
		font-size: 0.9rem;
		letter-spacing: normal;
	}

	.key-wrap {
		display: flex;
		justify-content: center;
	}

	.cta {
		align-self: center;
		min-width: 14rem;
		text-decoration: none;
	}

	.nav {
		display: flex;
		justify-content: center;
		gap: 1.75rem;
	}
	.nav a {
		font-weight: 500;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}
	.nav a:active {
		color: var(--color-text);
	}
</style>
