import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

const supportedVideoExtensions = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi'])
const supportedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const supportedMediaExtensions = new Set([...supportedVideoExtensions, ...supportedImageExtensions])
const VIDEO_CHUNK_SIZE = 2 * 1024 * 1024
const contentTypes: Record<string, string> = {
  '.avi': 'video/x-msvideo',
  '.avif': 'image/avif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.webm': 'video/webm'
}

interface ByteRange {
  start: number
  end: number
}

interface MediaMetadata {
  durationLabel: string | null
  durationSeconds: number | null
  isBrowserPlayable: boolean
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

function toWebPath(moviesRoot: string, absolutePath: string) {
  const relativePath = path.relative(moviesRoot, absolutePath).split(path.sep)
  return `/movies/${relativePath.map(encodeURIComponent).join('/')}`
}

function formatDurationLabel(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return null
  }

  const roundedSeconds = Math.round(totalSeconds)
  const hours = Math.floor(roundedSeconds / 3600)
  const minutes = Math.floor((roundedSeconds % 3600) / 60)
  const seconds = roundedSeconds % 60

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')
  }

  return [minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')
}

function readMediaMetadata(filePath: string): MediaMetadata {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration:stream=codec_type,codec_name,pix_fmt',
      '-of',
      'json',
      filePath
    ],
    {
      encoding: 'utf8'
    }
  )

  if (result.status !== 0) {
    return {
      durationLabel: null,
      durationSeconds: null,
      isBrowserPlayable: false
    }
  }

  try {
    const parsed = JSON.parse(result.stdout) as {
      format?: { duration?: string }
      streams?: Array<{
        codec_type?: string
        codec_name?: string
        pix_fmt?: string
      }>
    }

    const parsedDuration = Number(parsed.format?.duration ?? '0')
    const durationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null
    const durationLabel = formatDurationLabel(parsedDuration)
    const videoStream = parsed.streams?.find((stream) => stream.codec_type === 'video')
    const audioStream = parsed.streams?.find((stream) => stream.codec_type === 'audio')
    const extension = path.extname(filePath).toLowerCase()
    const videoCodec = videoStream?.codec_name?.toLowerCase() ?? ''
    const audioCodec = audioStream?.codec_name?.toLowerCase() ?? ''
    const pixelFormat = videoStream?.pix_fmt?.toLowerCase() ?? ''

    const isMp4Playable =
      extension === '.mp4' &&
      videoCodec === 'h264' &&
      (!pixelFormat || pixelFormat === 'yuv420p') &&
      (!audioCodec || audioCodec === 'aac' || audioCodec === 'mp3')

    const isWebmPlayable =
      extension === '.webm' &&
      (videoCodec === 'vp8' || videoCodec === 'vp9' || videoCodec === 'av1') &&
      (!audioCodec || audioCodec === 'opus' || audioCodec === 'vorbis')

    return {
      durationLabel,
      durationSeconds,
      isBrowserPlayable: isMp4Playable || isWebmPlayable
    }
  } catch {
    return {
      durationLabel: null,
      durationSeconds: null,
      isBrowserPlayable: false
    }
  }
}

function findPosterPath(videoPath: string) {
  const parsed = path.parse(videoPath)

  for (const extension of supportedImageExtensions) {
    const candidatePath = path.join(parsed.dir, `${parsed.name}${extension}`)

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath
    }
  }

  return null
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
    playbackPath: string
    posterPath: string | null
    extension: string
    category: string
    duration: string | null
    durationSeconds: number | null
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

      if (!supportedVideoExtensions.has(extension)) {
        continue
      }

      const stats = fs.statSync(entryPath)
      const webPath = toWebPath(moviesRoot, entryPath)
      const posterPath = findPosterPath(entryPath)
      const mediaMetadata = readMediaMetadata(entryPath)
      const playbackPath = mediaMetadata.isBrowserPlayable
        ? webPath
        : `/api/transcode?path=${encodeURIComponent(path.relative(moviesRoot, entryPath))}`

      videos.push({
        id: webPath,
        fileName: entry.name,
        title: getVideoTitle(entry.name),
        filePath: webPath,
        playbackPath,
        posterPath: posterPath ? toWebPath(moviesRoot, posterPath) : null,
        extension: extension.slice(1),
        category: '',
        duration: mediaMetadata.durationLabel,
        durationSeconds: mediaMetadata.durationSeconds,
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
  const requestedEnd = endValue ? Number(endValue) : start + VIDEO_CHUNK_SIZE - 1

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= fileSize
  ) {
    return null
  }

  return {
    start,
    end: Math.min(requestedEnd, start + VIDEO_CHUNK_SIZE - 1, fileSize - 1)
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

function streamStaticFile(response: ServerResponse, filePath: string) {
  const stats = fs.statSync(filePath)
  const extension = path.extname(filePath).toLowerCase()
  const contentType = contentTypes[extension] ?? 'application/octet-stream'

  response.writeHead(200, {
    'Cache-Control': 'private, no-cache',
    'Content-Length': stats.size,
    'Content-Type': contentType
  })

  fs.createReadStream(filePath).pipe(response)
}

function streamTranscodedVideo(
  request: IncomingMessage,
  response: ServerResponse,
  filePath: string,
  startSeconds: number
) {
  const seekArgs = startSeconds > 0 ? ['-ss', startSeconds.toFixed(3)] : []
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      ...seekArgs,
      '-i',
      filePath,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-ac',
      '2',
      '-avoid_negative_ts',
      'make_zero',
      '-movflags',
      'frag_keyframe+empty_moov+default_base_moof',
      '-f',
      'mp4',
      'pipe:1'
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )

  let stderrOutput = ''
  let started = false

  const stop = () => {
    if (!ffmpeg.killed) {
      ffmpeg.kill('SIGKILL')
    }
  }

  request.on('close', stop)
  response.on('close', stop)

  ffmpeg.stderr.on('data', (chunk) => {
    stderrOutput += chunk.toString()

    if (stderrOutput.length > 4000) {
      stderrOutput = stderrOutput.slice(-4000)
    }
  })

  ffmpeg.stdout.on('data', (chunk) => {
    if (!started) {
      started = true
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'video/mp4'
      })
    }

    response.write(chunk)
  })

  ffmpeg.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(500)
      response.end('Unable to start video transcoding.')
      return
    }

    response.end()
  })

  ffmpeg.on('close', (code) => {
    request.off('close', stop)
    response.off('close', stop)

    if (code === 0) {
      response.end()
      return
    }

    if (!response.headersSent) {
      response.writeHead(500)
      response.end(stderrOutput.trim() || 'Unable to transcode the selected video.')
      return
    }

    response.end()
  })
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

    if (requestUrl.pathname === '/api/transcode') {
      const relativePath = requestUrl.searchParams.get('path')

      if (!relativePath) {
        response.writeHead(400)
        response.end('Missing video path.')
        return
      }

      const videoPath = path.resolve(moviesRoot, relativePath)
      const extension = path.extname(videoPath).toLowerCase()

      if (
        !isInside(moviesRoot, videoPath) ||
        !supportedVideoExtensions.has(extension) ||
        !fs.existsSync(videoPath) ||
        !fs.statSync(videoPath).isFile()
      ) {
        response.writeHead(404)
        response.end('Not found')
        return
      }

      const requestedStart = Number(requestUrl.searchParams.get('start') ?? '0')
      const startSeconds = Number.isFinite(requestedStart) && requestedStart > 0 ? requestedStart : 0

      streamTranscodedVideo(request, response, videoPath, startSeconds)
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
      !supportedMediaExtensions.has(extension) ||
      !fs.existsSync(videoPath) ||
      !fs.statSync(videoPath).isFile()
    ) {
      response.writeHead(404)
      response.end('Not found')
      return
    }

    if (supportedImageExtensions.has(extension)) {
      streamStaticFile(response, videoPath)
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
    host: '0.0.0.0',
    port: 1420,
    strictPort: true
  },
  preview: {
    host: '0.0.0.0',
    port: 1420,
    strictPort: true
  }
})
