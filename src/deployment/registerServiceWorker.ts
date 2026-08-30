import { deploymentAdapter } from './config'

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !deploymentAdapter.pwa || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    const url = new URL('sw.js', document.baseURI)
    void navigator.serviceWorker.register(url, { scope: import.meta.env.BASE_URL }).catch((reason) => {
      console.warn('TensorNote PWA registration failed', reason)
    })
  }, { once: true })
}
