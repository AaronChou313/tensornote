import { deploymentAdapter } from './config'
import { TENSORNOTE_VERSION } from '../version'

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !deploymentAdapter.pwa || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    const url = new URL('sw.js', document.baseURI)
    url.searchParams.set('v', TENSORNOTE_VERSION)
    void navigator.serviceWorker.register(url, { scope: import.meta.env.BASE_URL }).catch((reason) => {
      console.warn('TensorNote PWA registration failed', reason)
    })
  }, { once: true })
}
