export type KernelStatus = 'offline' | 'starting' | 'idle' | 'busy' | 'error'

export interface NoteFrontmatter {
  id: string
  title: string
  aliases: string[]
  section: string
  order: number
  tags: string[]
  prerequisites: string[]
  summary?: string
}

export interface LabCell {
  id: string
  lab: string
  order: number
  title: string
  difficulty: 'basic' | 'medium' | 'heavy'
  code: string
}

export interface Lab {
  id: string
  title: string
  difficulty: 'basic' | 'medium' | 'heavy'
  cells: LabCell[]
}

export interface Heading {
  depth: number
  text: string
  id: string
}

export interface Note {
  id: string
  path: string
  directory: string
  frontmatter: NoteFrontmatter
  properties: Record<string, unknown>
  inlineTags: string[]
  raw: string
  content: string
  renderedContent: string
  labs: Lab[]
  headings: Heading[]
  searchText: string
  sourceModifiedAt?: number
  sourceSize?: number
}

export interface NoteProgress {
  read: boolean
  labRun: boolean
  reviewed: boolean
}
