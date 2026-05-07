/**
 * Reactive user state — single source of truth, hydrated from IndexedDB once.
 *
 * Streak rules:
 *   - completing ≥1 session on a calendar day counts that day
 *   - if today's day == lastSessionDay, no streak change (already counted)
 *   - if today is the day-after, streak += 1
 *   - if a day was missed but a freeze is available, consume the freeze
 *     and treat as continued streak
 *   - otherwise streak resets to 1 (this session counts as day 1)
 */
import { browser } from '$app/environment';
import type { Item, ItemProgress, UserStats } from '$lib/content/types';
import {
	loadAllProgress,
	loadStats,
	resetEverything,
	saveProgress,
	saveStats
} from '$lib/db/store';
import { ITEMS } from '$lib/content/corpus';
import { MASTERED_LEVEL, review, xpFor } from '$lib/srs/engine';

function todayStr(d = new Date()): string {
	return d.toISOString().slice(0, 10);
}
function dayDiff(a: string, b: string): number {
	return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 3600 * 1000));
}

class UserStore {
	loaded = $state(false);
	stats = $state<UserStats>({
		id: 'me',
		xp: 0,
		streak: 0,
		lastSessionDay: null,
		freezesAvailable: 1,
		totalSessions: 0,
		onboarded: false
	});
	progress = $state<Map<string, ItemProgress>>(new Map());

	dueCount = $derived.by(() => {
		const now = Date.now();
		let n = 0;
		for (const p of this.progress.values()) {
			if (p.level < MASTERED_LEVEL && p.nextDueAt <= now) n++;
		}
		return n;
	});

	masteredCount = $derived.by(() => {
		let n = 0;
		for (const p of this.progress.values()) if (p.level >= MASTERED_LEVEL) n++;
		return n;
	});

	newAvailable = $derived(ITEMS.length - this.progress.size);

	async hydrate(): Promise<void> {
		if (!browser || this.loaded) return;
		const [p, s] = await Promise.all([loadAllProgress(), loadStats()]);
		this.progress = p;
		this.stats = s;
		this.loaded = true;
	}

	/** Record a single review and persist progress. */
	async review(item: Item, correct: boolean): Promise<ItemProgress> {
		const prev = this.progress.get(item.id);
		const isNew = !prev;
		const next = review(prev, item.id, correct);
		const newMap = new Map(this.progress);
		newMap.set(item.id, next);
		this.progress = newMap;
		await saveProgress(next);

		this.stats = { ...this.stats, xp: this.stats.xp + xpFor(isNew, correct) };
		await saveStats(this.stats);

		return next;
	}

	/** Apply streak rules at the end of a session. Returns updated stats. */
	async finishSession(): Promise<UserStats> {
		const today = todayStr();
		let { streak, lastSessionDay, freezesAvailable, totalSessions } = this.stats;

		if (lastSessionDay === today) {
			// Already counted today — nothing changes for streak.
		} else if (lastSessionDay == null) {
			streak = 1;
		} else {
			const diff = dayDiff(lastSessionDay, today);
			if (diff === 1) {
				streak += 1;
			} else if (diff === 2 && freezesAvailable > 0) {
				streak += 1;
				freezesAvailable -= 1;
			} else {
				streak = 1;
			}
		}

		totalSessions += 1;
		lastSessionDay = today;

		// Once-a-week freeze refill: if it's Monday and we have <1 freeze, top up.
		if (new Date().getDay() === 1 && freezesAvailable < 1) freezesAvailable = 1;

		this.stats = { ...this.stats, streak, lastSessionDay, freezesAvailable, totalSessions };
		await saveStats(this.stats);
		return this.stats;
	}

	async reset(): Promise<void> {
		await resetEverything();
		this.progress = new Map();
		this.stats = {
			id: 'me',
			xp: 0,
			streak: 0,
			lastSessionDay: null,
			freezesAvailable: 1,
			totalSessions: 0,
			onboarded: false
		};
	}

	async setOnboarded(): Promise<void> {
		this.stats = { ...this.stats, onboarded: true };
		await saveStats(this.stats);
	}

	/**
	 * Force-introduce an item (used by onboarding) so it shows up in regular
	 * sessions afterward. Schedules it as immediately due. Idempotent: if the
	 * item already has progress (e.g. the user is replaying the tutorial), do
	 * nothing rather than wiping their hard-won mastery.
	 */
	async seedItemAsLearned(itemId: string): Promise<void> {
		if (this.progress.has(itemId)) return;
		const now = Date.now();
		const p: ItemProgress = {
			itemId,
			level: 0,
			nextDueAt: now,
			correctStreak: 0,
			totalCorrect: 0,
			totalWrong: 0,
			lastSeenAt: now
		};
		const newMap = new Map(this.progress);
		newMap.set(itemId, p);
		this.progress = newMap;
		await saveProgress(p);
	}
}

export const user = new UserStore();
