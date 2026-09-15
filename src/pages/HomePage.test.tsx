// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { WebHostAdapter } from '../host/WebHostAdapter'
import { installHostAdapter } from '../host/runtime'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { HomePage } from './HomePage'

describe('knowledge base home', () => {
  beforeEach(() => {
    installHostAdapter(new WebHostAdapter('Web'))
    useWorkspaceStore.setState({ status: 'idle', loadingMessage: '', error: null, recentWorkspaces: [] })
  })
  afterEach(cleanup)

  it('presents only the three knowledge-base entry actions', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /打开本地知识库/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /新建本地知识库/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /打开在线知识库/ })).toBeTruthy()
    expect(screen.getByText('还没有最近打开的知识库')).toBeTruthy()
    expect(screen.queryByText('AI Learning Notes')).toBeNull()
  })
})
