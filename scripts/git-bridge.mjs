#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createGitService, GitCommandError } from './git-bridge-lib.mjs'

const tensorNoteVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function json(response, status, body, origin) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
  })
  response.end(JSON.stringify(body))
}

async function requestBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 32 * 1024) throw new Error('请求内容过大')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const workspaceArg = argument('--workspace') || process.env.TENSORNOTE_GIT_ROOT
if (!workspaceArg) {
  console.error('Usage: pnpm git:bridge -- --workspace /absolute/path/to/workspace')
  process.exit(1)
}

const workspaceRoot = resolve(workspaceArg)
const port = Number(argument('--port') || process.env.TENSORNOTE_GIT_PORT || 4318)
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Git Bridge port must be an integer between 1024 and 65535.')
  process.exit(1)
}

const allowedOrigins = new Set((process.env.TENSORNOTE_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => value.trim()).filter(Boolean))
const service = createGitService(workspaceRoot)
await service.assertRepository().catch((reason) => {
  console.error(`Git Bridge could not open ${workspaceRoot}: ${reason.message}`)
  process.exit(1)
})

const server = createServer(async (request, response) => {
  const origin = request.headers.origin
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : undefined
  if (origin && !allowedOrigin) return json(response, 403, { error: 'Origin is not allowed.' })

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin' } : {}),
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    })
    return response.end()
  }

  if (request.method === 'POST' && !request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    return json(response, 415, { error: 'Git Bridge POST requests require application/json.' }, allowedOrigin)
  }

  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`)
  try {
    if (request.method === 'GET' && url.pathname === '/api/git/health') {
      return json(response, 200, { version: tensorNoteVersion, workspaceName: service.workspaceName, repositoryRoot: service.root }, allowedOrigin)
    }
    if (request.method === 'GET' && url.pathname === '/api/git/status') {
      return json(response, 200, await service.status(), allowedOrigin)
    }
    if (request.method === 'GET' && url.pathname === '/api/git/history') {
      return json(response, 200, { entries: await service.history(url.searchParams.get('limit')) }, allowedOrigin)
    }
    if (request.method === 'GET' && url.pathname === '/api/git/diff') {
      const path = url.searchParams.get('path') || ''
      const staged = url.searchParams.get('staged') === 'true'
      return json(response, 200, { path, staged, patch: await service.diff(path, staged) }, allowedOrigin)
    }
    if (request.method === 'POST' && url.pathname === '/api/git/stage') {
      const body = await requestBody(request)
      return json(response, 200, await service.stage(body.paths, body.staged === true), allowedOrigin)
    }
    if (request.method === 'POST' && url.pathname === '/api/git/commit') {
      const body = await requestBody(request)
      return json(response, 200, await service.commit(body.message), allowedOrigin)
    }
    return json(response, 404, { error: 'Git Bridge route not found.' }, allowedOrigin)
  } catch (reason) {
    const error = reason instanceof GitCommandError ? reason.message : reason instanceof Error ? reason.message : 'Git Bridge 请求失败'
    return json(response, 400, { error }, allowedOrigin)
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`TensorNote Git Bridge v${tensorNoteVersion}`)
  console.log(`Repository: ${service.root}`)
  console.log(`Listening:  http://127.0.0.1:${port}`)
  console.log('Local-only. Push, pull, credentials, and arbitrary shell commands are not exposed.')
})
