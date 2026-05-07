/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Offline-first service worker. Pre-caches the build output on install,
 * then serves from cache and falls back to network. The user can use the
 * app fully offline once it has been opened once.
 */
import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `dah-cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return;

	event.respondWith(
		caches.match(event.request).then(async (hit) => {
			if (hit) return hit;
			try {
				const res = await fetch(event.request);
				const cache = await caches.open(CACHE);
				cache.put(event.request, res.clone());
				return res;
			} catch {
				const fallback = await caches.match('/');
				return fallback ?? new Response('offline', { status: 503 });
			}
		})
	);
});
