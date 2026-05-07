/**
 * SRS engine — Memrise-style spaced repetition with a fixed ladder.
 *
 *   level 0  → +4h
 *   level 1  → +12h
 *   level 2  → +24h
 *   level 3  → +6d
 *   level 4  → +12d
 *   level 5  → +48d
 *   level 6  → +96d
 *   level 7  → +6 months  (mastered)
 *
 * On correct: level += 1 (capped at 7)
 * On wrong:   level = 0
 */
import type { Item, ItemProgress } from '$lib/content/types';

export const LADDER_HOURS = [4, 12, 24, 6 * 24, 12 * 24, 48 * 24, 96 * 24, 180 * 24];
export const MASTERED_LEVEL = LADDER_HOURS.length - 1;

export const HOUR_MS = 60 * 60 * 1000;

export function nextDueFor(level: number, now = Date.now()): number {
	const lvl = Math.max(0, Math.min(level, MASTERED_LEVEL));
	return now + LADDER_HOURS[lvl] * HOUR_MS;
}

/** Apply a review result and return the updated progress. Pure function. */
export function review(
	prev: ItemProgress | undefined,
	itemId: string,
	correct: boolean,
	now = Date.now()
): ItemProgress {
	const base: ItemProgress = prev ?? {
		itemId,
		level: 0,
		nextDueAt: now,
		correctStreak: 0,
		totalCorrect: 0,
		totalWrong: 0,
		lastSeenAt: now
	};

	if (correct) {
		const level = Math.min(base.level + 1, MASTERED_LEVEL);
		return {
			...base,
			level,
			nextDueAt: nextDueFor(level, now),
			correctStreak: base.correctStreak + 1,
			totalCorrect: base.totalCorrect + 1,
			lastSeenAt: now
		};
	}
	return {
		...base,
		level: 0,
		nextDueAt: nextDueFor(0, now),
		correctStreak: 0,
		totalWrong: base.totalWrong + 1,
		lastSeenAt: now
	};
}

/** Format a duration in ms as a short human string. */
export function humanizeMs(ms: number, locale: 'pt' | 'en' | 'es' = 'pt'): string {
	const labels = {
		pt: { min: 'min', h: 'h', d: 'd', mo: 'meses', now: 'agora' },
		en: { min: 'min', h: 'h', d: 'd', mo: 'mo', now: 'now' },
		es: { min: 'min', h: 'h', d: 'd', mo: 'meses', now: 'ahora' }
	}[locale];
	if (ms <= 0) return labels.now;
	const min = Math.round(ms / 60_000);
	if (min < 60) return `${min} ${labels.min}`;
	const h = Math.round(ms / HOUR_MS);
	if (h < 48) return `${h} ${labels.h}`;
	const d = Math.round(ms / (24 * HOUR_MS));
	if (d < 60) return `${d} ${labels.d}`;
	const mo = Math.round(d / 30);
	return `${mo} ${labels.mo}`;
}

/**
 * Build a session: blend of due reviews and new items.
 * Default cap: 10 items. The user said "sem limites" but a UI session still
 * benefits from a soft cap; the user can always run another session right after.
 */
export function buildSession(opts: {
	allItems: Item[];
	progress: Map<string, ItemProgress>;
	introductionOrder: string[];
	now?: number;
	maxItems?: number;
	maxNew?: number;
}): Item[] {
	const { allItems, progress, introductionOrder } = opts;
	const now = opts.now ?? Date.now();
	const maxItems = opts.maxItems ?? 10;
	const maxNew = opts.maxNew ?? 3;

	const seen = new Set(progress.keys());
	const due: Item[] = [];

	for (const item of allItems) {
		const p = progress.get(item.id);
		if (!p) continue;
		if (p.level < MASTERED_LEVEL && p.nextDueAt <= now) due.push(item);
	}
	// Most overdue first.
	due.sort((a, b) => (progress.get(a.id)!.nextDueAt - progress.get(b.id)!.nextDueAt));

	const newItems = introductionOrder
		.filter((id) => !seen.has(id))
		.map((id) => allItems.find((i) => i.id === id))
		.filter((x): x is Item => !!x)
		.slice(0, maxNew);

	const session: Item[] = [];
	const dueQueue = [...due];
	const newQueue = [...newItems];

	// Interleave: new, due, due, new, due, due, ...
	while (session.length < maxItems && (dueQueue.length || newQueue.length)) {
		if (newQueue.length && session.length % 3 === 0) {
			session.push(newQueue.shift()!);
		} else if (dueQueue.length) {
			session.push(dueQueue.shift()!);
		} else if (newQueue.length) {
			session.push(newQueue.shift()!);
		}
	}

	return session;
}

/** XP awarded for a single review. */
export function xpFor(isNew: boolean, correct: boolean): number {
	if (correct) return isNew ? 10 : 5;
	return 1;
}
