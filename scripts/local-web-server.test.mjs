import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { request } from 'node:http'
import { afterEach, expect, it } from 'vitest'
import { createLocalWebServer } from './local-web-server.mjs'
const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })
it('serves the offline application and SPA routes without exposing files outside its root', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tensornote-web-test-'))
  cleanups.push(() => rm(directory, { recursive: true, force: true }))
  const root = join(directory, 'app')
  await mkdir(root)
  await writeFile(join(root, 'index.html'), '<main>TensorNote</main>')
  await writeFile(join(root, 'app.js'), 'export {}')
  await writeFile(join(directory, 'private.txt'), 'not application content')
  await symlink(join(directory, 'private.txt'), join(root, 'linked.txt'))
  const server = await createLocalWebServer(root)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  cleanups.push(() => new Promise((resolve) => server.close(resolve)))
  const call = (path, method = 'GET', host) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path, method, headers: host ? { Host: host } : {} }, (res) => { let body = ''; res.on('data', (data) => { body += data }); res.on('end', () => resolve({ status: res.statusCode, body, type: res.headers['content-type'] })) })
    req.on('error', reject); req.end()
  })
  expect(await call('/notes/example')).toMatchObject({ status: 200, body: '<main>TensorNote</main>' })
  expect(await call('/app.js')).toMatchObject({ status: 200, type: 'text/javascript; charset=utf-8' })
  expect(await call('/', 'HEAD')).toMatchObject({ status: 200, body: '' })
  for (const path of ['/../private.txt', '/%2e%2e/private.txt', '/linked.txt']) expect((await call(path)).status).toBe(403)
  expect((await call('/%ZZ')).status).toBe(400)
  expect((await call('/missing.js')).status).toBe(404)
  expect((await call('/', 'POST')).status).toBe(405)
  expect((await call('/', 'GET', 'attacker.example')).status).toBe(403)
})
