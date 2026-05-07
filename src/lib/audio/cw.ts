/**
 * CW (Continuous Wave) audio engine.
 * Pure sine tone with a soft ADSR envelope to avoid the "click" you get
 * from gating an oscillator on/off abruptly. Browser-friendly: the
 * AudioContext is created lazily on the first user gesture.
 */

export type CWConfig = {
	/** Tone frequency in Hz. Real CW operators use 500–800; 600 is the sweet spot. */
	freq: number;
	/** Master volume 0–1. */
	volume: number;
	/** Attack time in seconds. ~5 ms keeps it crisp without clicking. */
	attack: number;
	/** Release time in seconds. */
	release: number;
};

const DEFAULTS: CWConfig = {
	freq: 600,
	volume: 0.18,
	attack: 0.005,
	release: 0.01
};

export class CWEngine {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private osc: OscillatorNode | null = null;
	private envelope: GainNode | null = null;
	private cfg: CWConfig;
	private muted = false;

	constructor(cfg: Partial<CWConfig> = {}) {
		this.cfg = { ...DEFAULTS, ...cfg };
	}

	/** Lazy-init the AudioContext (must be called from a user gesture). */
	private ensure(): AudioContext {
		if (this.ctx) return this.ctx;
		const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
		this.ctx = new Ctx();
		this.master = this.ctx.createGain();
		this.master.gain.value = this.cfg.volume;
		this.master.connect(this.ctx.destination);
		return this.ctx;
	}

	/** Open the gate — start a tone that holds until close() is called. */
	open() {
		if (this.muted) return;
		const ctx = this.ensure();
		if (ctx.state === 'suspended') ctx.resume();

		// If there's a previous tone still releasing, kill it cleanly.
		this.close(true);

		this.envelope = ctx.createGain();
		this.envelope.gain.value = 0;
		this.envelope.connect(this.master!);

		this.osc = ctx.createOscillator();
		this.osc.type = 'sine';
		this.osc.frequency.value = this.cfg.freq;
		this.osc.connect(this.envelope);

		const now = ctx.currentTime;
		this.envelope.gain.cancelScheduledValues(now);
		this.envelope.gain.setValueAtTime(0, now);
		this.envelope.gain.linearRampToValueAtTime(1, now + this.cfg.attack);
		this.osc.start(now);
	}

	/** Close the gate — release tone with a short fade. */
	close(immediate = false) {
		if (!this.ctx || !this.osc || !this.envelope) return;
		const now = this.ctx.currentTime;
		const release = immediate ? 0.002 : this.cfg.release;
		this.envelope.gain.cancelScheduledValues(now);
		this.envelope.gain.setValueAtTime(this.envelope.gain.value, now);
		this.envelope.gain.linearRampToValueAtTime(0, now + release);
		const osc = this.osc;
		const env = this.envelope;
		osc.stop(now + release + 0.01);
		setTimeout(() => {
			osc.disconnect();
			env.disconnect();
		}, (release + 0.05) * 1000);
		this.osc = null;
		this.envelope = null;
	}

	/** Beep for a fixed duration in ms (used for playback / preview). */
	async beep(ms: number) {
		this.open();
		await new Promise((r) => setTimeout(r, ms));
		this.close();
	}

	/** Play a `.`/`-` string at the given WPM (PARIS standard). */
	async play(symbols: string, wpm = 18) {
		const unit = 1200 / wpm; // ms per dit
		for (const s of symbols) {
			if (s === '.') {
				await this.beep(unit);
			} else if (s === '-' || s === '—') {
				await this.beep(unit * 3);
			} else if (s === ' ') {
				await new Promise((r) => setTimeout(r, unit * 3));
				continue;
			}
			await new Promise((r) => setTimeout(r, unit)); // intra-character gap
		}
	}

	setVolume(v: number) {
		this.cfg.volume = v;
		if (this.master) this.master.gain.value = v;
	}
	setFreq(hz: number) {
		this.cfg.freq = hz;
		if (this.osc) this.osc.frequency.value = hz;
	}
	setMuted(m: boolean) {
		this.muted = m;
		if (m) this.close(true);
	}
}

/** Singleton — there's only one user, only one tone needed. */
export const cw = new CWEngine();
