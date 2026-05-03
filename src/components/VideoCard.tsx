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
  const imageSource = shouldLoadPreview && video.thumbnail !== video.filePath ? video.thumbnail : null

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
    <article
      className="group snap-start cursor-pointer overflow-hidden rounded-lg border border-white/8 bg-[#111114] shadow-[0_18px_44px_rgba(0,0,0,0.42)] transition duration-300 md:hover:z-10 md:hover:-translate-y-1 md:hover:scale-[1.035] md:hover:border-red-400/35 md:hover:shadow-[0_26px_70px_rgba(0,0,0,0.72)]"
      onClick={() => onPlay(video)}
    >
      <div ref={previewRef} className="relative aspect-[2/3] overflow-hidden bg-[#0b0b0f]">
        {imageSource ? (
          <img
            src={imageSource}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75"
          />
        ) : previewSource ? (
          <video
            src={previewSource}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75"
            aria-label={`${video.title} preview`}
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-end bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.26),transparent_34%),linear-gradient(135deg,#18181c_0%,#09090c_70%)] p-4">
            <p className="line-clamp-2 max-w-[90%] text-lg font-black leading-tight text-white drop-shadow">
              {video.title}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-red-200/75">
              {video.extension}
            </p>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex justify-end p-3 opacity-0 transition duration-300 group-hover:opacity-100">
          <span className="rounded bg-black/70 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
            {video.extension}
          </span>
        </div>

        {video.progress > 0 ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/45">
            <div
              className="h-full bg-red-600"
              style={{ width: `${video.progress}%` }}
            />
          </div>
        ) : null}

        <div className="absolute inset-0 flex translate-y-4 flex-col justify-end bg-gradient-to-t from-black via-black/55 to-transparent px-3 pb-3 opacity-0 transition duration-300 md:group-hover:translate-y-0 md:group-hover:opacity-100 sm:px-4 sm:pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onPlay(video)
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_28px_rgba(255,255,255,0.18)] transition hover:scale-110 sm:h-10 sm:w-10"
              aria-label={`Play ${video.title}`}
            >
              <Play size={16} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onMoreInfo(video)
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white backdrop-blur transition hover:scale-110 hover:bg-white/20 sm:h-10 sm:w-10"
              aria-label={`More information for ${video.title}`}
            >
              <Info size={16} />
            </button>
          </div>
          <p className="line-clamp-2 mt-3 text-sm font-semibold leading-5 text-white">
            {video.title}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-3.5">
        <div>
          <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-white">
            {video.title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem] text-slate-300/75 sm:gap-2 sm:text-xs">
          <span>{video.year}</span>
          {video.duration ? (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              <span>{video.duration}</span>
            </>
          ) : null}
        </div>

        {video.progress > 0 ? (
          <div className="space-y-2">
            <div className="h-1 overflow-hidden rounded-full bg-white/8 sm:h-1.5">
              <div
                className="h-full rounded-full bg-red-600"
                style={{ width: `${video.progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-300/70">{video.progress}% watched</p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
