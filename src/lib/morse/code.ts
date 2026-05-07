/**
 * International Morse Code table + utilities.
 * Symbols use ASCII: '.' for dit, '-' for dah.
 */

export const MORSE: Record<string, string> = {
	A: '.-',
	B: '-...',
	C: '-.-.',
	D: '-..',
	E: '.',
	F: '..-.',
	G: '--.',
	H: '....',
	I: '..',
	J: '.---',
	K: '-.-',
	L: '.-..',
	M: '--',
	N: '-.',
	O: '---',
	P: '.--.',
	Q: '--.-',
	R: '.-.',
	S: '...',
	T: '-',
	U: '..-',
	V: '...-',
	W: '.--',
	X: '-..-',
	Y: '-.--',
	Z: '--..',
	'0': '-----',
	'1': '.----',
	'2': '..---',
	'3': '...--',
	'4': '....-',
	'5': '.....',
	'6': '-....',
	'7': '--...',
	'8': '---..',
	'9': '----.',
	'.': '.-.-.-',
	',': '--..--',
	'?': '..--..',
	"'": '.----.',
	'!': '-.-.--',
	'/': '-..-.',
	'(': '-.--.',
	')': '-.--.-',
	'&': '.-...',
	':': '---...',
	';': '-.-.-.',
	'=': '-...-',
	'+': '.-.-.',
	'-': '-....-',
	_: '..--.-',
	'"': '.-..-.',
	$: '...-..-',
	'@': '.--.-.'
};

/** Reverse map: Morse → letter. Built once. */
export const FROM_MORSE: Record<string, string> = Object.fromEntries(
	Object.entries(MORSE).map(([k, v]) => [v, k])
);

/** Encode a plain string into space-separated Morse, with ' / ' for word breaks. */
export function encode(text: string): string {
	return text
		.toUpperCase()
		.split(' ')
		.map((word) =>
			word
				.split('')
				.map((c) => MORSE[c] ?? '')
				.filter(Boolean)
				.join(' ')
		)
		.join(' / ');
}

/** Decode a single Morse cluster (e.g. ".-") to a character, or '?' if unknown. */
export function decode(symbols: string): string {
	return FROM_MORSE[symbols] ?? '?';
}

/** Check whether `prefix` is the start of any valid Morse code. */
export function isValidPrefix(prefix: string): boolean {
	if (prefix.length === 0) return true;
	for (const code of Object.values(MORSE)) {
		if (code.startsWith(prefix)) return true;
	}
	return false;
}

/**
 * Standard Morse timing in milliseconds, derived from words-per-minute.
 * "PARIS" defines 1 word = 50 dit-units, so 1 dit = 1200 / wpm ms.
 */
export function timing(wpm: number, farnsworth = wpm) {
	const unit = 1200 / wpm;
	const slowUnit = 1200 / farnsworth;
	return {
		dit: unit,
		dah: unit * 3,
		/** Threshold separating a tap (dit) from a hold (dah). */
		ditDahThreshold: unit * 2,
		intraChar: unit,
		/** Gap that signals "letter complete". */
		letterGap: slowUnit * 3,
		wordGap: slowUnit * 7
	};
}
