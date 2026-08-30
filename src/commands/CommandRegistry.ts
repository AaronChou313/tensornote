export type CommandCategory = 'Navigation' | 'Workspace' | 'Editor' | 'Compute' | 'View' | 'Extension'

export interface Command {
  id: string
  label: string
  category: CommandCategory
  shortcut?: string
  description?: string
  isAvailable?: () => boolean
  execute: () => void | Promise<void>
}

export class CommandRegistry {
  private commands = new Map<string, Command>()
  private listeners = new Set<() => void>()

  register(command: Command) {
    this.commands.set(command.id, command)
    this.notify()
    return () => {
      this.commands.delete(command.id)
      this.notify()
    }
  }

  get(id: string) { return this.commands.get(id) }

  list(query = '') {
    const normalized = query.trim().toLowerCase()
    return [...this.commands.values()].filter((command) => {
      const matches = !normalized || `${command.label} ${command.category} ${command.description || ''}`.toLowerCase().includes(normalized)
      return matches && (command.isAvailable?.() ?? true)
    })
  }

  execute(id: string) {
    const command = this.commands.get(id)
    if (!command || command.isAvailable?.() === false) return false
    void command.execute()
    return true
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() { this.listeners.forEach((listener) => listener()) }
}
