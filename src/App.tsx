import { useMemo } from 'react'
import { EmptyState } from './components/EmptyState'
import { HeroSection } from './components/HeroSection'
import { Navbar } from './components/Navbar'
import { VideoPlayer } from './components/VideoPlayer'
import { VideoRow } from './components/VideoRow'
import { useVideoLibrary } from './hooks/useVideoLibrary'

function LibrarySkeleton() {
  return (
    <section className="space-y-8">
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <div key={rowIndex} className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="h-7 w-48 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="grid grid-flow-col auto-cols-[minmax(150px,42vw)] gap-3 overflow-hidden sm:auto-cols-[minmax(178px,210px)] sm:gap-4 lg:auto-cols-[minmax(198px,230px)]">
            {Array.from({ length: 7 }).map((__, itemIndex) => (
              <div
                key={itemIndex}
                className="overflow-hidden rounded-lg border border-white/8 bg-white/[0.04]"
              >
                <div className="aspect-[2/3] animate-pulse bg-white/8" />
                <div className="space-y-2 p-3">
                  <div className="h-4 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function App() {
  const {
    activePlayer,
    closePlayer,
    errorMessage,
    featuredVideo,
    filteredVideos,
    hasAnyVideos,
    hasLocalVideos,
    isScanning,
    lastScanLabel,
    openVideo,
    refreshLibrary,
    savePlaybackProgress,
    searchQuery,
    selectedFolder,
    setSearchQuery,
    videoSections
  } = useVideoLibrary()

  const libraryHeading = useMemo(() => {
    return `Streaming directly from the ${selectedFolder} folder`
  }, [selectedFolder])

  const renderLibrary = () => {
    if (isScanning && !hasAnyVideos) {
      return <LibrarySkeleton />
    }

    if (!filteredVideos.length) {
      return (
        <EmptyState
          title="No videos match this search."
          description="Try another title, clear the search box, or add supported videos to the movies folder."
          actionLabel="Refresh Library"
          onAction={refreshLibrary}
        />
      )
    }

    return (
      <section className="space-y-8 sm:space-y-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
              {searchQuery.trim() ? 'Search results' : 'Streaming now'}
            </p>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              {searchQuery.trim() ? `Results for "${searchQuery.trim()}"` : 'Browse UFlix'}
            </h2>
            <p className="max-w-3xl text-sm text-slate-300/80">{libraryHeading}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="w-fit rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-slate-300 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
              {filteredVideos.length} item{filteredVideos.length === 1 ? '' : 's'}
            </p>
            <p className="w-fit rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-slate-300 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
              {lastScanLabel}
            </p>
          </div>
        </div>

        {videoSections.map((section) => (
          <VideoRow
            key={section.key}
            title={section.title}
            description={section.description}
            accent={section.accent}
            videos={section.videos}
            onPlay={(video) => openVideo(video, true)}
            onMoreInfo={(video) => openVideo(video, false)}
          />
        ))}
      </section>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507] text-slate-50">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-[28rem] w-[36rem] bg-red-700/10 blur-[150px]" />
        <div className="absolute right-0 top-32 h-[34rem] w-[34rem] bg-zinc-500/8 blur-[150px]" />
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isScanning={isScanning}
        onRefresh={refreshLibrary}
      />

      <main className="relative z-10 pb-12">
        {featuredVideo ? (
          <HeroSection
            hasLocalVideos={hasLocalVideos}
            lastScanLabel={lastScanLabel}
            onMoreInfo={() => openVideo(featuredVideo, false)}
            onPlay={() => openVideo(featuredVideo, true)}
            video={featuredVideo}
          />
        ) : null}

        <div className={`mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 ${featuredVideo ? '-mt-16' : 'pt-10'}`}>
          {errorMessage ? (
            <div className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 backdrop-blur">
              {errorMessage}
            </div>
          ) : null}

          {!hasAnyVideos && !isScanning ? (
            <EmptyState
              title="No local videos loaded."
              description="Put MP4, MKV, WEBM, MOV, or AVI files inside D:\Projects\udot-flix\movies, then refresh the browser."
              actionLabel="Refresh Library"
              onAction={refreshLibrary}
            />
          ) : null}

          {hasAnyVideos || isScanning ? renderLibrary() : null}
        </div>
      </main>

      {activePlayer ? (
        <VideoPlayer
          autoplay={activePlayer.autoplay}
          onClose={closePlayer}
          onSaveProgress={savePlaybackProgress}
          video={activePlayer.video}
        />
      ) : null}
    </div>
  )
}

export default App
