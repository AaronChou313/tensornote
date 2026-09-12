import { ArrowSquareOut } from '@phosphor-icons/react'
import logoSquare from '../../assets/images/TensorNote_logo.png'
import { USER_GUIDE_URL } from '../config/links'
import { getHostAdapter } from '../host/runtime'

const packagedDesktopGuideOpener: ((url: string) => Promise<void>) | undefined =
  import.meta.env.VITE_TENSORNOTE_HOST === 'desktop' || import.meta.env.MODE === 'test'
    ? async (url) => { const { openUrl } = await import('@tauri-apps/plugin-opener'); await openUrl(url) }
    : undefined

async function openGuide(event: React.MouseEvent<HTMLAnchorElement>) {
  if (getHostAdapter().id !== 'desktop') return
  event.preventDefault()
  await packagedDesktopGuideOpener?.(USER_GUIDE_URL)
}

export function ProductIdentity() {
  const host = getHostAdapter()
  return <div className="product-identity">
    <span className="product-identity__logo"><img src={logoSquare} alt="" aria-hidden="true" /></span>
    <strong>TensorNote</strong>
    <span className="host-badge">{host.id === 'desktop' ? '桌面版' : 'Web版'}</span>
    <a href={USER_GUIDE_URL} target="_blank" rel="noreferrer" onClick={(event) => void openGuide(event)}>使用说明 <ArrowSquareOut size={13} /></a>
  </div>
}
