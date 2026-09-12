import type { LabCell } from '../types'

export type SidecarType = 'derivation' | 'jupyter'

export interface SidecarSourceRange {
  start: number
  end: number
}

interface SidecarBase {
  id: string
  type: SidecarType
  title: string
  source: SidecarSourceRange
  legacy?: boolean
}

export interface DerivationSidecar extends SidecarBase {
  type: 'derivation'
  markdown: string
}

export interface JupyterSidecar extends SidecarBase {
  type: 'jupyter'
  cells: LabCell[]
}

export type Sidecar = DerivationSidecar | JupyterSidecar

export interface SidecarDiagnostic {
  offset: number
  message: string
}

