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
  const backdropSource = video.backdrop && video.backdrop !== video.filePath ? video.backdrop : null

  return (
    <section className="relative min-h-[56vh] overflow-hidden sm:min-h-[66vh] lg:min-h-[72vh]">
      <div className="absolute inset-0 bg-[#050507]">
        {backdropSource ? (
          <img
            src={backdropSource}
            alt={video.title}
            className="h-full w-full scale-105 object-cover opacity-45 blur-[1px]"
            aria-hidden="true"
          />
        ) : previewSource ? (
          <video
            src={previewSource}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full scale-105 object-cover opacity-40 blur-[1px]"
            aria-hidden="true"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,7,0.98)_0%,rgba(5,5,7,0.76)_45%,rgba(5,5,7,0.34)_72%,rgba(5,5,7,0.92)_100%),linear-gradient(180deg,rgba(5,5,7,0.10)_0%,rgba(5,5,7,0.42)_52%,rgba(5,5,7,0.98)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[56vh] w-full max-w-[1680px] items-end px-4 pb-20 pt-16 sm:min-h-[66vh] sm:px-6 sm:pb-24 lg:min-h-[72vh] lg:px-10">
        <div className="max-w-4xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-red-200/85 sm:text-xs sm:tracking-[0.32em]">
            {hasLocalVideos ? lastScanLabel : 'Movies folder'}
          </p>

          <h2 className="mt-3 max-w-4xl text-3xl font-black leading-[1.04] text-white drop-shadow-[0_10px_32px_rgba(0,0,0,0.72)] sm:mt-4 sm:text-5xl lg:text-6xl">
            {video.title}
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-200 sm:mt-6 sm:gap-3 sm:text-sm">
            <span>{video.year}</span>
            {video.duration ? (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-400" />
                <span>{video.duration}</span>
              </>
            ) : null}
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            <span className="rounded border border-white/20 px-1.5 py-0.5 text-[0.7rem] uppercase tracking-[0.14em] text-slate-100">
              {video.extension}
            </span>
          </div>

          <div className="mt-6 flex max-w-sm flex-col gap-3 sm:mt-8 sm:max-w-none sm:flex-row">
            <button
              type="button"
              onClick={onPlay}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-bold text-black shadow-[0_18px_48px_rgba(255,255,255,0.16)] transition hover:scale-[1.03] hover:bg-red-50 sm:px-7 sm:py-3.5"
            >
              <Play size={18} fill="currentColor" />
              <span>Play</span>
            </button>

            <button
              type="button"
              onClick={onMoreInfo}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/12 bg-white/16 px-6 py-3 text-sm font-bold text-white shadow-[0_18px_48px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:scale-[1.03] hover:bg-white/24 sm:px-7 sm:py-3.5"
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
