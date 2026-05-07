<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { user } from '$lib/stores/user.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { humanizeMs } from '$lib/srs/engine';
	import ListenMC from '$lib/components/ListenMC.svelte';
	import ProduceKey from '$lib/components/ProduceKey.svelte';
	import IntroduceItem from '$lib/components/IntroduceItem.svelte';

	const t = i18n.t;
	let ready = $state(false);

	onMount(async () => {
		await user.hydrate();
		settings.hydrate();
		if (!user.stats.onboarded) {
			goto(`${base}/welcome`);
			return;
		}
		session.build();
		ready = true;
	});

	function handleResolve(correct: boolean) {
		session.resolve(correct ? 'correct' : 'wrong');
	}

	function exit() {
		goto(`${base}/`);
	}

	const next = $derived.by(() => {
		const earliest = [...user.progress.values()]
			.map((p) => p.nextDueAt)
			.filter((t) => t > Date.now())
			.sort((a, b) => a - b)[0];
		return earliest ? humanizeMs(earliest - Date.now(), i18n.locale) : '—';
	});
</script>

<main class="page">
	<header class="head">
		<div class="bar">
			<div class="bar-fill" style="width: {(session.finished ? 1 : session.progress) * 100}%"></div>
		</div>
		<button type="button" onclick={exit} class="close" aria-label={t('session.exit')}>✕</button>
	</header>

	{#if !ready || session.queue.length === 0}
		<section class="center muted">…</section>
	{:else if session.finished}
		<section class="center result">
			<div class="title">{t('result.title')}</div>
			<div class="xp">+{session.xpEarned} XP</div>
			<div class="counts">
				<span class="ok">{t('result.correct', { n: session.correctCount })}</span>
				<span class="ko">{t('result.wrong', { n: session.wrongCount })}</span>
			</div>
			<div class="streak">
				{user.stats.streak > session.streakStart
					? t('result.streakUp', { n: user.stats.streak })
					: t('result.streakKeep', { n: user.stats.streak })}
			</div>
			<div class="next-due">{t('result.nextDue', { when: next })}</div>
			<div class="result-actions">
				<button type="button" onclick={() => session.build()} class="btn btn-ghost">
					{t('result.again')}
				</button>
				<button type="button" onclick={exit} class="btn btn-primary">
					{t('result.home')}
				</button>
			</div>
		</section>
	{:else if session.current}
		<section class="center">
			{#key session.cursor + ':' + session.current.item.id + ':' + session.current.kind + ':' + session.current.purpose}
				{#if session.current.kind === 'INTRO'}
					<IntroduceItem
						item={session.current.item}
						purpose={session.current.purpose === 'remedial-intro' ? 'remedial-intro' : 'first-time'}
						onContinue={() => session.resolve('correct')}
					/>
				{:else if session.current.kind === 'LISTEN_MC'}
					<ListenMC item={session.current.item} onResolve={handleResolve} />
				{:else if session.current.kind === 'PRODUCE_KEY'}
					<ProduceKey item={session.current.item} onResolve={handleResolve} />
				{/if}
			{/key}
		</section>
	{/if}
</main>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.bar {
		flex: 1;
		height: 8px;
		background: var(--color-border);
		border-radius: 999px;
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		background: var(--color-primary);
		transition: width 300ms ease;
	}
	.close {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		border: 2px solid var(--color-border);
		color: var(--color-text);
		font-size: 1rem;
		display: grid;
		place-items: center;
		background: var(--color-bg);
	}
	.close:active {
		background: var(--color-surface);
	}

	.center {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.muted {
		color: var(--color-text-disabled);
	}

	.result {
		gap: 1rem;
		text-align: center;
	}
	.title {
		font-weight: 700;
		font-size: 1.5rem;
	}
	.xp {
		font-weight: 800;
		font-size: 3.5rem;
		color: var(--color-primary);
		line-height: 1;
		margin: 0.5rem 0 1rem;
	}
	.counts {
		display: flex;
		gap: 1.5rem;
		font-weight: 600;
	}
	.ok {
		color: var(--color-primary);
	}
	.ko {
		color: var(--color-danger);
	}
	.streak {
		font-weight: 600;
		font-size: 1.15rem;
	}
	.next-due {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
	.result-actions {
		margin-top: 1rem;
		display: flex;
		gap: 0.75rem;
	}
</style>
