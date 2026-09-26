# Frontend performance notes

## Initial bundle

Measured with `npm run build` on Vite 8.1.4:

| Build | Initial JS | Gzip | Lazy chat route | Lazy Markdown |
| --- | ---: | ---: | ---: | ---: |
| Before route/code splitting | 686.49 kB | 204.55 kB | — | included |
| After route/code splitting | 444.03 kB | 139.91 kB | 28.30 kB | 161.76 kB |

The initial JavaScript is 35% smaller uncompressed and 32% smaller over gzip.
Route-specific page code is loaded on navigation, and the Markdown renderer is
loaded with chat rather than the application shell.

## Streaming message rendering

`src/__tests__/MessageBubble.test.tsx` models a 30-message thread and streams
one token into the final message. The Markdown renderer is invoked 30 times
initially and once for the update (31 total), rather than reparsing all 30
messages on every token. This deterministic render-count regression protects
the memoization behavior; it is not a substitute for a browser FPS/long-task
profile on production hardware.

Chat autoscroll is scheduled once per animation frame while streaming and uses
instant `scrollTop` updates during token delivery, avoiding repeated smooth
scroll animations.
