/**
 * Seed content corpus. Items are introduced in approximately Koch order
 * for the CHAR tier (highest-value letters first), then a curated set of
 * short words and ham-radio idioms.
 *
 * `morse` is pre-encoded so we don't run the encoder at startup.
 */
import { encode } from '$lib/morse/code';
import type { Item } from './types';

function chr(letter: string): Item {
	return {
		id: `char:${letter}`,
		tier: 'CHAR',
		text: letter,
		morse: encode(letter)
	};
}

// Koch order — letters only. We deliberately leave out digits and
// punctuation: this app focuses on the 26 letters that live on the tree
// the user is learning to navigate.
export const KOCH_ORDER = [
	'K',
	'M',
	'R',
	'S',
	'U',
	'A',
	'P',
	'T',
	'L',
	'O',
	'W',
	'I',
	'N',
	'J',
	'E',
	'F',
	'Y',
	'V',
	'G',
	'Q',
	'Z',
	'H',
	'B',
	'C',
	'D',
	'X'
] as const;

const CHAR_ITEMS: Item[] = KOCH_ORDER.map(chr);

const SHORT_WORD_ITEMS: Item[] = [
	{
		text: 'SOS',
		meaning: {
			pt: 'pedido de socorro',
			en: 'distress signal',
			es: 'señal de auxilio'
		}
	},
	{
		text: 'OK',
		meaning: { pt: 'tudo certo', en: 'all good', es: 'todo bien' }
	},
	{
		text: 'CQ',
		meaning: {
			pt: 'chamada geral',
			en: 'general call',
			es: 'llamada general'
		}
	},
	{
		text: 'HI',
		meaning: { pt: 'oi', en: 'hi (also: laughter)', es: 'hola' }
	},
	{
		text: 'YES',
		meaning: { pt: 'sim', en: 'yes', es: 'sí' }
	},
	{
		text: 'NO',
		meaning: { pt: 'não', en: 'no', es: 'no' }
	},
	{
		text: 'AND',
		meaning: { pt: 'e', en: 'and', es: 'y' }
	},
	{
		text: 'THE',
		meaning: { pt: 'o / a', en: 'the', es: 'el / la' }
	},
	{
		text: 'FOX',
		meaning: { pt: 'raposa', en: 'fox', es: 'zorro' }
	},
	{
		text: 'CAT',
		meaning: { pt: 'gato', en: 'cat', es: 'gato' }
	},
	{
		text: 'SUN',
		meaning: { pt: 'sol', en: 'sun', es: 'sol' }
	},
	{
		text: 'SEA',
		meaning: { pt: 'mar', en: 'sea', es: 'mar' }
	},
	{
		text: 'SKY',
		meaning: { pt: 'céu', en: 'sky', es: 'cielo' }
	},
	{
		text: 'QSL',
		meaning: {
			pt: 'recebido / confirmado',
			en: 'received / confirmed',
			es: 'recibido'
		}
	},
	{
		text: 'TNX',
		meaning: { pt: 'obrigado', en: 'thanks', es: 'gracias' }
	}
].map((d) => ({
	id: `sw:${d.text}`,
	tier: 'SHORT_WORD' as const,
	text: d.text,
	morse: encode(d.text),
	meaning: d.meaning
}));

export const ITEMS: Item[] = [...CHAR_ITEMS, ...SHORT_WORD_ITEMS];

export const ITEMS_BY_ID: Record<string, Item> = Object.fromEntries(
	ITEMS.map((i) => [i.id, i])
);

/** Items in the order they should be introduced to a new learner. */
export const INTRODUCTION_ORDER: string[] = [
	...KOCH_ORDER.map((c) => `char:${c}`),
	...SHORT_WORD_ITEMS.map((i) => i.id)
];
