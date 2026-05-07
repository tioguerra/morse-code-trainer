<script lang="ts">
	import { i18n, LOCALES, type Locale } from '$lib/i18n/index.svelte';

	function pick(loc: Locale) {
		i18n.set(loc);
	}
</script>

<div class="picker">
	{#each LOCALES as loc (loc.code)}
		<button
			type="button"
			onclick={() => pick(loc.code)}
			class="opt"
			class:active={i18n.locale === loc.code}
		>
			{loc.code.toUpperCase()}
		</button>
	{/each}
</div>

<style>
	.picker {
		display: inline-flex;
		gap: 4px;
		padding: 3px;
		border: 2px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-bg);
	}
	.opt {
		font-weight: 600;
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		color: var(--color-text-muted);
		transition: all 120ms;
	}
	.opt.active {
		background: var(--color-text);
		color: var(--color-bg);
	}
</style>
