import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useRef } from 'react'
import type { VideoItem } from '../types/video'
import { VideoCard } from './VideoCard'

interface VideoRowProps {
  title: string
  description: string
  accent?: string
  videos: VideoItem[]
  onPlay: (video: VideoItem) => void
  onMoreInfo: (video: VideoItem) => void
}

export function VideoRow({
  title,
  description,
  accent,
  videos,
  onPlay,
  onMoreInfo
}: VideoRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null)

  const scrollByPage = useCallback((direction: 'left' | 'right') => {
    const row = rowRef.current

    if (!row) {
      return
    }

    row.scrollBy({
      left: row.clientWidth * (direction === 'left' ? -0.82 : 0.82),
      behavior: 'smooth'
    })
  }, [])

  if (!videos.length) {
    return null
  }

  return (
    <section className="group/row space-y-3 sm:space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          {accent ? (
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-red-300/90">
              {accent}
            </p>
          ) : null}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-white sm:text-2xl">{title}</h3>
              <span className="rounded-full border border-white/10 bg-white/7 px-2 py-0.5 text-[0.68rem] font-medium text-slate-300">
                {videos.length}
              </span>
            </div>
            <p className="max-w-2xl text-xs leading-5 text-slate-300/72 sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollByPage('left')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white opacity-80 shadow-[0_16px_36px_rgba(0,0,0,0.38)] backdrop-blur-xl transition hover:border-red-300/40 hover:bg-red-500/15 hover:opacity-100 group-hover/row:opacity-100"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage('right')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white opacity-80 shadow-[0_16px_36px_rgba(0,0,0,0.38)] backdrop-blur-xl transition hover:border-red-300/40 hover:bg-red-500/15 hover:opacity-100 group-hover/row:opacity-100"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="no-scrollbar grid auto-cols-[minmax(150px,42vw)] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-5 pt-1 sm:auto-cols-[minmax(178px,210px)] sm:gap-4 lg:auto-cols-[minmax(198px,230px)]"
      >
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onPlay={onPlay}
            onMoreInfo={onMoreInfo}
          />
        ))}
      </div>
    </section>
  )
}
