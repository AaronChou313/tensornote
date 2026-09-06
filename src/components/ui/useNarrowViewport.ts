import { useSyncExternalStore } from 'react'

const query = '(max-width: 880px)'
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
export function useNarrowViewport() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}
