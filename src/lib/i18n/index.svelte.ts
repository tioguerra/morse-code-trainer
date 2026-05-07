/**
 * Tiny custom i18n. No runtime dependency.
 * Each locale is a typed object; `t(key)` looks up dot-paths.
 */
import { pt } from './pt';
import { en } from './en';
import { es } from './es';

export type Locale = 'pt' | 'en' | 'es';
export const LOCALES: { code: Locale; label: string }[] = [
	{ code: 'pt', label: 'Português' },
	{ code: 'en', label: 'English' },
	{ code: 'es', label: 'Español' }
];

const catalogs = { pt, en, es } as const;

function detect(): Locale {
	if (typeof navigator === 'undefined') return 'pt';
	const lang = (navigator.language ?? 'pt').toLowerCase();
	if (lang.startsWith('pt')) return 'pt';
	if (lang.startsWith('es')) return 'es';
	if (lang.startsWith('en')) return 'en';
	return 'pt';
}

class I18n {
	locale = $state<Locale>('pt');

	constructor() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('dah.locale') as Locale | null;
			this.locale = stored && stored in catalogs ? stored : detect();
		}
	}

	set(loc: Locale) {
		this.locale = loc;
		if (typeof window !== 'undefined') localStorage.setItem('dah.locale', loc);
	}

	t = (key: string, vars?: Record<string, string | number>) => {
		const cat = catalogs[this.locale];
		const value = key.split('.').reduce<any>((acc, k) => (acc ? acc[k] : undefined), cat);
		const fallback =
			value ??
			key.split('.').reduce<any>((acc, k) => (acc ? acc[k] : undefined), catalogs.en) ??
			key;
		if (typeof fallback !== 'string') return key;
		if (!vars) return fallback;
		return fallback.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
	};
}

export const i18n = new I18n();
