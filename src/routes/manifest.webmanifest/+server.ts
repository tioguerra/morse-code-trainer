import { base } from '$app/paths';

// Prerender the manifest so it ends up as a real static file at build time.
export const prerender = true;

export function GET() {
	const manifest = {
		name: 'Dah · Morse Code Trainer',
		short_name: 'Dah',
		description: 'Learn and practice International Morse code, the playful way.',
		start_url: `${base}/`,
		scope: `${base}/`,
		display: 'standalone',
		orientation: 'portrait',
		background_color: '#ffffff',
		theme_color: '#ffffff',
		categories: ['education', 'games'],
		icons: [
			{
				src: `${base}/icon.svg`,
				sizes: 'any',
				type: 'image/svg+xml',
				purpose: 'any'
			},
			{
				src: `${base}/icon-maskable.svg`,
				sizes: 'any',
				type: 'image/svg+xml',
				purpose: 'maskable'
			}
		]
	};
	return new Response(JSON.stringify(manifest, null, 2), {
		headers: { 'Content-Type': 'application/manifest+json' }
	});
}
