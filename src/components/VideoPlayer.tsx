import { useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, HardDriveDownload, Info } from 'lucide-react'
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

export function VideoPlayer({
  video,
  autoplay,
  onClose,
  onSaveProgress
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastSavedRef = useRef(0)

  const videoSource = useMemo(() => {
    return video.filePath ?? null
  }, [video.filePath])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xl">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#060916] shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              {video.isLocal ? 'Offline playback' : 'Preview details'}
            </p>
            <h3 className="truncate text-xl font-semibold text-white">{video.title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
          >
            <ArrowLeft size={16} />
            <span>Close</span>
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.6fr)_360px]">
          <div className="bg-black">
            {videoSource ? (
              <video
                ref={videoRef}
                src={videoSource}
                autoPlay={autoplay}
                controls
                preload="metadata"
                playsInline
                className="aspect-video w-full bg-black"
                onLoadedMetadata={() => {
                  if (!videoRef.current) {
                    return
                  }

                  if (video.resumeTime > 0 && video.resumeTime < videoRef.current.duration - 5) {
                    videoRef.current.currentTime = video.resumeTime
                  }
                }}
                onTimeUpdate={(event) => {
                  const currentTarget = event.currentTarget
                  if (!Number.isFinite(currentTarget.duration) || currentTarget.duration <= 0) {
                    return
                  }

                  if (currentTarget.currentTime - lastSavedRef.current >= 5) {
                    lastSavedRef.current = currentTarget.currentTime
                    onSaveProgress(video.id, currentTarget.currentTime, currentTarget.duration)
                  }
                }}
                onPause={(event) => {
                  const currentTarget = event.currentTarget
                  if (Number.isFinite(currentTarget.duration) && currentTarget.duration > 0) {
                    onSaveProgress(video.id, currentTarget.currentTime, currentTarget.duration)
                  }
                }}
                onEnded={(event) => {
                  const currentTarget = event.currentTarget
                  if (Number.isFinite(currentTarget.duration) && currentTarget.duration > 0) {
                    onSaveProgress(video.id, currentTarget.duration, currentTarget.duration, true)
                  }
                }}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8">
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

          <aside className="space-y-5 border-t border-white/10 bg-white/[0.03] p-5 lg:border-l lg:border-t-0">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                Metadata
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-100">
                  {video.extension}
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-100">
                  {video.duration}
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-100">
                  {video.isLocal ? 'Local video' : 'Dummy preview'}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-200">
                <Info size={16} />
                <span className="text-sm font-semibold">About this item</span>
              </div>
              <p className="text-sm leading-7 text-slate-300/80">{video.description}</p>
            </div>

            <dl className="space-y-3 text-sm text-slate-300/80">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-400">File name</dt>
                <dd className="max-w-[70%] text-right text-slate-100">{video.fileName}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-400">Category</dt>
                <dd className="text-right text-slate-100">{video.category}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-400">Added</dt>
                <dd className="text-right text-slate-100">{video.addedAt ? new Date(video.addedAt).toLocaleString() : 'Unknown'}</dd>
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
          </aside>
        </div>
      </div>
    </div>
  )
}
