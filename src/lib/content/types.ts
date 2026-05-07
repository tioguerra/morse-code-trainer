/** Tier of difficulty / unit size. */
export type ItemTier = 'CHAR' | 'SHORT_WORD' | 'WORD' | 'PHRASE' | 'SENTENCE' | 'QA';

/** A single learnable unit. */
export type Item = {
	id: string;
	tier: ItemTier;
	/** What the user reads / produces in plain text. Always Latin alphabet. */
	text: string;
	/** Pre-computed Morse code (space-separated for multi-char items). */
	morse: string;
	/** For QA tier: the prompt and the expected response. */
	prompt?: string;
	response?: string;
	/** Localized gloss explaining the item. Optional, mostly for tier ≥ 2. */
	meaning?: Partial<Record<'pt' | 'en' | 'es', string>>;
};

/** Per-item learning state. One row per item once seen. */
export type ItemProgress = {
	itemId: string;
	/** Position on the SRS ladder (0..7). */
	level: number;
	/** Unix ms timestamp when this item is next due. */
	nextDueAt: number;
	correctStreak: number;
	totalCorrect: number;
	totalWrong: number;
	lastSeenAt: number;
};

/** User's lifetime stats — single row, id 'me'. */
export type UserStats = {
	id: 'me';
	xp: number;
	streak: number;
	/** Last day (YYYY-MM-DD) where a session was completed. */
	lastSessionDay: string | null;
	freezesAvailable: number;
	totalSessions: number;
	/** Whether the first-launch tutorial was completed. */
	onboarded: boolean;
};
