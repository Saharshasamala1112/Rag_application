import { useSyncExternalStore } from 'react'

const queryCache = new Map<string, MediaQueryList>()

function getMediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }
  let mediaQueryList = queryCache.get(query)
  if (!mediaQueryList) {
    mediaQueryList = window.matchMedia(query)
    queryCache.set(query, mediaQueryList)
  }
  return mediaQueryList
}

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * Falls back to `false` when `matchMedia` is unavailable, which keeps the first
 * render deterministic.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = getMediaQueryList(query)
      if (!mediaQueryList) return () => {}
      mediaQueryList.addEventListener('change', onChange)
      return () => mediaQueryList.removeEventListener('change', onChange)
    },
    () => getMediaQueryList(query)?.matches ?? false,
    () => false,
  )
}
