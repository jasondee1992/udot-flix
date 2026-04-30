import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Captions,
  HardDriveDownload,
  Info,
  LoaderCircle,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX
} from 'lucide-react'
import type { VideoItem } from '../types/video'

interface VideoPlayerProps {
  video: VideoItem
  autoplay: boolean
  onClose: () => void
  onSaveProgress: (
    videoId: string,
    currentTime: number,
    durationSeconds: number,
    completed?: boolean
  ) => void
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00'
  }

  const roundedSeconds = Math.floor(seconds)
  const hours = Math.floor(roundedSeconds / 3600)
  const minutes = Math.floor((roundedSeconds % 3600) / 60)
  const remainingSeconds = roundedSeconds % 60

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value) => value.toString().padStart(2, '0'))
      .join(':')
  }

  return [minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

function buildSliderBackground(progressPercent: number, activeColor: string) {
  return {
    background: `linear-gradient(90deg, ${activeColor} 0%, ${activeColor} ${progressPercent}%, rgba(255,255,255,0.18) ${progressPercent}%, rgba(255,255,255,0.18) 100%)`
  }
}

function getValidDuration(duration: number) {
  return Number.isFinite(duration) && duration > 0 ? duration : 0
}

function parseDurationLabel(durationLabel: string) {
  const parts = durationLabel
    .split(':')
    .map((part) => Number(part))

  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((part) => !Number.isFinite(part) || part < 0)
  ) {
    return 0
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  const [minutes, seconds] = parts
  return minutes * 60 + seconds
}

function buildTranscodePath(source: string, startSeconds: number) {
  const [pathname, query = ''] = source.split('?')
  const params = new URLSearchParams(query)
  params.set('start', Math.max(0, startSeconds).toFixed(3))

  return `${pathname}?${params.toString()}`
}

function buildSubtitlePath(source: string, startSeconds: number) {
  if (startSeconds <= 0) {
    return source
  }

  const [pathname, query = ''] = source.split('?')
  const params = new URLSearchParams(query)
  params.set('start', Math.max(0, startSeconds).toFixed(3))

  return `${pathname}?${params.toString()}`
}

export function VideoPlayer({
  video,
  autoplay,
  onClose,
  onSaveProgress
}: VideoPlayerProps) {
  const playerShellRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastSavedRef = useRef(0)
  const lastNonZeroVolumeRef = useRef(1)
  const shouldPlayAfterSeekRef = useRef(false)
  const [currentTime, setCurrentTime] = useState(video.resumeTime)
  const metadataDuration = getValidDuration(video.durationSeconds ?? parseDurationLabel(video.duration))
  const [duration, setDuration] = useState(metadataDuration)
  const [transcodeStartTime, setTranscodeStartTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoplay)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null)
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [isSeekingMedia, setIsSeekingMedia] = useState(false)
  const [isBuffering, setIsBuffering] = useState(Boolean(autoplay))
  const [activityTick, setActivityTick] = useState(0)

  const isTranscodedPlayback = Boolean(video.playbackPath?.startsWith('/api/transcode'))
  const videoSource = useMemo(() => {
    const source = video.playbackPath ?? video.filePath ?? null

    if (!source) {
      return null
    }

    return isTranscodedPlayback ? buildTranscodePath(source, transcodeStartTime) : source
  }, [isTranscodedPlayback, transcodeStartTime, video.filePath, video.playbackPath])

  const safeDuration = metadataDuration || getValidDuration(duration)
  const clampedCurrentTime = Math.min(Math.max(currentTime, 0), safeDuration || 0)
  const progressPercent = safeDuration ? Math.min((clampedCurrentTime / safeDuration) * 100, 100) : 0
  const volumePercent = Math.round((isMuted ? 0 : volume) * 100)
  const infoDuration = video.duration || formatTime(safeDuration)
  const subtitleTracks = video.subtitles ?? []
  const timedSubtitleTracks = useMemo(() => {
    return subtitleTracks.map((subtitle) => ({
      ...subtitle,
      url: isTranscodedPlayback ? buildSubtitlePath(subtitle.url, transcodeStartTime) : subtitle.url
    }))
  }, [isTranscodedPlayback, subtitleTracks, transcodeStartTime])
  const hasSubtitles = subtitleTracks.length > 0
  const closePlayback = useCallback(() => {
    const element = videoRef.current
    const progressTime = isTranscodedPlayback ? currentTime : element?.currentTime
    const progressDuration = safeDuration || getValidDuration(element?.duration ?? 0)

    if (typeof progressTime === 'number' && progressDuration > 0) {
      onSaveProgress(video.id, progressTime, progressDuration)
    }

    if (element) {
      element.pause()
    }

    onClose()
  }, [currentTime, isTranscodedPlayback, onClose, onSaveProgress, safeDuration, video.id])

  useEffect(() => {
    const resumeTime = Math.max(video.resumeTime, 0)
    setCurrentTime(resumeTime)
    setDuration(metadataDuration)
    setTranscodeStartTime(isTranscodedPlayback && resumeTime > 0 ? resumeTime : 0)
    setIsPlaying(autoplay)
    setIsBuffering(Boolean(autoplay))
    setIsSeekingMedia(false)
    setControlsVisible(true)
    setIsInfoOpen(false)
    setSelectedSubtitleIndex(null)
    setIsSubtitleMenuOpen(false)
    setIsScrubbing(false)
  }, [autoplay, isTranscodedPlayback, metadataDuration, video.id, video.resumeTime])

  useEffect(() => {
    const element = videoRef.current

    if (!element) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      Array.from(element.textTracks).forEach((track, index) => {
        track.mode = selectedSubtitleIndex === index ? 'showing' : 'disabled'
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [selectedSubtitleIndex, timedSubtitleTracks.length, video.id, videoSource])

  const markActivity = useCallback(() => {
    setControlsVisible(true)
    setActivityTick(Date.now())
  }, [])

  const togglePlayback = useCallback(() => {
    const element = videoRef.current

    if (!element) {
      return
    }

    markActivity()

    if (element.paused) {
      void element.play()
      return
    }

    element.pause()
  }, [markActivity])

  const seekTo = useCallback((nextTime: number) => {
    const element = videoRef.current

    if (!safeDuration) {
      return
    }

    const boundedTime = Math.min(Math.max(nextTime, 0), safeDuration)
    shouldPlayAfterSeekRef.current = Boolean(element && !element.paused)
    setCurrentTime(boundedTime)
    setIsSeekingMedia(true)
    setIsBuffering(true)
    markActivity()

    if (isTranscodedPlayback) {
      lastSavedRef.current = boundedTime
      setTranscodeStartTime(boundedTime)
      return
    }

    if (element) {
      element.currentTime = boundedTime
    }
  }, [isTranscodedPlayback, markActivity, safeDuration])

  const seekBy = useCallback((seconds: number) => {
    const element = videoRef.current
    const baseTime = isTranscodedPlayback ? currentTime : element?.currentTime

    if (typeof baseTime !== 'number' || !safeDuration) {
      return
    }

    seekTo(baseTime + seconds)
  }, [currentTime, isTranscodedPlayback, safeDuration, seekTo])

  const setPlayerVolume = useCallback((nextVolume: number) => {
    const element = videoRef.current
    const boundedVolume = Math.min(Math.max(nextVolume, 0), 1)

    setVolume(boundedVolume)
    setIsMuted(boundedVolume === 0)

    if (boundedVolume > 0) {
      lastNonZeroVolumeRef.current = boundedVolume
    }

    if (!element) {
      return
    }

    element.volume = boundedVolume
    element.muted = boundedVolume === 0
  }, [])

  const adjustVolumeBy = useCallback((delta: number) => {
    markActivity()
    setPlayerVolume((isMuted ? lastNonZeroVolumeRef.current : volume) + delta)
  }, [isMuted, markActivity, setPlayerVolume, volume])

  const toggleMute = useCallback(() => {
    const element = videoRef.current
    markActivity()

    if (!element) {
      setIsMuted((previous) => !previous)
      return
    }

    if (element.muted || element.volume === 0 || isMuted) {
      const restoredVolume = lastNonZeroVolumeRef.current > 0 ? lastNonZeroVolumeRef.current : 1
      setPlayerVolume(restoredVolume)
      return
    }

    if (element.volume > 0) {
      lastNonZeroVolumeRef.current = element.volume
    }

    element.muted = true
    setIsMuted(true)
  }, [isMuted, markActivity, setPlayerVolume])

  const toggleFullscreen = useCallback(async () => {
    markActivity()

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    if (playerShellRef.current) {
      await playerShellRef.current.requestFullscreen()
    }
  }, [markActivity])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerShellRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!controlsVisible || !isPlaying || isScrubbing || isInfoOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setControlsVisible(false)
    }, 2600)

    return () => window.clearTimeout(timeoutId)
  }, [activityTick, controlsVisible, isInfoOpen, isPlaying, isScrubbing])

  useEffect(() => {
    if (!isPlaying || isScrubbing || isInfoOpen) {
      setControlsVisible(true)
    }
  }, [isInfoOpen, isPlaying, isScrubbing])

  useEffect(() => {
    if (!isScrubbing) {
      return
    }

    const stopScrubbing = () => setIsScrubbing(false)

    window.addEventListener('pointerup', stopScrubbing)
    window.addEventListener('touchend', stopScrubbing)

    return () => {
      window.removeEventListener('pointerup', stopScrubbing)
      window.removeEventListener('touchend', stopScrubbing)
    }
  }, [isScrubbing])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement && target.type === 'range' && event.key !== 'Escape') {
        return
      }

      switch (event.key) {
        case ' ':
          event.preventDefault()
          togglePlayback()
          break
        case 'ArrowLeft':
          event.preventDefault()
          seekBy(-10)
          break
        case 'ArrowRight':
          event.preventDefault()
          seekBy(10)
          break
        case 'ArrowUp':
          event.preventDefault()
          adjustVolumeBy(0.1)
          break
        case 'ArrowDown':
          event.preventDefault()
          adjustVolumeBy(-0.1)
          break
        case 'f':
        case 'F':
          event.preventDefault()
          void toggleFullscreen()
          break
        case 'm':
        case 'M':
          event.preventDefault()
          toggleMute()
          break
        case 'c':
        case 'C':
          if (hasSubtitles) {
            event.preventDefault()
            setSelectedSubtitleIndex((previous) => previous === null ? 0 : null)
            setIsSubtitleMenuOpen(false)
            markActivity()
          }
          break
        case 'Escape':
          event.preventDefault()
          if (document.fullscreenElement) {
            void document.exitFullscreen()
            return
          }

          if (isInfoOpen) {
            setIsInfoOpen(false)
            return
          }

          closePlayback()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adjustVolumeBy, closePlayback, hasSubtitles, isInfoOpen, markActivity, seekBy, toggleFullscreen, toggleMute, togglePlayback])

  const volumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const VolumeIcon = volumeIcon

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div
        ref={playerShellRef}
        className={`relative h-full w-full overflow-hidden bg-black ${controlsVisible ? 'cursor-default' : 'cursor-none'}`}
        onMouseMove={markActivity}
        onMouseDown={markActivity}
        onTouchStart={markActivity}
      >
        {video.backdrop ? (
          <img
            src={video.backdrop}
            alt={video.title}
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.18] blur-3xl"
            aria-hidden="true"
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(12,18,31,0.28),rgba(0,0,0,0.86)_72%)]" />

        {videoSource ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoSource}
                autoPlay={autoplay}
                preload="metadata"
                playsInline
                className="h-full w-full cursor-pointer bg-black object-contain"
                onClick={() => {
                  if (!controlsVisible) {
                    markActivity()
                    return
                  }

                  togglePlayback()
                }}
                onLoadedMetadata={(event) => {
                  const currentTarget = event.currentTarget
                  const elementDuration = getValidDuration(currentTarget.duration)
                  setDuration(metadataDuration || elementDuration)
                  setVolume(currentTarget.volume)
                  setIsMuted(currentTarget.muted)

                  Array.from(currentTarget.textTracks).forEach((track, index) => {
                    track.mode = selectedSubtitleIndex === index ? 'showing' : 'disabled'
                  })

                  if (isTranscodedPlayback) {
                    setCurrentTime(transcodeStartTime + currentTarget.currentTime)
                    return
                  }

                  if (video.resumeTime > 0 && safeDuration > 0 && video.resumeTime < safeDuration - 5) {
                    currentTarget.currentTime = video.resumeTime
                    setCurrentTime(video.resumeTime)
                    return
                  }

                  setCurrentTime(currentTarget.currentTime)
                }}
                onDurationChange={(event) => {
                  const elementDuration = getValidDuration(event.currentTarget.duration)

                  if (!metadataDuration && elementDuration > 0) {
                    setDuration(elementDuration)
                  }
                }}
                onCanPlay={(event) => {
                  setIsBuffering(false)

                  if (shouldPlayAfterSeekRef.current) {
                    shouldPlayAfterSeekRef.current = false
                    void event.currentTarget.play()
                  }
                }}
                onPlay={() => {
                  setIsPlaying(true)
                  setIsBuffering(false)
                  markActivity()
                }}
                onPause={(event) => {
                  const currentTarget = event.currentTarget
                  const progressTime = isTranscodedPlayback
                    ? transcodeStartTime + currentTarget.currentTime
                    : currentTarget.currentTime
                  const progressDuration = safeDuration || getValidDuration(currentTarget.duration)
                  setIsPlaying(false)
                  setIsBuffering(false)

                  if (!isSeekingMedia && progressDuration > 0) {
                    onSaveProgress(video.id, progressTime, progressDuration)
                  }
                }}
                onWaiting={() => {
                  setIsBuffering(true)
                }}
                onVolumeChange={(event) => {
                  setVolume(event.currentTarget.volume)
                  setIsMuted(event.currentTarget.muted || event.currentTarget.volume === 0)
                }}
                onSeeking={(event) => {
                  const nextTime = isTranscodedPlayback
                    ? transcodeStartTime + event.currentTarget.currentTime
                    : event.currentTarget.currentTime
                  setCurrentTime(nextTime)
                  setIsSeekingMedia(true)
                  setIsBuffering(true)
                }}
                onSeeked={(event) => {
                  const nextTime = isTranscodedPlayback
                    ? transcodeStartTime + event.currentTarget.currentTime
                    : event.currentTarget.currentTime
                  setCurrentTime(nextTime)
                  setIsSeekingMedia(false)
                  setIsBuffering(false)
                }}
                onTimeUpdate={(event) => {
                  const currentTarget = event.currentTarget
                  const elementDuration = getValidDuration(currentTarget.duration)
                  const progressDuration = safeDuration || elementDuration

                  if (progressDuration <= 0) {
                    return
                  }

                  const progressTime = isTranscodedPlayback
                    ? Math.min(transcodeStartTime + currentTarget.currentTime, progressDuration)
                    : currentTarget.currentTime

                  if (!isScrubbing) {
                    setCurrentTime(progressTime)
                  }

                  if (!metadataDuration && elementDuration > 0) {
                    setDuration(elementDuration)
                  }

                  if (progressTime - lastSavedRef.current >= 5) {
                    lastSavedRef.current = progressTime
                    onSaveProgress(video.id, progressTime, progressDuration)
                  }
                }}
                onEnded={(event) => {
                  const currentTarget = event.currentTarget
                  const progressDuration = safeDuration || getValidDuration(currentTarget.duration)
                  setIsPlaying(false)
                  setIsBuffering(false)
                  setIsSeekingMedia(false)
                  setCurrentTime(progressDuration)

                  if (progressDuration > 0) {
                    onSaveProgress(video.id, progressDuration, progressDuration, true)
                  }
                }}
              >
                {timedSubtitleTracks.map((subtitle) => (
                  <track
                    key={subtitle.url}
                    kind="subtitles"
                    src={subtitle.url}
                    srcLang={subtitle.srcLang}
                    label={subtitle.label}
                  />
                ))}
              </video>
            </div>

            {isBuffering || isSeekingMedia ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/55 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl">
                  <LoaderCircle size={16} className="animate-spin text-cyan-200" />
                  <span>{isSeekingMedia ? 'Seeking...' : 'Buffering...'}</span>
                </div>
              </div>
            ) : null}

            {!isPlaying ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="pointer-events-auto inline-flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:scale-105"
                  aria-label="Play video"
                >
                  <Play size={28} fill="currentColor" />
                </button>
              </div>
            ) : null}

            <div
              className={`absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/78 via-black/30 to-transparent px-4 pb-10 pt-4 transition duration-300 sm:px-6 ${controlsVisible || isInfoOpen ? 'opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={closePlayback}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white backdrop-blur-xl transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
                    aria-label="Close playback"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                      Udot Home Cinema
                    </p>
                    <h2 className="truncate text-lg font-semibold text-white sm:text-2xl">
                      {video.title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsInfoOpen((previous) => !previous)
                    markActivity()
                  }}
                  className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium text-white backdrop-blur-xl transition ${
                    isInfoOpen
                      ? 'border-cyan-300/35 bg-cyan-400/14'
                      : 'border-white/10 bg-white/8 hover:border-cyan-300/30 hover:bg-cyan-400/10'
                  }`}
                  aria-pressed={isInfoOpen}
                >
                  <Info size={16} />
                  <span>Info</span>
                </button>
              </div>
            </div>

            <div
              className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/88 via-black/48 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 transition duration-300 sm:px-6 ${controlsVisible || isInfoOpen ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
              onMouseMove={markActivity}
            >
              <div className="mx-auto w-full max-w-7xl space-y-3">
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={safeDuration || 0}
                    step={0.1}
                    value={Math.min(clampedCurrentTime, safeDuration || 0)}
                    disabled={safeDuration <= 0}
                    onPointerDown={() => {
                      setIsScrubbing(true)
                      markActivity()
                    }}
                    onInput={(event) => {
                      const nextTime = Number((event.target as HTMLInputElement).value)
                      setCurrentTime(nextTime)
                    }}
                    onChange={(event) => {
                      seekTo(Number(event.target.value))
                    }}
                    className="player-range h-1.5 w-full cursor-pointer appearance-none rounded-full"
                    style={buildSliderBackground(progressPercent, 'rgba(34, 211, 238, 0.98)')}
                    aria-label="Scrub video"
                  />
                  <div className="flex items-center justify-between text-sm font-medium tabular-nums text-slate-100">
                    <span>{formatTime(clampedCurrentTime)}</span>
                    <span>{formatTime(safeDuration)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => seekBy(-10)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white backdrop-blur-xl transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
                      aria-label="Back 10 seconds"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={togglePlayback}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_18px_36px_rgba(0,0,0,0.28)] transition hover:scale-105"
                      aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    >
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => seekBy(10)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white backdrop-blur-xl transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
                      aria-label="Forward 10 seconds"
                    >
                      <RotateCw size={18} />
                    </button>

                    <div className="ml-0 flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-xl sm:ml-2">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/10"
                        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      >
                        <VolumeIcon size={18} />
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={(event) => {
                          setPlayerVolume(Number(event.target.value))
                          markActivity()
                        }}
                        className="player-volume-range h-1.5 w-24 cursor-pointer appearance-none rounded-full sm:w-28"
                        style={buildSliderBackground(volumePercent, 'rgba(255,255,255,0.95)')}
                        aria-label="Adjust volume"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    {hasSubtitles ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSubtitleMenuOpen((previous) => !previous)
                            markActivity()
                          }}
                          className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium text-white backdrop-blur-xl transition ${
                            selectedSubtitleIndex !== null
                              ? 'border-red-300/45 bg-red-500/18'
                              : 'border-white/10 bg-white/8 hover:border-red-300/35 hover:bg-red-500/12'
                          }`}
                          aria-haspopup="menu"
                          aria-expanded={isSubtitleMenuOpen}
                          aria-label="Subtitle options"
                        >
                          <Captions size={17} />
                          <span>CC</span>
                        </button>

                        {isSubtitleMenuOpen ? (
                          <div className="absolute bottom-14 right-0 w-48 overflow-hidden rounded-2xl border border-white/10 bg-black/82 p-1.5 text-sm text-white shadow-[0_22px_60px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubtitleIndex(null)
                                setIsSubtitleMenuOpen(false)
                                markActivity()
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/10 ${
                                selectedSubtitleIndex === null ? 'text-red-200' : 'text-slate-100'
                              }`}
                            >
                              <span>Off</span>
                              {selectedSubtitleIndex === null ? <span className="text-xs">On</span> : null}
                            </button>

                            {subtitleTracks.map((subtitle, index) => (
                              <button
                                key={subtitle.url}
                                type="button"
                                onClick={() => {
                                  setSelectedSubtitleIndex(index)
                                  setIsSubtitleMenuOpen(false)
                                  markActivity()
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/10 ${
                                  selectedSubtitleIndex === index ? 'text-red-200' : 'text-slate-100'
                                }`}
                              >
                                <span>{subtitle.label}</span>
                                {selectedSubtitleIndex === index ? <span className="text-xs">On</span> : null}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setIsInfoOpen((previous) => !previous)
                        markActivity()
                      }}
                      className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium text-white backdrop-blur-xl transition ${
                        isInfoOpen
                          ? 'border-cyan-300/35 bg-cyan-400/14'
                          : 'border-white/10 bg-white/8 hover:border-cyan-300/30 hover:bg-cyan-400/10'
                      }`}
                      aria-pressed={isInfoOpen}
                    >
                      <Info size={16} />
                      <span>Info</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleFullscreen()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white backdrop-blur-xl transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <aside
              className={`absolute z-30 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/72 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition duration-300 ${
                isInfoOpen
                  ? 'pointer-events-auto translate-y-0 opacity-100 sm:translate-x-0'
                  : 'pointer-events-none translate-y-4 opacity-0 sm:translate-x-6 sm:translate-y-0'
              } inset-x-4 bottom-24 max-h-[55vh] p-5 sm:inset-y-20 sm:bottom-auto sm:left-auto sm:right-6 sm:w-[360px] sm:max-h-none`}
            >
              <div className="no-scrollbar h-full overflow-y-auto">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                      Now Playing
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{video.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInfoOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
                    aria-label="Hide metadata"
                  >
                    <Info size={16} />
                  </button>
                </div>

                {video.description ? (
                  <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm leading-7 text-slate-200/85">{video.description}</p>
                  </div>
                ) : null}

                <dl className="space-y-3 text-sm text-slate-300/80">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-400">Duration</dt>
                    <dd className="text-right font-medium tabular-nums text-slate-100">
                      {infoDuration || formatTime(safeDuration)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-400">Current time</dt>
                    <dd className="text-right font-medium tabular-nums text-slate-100">
                      {formatTime(clampedCurrentTime)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-400">File name</dt>
                    <dd className="max-w-[70%] text-right text-slate-100">{video.fileName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-400">Added</dt>
                    <dd className="max-w-[70%] text-right text-slate-100">
                      {video.addedAt ? new Date(video.addedAt).toLocaleString() : 'Unknown'}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-400">Resume progress</dt>
                    <dd className="text-right text-slate-100">{video.progress}%</dd>
                  </div>
                  {video.filePath ? (
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-400">Path</dt>
                      <dd className="max-w-[70%] break-all text-right font-mono text-xs text-slate-100">
                        {video.filePath}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </aside>
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/6 text-cyan-300">
                <HardDriveDownload size={24} />
              </div>
              <h4 className="text-xl font-semibold text-white">Local file not attached yet</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300/80">
                This entry is missing a playable file URL. Add supported video files to the movies folder and refresh the web app.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
