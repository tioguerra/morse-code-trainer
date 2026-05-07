/**
 * KeyState — a Svelte 5 rune-based state machine for the virtual telegraph key.
 *
 * Behavior:
 *   - press()  → starts a tone (and a hold timer to classify dit/dah)
 *   - release() → stops tone, appends '.' or '-' to the current letter buffer
 *   - after `letterGap` ms with no input, the buffer is decoded and appended
 *     to the output tape; an invalid sequence yields '?' (and triggers onError).
 *   - after `wordGap` ms, a space is appended to the tape.
 */
import { cw } from '$lib/audio/cw';
import { decode, isValidPrefix, timing } from '$lib/morse/code';
import { settings } from '$lib/stores/settings.svelte';

export type KeyEvents = {
	onSymbol?: (s: '.' | '-') => void;
	onLetter?: (letter: string, code: string) => void;
	onWord?: () => void;
	onError?: (code: string) => void;
};

export type KeyTimingOptions = {
	/**
	 * Minimum gap (in ms) before the decoder treats a pause as a word
	 * boundary. The natural Morse value at default speeds is around 1
	 * second, which is far too short for a learner painstakingly forming
	 * their first words. Pass a higher floor (3000–5000) on screens
	 * intended for beginner free-form keying.
	 */
	minWordGapMs?: number;
};

export class KeyState {
	current = $state(''); // morse buffer for the letter being typed
	tape = $state(''); // decoded text tape
	isDown = $state(false);

	private pressedAt = 0;
	private letterTimer: ReturnType<typeof setTimeout> | null = null;
	private wordTimer: ReturnType<typeof setTimeout> | null = null;
	private events: KeyEvents;
	private opts: KeyTimingOptions;

	constructor(events: KeyEvents = {}, opts: KeyTimingOptions = {}) {
		this.events = events;
		this.opts = opts;
	}

	get wpm() {
		return settings.wpm;
	}
	get farnsworth() {
		return settings.farnsworth;
	}

	private get t() {
		const base = timing(this.wpm, this.farnsworth);
		const floor = this.opts.minWordGapMs ?? 0;
		return floor > base.wordGap ? { ...base, wordGap: floor } : base;
	}

	private buzz(pattern: number | number[]) {
		if (settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
	}

	press() {
		if (this.isDown) return;
		this.isDown = true;
		this.pressedAt = performance.now();
		this.clearTimers();
		cw.setMuted(settings.muted);
		cw.open();
		this.buzz(10);
	}

	release() {
		if (!this.isDown) return;
		this.isDown = false;
		const held = performance.now() - this.pressedAt;
		cw.close();

		const symbol: '.' | '-' = held < this.t.ditDahThreshold ? '.' : '-';
		this.current += symbol;
		this.events.onSymbol?.(symbol);

		// Optimistic check: if no valid Morse code starts with this prefix,
		// flush as error immediately so the user gets fast feedback.
		if (!isValidPrefix(this.current)) {
			this.flushLetter(true);
			return;
		}

		this.scheduleFlush();
	}

	private scheduleFlush() {
		this.letterTimer = setTimeout(() => this.flushLetter(false), this.t.letterGap);
	}

	private flushLetter(forceError: boolean) {
		const code = this.current;
		if (!code) return;
		this.current = '';
		const letter = decode(code);
		this.tape += letter;
		if (forceError || letter === '?') {
			this.events.onError?.(code);
			this.buzz([40, 30, 40]);
		} else {
			this.events.onLetter?.(letter, code);
		}
		// after a letter, schedule a possible word break
		this.wordTimer = setTimeout(() => {
			this.tape += ' ';
			this.events.onWord?.();
		}, this.t.wordGap - this.t.letterGap);
	}

	clear() {
		this.clearTimers();
		this.current = '';
		this.tape = '';
		this.isDown = false;
		cw.close(true);
	}

	/**
	 * Erase one unit of the user's recent input.
	 *   - If a partial letter is in flight (current buffer non-empty),
	 *     drop it entirely. Cancels the pending letter timer too.
	 *   - Otherwise, drop the last character (letter or space) of the tape.
	 *   - Always cancels any pending word-gap timer so a phantom space
	 *     doesn't appear after an edit.
	 */
	backspace() {
		if (this.wordTimer) {
			clearTimeout(this.wordTimer);
			this.wordTimer = null;
		}
		if (this.current) {
			if (this.letterTimer) {
				clearTimeout(this.letterTimer);
				this.letterTimer = null;
			}
			this.current = '';
			return;
		}
		this.tape = this.tape.slice(0, -1);
	}

	private clearTimers() {
		if (this.letterTimer) clearTimeout(this.letterTimer);
		if (this.wordTimer) clearTimeout(this.wordTimer);
		this.letterTimer = null;
		this.wordTimer = null;
	}
}
