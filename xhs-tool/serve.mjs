import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const toolRoot = path.dirname(fileURLToPath(import.meta.url))
const distRoot = path.join(toolRoot, 'dist')
const port = Number(process.env.PORT || process.argv[2] || 4178)
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const target = path.resolve(distRoot, relative)
    const relativeTarget = path.relative(distRoot, target)

    if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
      response.writeHead(403).end('Forbidden')
      return
    }

    const stat = await fs.stat(target)
    if (!stat.isFile()) throw new Error('Not a file')
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-length': stat.size,
      'content-type': mimeTypes[path.extname(target).toLowerCase()] || 'application/octet-stream',
    })
    createReadStream(target).pipe(response)
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`电脑访问：http://127.0.0.1:${port}`)
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) {
        console.log(`手机访问：http://${address.address}:${port}`)
      }
    }
  }
})
