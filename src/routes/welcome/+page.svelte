<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import TelegraphKey from '$lib/components/TelegraphKey.svelte';
	import { KeyState } from '$lib/morse/key.svelte';
	import { cw } from '$lib/audio/cw';
	import { user } from '$lib/stores/user.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import LangPicker from '$lib/components/LangPicker.svelte';

	const t = i18n.t;

	let step = $state(0);
	const TOTAL_STEPS = 6;

	const key = new KeyState({
		onSymbol: (s) => {
			if (step === 1 && s === '.') dotsHit++;
			if (step === 2 && s === '-') dashesHit++;
		},
		onLetter: (letter) => {
			if (step === 3 && letter === 'E') eSent = true;
			if (step === 4 && letter === 'T') tSent = true;
		}
	});

	let dotsHit = $state(0);
	let dashesHit = $state(0);
	let eSent = $state(false);
	let tSent = $state(false);

	let quizAnswer = $state<'E' | 'T' | null>(null);
	let quizTarget = $state<'E' | 'T'>('E');
	let quizRevealed = $state(false);

	function pickQuizTarget() {
		quizTarget = Math.random() < 0.5 ? 'E' : 'T';
		quizAnswer = null;
		quizRevealed = false;
	}

	async function playQuiz() {
		await cw.play(quizTarget === 'E' ? '.' : '-', settings.wpm);
	}

	function answer(a: 'E' | 'T') {
		if (quizRevealed) return;
		quizAnswer = a;
		quizRevealed = true;
	}

	onMount(async () => {
		await user.hydrate();
		settings.hydrate();
		// Onboarded users may still revisit /welcome from the home page link to
		// replay the tour — don't auto-redirect them away.
	});

	$effect(() => {
		if (step === 5 && quizAnswer === null && !quizRevealed) {
			pickQuizTarget();
			setTimeout(() => playQuiz(), 400);
		}
		if (step !== 1 && step !== 2 && step !== 3 && step !== 4) {
			key.clear();
		}
	});

	const canAdvance = $derived.by(() => {
		switch (step) {
			case 0:
				return true;
			case 1:
				return dotsHit >= 3;
			case 2:
				return dashesHit >= 3;
			case 3:
				return eSent;
			case 4:
				return tSent;
			case 5:
				return quizRevealed;
			default:
				return true;
		}
	});

	async function next() {
		if (step + 1 >= TOTAL_STEPS) {
			await finish();
			return;
		}
		step += 1;
		key.clear();
	}
	function back() {
		if (step === 0) return;
		step -= 1;
		key.clear();
	}
	async function skip() {
		await finish();
	}
	async function finish() {
		try {
			await user.seedItemAsLearned('char:E');
			await user.seedItemAsLearned('char:T');
			await user.setOnboarded();
		} catch (err) {
			console.error('[welcome] finish() failed:', err);
		}
		// Use full navigation as a fallback so the user always escapes the tour
		// even if SvelteKit client routing chokes on something.
		try {
			await goto('/');
		} catch {
			window.location.assign('/');
		}
	}
</script>

<main class="page">
	<header class="head">
		<button type="button" onclick={skip} class="btn-link">{t('welcome.skip')}</button>
		<LangPicker />
	</header>

	<div class="dots">
		{#each Array(TOTAL_STEPS) as _, i (i)}
			<span class="dot" class:active={i === step} class:done={i < step}></span>
		{/each}
	</div>

	<section class="body">
		{#if step === 0}
			<div class="brand-big">DAH</div>
			<h1 class="title">{t('welcome.s1Title')}</h1>
			<p class="copy">{t('welcome.s1Body')}</p>
			<button onclick={next} class="btn btn-primary">{t('welcome.s1Cta')}</button>
		{:else if step === 1}
			<h2 class="title">{t('welcome.s2Title')}</h2>
			<p class="copy">{t('welcome.s2Body')}</p>
			<TelegraphKey state={key} label="·" />
			<div class="counter">
				{#if dotsHit >= 3}<span class="ok">✓ {t('welcome.s2Done')}</span>{:else}{dotsHit} / 3{/if}
			</div>
			<div class="row">
				<button onclick={back} class="btn btn-ghost">{t('welcome.back')}</button>
				<button onclick={next} disabled={!canAdvance} class="btn btn-primary">
					{t('welcome.next')}
				</button>
			</div>
		{:else if step === 2}
			<h2 class="title">{t('welcome.s3Title')}</h2>
			<p class="copy">{t('welcome.s3Body')}</p>
			<TelegraphKey state={key} label="—" />
			<div class="counter">
				{#if dashesHit >= 3}<span class="ok">✓ {t('welcome.s3Done')}</span>{:else}{dashesHit} / 3{/if}
			</div>
			<div class="row">
				<button onclick={back} class="btn btn-ghost">{t('welcome.back')}</button>
				<button onclick={next} disabled={!canAdvance} class="btn btn-primary">
					{t('welcome.next')}
				</button>
			</div>
		{:else if step === 3}
			<h2 class="title">{t('welcome.s4Title')}</h2>
			<p class="copy">{t('welcome.s4Body')}</p>
			<div class="formula">E = ·</div>
			<TelegraphKey state={key} label="E" />
			<div class="counter">{#if eSent}<span class="ok">✓ {t('welcome.s4Done')}</span>{:else}&nbsp;{/if}</div>
			<div class="row">
				<button onclick={back} class="btn btn-ghost">{t('welcome.back')}</button>
				<button onclick={next} disabled={!canAdvance} class="btn btn-primary">
					{t('welcome.next')}
				</button>
			</div>
		{:else if step === 4}
			<h2 class="title">{t('welcome.s5Title')}</h2>
			<p class="copy">{t('welcome.s5Body')}</p>
			<div class="formula">T = —</div>
			<TelegraphKey state={key} label="T" />
			<div class="counter">{#if tSent}<span class="ok">✓ {t('welcome.s5Done')}</span>{:else}&nbsp;{/if}</div>
			<div class="row">
				<button onclick={back} class="btn btn-ghost">{t('welcome.back')}</button>
				<button onclick={next} disabled={!canAdvance} class="btn btn-primary">
					{t('welcome.next')}
				</button>
			</div>
		{:else if step === 5}
			<h2 class="title">{t('welcome.s6Title')}</h2>
			<p class="copy">{t('welcome.s6Body')}</p>
			<button type="button" onclick={playQuiz} class="play-btn" aria-label={t('welcome.s6Replay')}>▶</button>
			<div class="prompt">{t('welcome.s6Pick')}</div>
			<div class="quiz-grid">
				{#each ['E', 'T'] as opt (opt)}
					{@const isCorrect = quizRevealed && opt === quizTarget}
					{@const isWrong = quizRevealed && opt === quizAnswer && opt !== quizTarget}
					<button
						type="button"
						onclick={() => answer(opt as 'E' | 'T')}
						disabled={quizRevealed}
						class="quiz-btn"
						class:correct={isCorrect}
						class:wrong={isWrong}
					>
						{opt}
					</button>
				{/each}
			</div>
			{#if quizRevealed}
				<div class="counter">
					{#if quizAnswer === quizTarget}
						<span class="ok">✓ {t('welcome.s6Done')}</span>
					{:else}
						<span class="ko">✗ {quizTarget}</span>
					{/if}
				</div>
			{/if}
			<div class="row">
				<button onclick={back} class="btn btn-ghost">{t('welcome.back')}</button>
				<button onclick={next} disabled={!canAdvance} class="btn btn-primary">
					{t('welcome.s6Cta')}
				</button>
			</div>
		{/if}
	</section>
</main>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.dots {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
	}
	.dot {
		width: 1rem;
		height: 4px;
		border-radius: 999px;
		background: var(--color-border);
		transition: all 200ms;
	}
	.dot.active {
		width: 1.75rem;
		background: var(--color-primary);
	}
	.dot.done {
		background: var(--color-text);
	}

	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		text-align: center;
	}
	.brand-big {
		font-weight: 700;
		font-size: clamp(3rem, 14vw, 5rem);
		color: var(--color-text);
	}
	.title {
		font-weight: 700;
		font-size: 1.5rem;
		color: var(--color-text);
		margin: 0;
	}
	.copy {
		font-size: 1rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		max-width: 24rem;
		margin: 0;
	}
	.counter {
		font-weight: 600;
	}
	.counter .ok {
		color: var(--color-primary);
	}
	.counter .ko {
		color: var(--color-danger);
	}
	.formula {
		font-weight: 700;
		font-size: 1.75rem;
		letter-spacing: 0.4em;
		color: var(--color-text);
		padding: 0.6rem 1.5rem;
		border: 2px solid var(--color-border);
		border-radius: 12px;
	}
	.row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.prompt {
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.play-btn {
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
	.play-btn:active {
		transform: scale(0.96);
	}

	.quiz-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
		width: 100%;
		max-width: 18rem;
	}
	.quiz-btn {
		font-weight: 700;
		font-size: 2rem;
		color: var(--color-text);
		background: var(--color-bg);
		border: 2px solid var(--color-border-strong);
		padding: 1.1rem 0;
		border-radius: 12px;
		transition: all 200ms;
	}
	.quiz-btn:active:not(:disabled) {
		transform: translateY(1px);
	}
	.quiz-btn.correct {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}
	.quiz-btn.wrong {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: white;
	}
</style>
