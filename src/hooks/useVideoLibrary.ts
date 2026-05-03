import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PlaybackState,
  PlayerState,
  ScannedVideoFile,
  VideoItem,
  VideoSection
} from '../types/video'
import { formatVideoTitle } from '../utils/formatVideoTitle'
import { isVideoFile } from '../utils/isVideoFile'

const STORAGE_KEYS = {
  playback: 'udotflix.playback-state'
} as const

const DEFAULT_MOVIES_FOLDER = 'movies'
const AUTO_REFRESH_INTERVAL_MS = 45_000
const RECENTLY_ADDED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const genreRules: Array<{
  key: string
  title: string
  description: string
  accent: string
  keywords: string[]
}> = [
  {
    key: 'action-adventure',
    title: 'Action & Adventure',
    description: 'Fast, loud, and built for the big screen.',
    accent: 'High impact',
    keywords: [
      'action',
      'adventure',
      'apex',
      'combat',
      'conqueror',
      'f1',
      'fantastic four',
      'jurassic',
      'mission impossible',
      'rebirth',
      'running man'
    ]
  },
  {
    key: 'drama',
    title: 'Drama',
    description: 'Story-first movies with heavier stakes.',
    accent: 'Character driven',
    keywords: ['drama', 'wicked', 'sinners', 'necrop', 'shallow']
  },
  {
    key: 'comedy',
    title: 'Comedy',
    description: 'Lighter watches and crowd pleasers.',
    accent: 'Easy picks',
    keywords: ['comedy', 'goat', 'happy gilmore', 'minecraft', 'hoppers', 'zootopia']
  },
  {
    key: 'horror-thriller',
    title: 'Horror & Thriller',
    description: 'Tense, dark, and suspense-heavy titles.',
    accent: 'Suspense',
    keywords: [
      'horror',
      'thriller',
      'apex',
      'kill',
      'necrop',
      'shallow',
      'sinners',
      'running man'
    ]
  },
  {
    key: 'animation-family',
    title: 'Animation & Family',
    description: 'Animated, family, and all-ages movie night options.',
    accent: 'Family night',
    keywords: [
      'aang',
      'animation',
      'avatar',
      'family',
      'goat',
      'hoppers',
      'how to train',
      'kpop',
      'lilo',
      'minecraft',
      'ne zha',
      'zootopia'
    ]
  },
  {
    key: 'sci-fi-fantasy',
    title: 'Sci-Fi & Fantasy',
    description: 'Worlds, powers, creatures, and impossible problems.',
    accent: 'Escapes',
    keywords: [
      'aang',
      'avatar',
      'fantastic four',
      'fantasy',
      'jurassic',
      'kpop',
      'minecraft',
      'ne zha',
      'sci fi',
      'sci-fi',
      'wicked'
    ]
  }
]

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

function getSearchText(video: VideoItem) {
  return [
    video.title,
    video.fileName,
    video.category,
    video.description,
    video.extension
  ]
    .join(' ')
    .toLowerCase()
}

function matchesGenre(video: VideoItem, keywords: string[]) {
  const searchText = getSearchText(video)
  return keywords.some((keyword) => searchText.includes(keyword))
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
  const addedAt = video.addedAt ?? video.createdAt ?? video.modifiedAt ?? undefined
  const createdAt = video.createdAt ?? video.addedAt ?? video.modifiedAt ?? undefined
  const title = video.title || formatVideoTitle(video.fileName)

  return {
    id: video.id,
    fileName: video.fileName,
    title,
    filePath: video.filePath,
    playbackPath: video.playbackPath,
    hasSubtitle: video.hasSubtitle,
    subtitleUrl: video.subtitleUrl,
    subtitles: video.subtitles,
    extension,
    category: '',
    year: addedAt ? new Date(addedAt).getFullYear().toString() : 'Local',
    duration: video.duration ?? '',
    durationSeconds: video.durationSeconds ?? null,
    badge: extension,
    description: '',
    thumbnail: video.posterPath ?? video.filePath,
    backdrop: video.posterPath ?? video.filePath,
    isLocal: true,
    progress: 0,
    resumeTime: 0,
    isFavorite: false,
    addedAt,
    createdAt,
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

function isRecentlyAdded(video: VideoItem) {
  const addedAt = video.addedAt ?? video.createdAt

  if (!addedAt) {
    return false
  }

  const addedTime = new Date(addedAt).getTime()

  if (!Number.isFinite(addedTime)) {
    return false
  }

  const ageMs = Date.now() - addedTime
  return ageMs >= 0 && ageMs <= RECENTLY_ADDED_WINDOW_MS
}

export function useVideoLibrary() {
  const selectedFolder = DEFAULT_MOVIES_FOLDER
  const scanInFlightRef = useRef(false)
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
    if (scanInFlightRef.current) {
      return
    }

    scanInFlightRef.current = true
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
      scanInFlightRef.current = false
      setIsScanning(false)
    }
  }, [])

  useEffect(() => {
    void scanDefaultMoviesFolder()
  }, [scanDefaultMoviesFolder])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void scanDefaultMoviesFolder()
    }, AUTO_REFRESH_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
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

  const continueWatchingVideos = useMemo(() => {
    return sortByDateDesc(
      filteredVideos.filter((video) => video.progress > 0 && video.progress < 100),
      'lastPlayedAt'
    )
  }, [filteredVideos])

  const recentlyAddedVideos = useMemo(() => {
    return sortByDateDesc(filteredVideos.filter(isRecentlyAdded), 'addedAt').slice(0, 24)
  }, [filteredVideos])

  const videoSections = useMemo<VideoSection[]>(() => {
    const sections: VideoSection[] = []
    const categorizedIds = new Set<string>()

    if (continueWatchingVideos.length) {
      sections.push({
        key: 'continue-watching',
        title: 'Continue Watching',
        description: 'Pick up from where you left off.',
        accent: 'Keep watching',
        videos: continueWatchingVideos
      })
    }

    if (recentlyAddedVideos.length) {
      sections.push({
        key: 'recently-added',
        title: 'Recently Added',
        description: 'Fresh from your local movies folder.',
        accent: 'New in UFlix',
        videos: recentlyAddedVideos
      })
    }

    for (const rule of genreRules) {
      const videos = filteredVideos.filter((video) => matchesGenre(video, rule.keywords))

      if (!videos.length) {
        continue
      }

      videos.forEach((video) => categorizedIds.add(video.id))
      sections.push({
        key: rule.key,
        title: rule.title,
        description: rule.description,
        accent: rule.accent,
        videos
      })
    }

    const otherMovies = filteredVideos.filter((video) => !categorizedIds.has(video.id))

    if (otherMovies.length) {
      sections.push({
        key: 'other-movies',
        title: 'Other Movies',
        description: 'Everything else in your library.',
        accent: 'More to watch',
        videos: otherMovies
      })
    }

    return sections
  }, [continueWatchingVideos, filteredVideos, recentlyAddedVideos])

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
    refreshLibrary: scanDefaultMoviesFolder,
    recentlyPlayedVideos,
    savePlaybackProgress,
    searchQuery,
    selectedFolder,
    setSearchQuery,
    videoSections
  }
}
