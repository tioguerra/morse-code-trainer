/**
 * App-wide audio + interaction settings, persisted to localStorage.
 * Side-effects on the CW engine happen automatically when fields change.
 */
import { browser } from '$app/environment';
import { cw } from '$lib/audio/cw';

const KEY = 'dah.settings';

type Stored = {
	wpm: number;
	farnsworth: number;
	freq: number;
	volume: number;
	muted: boolean;
	haptics: boolean;
};

const DEFAULTS: Stored = {
	wpm: 15,
	farnsworth: 8,
	freq: 600,
	volume: 0.18,
	muted: false,
	haptics: true
};

class Settings {
	wpm = $state(DEFAULTS.wpm);
	farnsworth = $state(DEFAULTS.farnsworth);
	freq = $state(DEFAULTS.freq);
	volume = $state(DEFAULTS.volume);
	muted = $state(DEFAULTS.muted);
	haptics = $state(DEFAULTS.haptics);

	loaded = false;

	hydrate() {
		if (!browser || this.loaded) return;
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) {
				const data = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Stored>) };
				this.wpm = clamp(data.wpm, 8, 35);
				this.farnsworth = clamp(data.farnsworth, 4, this.wpm);
				this.freq = clamp(data.freq, 300, 1000);
				this.volume = clamp(data.volume, 0, 1);
				this.muted = !!data.muted;
				this.haptics = data.haptics !== false;
			}
		} catch {
			/* ignore */
		}
		this.applyToEngine();
		this.loaded = true;
	}

	persist() {
		if (!browser) return;
		const data: Stored = {
			wpm: this.wpm,
			farnsworth: this.farnsworth,
			freq: this.freq,
			volume: this.volume,
			muted: this.muted,
			haptics: this.haptics
		};
		localStorage.setItem(KEY, JSON.stringify(data));
		this.applyToEngine();
	}

	applyToEngine() {
		cw.setVolume(this.muted ? 0 : this.volume);
		cw.setFreq(this.freq);
		cw.setMuted(this.muted);
	}

	resetDefaults() {
		this.wpm = DEFAULTS.wpm;
		this.farnsworth = DEFAULTS.farnsworth;
		this.freq = DEFAULTS.freq;
		this.volume = DEFAULTS.volume;
		this.muted = DEFAULTS.muted;
		this.haptics = DEFAULTS.haptics;
		this.persist();
	}
}

function clamp(n: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, n));
}

export const settings = new Settings();
