import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  PlaybackState,
  PlayerState,
  ScannedVideoFile,
  VideoItem
} from '../types/video'
import { formatVideoTitle } from '../utils/formatVideoTitle'
import { isVideoFile } from '../utils/isVideoFile'

const STORAGE_KEYS = {
  playback: 'udotflix.playback-state'
} as const

const DEFAULT_MOVIES_FOLDER = 'movies'

function readStorage<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function formatBytes(bytes: number) {
  if (!bytes) {
    return 'Unknown size'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / 1024 ** exponent
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function formatDateLabel(value?: string) {
  if (!value) {
    return undefined
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function mergePlayback(video: VideoItem, playbackState: Record<string, PlaybackState>) {
  const playback = playbackState[video.id]

  if (!playback) {
    return video
  }

  return {
    ...video,
    progress: playback.progress,
    resumeTime: playback.resumeTime,
    lastPlayedAt: playback.lastPlayedAt
  }
}

function decorateLocalVideo(video: ScannedVideoFile): VideoItem {
  const extension = video.extension.toUpperCase()
  const addedAt = video.modifiedAt ?? undefined
  const title = video.title || formatVideoTitle(video.fileName)

  return {
    id: video.id,
    fileName: video.fileName,
    title,
    filePath: video.filePath,
    extension,
    category: 'Local Videos',
    year: addedAt ? new Date(addedAt).getFullYear().toString() : 'Local',
    duration: video.duration ?? 'Duration pending',
    badge: extension,
    description: `Ready to play from the movies folder: ${title}`,
    thumbnail: video.filePath,
    backdrop: video.filePath,
    isLocal: true,
    progress: 0,
    resumeTime: 0,
    isFavorite: false,
    addedAt,
    fileSize: formatBytes(video.sizeBytes)
  }
}

function sortByDateDesc(items: VideoItem[], key: 'addedAt' | 'lastPlayedAt') {
  return [...items].sort((left, right) => {
    const leftValue = left[key] ? new Date(left[key] as string).getTime() : 0
    const rightValue = right[key] ? new Date(right[key] as string).getTime() : 0
    return rightValue - leftValue
  })
}

export function useVideoLibrary() {
  const selectedFolder = DEFAULT_MOVIES_FOLDER
  const [playbackState, setPlaybackState] = useState<Record<string, PlaybackState>>(() =>
    readStorage<Record<string, PlaybackState>>(STORAGE_KEYS.playback, {})
  )
  const [localVideos, setLocalVideos] = useState<VideoItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanAt, setLastScanAt] = useState<string | null>(null)
  const [activePlayer, setActivePlayer] = useState<PlayerState | null>(null)

  useEffect(() => {
    writeStorage(STORAGE_KEYS.playback, playbackState)
  }, [playbackState])

  const scanDefaultMoviesFolder = useCallback(async () => {
    setIsScanning(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/videos')

      if (!response.ok) {
        throw new Error('Unable to scan the movies folder.')
      }

      const files = (await response.json()) as ScannedVideoFile[]
      const supportedFiles = files.filter((file) => isVideoFile(file.fileName))
      setLocalVideos(supportedFiles.map(decorateLocalVideo))
      setLastScanAt(new Date().toISOString())

      if (!supportedFiles.length) {
        setErrorMessage('The movies folder does not contain supported video files yet.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to scan the movies folder.'
      setErrorMessage(message)
    } finally {
      setIsScanning(false)
    }
  }, [])

  useEffect(() => {
    void scanDefaultMoviesFolder()
  }, [scanDefaultMoviesFolder])

  const openVideo = useCallback((video: VideoItem, autoplay: boolean) => {
    setActivePlayer({ video, autoplay })
  }, [])

  const closePlayer = useCallback(() => {
    setActivePlayer(null)
  }, [])

  const savePlaybackProgress = useCallback(
    (videoId: string, currentTime: number, durationSeconds: number, completed = false) => {
      const safeDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0
      const progress = safeDuration
        ? completed
          ? 100
          : Math.min(99, Math.max(0, Math.round((currentTime / safeDuration) * 100)))
        : 0

      setPlaybackState((previous) => ({
        ...previous,
        [videoId]: {
          progress,
          resumeTime: completed ? 0 : currentTime,
          durationSeconds: safeDuration,
          lastPlayedAt: new Date().toISOString()
        }
      }))
    },
    []
  )

  const catalogVideos = useMemo(() => {
    return localVideos.map((video) => mergePlayback(video, playbackState))
  }, [localVideos, playbackState])

  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return catalogVideos
    }

    return catalogVideos.filter((video) => {
      const searchBase = [
        video.title,
        video.fileName,
        video.extension,
        video.description,
        video.category
      ]
        .join(' ')
        .toLowerCase()

      return searchBase.includes(query)
    })
  }, [catalogVideos, searchQuery])

  const featuredVideo = useMemo(() => {
    return filteredVideos[0] ?? catalogVideos[0] ?? null
  }, [catalogVideos, filteredVideos])

  const recentlyPlayedVideos = useMemo(() => {
    return sortByDateDesc(
      filteredVideos.filter((video) => Boolean(video.lastPlayedAt)),
      'lastPlayedAt'
    )
  }, [filteredVideos])

  const lastScanLabel = useMemo(() => {
    if (!lastScanAt) {
      return 'Scanning movies folder'
    }

    return `Last scanned ${formatDateLabel(lastScanAt)}`
  }, [lastScanAt])

  return {
    activePlayer,
    closePlayer,
    errorMessage,
    featuredVideo,
    filteredVideos,
    hasAnyVideos: catalogVideos.length > 0,
    hasLocalVideos: localVideos.length > 0,
    isScanning,
    lastScanLabel,
    openVideo,
    recentlyPlayedVideos,
    savePlaybackProgress,
    searchQuery,
    selectedFolder,
    setSearchQuery
  }
}
