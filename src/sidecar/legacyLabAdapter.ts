import type { Lab } from '../types'
import type { JupyterSidecar } from './types'

export function legacyLabToSidecar(lab: Lab): JupyterSidecar {
  return {
    id: lab.id,
    type: 'jupyter',
    title: lab.title,
    cells: lab.cells,
    source: { start: -1, end: -1 },
    legacy: true,
  }
}

