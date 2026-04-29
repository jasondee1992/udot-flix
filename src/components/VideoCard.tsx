import { useEffect, useRef, useState } from 'react'
import { Info, Play } from 'lucide-react'
import type { VideoItem } from '../types/video'

interface VideoCardProps {
  video: VideoItem
  onPlay: (video: VideoItem) => void
  onMoreInfo: (video: VideoItem) => void
}

export function VideoCard({ video, onPlay, onMoreInfo }: VideoCardProps) {
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false)
  const previewSource = shouldLoadPreview && video.filePath ? `${video.filePath}#t=1` : null

  useEffect(() => {
    if (shouldLoadPreview) {
      return
    }

    const target = previewRef.current

    if (!target) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadPreview(true)
          observer.disconnect()
        }
      },
      { rootMargin: '320px' }
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [shouldLoadPreview])

  return (
    <article className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_18px_44px_rgba(2,6,23,0.34)] backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-cyan-300/30 hover:shadow-[0_24px_54px_rgba(6,24,46,0.48)]">
      <div ref={previewRef} className="relative aspect-video overflow-hidden bg-slate-950">
        {previewSource ? (
          <video
            src={previewSource}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75"
            aria-label={`${video.title} preview`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400">
            <Play size={28} fill="currentColor" />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {video.badge}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-100">
            {video.isLocal ? 'Local' : video.extension}
          </span>
        </div>

        <div className="absolute inset-0 flex translate-y-3 flex-col justify-end bg-gradient-to-t from-[#03050d] via-[#03050d]/70 to-transparent px-4 pb-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPlay(video)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950 transition hover:scale-105"
              aria-label={`Play ${video.title}`}
            >
              <Play size={16} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => onMoreInfo(video)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:scale-105"
              aria-label={`More information for ${video.title}`}
            >
              <Info size={16} />
            </button>
          </div>

          <p className="line-clamp-3 mt-3 text-sm leading-6 text-slate-200/85">
            {video.description}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-white">{video.title}</h4>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              {video.category}
            </p>
          </div>

          <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-100">
            {video.extension}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300/75">
          <span>{video.year}</span>
          <span className="h-1 w-1 rounded-full bg-slate-500" />
          <span>{video.duration}</span>
          {video.fileSize ? (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              <span>{video.fileSize}</span>
            </>
          ) : null}
        </div>

        {video.progress > 0 ? (
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                style={{ width: `${video.progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-300/70">{video.progress}% watched</p>
          </div>
        ) : (
          <p className="text-xs text-slate-300/70">
            {video.isLocal ? 'Ready for offline playback' : 'Preview item for UI mode'}
          </p>
        )}
      </div>
    </article>
  )
}
