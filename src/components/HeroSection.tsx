import { Info, Play } from 'lucide-react'
import type { VideoItem } from '../types/video'

interface HeroSectionProps {
  video: VideoItem
  hasLocalVideos: boolean
  lastScanLabel: string
  onPlay: () => void
  onMoreInfo: () => void
}

export function HeroSection({
  video,
  hasLocalVideos,
  lastScanLabel,
  onPlay,
  onMoreInfo
}: HeroSectionProps) {
  const previewSource = video.filePath ? `${video.filePath}#t=1` : null
  const backdropSource = video.backdrop

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-950">
        {backdropSource ? (
          <img
            src={backdropSource}
            alt={video.title}
            className="h-full w-full object-cover opacity-40"
            aria-hidden="true"
          />
        ) : previewSource ? (
          <video
            src={previewSource}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover opacity-35"
            aria-hidden="true"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,12,0.94)_0%,rgba(4,5,12,0.62)_48%,rgba(4,5,12,0.9)_100%),linear-gradient(180deg,rgba(4,5,12,0.14)_0%,rgba(4,5,12,0.96)_92%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[34rem] w-full max-w-[1600px] items-end px-4 pb-16 pt-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl rounded-[28px] border border-white/10 bg-slate-950/35 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
            {hasLocalVideos ? lastScanLabel : 'Movies folder'}
          </p>

          <h2 className="mt-3 text-4xl font-semibold leading-none text-white sm:text-6xl">
            {video.title}
          </h2>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span>{video.year}</span>
            {video.duration ? (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-500" />
                <span>{video.duration}</span>
              </>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onPlay}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.32)] transition hover:-translate-y-0.5"
            >
              <Play size={18} fill="currentColor" />
              <span>Play</span>
            </button>

            <button
              type="button"
              onClick={onMoreInfo}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-5 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/12"
            >
              <Info size={18} />
              <span>More Info</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
