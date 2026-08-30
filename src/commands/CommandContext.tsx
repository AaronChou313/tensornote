import { createContext, useContext } from 'react'
import type { CommandRegistry } from './CommandRegistry'

export const CommandRegistryContext = createContext<CommandRegistry | null>(null)
export function useCommandRegistry() {
  const registry = useContext(CommandRegistryContext)
  if (!registry) throw new Error('CommandRegistry is unavailable')
  return registry
}
