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
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Local library
            </p>
            <h2 className="text-3xl font-semibold text-white">All Videos</h2>
            <p className="max-w-3xl text-sm text-slate-300/80">{libraryHeading}</p>
          </div>
          <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
            {filteredVideos.length} item{filteredVideos.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
    <div className="relative min-h-screen overflow-hidden bg-[#04050c] text-slate-50">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-28 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute right-0 top-48 h-96 w-96 rounded-full bg-violet-600/18 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/12 blur-[110px]" />
      </div>

      <Navbar
        appName="UdotFlix"
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

        <div className={`mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 ${featuredVideo ? '-mt-10' : 'pt-10'}`}>
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
