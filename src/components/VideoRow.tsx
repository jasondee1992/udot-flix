import { ChevronRight } from 'lucide-react'
import type { VideoItem } from '../types/video'
import { VideoCard } from './VideoCard'

interface VideoRowProps {
  title: string
  description: string
  videos: VideoItem[]
  onPlay: (video: VideoItem) => void
  onMoreInfo: (video: VideoItem) => void
}

export function VideoRow({
  title,
  description,
  videos,
  onPlay,
  onMoreInfo
}: VideoRowProps) {
  if (!videos.length) {
    return null
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Curated row
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-300/75">{description}</p>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
        >
          <span>Browse row</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="no-scrollbar grid auto-cols-[minmax(260px,300px)] grid-flow-col gap-5 overflow-x-auto pb-2">
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
