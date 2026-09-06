#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' }
const contained = (root, path) => { const child = relative(root, path); return child !== '..' && !child.startsWith('../') && !child.startsWith('..\\') && !isAbsolute(child) }

export async function createLocalWebServer(directory) {
  const root = await realpath(directory)
  return createServer(async (request, response) => {
    const reply = (status, body = '') => { response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end(request.method === 'HEAD' ? undefined : body) }
    // Serve only the application shell, never Workspace files. Reject DNS rebinding hosts.
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(request.headers.host || '')) return reply(403, 'Local access only')
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return reply(405, 'Method not allowed') }
    try {
      const pathname = decodeURIComponent((request.url || '/').split('?')[0])
      if (!pathname.startsWith('/') || pathname.includes('\0') || pathname.includes('\\')) return reply(400, 'Invalid path')
      let target = resolve(root, `.${pathname}`)
      if (!contained(root, target)) return reply(403, 'Forbidden')
      try { if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html') }
      catch (error) { if (error.code !== 'ENOENT') throw error; if (extname(pathname)) return reply(404, 'Not found'); target = resolve(root, 'index.html') }
      target = await realpath(target)
      if (!contained(root, target)) return reply(403, 'Forbidden')
      const body = await readFile(target)
      response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' })
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch (error) { reply(error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 500, 'Unable to serve this path') }
  })
}

if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('TensorNote Local Web requires Node.js 22 or newer.')
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), 'app')
  const server = await createLocalWebServer(directory)
  server.on('error', (error) => { console.error(error.code === 'EADDRINUSE' ? 'Port 5173 is already in use. Stop the other local web server and try again.' : error.message); process.exitCode = 1 })
  server.listen(5173, '127.0.0.1', () => console.log('TensorNote: http://127.0.0.1:5173\nOpen this address in Chrome or Edge. Keep this terminal open; Ctrl+C stops the app.'))
}
