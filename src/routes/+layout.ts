// Pure client-side SPA: nothing renders on the server, nothing prerenders.
// adapter-static will produce a single fallback index.html that bootstraps
// the client router. We copy that to 404.html during deploy so GitHub Pages
// hands back the SPA shell on any deep link.
export const ssr = false;
export const prerender = false;
