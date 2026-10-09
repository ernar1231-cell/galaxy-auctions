// Only the public marketing domain redirects; keep the Vercel Mini App untouched.
export default function middleware(request) {
  const host = new URL(request.url).hostname.toLowerCase();
  const path = new URL(request.url).pathname;
  if ((host === 'galaxyauction.live' || host === 'www.galaxyauction.live') &&
      (path === '/' || path === '/index.html')) {
    return Response.redirect('https://t.me/GalaxyAuctionbot', 302);
  }
}
export const config = { matcher: ['/', '/index.html'] };
