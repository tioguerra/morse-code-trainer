<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { settings } from '$lib/stores/settings.svelte';
	import { user } from '$lib/stores/user.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { cw } from '$lib/audio/cw';
	import LangPicker from '$lib/components/LangPicker.svelte';

	const t = i18n.t;

	onMount(() => {
		settings.hydrate();
		user.hydrate();
	});

	function persist() {
		settings.persist();
	}
	async function preview() {
		await cw.beep(120);
	}
	async function restartTutorial() {
		await user.reset();
		goto('/welcome');
	}

	let confirmReset = $state(false);
	async function doReset() {
		await user.reset();
		confirmReset = false;
	}

	$effect(() => {
		if (settings.farnsworth > settings.wpm) settings.farnsworth = settings.wpm;
	});
</script>

<main class="page">
	<header class="head">
		<a href="/" class="back" aria-label="back">←</a>
		<span class="title">{t('settings.title')}</span>
		<span class="back-spacer"></span>
	</header>

	<section class="rows">
		<div class="row">
			<span class="label">{t('settings.language')}</span>
			<LangPicker />
		</div>

		<div class="row col">
			<div class="line">
				<span class="label">{t('settings.wpm')}</span>
				<span class="value">{settings.wpm}</span>
			</div>
			<input
				type="range"
				min="8"
				max="30"
				step="1"
				bind:value={settings.wpm}
				oninput={persist}
				class="slider"
			/>
		</div>

		<div class="row col">
			<div class="line">
				<span class="label">Farnsworth</span>
				<span class="value">{settings.farnsworth}</span>
			</div>
			<input
				type="range"
				min="4"
				max={settings.wpm}
				step="1"
				bind:value={settings.farnsworth}
				oninput={persist}
				class="slider"
			/>
		</div>

		<div class="row col">
			<div class="line">
				<span class="label">{t('settings.freq')}</span>
				<button type="button" onclick={preview} class="value preview">{settings.freq} Hz</button>
			</div>
			<input
				type="range"
				min="400"
				max="900"
				step="20"
				bind:value={settings.freq}
				oninput={persist}
				class="slider"
			/>
		</div>

		<div class="row col">
			<div class="line">
				<span class="label">{t('settings.volume')}</span>
				<span class="value">{Math.round(settings.volume * 100)}%</span>
			</div>
			<input
				type="range"
				min="0"
				max="1"
				step="0.02"
				bind:value={settings.volume}
				oninput={persist}
				class="slider"
			/>
		</div>

		<label class="row">
			<span class="label">{t('settings.mute')}</span>
			<input type="checkbox" bind:checked={settings.muted} onchange={persist} class="toggle" />
		</label>

		<label class="row">
			<span class="label">{t('settings.haptics')}</span>
			<input type="checkbox" bind:checked={settings.haptics} onchange={persist} class="toggle" />
		</label>
	</section>

	<section class="dangerzone">
		<button type="button" onclick={restartTutorial} class="btn btn-ghost">
			{t('settings.restartTutorial')}
		</button>

		{#if !confirmReset}
			<button
				type="button"
				onclick={() => (confirmReset = true)}
				class="reset-btn"
			>
				{t('settings.reset')}
			</button>
		{:else}
			<div class="confirm">
				<button type="button" onclick={doReset} class="btn btn-danger">
					{t('settings.reset')}
				</button>
				<button type="button" onclick={() => (confirmReset = false)} class="btn btn-ghost">
					cancel
				</button>
			</div>
		{/if}
	</section>

	<footer class="foot">Dah · MIT · open source</footer>
</main>

<style>
	.head {
		display: grid;
		grid-template-columns: 36px 1fr 36px;
		align-items: center;
	}
	.back {
		font-size: 1.5rem;
		font-weight: 600;
		text-align: center;
	}
	.back-spacer {
		width: 36px;
	}
	.title {
		font-weight: 700;
		font-size: 1.15rem;
		text-align: center;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 0.25rem;
		border-bottom: 2px solid var(--color-border);
		gap: 1rem;
	}
	.row.col {
		flex-direction: column;
		align-items: stretch;
		gap: 0.6rem;
	}
	.line {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.label {
		font-weight: 500;
		font-size: 0.95rem;
		color: var(--color-text);
	}
	.value {
		font-weight: 600;
		font-size: 1rem;
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
	}
	.preview {
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	.dangerzone {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		margin-top: 1rem;
	}
	.reset-btn {
		font-weight: 600;
		font-size: 0.85rem;
		padding: 0.85rem 1.5rem;
		border: 2px solid var(--color-danger);
		color: var(--color-danger);
		border-radius: 999px;
		background: var(--color-bg);
	}
	.confirm {
		display: flex;
		gap: 0.65rem;
	}
	.confirm .btn {
		flex: 1;
	}

	.foot {
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		padding-top: 0.5rem;
	}
</style>
