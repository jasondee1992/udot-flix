import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

const supportedExtensions = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi'])
const contentTypes: Record<string, string> = {
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
}

interface ByteRange {
  start: number
  end: number
}

function isInside(basePath: string, candidatePath: string) {
  const relativePath = path.relative(basePath, candidatePath)
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

function getVideoTitle(fileName: string) {
  const parsed = path.parse(fileName)
  return parsed.name
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scanMoviesFolder(moviesRoot: string) {
  if (!fs.existsSync(moviesRoot)) {
    return []
  }

  const videos: Array<{
    id: string
    fileName: string
    title: string
    filePath: string
    extension: string
    category: string
    duration: null
    modifiedAt: string
    sizeBytes: number
  }> = []

  const walk = (folderPath: string) => {
    for (const entry of fs.readdirSync(folderPath, { withFileTypes: true })) {
      const entryPath = path.join(folderPath, entry.name)

      if (entry.isDirectory()) {
        walk(entryPath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()

      if (!supportedExtensions.has(extension)) {
        continue
      }

      const stats = fs.statSync(entryPath)
      const relativePath = path.relative(moviesRoot, entryPath).split(path.sep)
      const webPath = `/movies/${relativePath.map(encodeURIComponent).join('/')}`

      videos.push({
        id: webPath,
        fileName: entry.name,
        title: getVideoTitle(entry.name),
        filePath: webPath,
        extension: extension.slice(1),
        category: 'Local Videos',
        duration: null,
        modifiedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size
      })
    }
  }

  walk(moviesRoot)

  return videos.sort((left, right) => right.fileName.localeCompare(left.fileName))
}

function parseRangeHeader(range: string | undefined, fileSize: number): ByteRange | null {
  if (!range) {
    return null
  }

  const match = range.match(/^bytes=(\d*)-(\d*)$/)

  if (!match) {
    return null
  }

  const [, startValue, endValue] = match

  if (!startValue && !endValue) {
    return null
  }

  if (!startValue) {
    const suffixLength = Number(endValue)

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null
    }

    return {
      start: Math.max(fileSize - suffixLength, 0),
      end: fileSize - 1
    }
  }

  const start = Number(startValue)
  const end = endValue ? Number(endValue) : fileSize - 1

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return null
  }

  return {
    start,
    end: Math.min(end, fileSize - 1)
  }
}

function streamVideoFile(request: IncomingMessage, response: ServerResponse, filePath: string) {
  const stats = fs.statSync(filePath)
  const extension = path.extname(filePath).toLowerCase()
  const contentType = contentTypes[extension] ?? 'application/octet-stream'
  const requestedRange = request.headers.range
  const range = parseRangeHeader(requestedRange, stats.size)
  const fileName = path.basename(filePath)

  if (requestedRange && !range) {
    console.info(`[video] 416 ${fileName} size=${stats.size} range="${requestedRange}" type=${contentType}`)
    response.writeHead(416, {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-cache',
      'Content-Range': `bytes */${stats.size}`
    })
    response.end()
    return
  }

  if (!range) {
    console.info(`[video] 200 ${fileName} size=${stats.size} type=${contentType} range=none`)
    response.writeHead(200, {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-cache',
      'Content-Length': stats.size,
      'Content-Type': contentType
    })

    if (request.method === 'HEAD') {
      response.end()
      return
    }

    fs.createReadStream(filePath).pipe(response)
    return
  }

  console.info(
    `[video] 206 ${fileName} bytes=${range.start}-${range.end}/${stats.size} type=${contentType}`
  )

  response.writeHead(206, {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-cache',
    'Content-Length': range.end - range.start + 1,
    'Content-Range': `bytes ${range.start}-${range.end}/${stats.size}`,
    'Content-Type': contentType
  })

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  fs.createReadStream(filePath, { start: range.start, end: range.end }).pipe(response)
}

function installMoviesMiddleware(server: ViteDevServer | PreviewServer) {
  const moviesRoot = path.resolve(process.cwd(), 'movies')

  server.middlewares.use((request, response, next) => {
    if (!request.url) {
      next()
      return
    }

    const requestUrl = new URL(request.url, 'http://127.0.0.1')

    if (requestUrl.pathname.startsWith('/assets/')) {
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      next()
      return
    }

    if (requestUrl.pathname === '/api/videos') {
      response.setHeader('Content-Type', 'application/json')
      response.setHeader('Cache-Control', 'no-store')
      response.end(JSON.stringify(scanMoviesFolder(moviesRoot)))
      return
    }

    if (!requestUrl.pathname.startsWith('/movies/')) {
      next()
      return
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, {
        Allow: 'GET, HEAD'
      })
      response.end('Method not allowed')
      return
    }

    let relativePath = ''

    try {
      relativePath = decodeURIComponent(requestUrl.pathname.replace(/^\/movies\//, ''))
    } catch {
      response.writeHead(400)
      response.end('Bad request')
      return
    }

    const videoPath = path.resolve(moviesRoot, relativePath)
    const extension = path.extname(videoPath).toLowerCase()

    if (
      !isInside(moviesRoot, videoPath) ||
      !supportedExtensions.has(extension) ||
      !fs.existsSync(videoPath) ||
      !fs.statSync(videoPath).isFile()
    ) {
      response.writeHead(404)
      response.end('Not found')
      return
    }

    streamVideoFile(request, response, videoPath)
  })
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'udotflix-local-movies',
      configureServer(server) {
        installMoviesMiddleware(server)
      },
      configurePreviewServer(server) {
        installMoviesMiddleware(server)
      }
    }
  ],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    allowedHosts: ['udot-1.taildca2a3.ts.net']
  },
  preview: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    allowedHosts: ['udot-1.taildca2a3.ts.net']
  }
})
