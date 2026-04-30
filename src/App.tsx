import { useMemo } from 'react'
import { EmptyState } from './components/EmptyState'
import { HeroSection } from './components/HeroSection'
import { Navbar } from './components/Navbar'
import { VideoCard } from './components/VideoCard'
import { VideoPlayer } from './components/VideoPlayer'
import { VideoRow } from './components/VideoRow'
import { useVideoLibrary } from './hooks/useVideoLibrary'

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
    recentlyPlayedVideos,
    savePlaybackProgress,
    searchQuery,
    selectedFolder,
    setSearchQuery
  } = useVideoLibrary()

  const libraryHeading = useMemo(() => {
    return `Streaming directly from the ${selectedFolder} folder`
  }, [selectedFolder])

  const renderLibrary = () => {
    if (!filteredVideos.length) {
      return (
        <EmptyState
          title="No videos match this search."
          description="Try another title, clear the search box, or add supported videos to the movies folder."
        />
      )
    }

    return (
      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
              Streaming now
            </p>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">All Videos</h2>
            <p className="max-w-3xl text-sm text-slate-300/80">{libraryHeading}</p>
          </div>
          <p className="w-fit rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-slate-300 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
            {filteredVideos.length} item{filteredVideos.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="no-scrollbar grid auto-cols-[minmax(260px,340px)] grid-flow-col gap-4 overflow-x-auto pb-5 pt-1 sm:auto-cols-[minmax(300px,380px)]">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={(item) => openVideo(item, true)}
              onMoreInfo={(item) => openVideo(item, false)}
            />
          ))}
        </div>
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

          {!hasAnyVideos ? (
            <EmptyState
              title="No local videos loaded."
              description="Put MP4, MKV, WEBM, MOV, or AVI files inside D:\Projects\udot-flix\movies, then refresh the browser."
            />
          ) : null}

          {hasAnyVideos ? renderLibrary() : null}
          {recentlyPlayedVideos.length ? (
            <section className="mt-9">
              <VideoRow
                title="Recently Played"
                description="Videos opened on this device."
                videos={recentlyPlayedVideos}
                onPlay={(video) => openVideo(video, true)}
                onMoreInfo={(video) => openVideo(video, false)}
              />
            </section>
          ) : null}
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
