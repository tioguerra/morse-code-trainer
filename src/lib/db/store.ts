/**
 * IndexedDB layer via Dexie. Two tables:
 *   - progress:  per-item SRS state (key = itemId)
 *   - stats:     single-row user stats (key = 'me')
 *
 * No backend, no account. The browser is the database.
 */
import Dexie, { type Table } from 'dexie';
import type { ItemProgress, UserStats } from '$lib/content/types';

class DahDB extends Dexie {
	progress!: Table<ItemProgress, string>;
	stats!: Table<UserStats, string>;

	constructor() {
		super('dah');
		this.version(1).stores({
			progress: 'itemId, level, nextDueAt',
			stats: 'id'
		});
	}
}

export const db = new DahDB();

export async function loadAllProgress(): Promise<Map<string, ItemProgress>> {
	const rows = await db.progress.toArray();
	const m = new Map<string, ItemProgress>();
	for (const r of rows) m.set(r.itemId, r);
	return m;
}

export async function saveProgress(p: ItemProgress): Promise<void> {
	await db.progress.put(p);
}

export async function loadStats(): Promise<UserStats> {
	const existing = await db.stats.get('me');
	if (existing) return existing;
	const fresh: UserStats = {
		id: 'me',
		xp: 0,
		streak: 0,
		lastSessionDay: null,
		freezesAvailable: 1,
		totalSessions: 0,
		onboarded: false
	};
	await db.stats.put(fresh);
	return fresh;
}

export async function saveStats(s: UserStats): Promise<void> {
	await db.stats.put(s);
}

export async function resetEverything(): Promise<void> {
	await db.progress.clear();
	await db.stats.clear();
}
