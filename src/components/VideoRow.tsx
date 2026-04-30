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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
            Watch again
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-300/75">{description}</p>
          </div>
        </div>
      </div>

      <div className="no-scrollbar grid auto-cols-[minmax(260px,340px)] grid-flow-col gap-4 overflow-x-auto pb-5 pt-1 sm:auto-cols-[minmax(300px,380px)]">
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
