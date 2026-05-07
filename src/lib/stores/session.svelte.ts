/**
 * Session controller — adaptive learning loop.
 *
 * The session is a dynamic queue that grows based on what the user does:
 *
 *  - At most ONE new item is being introduced at a time.
 *  - Pattern when a new item is introduced:
 *      INTRO → first TEST → 2 reviews → re-TEST (consolidation)
 *  - If the consolidation passes AND there is time for it, another new item
 *    is introduced with the same pattern, and so on.
 *  - On any wrong answer, a remedial sequence is injected right after the
 *    failure: INTRO → TEST → 2 reviews → follow-up TEST. The same item is
 *    NOT re-introduced more than three times in one session.
 *  - Items the user is currently missing are picked more often as the
 *    "review fillers" between new introductions and remedials, so the
 *    weakest letters get extra repetitions.
 *  - Session is bounded in real wall-clock time: at least one minute, at
 *    most five. We extend the queue with extra reviews when the user
 *    finishes too quickly, and we cut it off when 5 minutes elapse.
 */
import type { Item, ItemProgress } from '$lib/content/types';
import { ITEMS, INTRODUCTION_ORDER, ITEMS_BY_ID } from '$lib/content/corpus';
import { MASTERED_LEVEL } from '$lib/srs/engine';
import { user } from './user.svelte';

export type ExerciseKind = 'INTRO' | 'LISTEN_MC' | 'PRODUCE_KEY';

export type ExercisePurpose =
	| 'first-time'
	| 'review'
	| 'consolidation'
	| 'remedial-intro'
	| 'remedial-test'
	| 'remedial-followup';

export type SessionEntry = {
	item: Item;
	kind: ExerciseKind;
	purpose: ExercisePurpose;
	isRetest?: boolean;
	result?: 'correct' | 'wrong' | 'skipped';
};

const MIN_SESSION_MS = 60_000; // 1 minute floor
const MAX_SESSION_MS = 300_000; // 5 minute ceiling
const MAX_REMEDIALS_PER_ITEM = 3;
const HARD_QUEUE_CAP = 30; // safety net so memory doesn't blow up

class SessionStore {
	queue = $state<SessionEntry[]>([]);
	cursor = $state(0);
	finished = $state(false);
	xpStart = 0;
	streakStart = 0;

	private startTime = 0;
	private errorCount = new Map<string, number>();
	private reintroduceCount = new Map<string, number>();
	/**
	 * Items the user got wrong this session and hasn't yet redeemed by
	 * passing a subsequent test. While this set is non-empty we refuse to
	 * introduce new items — focus stays on the weak letter first.
	 */
	private weakItems = new Set<string>();
	private newPool: Item[] = [];

	current = $derived<SessionEntry | undefined>(this.queue[this.cursor]);

	correctCount = $derived(
		this.queue.filter((e) => e.result === 'correct' && e.kind !== 'INTRO').length
	);
	wrongCount = $derived(this.queue.filter((e) => e.result === 'wrong').length);
	progress = $derived(this.queue.length === 0 ? 0 : this.cursor / this.queue.length);
	xpEarned = $derived(user.stats.xp - this.xpStart);

	build() {
		this.startTime = Date.now();
		this.errorCount = new Map();
		this.reintroduceCount = new Map();
		this.weakItems = new Set();
		this.xpStart = user.stats.xp;
		this.streakStart = user.stats.streak;
		this.cursor = 0;
		this.finished = false;

		// Pool of unseen items in curated introduction order.
		this.newPool = INTRODUCTION_ORDER.map((id) => ITEMS_BY_ID[id]).filter(
			(i): i is Item => !!i && !user.progress.has(i.id)
		);

		// Initial queue: introduce one new item with consolidation pattern.
		this.queue = [];
		this.appendNewItemPattern();

		// If there were no new items at all, fall back to a pure-review session.
		if (this.queue.length === 0) {
			this.padWithReviews(6);
		}
	}

	async resolve(result: 'correct' | 'wrong' | 'skipped') {
		const entry = this.queue[this.cursor];
		if (!entry) return;
		entry.result = result;
		this.queue = [...this.queue];

		if (entry.kind !== 'INTRO') {
			try {
				await user.review(entry.item, result === 'correct');
			} catch (err) {
				console.error('[session] review failed:', err);
			}

			if (result === 'correct') {
				// Any successful test redeems the item from "weak" status.
				this.weakItems.delete(entry.item.id);
				if (entry.purpose === 'consolidation') {
					this.maybeIntroduceAnother();
				}
			} else {
				this.errorCount.set(
					entry.item.id,
					(this.errorCount.get(entry.item.id) ?? 0) + 1
				);
				this.weakItems.add(entry.item.id);
				if (result === 'wrong') this.maybeInjectRemedial(entry);
			}
		}

		this.cursor += 1;
		await this.maybeFinish();
	}

	// -------- internals --------

	private elapsed(): number {
		return Date.now() - this.startTime;
	}

	private appendNewItemPattern(): void {
		const item = this.newPool.shift();
		if (!item) return;
		const r1 = this.pickReviewItem();
		const r2 = this.pickReviewItem([r1?.id]);
		const entries: SessionEntry[] = [
			{ item, kind: 'INTRO', purpose: 'first-time' },
			{ item, kind: 'LISTEN_MC', purpose: 'first-time' }
		];
		if (r1) entries.push({ item: r1, kind: 'PRODUCE_KEY', purpose: 'review' });
		if (r2) entries.push({ item: r2, kind: 'LISTEN_MC', purpose: 'review' });
		entries.push({ item, kind: 'LISTEN_MC', purpose: 'consolidation', isRetest: true });
		this.queue = [...this.queue, ...entries];
	}

	private maybeIntroduceAnother(): void {
		// Hard rule: don't introduce a new item while the user still has any
		// unresolved weak letter. Focus on shoring that one up first.
		if (this.weakItems.size > 0) return;
		if (this.elapsed() > MAX_SESSION_MS - 90_000) return;
		if (this.queue.length + 5 > HARD_QUEUE_CAP) return;
		if (this.newPool.length === 0) return;
		this.appendNewItemPattern();
	}

	private maybeInjectRemedial(entry: SessionEntry): void {
		if (this.elapsed() > MAX_SESSION_MS - 60_000) return; // not enough time left for full remedial
		const itemId = entry.item.id;
		const count = this.reintroduceCount.get(itemId) ?? 0;
		if (count >= MAX_REMEDIALS_PER_ITEM) return;
		if (this.queue.length + 5 > HARD_QUEUE_CAP) return;

		this.reintroduceCount.set(itemId, count + 1);

		const item = entry.item;
		const r1 = this.pickReviewItem([itemId]);
		const r2 = this.pickReviewItem([itemId, r1?.id]);

		const inserts: SessionEntry[] = [
			{ item, kind: 'INTRO', purpose: 'remedial-intro' },
			{ item, kind: 'LISTEN_MC', purpose: 'remedial-test', isRetest: true }
		];
		if (r1) inserts.push({ item: r1, kind: 'PRODUCE_KEY', purpose: 'review' });
		if (r2) inserts.push({ item: r2, kind: 'LISTEN_MC', purpose: 'review' });
		inserts.push({ item, kind: 'LISTEN_MC', purpose: 'remedial-followup', isRetest: true });

		const newQ = [...this.queue];
		newQ.splice(this.cursor + 1, 0, ...inserts);
		this.queue = newQ;
	}

	private padWithReviews(count: number): void {
		for (let i = 0; i < count; i++) {
			const r = this.pickReviewItem();
			if (!r) return;
			const variant: ExerciseKind = this.queue.length % 2 === 0 ? 'LISTEN_MC' : 'PRODUCE_KEY';
			this.queue = [...this.queue, { item: r, kind: variant, purpose: 'review' }];
		}
	}

	/**
	 * Choose the best review item to slot in next.
	 *
	 * Priority order:
	 *   1. Highest error count this session — drill what the user is missing.
	 *   2. Most overdue (oldest nextDueAt).
	 *   3. Anything else not yet mastered.
	 *
	 * Items appearing very near the current cursor are skipped so the user
	 * doesn't see the same letter back-to-back.
	 */
	private pickReviewItem(excludeIds: (string | undefined)[] = []): Item | null {
		const exclude = new Set<string>(excludeIds.filter((x): x is string => !!x));
		// Avoid items that are already in the next 3 upcoming entries.
		for (let i = this.cursor; i < Math.min(this.queue.length, this.cursor + 3); i++) {
			const e = this.queue[i];
			if (e) exclude.add(e.item.id);
		}

		const candidates: Item[] = [];
		for (const item of ITEMS) {
			const p = user.progress.get(item.id);
			if (!p) continue;
			if (p.level >= MASTERED_LEVEL) continue;
			if (exclude.has(item.id)) continue;
			candidates.push(item);
		}
		if (candidates.length === 0) return null;

		candidates.sort((a, b) => {
			const errA = this.errorCount.get(a.id) ?? 0;
			const errB = this.errorCount.get(b.id) ?? 0;
			if (errA !== errB) return errB - errA;
			const pa = user.progress.get(a.id) as ItemProgress;
			const pb = user.progress.get(b.id) as ItemProgress;
			return pa.nextDueAt - pb.nextDueAt;
		});

		return candidates[0];
	}

	private async maybeFinish(): Promise<void> {
		const elapsed = this.elapsed();

		// Hard ceiling: time's up, end after this entry resolves.
		if (elapsed >= MAX_SESSION_MS) {
			await this.endSession();
			return;
		}

		// Queue exhausted — either pad to floor or finish.
		if (this.cursor >= this.queue.length) {
			if (elapsed < MIN_SESSION_MS) {
				// Soft floor: keep appending reviews until we reach 1 minute.
				if (this.queue.length < HARD_QUEUE_CAP) {
					const before = this.queue.length;
					this.padWithReviews(2);
					if (this.queue.length > before) return;
				}
			}
			await this.endSession();
		}
	}

	private async endSession(): Promise<void> {
		try {
			await user.finishSession();
		} catch (err) {
			console.error('[session] finishSession failed:', err);
		}
		this.finished = true;
	}
}

export const session = new SessionStore();
